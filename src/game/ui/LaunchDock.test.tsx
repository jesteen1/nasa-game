import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyBuild, getVehicle } from "../data/vehicles";
import type { PreflightPrediction } from "../sim/preflight";
import { computeStats } from "../sim/vehicle";
import LaunchDock from "./LaunchDock";

const vehicle = getVehicle(2);

function prediction(overrides: Partial<PreflightPrediction>): PreflightPrediction {
  return {
    outcome: "success",
    failureId: null,
    risk: "none",
    secoSpeed: 7_770,
    neededSpeed: 7_650,
    maxQ: 36.7,
    maxG: 5,
    timeS: 466,
    heightKm: 122,
    ...overrides,
  };
}

describe("LaunchDock", () => {
  it("shows incomplete status and missing hardware", () => {
    const build = emptyBuild(vehicle);
    const html = renderToStaticMarkup(
      <LaunchDock
        vehicle={vehicle}
        build={build}
        prediction={prediction({ outcome: "incomplete", risk: "incomplete" })}
        stats={computeStats(vehicle, build)}
      />,
    );

    expect(html).toContain("required slot");
    expect(html).toContain("Incomplete");
    expect(html).toContain("Install hardware in");
  });

  it("shows the risk clue and launch-anyway state for a risky build", () => {
    const html = renderToStaticMarkup(
      <LaunchDock
        vehicle={vehicle}
        build={vehicle.defaults}
        prediction={prediction({ outcome: "failure", failureId: "unstable_orbit", risk: "payload" })}
        stats={computeStats(vehicle, vehicle.defaults)}
      />,
    );

    expect(html).toContain("PAYLOAD RISK");
    expect(html).toContain("Clue");
    expect(html).toContain("Launch anyway");
  });

  it("shows TWR and Δv for a ready build", () => {
    const html = renderToStaticMarkup(
      <LaunchDock
        vehicle={vehicle}
        build={vehicle.defaults}
        prediction={prediction({})}
        stats={computeStats(vehicle, vehicle.defaults)}
      />,
    );

    expect(html).toContain("Ready for launch");
    expect(html).toContain("TWR 1.43");
    expect(html).toContain("Initiate launch");
  });
});
