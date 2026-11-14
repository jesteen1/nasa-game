import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeName, profileKey, useGame } from "./game";

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

let storage: ReturnType<typeof fakeStorage>;
const store = () => useGame.getState();

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("window", { localStorage: storage });
  store().bootstrap();
});

describe("commander profiles", () => {
  it("normalizes names: trims, collapses spaces and caps at 24 characters", () => {
    expect(normalizeName("  Neil   Armstrong  ")).toBe("Neil Armstrong");
    expect(normalizeName("ABCDEFGHIJKLMNOPQRSTUVWXYZ-EXTRA")).toBe(
      "ABCDEFGHIJKLMNOPQRSTUVWX",
    );
  });

  it("stores a separate save per username and restores it on selection", async () => {
    expect(store().profiles).toEqual([]);
    expect(store().activeProfile).toBeNull();

    expect(store().createProfile("  Armstrong ")).toBe(true);
    expect(store().playerName).toBe("Armstrong");
    store().setSlot("s1Engine", "eng_htpb_solid");

    expect(store().createProfile("Michael")).toBe(true);
    store().setSlot("s1Engine", "eng_merlin_1d");

    // duplicate names are rejected case-insensitively
    expect(store().createProfile("armstrong")).toBe(false);
    expect(store().profiles).toEqual(["Armstrong", "Michael"]);

    expect(storage.getItem(profileKey("Armstrong"))).toContain("eng_htpb_solid");
    expect(storage.getItem(profileKey("Michael"))).toContain("eng_merlin_1d");

    store().selectProfile("Armstrong");
    await useGame.persist.rehydrate();
    expect(store().playerName).toBe("Armstrong");
    expect(store().build.s1Engine).toBe("eng_htpb_solid");
  });

  it("clears one commander's data without touching the others", () => {
    store().createProfile("Armstrong");
    store().setSlot("s1Engine", "eng_htpb_solid");
    store().createProfile("Michael");
    store().setSlot("s1Engine", "eng_merlin_1d");

    store().deleteProfile("Michael");
    expect(store().profiles).toEqual(["Armstrong"]);
    expect(storage.getItem(profileKey("Michael"))).toBeNull();
    expect(storage.getItem(profileKey("Armstrong"))).not.toBeNull();
    // Michael was selected, so the active slot resets
    expect(store().activeProfile).toBeNull();
    expect(store().playerName).toBe("");
  });

  it("migrates the old single-player save into a named profile", () => {
    storage.setItem(
      "orbital-architect-save",
      JSON.stringify({ state: { playerName: "Legacy", tier: 3, unlocked: 2 } }),
    );

    store().bootstrap();

    expect(storage.getItem("orbital-architect-save")).toBeNull();
    expect(store().profiles).toContain("Legacy");
    expect(store().activeProfile).toBe("Legacy");
  });

  it("persists the sound preference per commander", async () => {
    store().createProfile("Armstrong");
    expect(store().soundOn).toBe(true);
    store().toggleSound();
    expect(store().soundOn).toBe(false);

    store().createProfile("Michael");
    expect(store().soundOn).toBe(true);

    store().selectProfile("Armstrong");
    await useGame.persist.rehydrate();
    expect(store().soundOn).toBe(false);
  });

  it("blocks launch while the vehicle is incomplete", () => {
    store().createProfile("Armstrong");
    expect(store().launch()).toBe(true);
    expect(store().screen).toBe("flight");

    store().backToVab();
    store().setSlot("s1Engine", "none_engine");
    expect(store().launch()).toBe(false);
    expect(store().screen).toBe("vab");

    store().setSlot("s1Engine", "eng_htpb_solid");
    expect(store().launch()).toBe(true);
    expect(store().screen).toBe("flight");
  });
});
