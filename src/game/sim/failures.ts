import type { FailureDef } from "../types";

export const FAILURE_DEFS: Record<string, FailureDef> = {
  nozzle_overexpanded: {
    id: "nozzle_overexpanded",
    code: "NOZZLE_FLOW_SEPARATION",
    title: "Nozzle Flow Separation",
    phase: "Phase 0 · T+1s",
    telemetry: "WARN: NOZZLE FLOW SEPARATION",
    outcome:
      "Atmospheric pressure crushes the over-expanded exhaust plume. The nozzle wobbles violently and is torn apart on the pad.",
  },
  cryo_boiloff: {
    id: "cryo_boiloff",
    code: "CRYO_BOILOFF",
    title: "Cryogenic Boil-Off / Ice Formation",
    phase: "Phase 0 · T−5s",
    telemetry: "CRIT: CRYOGENIC BOIL-OFF / ICE",
    outcome:
      "Frost forms on the uninsulated hull. Tank pressure falls below the ignition threshold and the engine flames out during terminal count.",
  },
  pad_burn: {
    id: "pad_burn",
    code: "TWR_BELOW_UNITY",
    title: "Insufficient Liftoff Thrust",
    phase: "Phase 0 · T+0s",
    telemetry: "CRIT: TWR < 1.0 — PAD BURN",
    outcome:
      "The engines fire at full thrust but the vehicle is too heavy to climb. It burns through its propellant on the launch mount.",
  },
  pitch_divergence: {
    id: "pitch_divergence",
    code: "ATTITUDE_LOSS",
    title: "Attitude Loss / Pitch Divergence",
    phase: "Phase 1 · T+12s",
    telemetry: "CRIT: ATTITUDE LOSS / PITCH DIVERGENCE",
    outcome:
      "With no fins and a fixed engine, the centre of pressure sits ahead of the centre of mass. The rocket flips end-over-end and Range Safety destroys it.",
  },
  interstage_snap: {
    id: "interstage_snap",
    code: "BENDING_MOMENT_EXCEEDED",
    title: "Interstage Bending Moment Exceeded",
    phase: "Phase 2 · Max Q",
    telemetry: "CRIT: BENDING MOMENT EXCEEDED",
    outcome:
      "The hammerhead fairing loads the lightweight interstage past its bending limit. The stack snaps and the upper stage tumbles away.",
  },
  max_q_exceeded: {
    id: "max_q_exceeded",
    code: "STRUCTURAL_OVERPRESSURE",
    title: "Structural Overpressure at Max Q",
    phase: "Phase 2 · Max Q",
    telemetry: "CRIT: DYNAMIC PRESSURE REDLINE",
    outcome:
      "Dynamic pressure exceeds the airframe rating. The tank buckles and the vehicle breaks up in the transonic region.",
  },
  ullage_cavitation: {
    id: "ullage_cavitation",
    code: "TURBOPUMP_CAVITATION",
    title: "Turbopump Cavitation",
    phase: "Phase 3 · Staging",
    telemetry: "CRIT: TURBOPUMP CAVITATION",
    outcome:
      "Without ullage thrusters the propellant floats in zero-G. The turbopump ingests gas bubbles and detonates on restart.",
  },
  early_fairing: {
    id: "early_fairing",
    code: "AERO_THERMAL_OVERLOAD",
    title: "Aero-Thermal Overload",
    phase: "Phase 4 · Ascent",
    telemetry: "CRIT: AERO-THERMAL OVERLOAD (>1200°C)",
    outcome:
      "The fairing is jettisoned below 80 km. Friction plasma engulfs the exposed satellite and the payload melts.",
  },
  crash: {
    id: "crash",
    code: "VEHICLE_LOST",
    title: "Vehicle Lost",
    phase: "Flight",
    telemetry: "CRIT: TRAJECTORY BELOW SURFACE",
    outcome: "The vehicle re-enters the atmosphere and impacts the surface.",
  },
  unstable_orbit: {
    id: "unstable_orbit",
    code: "UNSTABLE_ORBIT",
    title: "Payload Released in Unstable Orbit",
    phase: "Phase 6 · Deployment",
    telemetry: "CRIT: ORBITAL VELOCITY NOT ACHIEVED",
    outcome:
      "The payload is released below orbital velocity. It re-enters and burns up before completing one revolution.",
  },
  timeout: {
    id: "timeout",
    code: "MISSION_TIMEOUT",
    title: "Mission Timeout",
    phase: "End of flight",
    telemetry: "CRIT: TARGET NOT ACHIEVED",
    outcome:
      "Propellant is exhausted and the mission has not met its target. Ground Control closes the flight loop.",
  },
  abort: {
    id: "abort",
    code: "MISSION_ABORTED",
    title: "Mission Aborted",
    phase: "Flight",
    telemetry: "WARN: RANGE SAFETY ABORT",
    outcome: "The flight director calls an abort. The vehicle is destroyed by Range Safety.",
  },
};

export function makeFailure(id: string, at: number, cause: string) {
  const def = FAILURE_DEFS[id] ?? FAILURE_DEFS.crash;
  return { ...def, at, cause };
}

export interface RuleContext {
  t: number;
  h: number;
  qKpa: number;
  throttle: number;
  stage: 1 | 2;
  twr: number;
  control: "fins" | "gimbal" | "none";
  fairingAttached: boolean;
  separated: boolean;
  stage1Burnout: boolean;
  s1VacuumNozzle: boolean;
  s1MaxQKpa: number;
  tankMaxQKpa: number;
  hammerhead: boolean;
  weakInterstage: boolean;
  uninsulatedLH2: boolean;
  vehicleStages: 1 | 2;
}

export function evaluateFailure(
  ctx: RuleContext,
  fired: Set<string>,
): FailureDef | null {
  const has = (id: string) => fired.has(id);

  if (ctx.t >= 1 && ctx.s1VacuumNozzle && !has("nozzle_overexpanded")) {
    return FAILURE_DEFS.nozzle_overexpanded;
  }
  if (ctx.t >= 5 && ctx.uninsulatedLH2 && !has("cryo_boiloff")) {
    return FAILURE_DEFS.cryo_boiloff;
  }
  if (ctx.t >= 8 && ctx.twr < 1 && !has("pad_burn")) {
    return FAILURE_DEFS.pad_burn;
  }
  if (
    ctx.t >= 12 &&
    ctx.control === "none" &&
    ctx.h < 20000 &&
    !has("pitch_divergence")
  ) {
    return FAILURE_DEFS.pitch_divergence;
  }
  if (
    ctx.qKpa >= 30 &&
    ctx.hammerhead &&
    ctx.weakInterstage &&
    !has("interstage_snap")
  ) {
    return FAILURE_DEFS.interstage_snap;
  }
  if (
    ctx.t > 20 &&
    ctx.qKpa > Math.min(ctx.s1MaxQKpa, ctx.tankMaxQKpa) &&
    ctx.throttle > 0.75 &&
    !has("max_q_exceeded")
  ) {
    return FAILURE_DEFS.max_q_exceeded;
  }
  return null;
}
