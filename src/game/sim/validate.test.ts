import { describe, expect, it } from "vitest";
import { emptyBuild, VEHICLES, getVehicle } from "../data/vehicles";
import { isVehicleComplete, missingSlots, requiredSlotsFor } from "./validate";

describe("vehicle completeness gate", () => {
  it("starts empty builds with all required slots missing", () => {
    for (const vehicle of VEHICLES) {
      const empty = emptyBuild(vehicle);
      expect(missingSlots(vehicle, empty), vehicle.name).toEqual(requiredSlotsFor(vehicle));
      expect(isVehicleComplete(vehicle, empty)).toBe(false);
    }
  });

  it("accepts every stock build", () => {
    for (const vehicle of VEHICLES) {
      expect(missingSlots(vehicle, vehicle.defaults), vehicle.name).toEqual([]);
      expect(isVehicleComplete(vehicle, vehicle.defaults)).toBe(true);
    }
  });

  it("requires the core body on a single-stage vehicle", () => {
    const vehicle = getVehicle(1);
    expect(missingSlots(vehicle, { ...vehicle.defaults, s1Engine: "none_engine" })).toEqual([
      "s1Engine",
    ]);
    expect(missingSlots(vehicle, { ...vehicle.defaults, s1Tank: "none_tank" })).toEqual([
      "s1Tank",
    ]);
    expect(missingSlots(vehicle, { ...vehicle.defaults, fairing: "none_fairing" })).toEqual([
      "fairing",
    ]);
  });

  it("requires interstage and upper-stage hardware on two-stage vehicles", () => {
    const vehicle = getVehicle(2);
    expect(
      missingSlots(vehicle, {
        ...vehicle.defaults,
        interstage: "none_interstage",
        s2Engine: "none_engine",
        s2Tank: "none_tank",
      }),
    ).toEqual(["interstage", "s2Engine", "s2Tank"]);
  });

  it("rejects parts that are not cleared for the tier", () => {
    const vehicle = getVehicle(2);
    // fairing_t1 only has tiers [1]
    expect(missingSlots(vehicle, { ...vehicle.defaults, fairing: "fairing_t1" })).toEqual([
      "fairing",
    ]);
  });
});
