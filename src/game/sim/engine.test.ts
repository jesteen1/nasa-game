import { describe, expect, it } from "vitest";
import { getVehicle } from "../data/vehicles";
import { SimEngine } from "../sim/engine";

const STEP = 1 / 60;

function run(engine: SimEngine, seconds: number, onStep?: (engine: SimEngine) => void) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    engine.step(STEP);
    onStep?.(engine);
    if (engine.getSnapshot().status === "success" || engine.getSnapshot().status === "failure") {
      return;
    }
  }
}

describe("SimEngine", () => {
  it("flies the stock Tier-1 sounding rocket to its altitude target", () => {
    const vehicle = getVehicle(1);
    const engine = new SimEngine(vehicle, vehicle.defaults);
    run(engine, 900);
    const snap = engine.getSnapshot();
    expect(snap.status).toBe("success");
    expect(snap.h).toBeGreaterThanOrEqual(vehicle.target.altitudeKm * 1000);
    expect(snap.maxQ).toBeGreaterThan(0);
    expect(snap.maxG).toBeGreaterThan(0);
    expect(engine.samples.length).toBeGreaterThan(10);
  });

  it("is deterministic for identical inputs and fixed steps", () => {
    const vehicle = getVehicle(1);
    const a = new SimEngine(vehicle, vehicle.defaults);
    const b = new SimEngine(vehicle, vehicle.defaults);
    run(a, 45);
    run(b, 45);
    const sa = a.getSnapshot();
    const sb = b.getSnapshot();
    expect(sa.t).toBe(sb.t);
    expect(sa.h).toBe(sb.h);
    expect(sa.speed).toBe(sb.speed);
    expect(sa.massKg).toBe(sb.massKg);
    expect(sa.massKg).toBeGreaterThan(0);
  });

  it("reports a pad burn when TWR is below unity without lifting off", () => {
    const vehicle = getVehicle(1);
    const engine = new SimEngine(vehicle, {
      ...vehicle.defaults,
      s1Engine: "none_engine",
      s1Tank: "tank_t4_rp1",
    });
    run(engine, 30);
    const snap = engine.getSnapshot();
    expect(snap.status).toBe("failure");
    expect(snap.failure?.id).toBe("pad_burn");
  });

  it("terminates the flight on a range-safety abort", () => {
    const vehicle = getVehicle(1);
    const engine = new SimEngine(vehicle, vehicle.defaults);
    run(engine, 12);
    engine.action("abort");
    const snap = engine.getSnapshot();
    expect(snap.status).toBe("failure");
    expect(snap.failure?.id).toBe("abort");
  });
});
