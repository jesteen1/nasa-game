import { describe, expect, it } from "vitest";
import { getVehicle } from "../data/vehicles";
import { SimEngine } from "../sim/engine";
import { insertionVelocity } from "../sim/vehicle";

const STEP = 1 / 60;

/**
 * Flies a stock vehicle with a conservative mission-control policy:
 * throttle down near the structural redline, jettison the fairing above
 * 80 km, stage at MECO, and deploy after SECO.
 */
function autopilot(engine: SimEngine) {
  const snap = engine.getSnapshot();
  if (snap.status !== "flying") return;
  if (snap.q > 38 && snap.throttle > 0.7) {
    engine.setThrottle(0.7);
  } else if (snap.q < 32 && snap.throttle < 1) {
    engine.setThrottle(1);
  }
  if (snap.fairingAttached && snap.h > 80_000) {
    engine.action("fairing");
  }
  if (snap.stage1Burnout && !snap.separated) {
    engine.action("stage");
  }
  if (snap.seco && !snap.deployed) {
    engine.action("deploy");
  }
}

describe("campaign", () => {
  it("completes every stock mission with correct staging", () => {
    for (let tier = 1; tier <= 5; tier++) {
      const vehicle = getVehicle(tier);
      const engine = new SimEngine(vehicle, vehicle.defaults);
      let steps = 0;

      while (steps < 1250 / STEP) {
        engine.step(STEP);
        autopilot(engine);
        const snap = engine.getSnapshot();
        if (snap.status === "success" || snap.status === "failure") break;
        steps += 1;
      }

      const snap = engine.getSnapshot();
      expect(snap.status, `${vehicle.name} ended as ${snap.status} (${snap.failure?.id ?? "no failure"})`).toBe(
        "success",
      );
      if (vehicle.target.kind !== "suborbital") {
        expect(snap.speed).toBeGreaterThanOrEqual(insertionVelocity(vehicle));
      }
    }
  });
});
