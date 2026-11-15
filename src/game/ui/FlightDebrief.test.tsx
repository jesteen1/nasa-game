import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FAILURE_DEFS } from "../sim/failures";
import { getVehicle } from "../data/vehicles";
import FlightDebrief from "./FlightDebrief";

const vehicle = getVehicle(2);

describe("FlightDebrief", () => {
  it("explains the failure and starts with the first clue", () => {
    const failure = {
      ...FAILURE_DEFS.unstable_orbit,
      at: 336,
      cause: "Payload released below orbital velocity",
    };
    const html = renderToStaticMarkup(
      <FlightDebrief failure={failure} vehicle={vehicle} build={vehicle.defaults} />,
    );

    expect(html).toContain("Flight debrief");
    expect(html).toContain("re-entered");
    expect(html).toContain("Clue 1/3");
    expect(html).toContain("Another clue");
    expect(html).not.toContain("Clue 2/3");
  });
});
