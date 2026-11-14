import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUILD_STEPS, TEAM, TECH_STACK } from "./about";

describe("about page data", () => {
  it("lists five unique team members", () => {
    expect(TEAM).toHaveLength(5);
    expect(new Set(TEAM.map((member) => member.id)).size).toBe(5);
    expect(TEAM.every((member) => member.name && member.role && member.focus)).toBe(true);
  });

  it("points every team photo at a file in public/", () => {
    for (const member of TEAM) {
      const file = join(process.cwd(), "public", member.image.replace(/^\//, ""));
      expect(existsSync(file), `${member.image} is missing`).toBe(true);
    }
  });

  it("documents the build story and stack", () => {
    expect(BUILD_STEPS.length).toBeGreaterThanOrEqual(5);
    expect(TECH_STACK.length).toBeGreaterThan(0);
  });
});
