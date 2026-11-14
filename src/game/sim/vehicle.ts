import { getPart } from "../data/parts";
import type {
  BuildConfig,
  Part,
  StageStats,
  StackItem,
  Vehicle,
  VehicleStats,
  Warning,
} from "../types";

const G0 = 9.80665;

function isNone(id: string): boolean {
  return id.startsWith("none_");
}

function blendIsp(part: Part): number {
  if (part.ispSeaLevel <= 0) return part.ispVacuum;
  if (part.ispVacuum <= 0) return part.ispSeaLevel;
  return (part.ispSeaLevel + part.ispVacuum) / 2;
}

export function emptyStats(): VehicleStats {
  return {
    totalWetKg: 0,
    totalDryKg: 0,
    twr: 0,
    deltaV: 0,
    stage1: {
      dryKg: 0,
      wetKg: 0,
      propellantKg: 0,
      thrustSlKn: 0,
      thrustVacKn: 0,
      isp: 0,
      deltaV: 0,
    },
    stage2: {
      dryKg: 0,
      wetKg: 0,
      propellantKg: 0,
      thrustSlKn: 0,
      thrustVacKn: 0,
      isp: 0,
      deltaV: 0,
    },
    heightM: 0,
    coreWidthM: 3.7,
    comY: 0,
    copY: 0,
    control: "none",
    stable: false,
    payloadKg: 0,
    warnings: [],
    layout: [],
  };
}

