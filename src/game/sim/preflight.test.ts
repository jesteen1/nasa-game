import { describe, expect, it } from "vitest";
import { getVehicle, VEHICLES } from "../data/vehicles";
import { predictMission } from "./preflight";

describe("preflight prediction", () => {
  it("clears every stock mission", () => {
    for (const vehicle of VEHICLES) {
      const prediction = predictMission(vehicle, vehicle.defaults);
      expect(
        prediction.outcome,
        `${vehicle.name} predicted ${prediction.failureId ?? "failure"}`,
      ).toBe("success");
      expect(prediction.risk).toBe("none");
    }
  });

  it("flags a sea-level upper engine as a payload risk", () => {
    const vehicle = getVehicle(2);
    const prediction = predictMission(vehicle, {
      ...vehicle.defaults,
      s2Engine: "eng_merlin_1d",
    });

    expect(prediction.outcome).toBe("failure");
    expect(prediction.risk).toBe("payload");
    expect(prediction.secoSpeed).toBeGreaterThan(0);
    expect(prediction.secoSpeed).toBeLessThan(prediction.neededSpeed);
  });

  it("flags the wrong tank in the first-stage slot", () => {
    const vehicle = getVehicle(2);
    const prediction = predictMission(vehicle, {
      ...vehicle.defaults,
      s1Tank: "tank_t2_upper",
    });

    expect(prediction.outcome).toBe("failure");
    expect(prediction.risk).toBe("payload");
    expect(prediction.secoSpeed).toBeLessThan(prediction.neededSpeed);
  });

  it("flags a heavy upper tank as a risk", () => {
    const vehicle = getVehicle(2);
    const prediction = predictMission(vehicle, {
      ...vehicle.defaults,
      s2Tank: "tank_steel_heavy",
    });

    expect(prediction.outcome).toBe("failure");
    expect(prediction.risk).not.toBe("none");
  });

  it("skips the check while the assembly is incomplete", () => {
    const vehicle = getVehicle(2);
    const prediction = predictMission(vehicle, {
      ...vehicle.defaults,
      s2Engine: "none_engine",
    });

    expect(prediction.outcome).toBe("incomplete");
    expect(prediction.risk).toBe("incomplete");
  });
});
