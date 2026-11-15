import type { BuildConfig, Vehicle, VehicleStats } from "../types";
import { FAILURE_DEFS } from "../sim/failures";
import { getPart } from "./parts";

export interface Debrief {
  title: string;
  /** Plain-language explanation of what went wrong. */
  why: string;
  /** Three escalating clues: symptom → subsystem → slot to revisit. */
  clues: [string, string, string];
}

interface DebriefBase {
  why: string;
  clues: [string, string, string];
}

const BASE: Record<string, DebriefBase> = {
  nozzle_overexpanded: {
    why: "A vacuum nozzle met thick sea-level air. The exhaust separated and tore the engine apart seconds after ignition.",
    clues: [
      "The engine failed while the rocket was still in dense air.",
      "One engine on the stack is designed for space, not sea level.",
      "Check the Stage 1 Engine slot — it needs a sea-level design.",
    ],
  },
  cryo_boiloff: {
    why: "A cryogenic tank had no insulation, so its pressure collapsed during tanking, before liftoff.",
    clues: [
      "The failure happened during the countdown, before the rocket moved.",
      "One tank is losing its cold propellant to the surrounding air.",
      "Check the Stage 1 or Stage 2 Tank slot for an insulated design.",
    ],
  },
  pad_burn: {
    why: "Liftoff thrust was lower than the vehicle's weight, so the stack burned on the launch mount.",
    clues: [
      "The rocket never left the pad.",
      "Its engines cannot lift the mass of the full stack.",
      "Check the Stage 1 Engine (or add boosters) and the tank mass.",
    ],
  },
  pitch_divergence: {
    why: "The vehicle had no way to hold its attitude. It flipped after clearing the tower and Range Safety destroyed it.",
    clues: [
      "The rocket lost control shortly after clearing the tower.",
      "It has no steering authority — no fins and no gimballed engine.",
      "Check the Fins slot or the Stage 1 Engine gimbal.",
    ],
  },
  interstage_snap: {
    why: "A wide fairing loaded a lightweight interstage past its bending limit at Max Q, and the stack snapped in two.",
    clues: [
      "The stack broke apart during the high-pressure part of ascent.",
      "The top of the rocket catches more air than the joint below it can take.",
      "Check the Interstage and Fairing slots.",
    ],
  },
  max_q_exceeded: {
    why: "Dynamic pressure rose past what the airframe was rated for, and the structure buckled.",
    clues: [
      "The failure happened in the transonic region, where the air is thickest.",
      "A tank or engine is rated below the pressure it actually meets.",
      "Check the tank and engine Max-Q ratings, and throttle down near Max Q.",
    ],
  },
  ullage_cavitation: {
    why: "The upper-stage propellant floated in zero-G, and the turbopump swallowed gas bubbles when the engine relit.",
    clues: [
      "The failure happened just after stage separation.",
      "The upper stage needs its propellant settled before it can relight.",
      "Check the Ullage slot — the settling thrusters are missing.",
    ],
  },
  early_fairing: {
    why: "The fairing came off below 80 km, and the exposed payload overheated in the thick air.",
    clues: [
      "The failure happened during ascent, after the fairing was jettisoned.",
      "The air was still thick enough to burn the exposed payload.",
      "Keep the Fairing on until altitude is above 80 km.",
    ],
  },
  crash: {
    why: "The stack ran out of vertical energy and fell back to the surface before reaching the target.",
    clues: [
      "The rocket climbed, then lost altitude and came back down.",
      "It did not have enough thrust or fuel to keep going.",
      "Check the Stage 1 Tank, Stage 1 Engine and total Δv.",
    ],
  },
  unstable_orbit: {
    why: "The payload was released below the speed needed to stay in orbit, so it re-entered and burned up.",
    clues: [
      "The capsule left the vehicle too slowly.",
      "The upper stage ran out of fuel before the stack reached orbital velocity.",
      "Check the Stage 2 Engine and Stage 2 Tank.",
    ],
  },
  timeout: {
    why: "The flight timer expired before the target. The upper stage was too slow or too small to finish the mission.",
    clues: [
      "The mission ran out of time instead of speed.",
      "The upper stage is taking too long to finish its burn.",
      "Check the Stage 2 Engine and Tank for thrust and propellant.",
    ],
  },
  abort: {
    why: "The flight was deliberately ended by the abort command or by Range Safety.",
    clues: [
      "The mission was stopped on purpose.",
      "An abort ends the run before the build is fully tested.",
      "Re-fly when you are ready, or check the assembly first.",
    ],
  },
};

