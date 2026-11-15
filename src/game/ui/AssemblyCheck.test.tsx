import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getVehicle } from "../data/vehicles";
import type { PreflightPrediction } from "../sim/preflight";
import { computeStats } from "../sim/vehicle";
import AssemblyCheck from "./AssemblyCheck";

const vehicle = getVehicle(2);
const stats = computeStats(vehicle, vehicle.defaults);

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

function render(value: PreflightPrediction) {
  return renderToStaticMarkup(
    <AssemblyCheck prediction={value} vehicle={vehicle} build={vehicle.defaults} stats={stats} />,
  );
}

describe("AssemblyCheck", () => {
  it("shows a clear card for a healthy build", () => {
    const html = render(prediction({}));
    expect(html).toContain("CLEAR");
    expect(html).toContain("No problems spotted");
    expect(html).not.toContain("Clue 1/3");
  });

  it("warns about payload risk and reveals clues progressively", () => {
    const html = render(
      prediction({
        outcome: "failure",
        failureId: "unstable_orbit",
        risk: "payload",
        secoSpeed: 5_240,
      }),
    );

    expect(html).toContain("PAYLOAD RISK");
    expect(html).toContain("5,240");
    expect(html).toContain("7,650");
    expect(html).toContain("Clue 1/3");
    expect(html).toContain("Another clue");
    expect(html).not.toContain("Check the Stage 2 Engine");
  });

  it("asks for the remaining hardware when incomplete", () => {
    const html = render(
      prediction({ outcome: "incomplete", risk: "incomplete", failureId: null }),
    );
    expect(html).toContain("INCOMPLETE");
  });
});