export function computeStats(vehicle: Vehicle, build: BuildConfig): VehicleStats {
  const e1 = getPart(build.s1Engine);
  const t1 = getPart(build.s1Tank);
  const booster = getPart(build.boosters);
  const fins = getPart(build.fins);
  const interstage = getPart(build.interstage);
  const e2 = vehicle.stages === 2 ? getPart(build.s2Engine) : getPart("none_engine");
  const t2 = vehicle.stages === 2 ? getPart(build.s2Tank) : getPart("none_tank");
  const fairing = getPart(build.fairing);
  const avionics = getPart(build.avionics);
  const ullage = getPart(build.ullage);

  const s1Count = isNone(e1.id) ? 0 : Math.max(1, vehicle.s1EngineCount);
  const s2Count = vehicle.stages === 2 && !isNone(e2.id) ? Math.max(1, vehicle.s2EngineCount) : 0;
  const bCount = isNone(booster.id) ? 0 : Math.max(1, vehicle.boosterCount);

  const e1Mass = e1.massKg * s1Count;
  const e2Mass = e2.massKg * s2Count;
  const boosterMass = booster.massKg * bCount;

  const stage1Dry = e1Mass + t1.massKg + boosterMass + fins.massKg + interstage.massKg;
  const stage1Prop = t1.propellantKg + booster.propellantKg * bCount;
  const stage1Wet = stage1Dry + stage1Prop;

  const payloadAndFairing =
    fairing.massKg + avionics.massKg + ullage.massKg + vehicle.payloadKg;
  const stage2Dry = e2Mass + t2.massKg + (vehicle.stages === 2 ? payloadAndFairing : 0);
  const stage2Prop = t2.propellantKg;
  const stage2Wet = stage2Dry + stage2Prop;

  const totalWet =
    vehicle.stages === 2 ? stage1Wet + stage2Wet : stage1Wet + payloadAndFairing;
  const totalDry =
    vehicle.stages === 2 ? stage1Dry + stage2Dry : stage1Dry + payloadAndFairing;

  const thrustSl =
    e1.thrustSeaLevelKn * s1Count + booster.thrustSeaLevelKn * bCount + (s2Count > 0 ? 0 : 0);
  const thrustVac = e1.thrustVacuumKn * s1Count + booster.thrustVacuumKn * bCount;

  const isp1 =
    (blendIsp(e1) * e1.thrustVacuumKn * s1Count +
      blendIsp(booster) * booster.thrustVacuumKn * bCount) /
    Math.max(1, e1.thrustVacuumKn * s1Count + booster.thrustVacuumKn * bCount);

  const isp2Raw = e2.ispVacuum > 0 ? e2.ispVacuum : blendIsp(e2);
  const vacuumNozzlePenalty = e2.nozzleType === "sea_level_bell" ? 0.62 : 1;
  const isp2 = isp2Raw * vacuumNozzlePenalty;

  const stage1DeltaV =
    stage1Wet > stage1Dry && stage1Dry > 0
      ? isp1 * G0 * Math.log(stage1Wet / stage1Dry)
      : 0;
  const stage2DeltaV =
    vehicle.stages === 2 && stage2Wet > stage2Dry && stage2Dry > 0
      ? isp2 * G0 * Math.log(stage2Wet / stage2Dry)
      : 0;

  const stages: [StageStats, StageStats] = [
    {
      dryKg: stage1Dry,
      wetKg: stage1Wet,
      propellantKg: stage1Prop,
      thrustSlKn: thrustSl,
      thrustVacKn: thrustVac,
      isp: isp1,
      deltaV: stage1DeltaV,
    },
    {
      dryKg: stage2Dry,
      wetKg: stage2Wet,
      propellantKg: stage2Prop,
      thrustSlKn: e2.thrustSeaLevelKn * s2Count,
      thrustVacKn: e2.thrustVacuumKn * s2Count,
      isp: isp2,
      deltaV: stage2DeltaV,
    },
  ];

  const twr = totalWet > 0 ? (thrustSl * 1000) / (totalWet * G0) : 0;

  // ── Stack layout, bottom to top ─────────────────────────────────────────
  const layout: StackItem[] = [];
  let comMass = 0;
  let comSum = 0;

  const addItem = (part: Part, y: number, massKg: number, count = 1, x = 0, z = 0) => {
    if (part.heightM <= 0 || isNone(part.id)) return;
    layout.push({ part, y, x, z, massKg, count });
    comMass += massKg * count;
    comSum += massKg * count * y;
  };

  let y = 0;
  const e1Center = e1.heightM > 0 ? e1.heightM / 2 : 0;
  addItem(e1, e1Center, e1.massKg, s1Count);
  y = Math.max(y, e1.heightM);

  const finsY = e1.heightM * 0.45 + 0.5;
  addItem(fins, finsY, fins.massKg);

  const t1Center = y + t1.heightM / 2;
  addItem(t1, t1Center, t1.massKg);
  y += t1.heightM;

  if (bCount > 0) {
    const boosterCenter = e1.heightM + t1.heightM * 0.55;
    const offset = t1.widthM / 2 + booster.widthM / 2 + 0.25;
    const slots = bCount === 1 ? [0] : [-offset, offset];
    for (let i = 0; i < bCount; i++) {
      addItem(booster, boosterCenter, booster.massKg, 1, slots[i % slots.length]);
    }
  }

  const interstageCenter = y + interstage.heightM / 2;
  addItem(interstage, interstageCenter, interstage.massKg);
  y += interstage.heightM;

  const e2Center = y + e2.heightM / 2;
  addItem(e2, e2Center, e2.massKg, s2Count);
  y += e2.heightM;

  const t2Center = y + t2.heightM / 2;
  addItem(t2, t2Center, t2.massKg);
  y += t2.heightM;

  const avionicsCenter = y + avionics.heightM / 2;
  addItem(avionics, avionicsCenter, avionics.massKg);
  y += avionics.heightM;

  const fairingCenter = y + fairing.heightM / 2;
  addItem(fairing, fairingCenter, fairing.massKg);
  y += fairing.heightM;

  const payloadY = fairing.heightM > 0 ? fairingCenter : y;
  comMass += vehicle.payloadKg;
  comSum += vehicle.payloadKg * payloadY;

  const heightM = Math.max(y, 1);
  const comY = comMass > 0 ? comSum / comMass : heightM * 0.45;
  const hasFins = fins.finAreaM2 > 0;
  const copY = hasFins ? finsY : heightM * 0.7;
  const control: VehicleStats["control"] =
    hasFins ? "fins" : e1.gimbalRangeDeg >= 3 ? "gimbal" : "none";
  const stable = control !== "none" || comY > copY;

  const warnings: Warning[] = [];
  if (twr < 1) {
    warnings.push({
      id: "twr-critical",
      label: "TWR < 1.0 — PAD BURN",
      detail: `Liftoff TWR is ${twr.toFixed(2)}. Engines cannot lift the vehicle; it will burn on the pad.`,
      severity: "critical",
    });
  } else if (twr < 1.2) {
    warnings.push({
      id: "twr-low",
      label: "LOW TWR",
      detail: `TWR ${twr.toFixed(2)} is below the 1.20 flight rule. Expect a sluggish, high-gravity-loss ascent.`,
      severity: "warn",
    });
  }
  if (control === "none") {
    warnings.push({
      id: "control-none",
      label: "NO ATTITUDE CONTROL",
      detail: "No fins and no engine gimbal. The centre of pressure is ahead of the centre of mass.",
      severity: "critical",
    });
  }
  if (e1.nozzleType === "vacuum_bell" && e1.expansionRatio > 60) {
    warnings.push({
      id: "nozzle-overexpanded",
      label: "VACUUM NOZZLE ON STAGE 1",
      detail: `Expansion ratio ${e1.expansionRatio}:1 at sea level will cause flow separation at ignition.`,
      severity: "critical",
    });
  }
  if (vehicle.stages === 2 && e2.nozzleType === "sea_level_bell") {
    warnings.push({
      id: "nozzle-underexpanded",
      label: "ISP EFFICIENCY LOSS (−38%)",
      detail: "A sea-level bell on the upper stage wastes expansion in vacuum.",
      severity: "warn",
    });
  }
  if (t1.propellant === "LH2_LOX" && !t1.cryoInsulated && t1.propellantKg > 0) {
    warnings.push({
      id: "cryo-boiloff",
      label: "CRYOGENIC BOIL-OFF",
      detail: "Uninsulated LH₂ tank. Ice forms on the hull and tank pressure collapses during tanking.",
      severity: "critical",
    });
  }
  if (t2.propellant === "LH2_LOX" && !t2.cryoInsulated && t2.propellantKg > 0) {
    warnings.push({
      id: "cryo-boiloff-2",
      label: "CRYOGENIC BOIL-OFF (STAGE 2)",
      detail: "Upper-stage LH₂ tank is uninsulated and will lose pressure before staging.",
      severity: "warn",
    });
  }
  if (
    vehicle.stages === 2 &&
    e2.propellant !== "SOLID" &&
    e2.propellant !== "NONE" &&
    !ullage.ullageThrusters
  ) {
    warnings.push({
      id: "no-ullage",
      label: "MISSING ULLAGE THRUSTERS",
      detail: "Liquid propellant will float during the coast; the upper-stage turbopump will ingest gas.",
      severity: "critical",
    });
  }
  if (fairing.hammerhead && interstage.structuralRatingKpa < 40 && vehicle.stages === 2) {
    warnings.push({
      id: "bending-moment",
      label: "BENDING MOMENT RISK",
      detail: "Hammerhead fairing on a lightweight interstage. Max Q loads may snap the stack.",
      severity: "critical",
    });
  }
  if (deltaVTotal(stages) < vehicle.target.deltaV) {
    warnings.push({
      id: "delta-v-short",
      label: "Δv BELOW MISSION BUDGET",
      detail: `Computed ${Math.round(deltaVTotal(stages)).toLocaleString()} m/s vs ${vehicle.target.deltaV.toLocaleString()} m/s required.`,
      severity: "warn",
    });
  }
  if (vehicle.stages === 2 && !isNone(e1.id) && e1.maxDynamicPressureKpa < 30) {
    warnings.push({
      id: "max-q-margin",
      label: "LOW MAX-Q RATING",
      detail: `Stage 1 engine is rated to ${e1.maxDynamicPressureKpa} kPa. Throttle down near Max Q.`,
      severity: "warn",
    });
  }

  return {
    totalWetKg: totalWet,
    totalDryKg: totalDry,
    twr,
    deltaV: deltaVTotal(stages),
    stage1: stages[0],
    stage2: stages[1],
    heightM,
    coreWidthM: Math.max(t1.widthM, t2.widthM, fairing.widthM, 1.6),
    comY,
    copY,
    control,
    stable,
    payloadKg: vehicle.payloadKg,
    warnings,
    layout,
  };
}

function deltaVTotal(stages: [StageStats, StageStats]): number {
  return stages[0].deltaV + stages[1].deltaV;
}

export function insertionVelocity(vehicle: Vehicle): number {
  if (vehicle.target.kind === "suborbital") return 0;
  if (vehicle.target.kind === "orbit") return 7650;
  return 8200;
}
