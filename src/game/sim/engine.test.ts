import { describe, expect, it } from "vitest";
import { getVehicle } from "../data/vehicles";
import { applyAutoDecisions } from "../sim/autopilot";
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

  it("holds and resumes the terminal count without advancing the clock", () => {
    const vehicle = getVehicle(1);
    const engine = new SimEngine(vehicle, vehicle.defaults);
    run(engine, 1);

    engine.hold();
    expect(engine.getSnapshot().hold).toBe(true);
    const heldAt = engine.getSnapshot().t;
    run(engine, 3);
    expect(engine.getSnapshot().t).toBe(heldAt);
    expect(engine.getSnapshot().status).toBe("countdown");

    engine.resumeCountdown();
    expect(engine.getSnapshot().hold).toBe(false);
    run(engine, 1);
    expect(engine.getSnapshot().t).toBeGreaterThan(heldAt);
  });

  it("drops the stage-1 beacon after separation while S2 stays locked", () => {
    const vehicle = getVehicle(2);
    const engine = new SimEngine(vehicle, vehicle.defaults);

    for (let i = 0; i < 600 / STEP; i++) {
      engine.step(STEP);
      const snap = engine.getSnapshot();
      if (snap.q > 38 && snap.throttle > 0.7) engine.setThrottle(0.7);
      else if (snap.q < 32 && snap.throttle < 1) engine.setThrottle(1);
      if (snap.stage1Burnout && !snap.separated) {
        engine.action("stage");
        break;
      }
    }

    const separated = engine.getSnapshot();
    expect(separated.separated).toBe(true);
    expect(separated.downlink.s1).toBe("weak");
    expect(separated.downlink.s2).toBe("locked");
    expect(separated.downlink.packets).toBeGreaterThan(0);

    run(engine, 9);
    expect(engine.getSnapshot().downlink.s1).toBe("lost");
  });

  it("reports an orbit shortfall instead of a false insertion callout", () => {
    const vehicle = getVehicle(2);
    const engine = new SimEngine(vehicle, {
      ...vehicle.defaults,
      s2Engine: "eng_merlin_1d",
    });

    for (let i = 0; i < 700 / STEP; i++) {
      engine.step(STEP);
      applyAutoDecisions(engine, vehicle);
      const snap = engine.getSnapshot();
      if (snap.status === "success" || snap.status === "failure") break;
    }

    const snap = engine.getSnapshot();
    expect(snap.events.some((event) => event.message.includes("ORBIT SHORTFALL"))).toBe(true);
    expect(
      snap.events.some((event) => event.message.includes("ORBITAL INSERTION VELOCITY REACHED")),
    ).toBe(false);
  });

  it("streams payload science downlink after deploy", () => {
    const vehicle = getVehicle(2);
    const engine = new SimEngine(vehicle, vehicle.defaults);

    for (let i = 0; i < 1250 / STEP; i++) {
      engine.step(STEP);
      const snap = engine.getSnapshot();
      if (snap.status === "success" || snap.status === "failure") break;
      if (snap.status !== "flying") continue;
      if (snap.q > 38 && snap.throttle > 0.7) engine.setThrottle(0.7);
      else if (snap.q < 32 && snap.throttle < 1) engine.setThrottle(1);
      if (snap.fairingAttached && snap.h > 80_000) engine.action("fairing");
      if (snap.stage1Burnout && !snap.separated) engine.action("stage");
      if (snap.seco && !snap.deployed) engine.action("deploy");
    }

    const snap = engine.getSnapshot();
    expect(snap.status).toBe("success");
    expect(snap.downlink.s2).toBe("locked");
    expect(snap.downlink.payload).toBe("locked");
    expect(snap.downlink.sciencePct).toBe(100);
    expect(snap.events.some((e) => e.message.includes("SCIENCE DOWNLINK ACQUIRED"))).toBe(true);
  });
});
