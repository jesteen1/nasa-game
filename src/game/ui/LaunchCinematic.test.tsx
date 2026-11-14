import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getVehicle } from "../data/vehicles";
import { SimEngine } from "../sim/engine";
import LaunchCinematic from "./LaunchCinematic";

const STEP = 1 / 60;

describe("LaunchCinematic", () => {
  it("is hidden during countdown, runs at T-0 and clears at 6 s", () => {
    const vehicle = getVehicle(1);
    const engine = new SimEngine(vehicle, vehicle.defaults);

    expect(renderToStaticMarkup(<LaunchCinematic snap={engine.getSnapshot()} />)).toBe("");

    for (let i = 0; i < 10.2 / STEP; i++) engine.step(STEP);
    const liftoff = renderToStaticMarkup(<LaunchCinematic snap={engine.getSnapshot()} />);
    expect(liftoff).toContain("launch-cinematic");
    expect(liftoff).toContain("LIFTOFF");
    expect(liftoff).toContain("ALT");

    for (let i = 0; i < 3.2 / STEP; i++) engine.step(STEP);
    expect(renderToStaticMarkup(<LaunchCinematic snap={engine.getSnapshot()} />)).toContain(
      "TOWER CLEAR",
    );

    for (let i = 0; i < 3 / STEP; i++) engine.step(STEP);
    expect(renderToStaticMarkup(<LaunchCinematic snap={engine.getSnapshot()} />)).toBe("");
  });
});