function isHeavy(build: BuildConfig, slot: "s1Tank" | "s2Tank"): boolean {
  return build[slot] === "tank_steel_heavy";
}

/**
 * Build-aware debrief: the first two clues stay general, the third points at
 * the assembly slot the player should revisit — never the exact replacement
 * part.
 */
export function debriefFor(
  failureId: string,
  vehicle: Vehicle,
  build: BuildConfig,
  stats: VehicleStats,
): Debrief {
  const def = FAILURE_DEFS[failureId] ?? FAILURE_DEFS.crash;
  const base = BASE[failureId] ?? BASE.crash;
  const clues: [string, string, string] = [...base.clues];

  const e1 = getPart(build.s1Engine);
  const e2 = getPart(build.s2Engine);
  const t1 = getPart(build.s1Tank);
  const t2 = getPart(build.s2Tank);
  const stage2DryRatio = stats.stage2.dryKg / Math.max(1, stats.stage2.wetKg);

  if (failureId === "unstable_orbit") {
    if (e2.nozzleType === "sea_level_bell") {
      clues[2] = "Check the Stage 2 Engine slot — it looks tuned for sea-level air, not vacuum.";
    } else if (stage2DryRatio > 0.24) {
      clues[2] = "Check the Stage 2 Tank — the upper stage is very heavy for the fuel it carries.";
    } else if (t1.id === "tank_t2_upper") {
      clues[2] = "Check the Stage 1 Tank — the first stage may not be carrying enough propellant.";
    }
  }

  if (failureId === "crash") {
    if (e2.nozzleType === "sea_level_bell") {
      clues[2] = "Check the Stage 2 Engine slot — it may not be efficient enough in vacuum.";
    } else if (t1.id === "tank_t2_upper") {
      clues[2] = "Check the Stage 1 Tank — it is likely too small for the first stage.";
    } else if (isHeavy(build, "s2Tank") || stage2DryRatio > 0.3) {
      clues[2] = "Check the Stage 2 Tank — it is adding a lot of dead mass.";
    } else if (stats.twr < 1.2) {
      clues[2] = "Check the Stage 1 Engine or boosters — liftoff acceleration is low.";
    } else if (stats.deltaV < vehicle.target.deltaV * 1.1) {
      clues[2] = "Check the tanks — the fuel budget is thin for this mission.";
    }
  }

  if (failureId === "max_q_exceeded") {
    if (t1.id === "tank_t2_upper" || isHeavy(build, "s1Tank")) {
      clues[2] = "Check the Stage 1 Tank — the first stage is short on propellant or heavy for its size.";
    } else if (e1.maxDynamicPressureKpa <= t1.structuralRatingKpa) {
      clues[2] = "Check the Stage 1 Engine — it is rated below the pressure it meets.";
    } else {
      clues[2] = "Check the Stage 1 Tank — its structural rating is the weakest link.";
    }
  }

  if (failureId === "pad_burn" && stats.twr < 1) {
    clues[2] = "Check the Stage 1 Engine (or add boosters) — thrust is below the stack's weight.";
  }

  if (failureId === "timeout") {
    if (e2.thrustVacuumKn > 0 && e2.thrustVacuumKn < 500) {
      clues[2] = "Check the Stage 2 Engine — it is a low-thrust design that cannot finish in time.";
    } else if (t2.propellantKg > 0 && t2.propellantKg < 120_000) {
      clues[2] = "Check the Stage 2 Tank — there may not be enough propellant for the burn.";
    }
  }

  return { title: def.title, why: base.why, clues };
}
