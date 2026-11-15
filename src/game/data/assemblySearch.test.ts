import { describe, expect, it } from "vitest";
import { searchAssembly } from "./assemblySearch";
import { getVehicle } from "./vehicles";

const vehicle = getVehicle(2);

describe("assembly search", () => {
  it("finds slots by label", () => {
    const results = searchAssembly(vehicle, vehicle.defaults, "stage 2", 10);
    const slots = results.map((match) => match.slot);
    expect(slots).toContain("s2Engine");
    expect(slots).toContain("s2Tank");
    expect(results.every((match) => match.kind === "slot")).toBe(true);
  });

  it("finds tier-available parts and marks the installed one", () => {
    const results = searchAssembly(vehicle, vehicle.defaults, "merlin", 20);
    const vacuum = results.find(
      (match) => match.partId === "eng_merlin_vac" && match.slot === "s2Engine",
    );
    expect(vacuum).toBeDefined();
    expect(vacuum?.installed).toBe(true);
    expect(vacuum?.partName).toBe("Merlin Vacuum");
  });

  it("limits and orders results", () => {
    const results = searchAssembly(vehicle, vehicle.defaults, "tank", 3);
    expect(results).toHaveLength(3);
    expect(results[0].kind).toBe("slot");
  });

  it("respects tier-available parts", () => {
    expect(searchAssembly(vehicle, vehicle.defaults, "super heavy")).toHaveLength(0);
  });

  it("returns nothing for an empty or unknown query", () => {
    expect(searchAssembly(vehicle, vehicle.defaults, "   ")).toHaveLength(0);
    expect(searchAssembly(vehicle, vehicle.defaults, "zzzz")).toHaveLength(0);
  });
});
