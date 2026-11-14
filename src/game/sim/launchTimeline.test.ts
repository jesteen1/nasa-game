import { describe, expect, it } from "vitest";
import { cinematicActive, cinematicCallout, cinematicOpacity } from "./launchTimeline";

describe("launch cinematic timeline", () => {
  it("runs from T-0 for six seconds", () => {
    expect(cinematicActive(-0.1)).toBe(false);
    expect(cinematicActive(0)).toBe(true);
    expect(cinematicActive(5.9)).toBe(true);
    expect(cinematicActive(6)).toBe(false);
  });

  it("fades only in the last 0.6 s", () => {
    expect(cinematicOpacity(0)).toBe(1);
    expect(cinematicOpacity(5.3)).toBe(1);
    expect(cinematicOpacity(5.7)).toBeCloseTo(0.5);
    expect(cinematicOpacity(6)).toBe(0);
  });

  it("changes callouts through the sequence", () => {
    expect(cinematicCallout(0)).toBe("LIFTOFF");
    expect(cinematicCallout(3)).toBe("TOWER CLEAR");
    expect(cinematicCallout(5)).toBe("ASCENT NOMINAL");
  });
});
