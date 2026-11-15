import { describe, expect, it } from "vitest";
import { resultActions } from "./ResultModal";

describe("result actions", () => {
  it("offers a re-fly, never a next mission, after a failure", () => {
    const actions = resultActions(false, 2, 5);
    expect(actions.primary.label).toBe("Play again");
    expect(actions.primary.kind).toBe("refly");
    expect(actions.secondary.label).toBe("Back to VAB");
    expect(`${actions.primary.label} ${actions.secondary.label}`).not.toContain("Next mission");
  });

  it("advances only when the mission passed and the next tier is unlocked", () => {
    const success = resultActions(true, 2, 3);
    expect(success.primary.label).toBe("Next mission — T3");
    expect(success.primary.kind).toBe("advance");

    const notUnlocked = resultActions(true, 2, 2);
    expect(notUnlocked.primary.kind).toBe("vab");
    expect(notUnlocked.primary.label).toBe("Back to VAB");
  });

  it("returns to the VAB at the final tier, with a re-fly option", () => {
    const final = resultActions(true, 5, 5);
    expect(final.primary.label).toBe("Back to VAB");
    expect(final.secondary.kind).toBe("refly");
  });
});
