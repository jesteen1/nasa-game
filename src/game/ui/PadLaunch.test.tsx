import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getVehicle } from "../data/vehicles";
import { SimEngine } from "../sim/engine";
import PadLaunch from "./PadLaunch";

const STEP = 1 / 60;

describe("PadLaunch", () => {
  it("shows the 2D rocket through countdown, liftoff, then clears", () => {
    const vehicle = getVehicle(1);
    const engine = new SimEngine(vehicle, vehicle.defaults);

    const countdown = renderToStaticMarkup(<PadLaunch snap={engine.getSnapshot()} />);
    expect(countdown).toContain("rocket-craft");
    expect(countdown).toContain("Terminal count");
    expect(countdown).toContain("T−10");

    for (let i = 0; i < 10.5 / STEP; i++) engine.step(STEP);
    const liftoff = renderToStaticMarkup(<PadLaunch snap={engine.getSnapshot()} />);
    expect(liftoff).toContain("Liftoff");
    expect(liftoff).toContain("is-launching");

    for (let i = 0; i < 3 / STEP; i++) engine.step(STEP);
    expect(renderToStaticMarkup(<PadLaunch snap={engine.getSnapshot()} />)).toBe("");
  });
});
