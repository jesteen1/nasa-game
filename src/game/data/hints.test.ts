import { describe, expect, it } from "vitest";
import { FAILURE_DEFS } from "../sim/failures";
import { computeStats } from "../sim/vehicle";
import { getVehicle } from "./vehicles";
import { debriefFor } from "./hints";

const vehicle = getVehicle(2);
const stockStats = computeStats(vehicle, vehicle.defaults);

describe("flight debrief", () => {
  it("gives every failure a reason and three escalating clues", () => {
    for (const id of Object.keys(FAILURE_DEFS)) {
      const debrief = debriefFor(id, vehicle, vehicle.defaults, stockStats);
      expect(debrief.title.length).toBeGreaterThan(0);
      expect(debrief.why.length).toBeGreaterThan(30);
      expect(debrief.clues).toHaveLength(3);
      expect(debrief.clues.every((clue) => clue.trim().length > 0)).toBe(true);
    }
  });

  it("never leaks part ids in the clues", () => {
    for (const id of Object.keys(FAILURE_DEFS)) {
      const debrief = debriefFor(id, vehicle, vehicle.defaults, stockStats);
      for (const clue of debrief.clues) {
        expect(clue).not.toMatch(
          /(eng_|tank_|fairing_|interstage_|ullage_|avionics_|booster_|fins_)/,
        );
      }
    }
  });

  it("points at the Stage 2 Engine for a sea-level upper engine", () => {
    const build = { ...vehicle.defaults, s2Engine: "eng_merlin_1d" };
    const debrief = debriefFor("crash", vehicle, build, computeStats(vehicle, build));
    expect(debrief.clues[2].toLowerCase()).toContain("stage 2 engine");
  });

  it("points at the Stage 1 Tank when the upper tank was fitted first", () => {
    const build = { ...vehicle.defaults, s1Tank: "tank_t2_upper" };
    const debrief = debriefFor("crash", vehicle, build, computeStats(vehicle, build));
    expect(debrief.clues[2].toLowerCase()).toContain("stage 1 tank");
  });
});
