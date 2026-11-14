import { describe, expect, it } from "vitest";
import { getVehicle, VEHICLES } from "../data/vehicles";
import { computeStats } from "../sim/vehicle";

describe("computeStats", () => {
  it("builds a flyable stock vehicle for every tier", () => {
    for (const vehicle of VEHICLES) {
      const stats = computeStats(vehicle, vehicle.defaults);
      expect(stats.totalWetKg).toBeGreaterThan(0);
      expect(stats.totalWetKg).toBeGreaterThan(stats.totalDryKg);
      expect(stats.twr).toBeGreaterThan(1);
      expect(stats.deltaV).toBeGreaterThan(1000);
      expect(stats.heightM).toBeGreaterThan(1);
      expect(stats.layout.length).toBeGreaterThan(0);
      expect(stats.stable).toBe(true);
      expect(stats.deltaV).toBeGreaterThanOrEqual(vehicle.target.deltaV);
      expect(stats.warnings.some((w) => w.id === "delta-v-short")).toBe(false);
    }
  });

  it("flags a below-unity TWR as a critical pad-burn risk", () => {
    const vehicle = getVehicle(1);
    const heavy = {
      ...vehicle.defaults,
      s1Engine: "none_engine",
      s1Tank: "tank_t4_rp1",
    };
    const stats = computeStats(vehicle, heavy);
    expect(stats.twr).toBe(0);
    expect(stats.warnings.some((w) => w.id === "twr-critical")).toBe(true);
  });

  it("adds margin warnings when the build cannot meet the mission budget", () => {
    const vehicle = getVehicle(2);
    const weak = {
      ...vehicle.defaults,
      s1Tank: "none_tank",
      s2Tank: "none_tank",
    };
    const stats = computeStats(vehicle, weak);
    expect(stats.deltaV).toBeLessThan(vehicle.target.deltaV);
    expect(stats.warnings.some((w) => w.id === "delta-v-short")).toBe(true);
  });
});
