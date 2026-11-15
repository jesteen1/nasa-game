import { describe, expect, it } from "vitest";
import { getVehicle } from "../data/vehicles";
import type { SimSnapshot } from "../types";
import { autoDecisions } from "./autopilot";

const vehicle = getVehicle(2);

function snapshot(overrides: Partial<SimSnapshot> = {}): SimSnapshot {
  return {
    status: "flying",
    q: 10,
    throttle: 1,
    h: 120_000,
    speed: 5_000,
    seco: true,
    deployed: false,
    separated: true,
    stage1Burnout: true,
    fairingAttached: false,
    ...overrides,
  } as SimSnapshot;
}

describe("auto policy", () => {
  it("never auto-deploys below insertion velocity", () => {
    const decision = autoDecisions(snapshot({ speed: 5_000 }), vehicle);
    expect(decision.actions).not.toContain("deploy");
    expect(decision.deployBlocked).toBe(true);
  });

  it("auto-deploys once orbital velocity is reached", () => {
    const decision = autoDecisions(snapshot({ speed: 7_700 }), vehicle);
    expect(decision.actions).toContain("deploy");
    expect(decision.deployBlocked).toBe(false);
  });

  it("throttles down above Q 38 and back up below Q 32", () => {
    expect(autoDecisions(snapshot({ q: 40, seco: false }), vehicle).throttle).toBe(0.7);
    expect(autoDecisions(snapshot({ q: 20, throttle: 0.7, seco: false }), vehicle).throttle).toBe(1);
  });
});
