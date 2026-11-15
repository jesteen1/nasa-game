import { describe, expect, it } from "vitest";
import { FAILURE_DEFS } from "../sim/failures";
import { FAILURE_GUIDE, findFailureGuide } from "./failureGuide";

describe("failure guide", () => {
  it("covers every failure rule exactly once", () => {
    expect(FAILURE_GUIDE.map((entry) => entry.id).sort()).toEqual(
      Object.keys(FAILURE_DEFS).sort(),
    );
  });

  it("gives a cause and at least one concrete fix for each error", () => {
    for (const entry of FAILURE_GUIDE) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.code.length).toBeGreaterThan(0);
      expect(entry.short.length).toBeGreaterThan(0);
      expect(entry.why.length).toBeGreaterThan(40);
      expect(entry.fixes.length).toBeGreaterThan(0);
      expect(entry.fixes.every((fix) => fix.trim().length > 0)).toBe(true);
    }
  });

  it("resolves deep links, including the deploy failure", () => {
    expect(findFailureGuide("#unstable_orbit")?.id).toBe("unstable_orbit");
    expect(findFailureGuide("#MAX_Q_EXCEEDED")?.id).toBe("max_q_exceeded");
    expect(findFailureGuide("#max_q_exceeded")?.fixes.length).toBeGreaterThan(0);
  });

  it("returns null for an empty or unknown hash so the full list shows", () => {
    expect(findFailureGuide("")).toBeNull();
    expect(findFailureGuide("#")).toBeNull();
    expect(findFailureGuide("#not_a_real_failure")).toBeNull();
  });
});
