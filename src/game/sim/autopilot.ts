import type { SimEngine } from "./engine";
import type { SimSnapshot, Vehicle } from "../types";
import { insertionVelocity } from "./vehicle";

export type AutoAction = "stage" | "fairing" | "deploy";

export interface AutoDecision {
  throttle?: number;
  actions: AutoAction[];
  /** True when auto-deploy is holding because orbital velocity is short. */
  deployBlocked: boolean;
}

/**
 * The flight-assist policy shared by the live game, the preflight prediction
 * and the campaign tests. It never deploys a payload below the vehicle's
 * insertion velocity — pressing Deploy manually is still the player's call.
 */
export function autoDecisions(snap: SimSnapshot, vehicle: Vehicle): AutoDecision {
  const decision: AutoDecision = { actions: [], deployBlocked: false };
  if (snap.status !== "flying") return decision;

  if (snap.q > 38 && snap.throttle > 0.7) decision.throttle = 0.7;
  else if (snap.q < 32 && snap.throttle < 1) decision.throttle = 1;

  if (snap.stage1Burnout && !snap.separated && vehicle.stages === 2) {
    decision.actions.push("stage");
  }
  if (snap.fairingAttached && snap.h > 82_000 && vehicle.stages === 2) {
    decision.actions.push("fairing");
  }
  if (snap.seco && !snap.deployed && vehicle.stages === 2) {
    if (snap.speed >= insertionVelocity(vehicle)) decision.actions.push("deploy");
    else decision.deployBlocked = true;
  }

  return decision;
}

export function applyAutoDecisions(engine: SimEngine, vehicle: Vehicle): AutoDecision {
  const decision = autoDecisions(engine.getSnapshot(), vehicle);
  if (decision.throttle !== undefined) engine.setThrottle(decision.throttle);
  for (const action of decision.actions) engine.action(action);
  return decision;
}
