import { describe, expect, it } from "vitest";
import { cuesForEvent } from "./cues";

const event = (message: string, tone: "info" | "good" | "warn" | "bad" = "info") => ({
  t: 0,
  message,
  tone,
});

describe("event sound cues", () => {
  it("plays the clamp before the liftoff boom", () => {
    expect(cuesForEvent(event("LIFTOFF — HOLD-DOWN CLAMPS RELEASED", "good"))).toEqual([
      "clamp",
      "liftoff",
    ]);
  });

  it("plays latch and cold-gas puff at separation", () => {
    expect(cuesForEvent(event("STAGE SEPARATION CONFIRMED", "good"))).toEqual([
      "latch",
      "puff",
    ]);
  });

  it("uses the new boom at Max Q", () => {
    expect(cuesForEvent(event("MAX Q — THROTTLE DOWN IF STRESS RISES", "warn"))).toEqual([
      "boom",
    ]);
  });

  it("keeps failure and success cues", () => {
    expect(cuesForEvent(event("FAILURE — VEHICLE LOST", "bad"))).toEqual(["failure"]);
    expect(cuesForEvent(event("MISSION SUCCESS — TARGET ACHIEVED", "good"))).toEqual([
      "success",
    ]);
  });
});
