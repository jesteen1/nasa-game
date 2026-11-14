import { describe, expect, it } from "vitest";
import { FAILURE_DEFS } from "../sim/failures";
import { FAILURE_GUIDE } from "./failureGuide";

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
});
