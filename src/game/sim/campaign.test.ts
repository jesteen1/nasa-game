import { describe, expect, it } from "vitest";
import { getVehicle } from "../data/vehicles";
import { applyAutoDecisions } from "../sim/autopilot";
import { SimEngine } from "../sim/engine";
import { insertionVelocity } from "../sim/vehicle";

const STEP = 1 / 60;

/**
 * Flies a stock vehicle with the same mission-control policy the game and the
 * VAB preflight use: throttle down near the structural redline, jettison the
 * fairing above 82 km, stage at MECO, and deploy only once orbital velocity is
 * reached.
 */

describe("campaign", () => {
  it("completes every stock mission with correct staging", () => {
    for (let tier = 1; tier <= 5; tier++) {
      const vehicle = getVehicle(tier);
      const engine = new SimEngine(vehicle, vehicle.defaults);
      let steps = 0;

      while (steps < 1250 / STEP) {
        engine.step(STEP);
        applyAutoDecisions(engine, vehicle);
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
