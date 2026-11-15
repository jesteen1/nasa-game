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

  it("starts with an empty assembly unit and blocks launch until all required parts are selected", () => {
    store().createProfile("Armstrong");
    expect(store().build.s1Engine).toBe("none_engine");
    expect(store().build.s1Tank).toBe("none_tank");
    expect(store().build.fairing).toBe("none_fairing");
    expect(store().build.avionics).toBe("none_avionics");
    expect(store().launch()).toBe(false);
    expect(store().screen).toBe("vab");

    store().setSlot("s1Engine", "eng_htpb_solid");
    store().setSlot("s1Tank", "tank_t1_solid");
    store().setSlot("fairing", "fairing_t1");
    store().setSlot("avionics", "avionics_light");
    expect(store().launch()).toBe(true);
    expect(store().screen).toBe("flight");

    store().backToVab();
    store().setSlot("s1Engine", "none_engine");
    expect(store().launch()).toBe(false);
    expect(store().screen).toBe("vab");
  });

  it("advances to the next tier on success and stays on the same tier on failure when returning to VAB", () => {
    store().createProfile("Armstrong");
    store().finish({
      tier: 1,
      vehicleName: "Ares-I Sounding",
      success: false,
      score: 0,
      timeS: 10,
      maxQ: 2,
      maxG: 1,
      deltaVSpent: 100,
      failure: null,
    });
    expect(store().screen).toBe("result");
    expect(store().unlocked).toBe(1);
    expect(store().tier).toBe(1);

    // Failed mission -> backToVab stays on tier 1
    store().backToVab();
    expect(store().screen).toBe("vab");
    expect(store().tier).toBe(1);

    // Passed mission -> unlocks tier 2; advancing sets tier 2 with empty build and brings to VAB
    store().finish({
      tier: 1,
      vehicleName: "Ares-I Sounding",
      success: true,
      score: 950,
      timeS: 95,
      maxQ: 20,
      maxG: 3,
      deltaVSpent: 2100,
      failure: null,
    });
    expect(store().screen).toBe("result");
    expect(store().unlocked).toBe(2);

    store().setTier(2);
    store().backToVab();
    expect(store().screen).toBe("vab");
    expect(store().tier).toBe(2);
    expect(store().build.s1Engine).toBe("none_engine");
  });
});
