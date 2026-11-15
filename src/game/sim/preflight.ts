import type { BuildConfig, Vehicle } from "../types";
import { applyAutoDecisions } from "./autopilot";
import { SimEngine } from "./engine";
import { insertionVelocity } from "./vehicle";
import { missingSlots } from "./validate";

export type AssemblyRisk =
  | "none"
  | "incomplete"
  | "payload"
  | "orbit"
  | "pad"
  | "control"
  | "structure"
  | "restart"
  | "heat";

export interface PreflightPrediction {
  outcome: "success" | "failure" | "incomplete";
  failureId: string | null;
  risk: AssemblyRisk;
  /** Speed at SECO (or at the end of the flight) in m/s. */
  secoSpeed: number;
  /** Insertion velocity the vehicle must reach. */
  neededSpeed: number;
  maxQ: number;
  maxG: number;
  timeS: number;
  heightKm: number;
}

const RISK_BY_FAILURE: Record<string, AssemblyRisk> = {
  unstable_orbit: "payload",
  crash: "orbit",
  timeout: "orbit",
  pad_burn: "pad",
  pitch_divergence: "control",
  abort: "control",
  max_q_exceeded: "structure",
  interstage_snap: "structure",
  nozzle_overexpanded: "structure",
  cryo_boiloff: "structure",
  ullage_cavitation: "restart",
  early_fairing: "heat",
};

export function riskForFailure(id: string | null | undefined): AssemblyRisk {
  if (!id) return "none";
  return RISK_BY_FAILURE[id] ?? "orbit";
}

/**
 * Flies the assembled vehicle offline with the same auto policy as the game
 * (coarse 0.1 s steps) so the VAB can warn before launch. Cheap enough to run
 * on each assembly change: at most ~12k steps.
 */
export function predictMission(vehicle: Vehicle, build: BuildConfig): PreflightPrediction {
  const neededSpeed = insertionVelocity(vehicle);
  const empty: PreflightPrediction = {
    outcome: "incomplete",
    failureId: null,
    risk: "incomplete",
    secoSpeed: 0,
    neededSpeed,
    maxQ: 0,
    maxG: 0,
    timeS: 0,
    heightKm: 0,
  };
  if (missingSlots(vehicle, build).length > 0) return empty;

  const engine = new SimEngine(vehicle, build);
  const step = 1 / 30;
  let secoSpeed = 0;

  for (let i = 0; i < 1210 / step; i++) {
    engine.step(step);
    applyAutoDecisions(engine, vehicle);
    const snap = engine.getSnapshot();
    if (secoSpeed === 0 && snap.seco) secoSpeed = snap.speed;
    if (snap.status === "success" || snap.status === "failure") break;
  }

  const snap = engine.getSnapshot();
  if (secoSpeed === 0 && snap.seco) secoSpeed = snap.speed;

  const shared = {
    secoSpeed,
    neededSpeed,
    maxQ: snap.maxQ,
    maxG: snap.maxG,
    timeS: snap.t,
    heightKm: snap.h / 1000,
  };

  if (snap.status === "success") {
    return { ...shared, outcome: "success", failureId: null, risk: "none" };
  }

  // If SECO happened below insertion velocity, the real story is the payload
  // shortfall even when the gated autopilot lets the stack coast into a crash.
  const shortOfOrbit = secoSpeed > 0 && secoSpeed < neededSpeed;
  return {
    ...shared,
    outcome: "failure",
    failureId: snap.failure?.id ?? null,
    risk: shortOfOrbit ? "payload" : riskForFailure(snap.failure?.id),
  };
}
