import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getVehicle } from "../data/vehicles";
import { computeStats } from "../sim/vehicle";
import { SimEngine } from "../sim/engine";
import FlightHUD from "./FlightHUD";

const STEP = 1 / 60;

describe("FlightHUD", () => {
  it("renders countdown and powered-flight telemetry without crashing", () => {
    const vehicle = getVehicle(2);
    const engine = new SimEngine(vehicle, vehicle.defaults);
    const stats = computeStats(vehicle, vehicle.defaults);

    const countdown = renderToStaticMarkup(
      <FlightHUD
        snap={engine.getSnapshot()}
        vehicle={vehicle}
        samples={engine.samples}
        initialProp1Kg={stats.stage1.propellantKg}
        initialProp2Kg={stats.stage2.propellantKg}
        onThrottle={() => {}}
        onAction={() => {}}
      />,
    );
    expect(countdown).toContain("Mission clock");
    expect(countdown).toContain("Altitude");

    for (let i = 0; i < 45 / STEP; i++) engine.step(STEP);

    const flying = renderToStaticMarkup(
      <FlightHUD
        snap={engine.getSnapshot()}
        vehicle={vehicle}
        samples={engine.samples}
        initialProp1Kg={stats.stage1.propellantKg}
        initialProp2Kg={stats.stage2.propellantKg}
        onThrottle={() => {}}
        onAction={() => {}}
      />,
    );
    expect(flying).toContain("Throttle");
    expect(flying).toContain("Stage");
    expect(engine.getSnapshot().status).toBe("flying");
  });
});
