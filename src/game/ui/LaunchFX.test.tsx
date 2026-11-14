import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getVehicle } from "../data/vehicles";
import { SimEngine } from "../sim/engine";
import LaunchFX from "./LaunchFX";

const STEP = 1 / 60;

describe("LaunchFX", () => {
  it("shows countdown rings, liftoff flash and ascent streaks", () => {
    const vehicle = getVehicle(1);
    const engine = new SimEngine(vehicle, vehicle.defaults);

    const countdown = renderToStaticMarkup(<LaunchFX snap={engine.getSnapshot()} />);
    expect(countdown).toContain("fx-ring");
    expect(countdown).not.toContain("fx-liftoff");

    for (let i = 0; i < 10.5 / STEP; i++) engine.step(STEP);
    const liftoff = renderToStaticMarkup(<LaunchFX snap={engine.getSnapshot()} />);
    expect(liftoff).toContain("Liftoff");
    expect(liftoff).toContain("fx-flash");
    expect(liftoff).toContain("fx-smoke");

    for (let i = 0; i < 30 / STEP; i++) engine.step(STEP);
    const snap = engine.getSnapshot();
    expect(snap.status).toBe("flying");
    const ascent = renderToStaticMarkup(<LaunchFX snap={snap} />);
    expect(ascent).toContain("fx-streak");
  });
});
