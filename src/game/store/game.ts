"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getVehicle, MAX_TIER } from "../data/vehicles";
import type { BuildConfig, MissionResult, SlotId } from "../types";

type Screen = "vab" | "flight" | "result";

interface HistoryEntry {
  tier: number;
  success: boolean;
  score: number;
  at: number;
}

interface GameState {
  screen: Screen;
  tier: number;
  unlocked: number;
  playerName: string;
  profiles: string[];
  activeProfile: string | null;
  bootstrapped: boolean;
  build: BuildConfig;
  best: Record<string, number>;
  history: HistoryEntry[];
  result: MissionResult | null;
  runId: number;
  setTier: (tier: number) => void;
  setSlot: (slot: SlotId, partId: string) => void;
  resetBuild: () => void;
  launch: () => void;
  finish: (result: MissionResult) => void;
  backToVab: () => void;
  bootstrap: () => void;
  createProfile: (name: string) => boolean;
  selectProfile: (name: string | null) => void;
  deleteProfile: (name: string) => void;
}

const INDEX_KEY = "orbital-architect-profiles";
const ACTIVE_KEY = "orbital-architect-active";
const LEGACY_KEY = "orbital-architect-save"; // pre-profile single save
const USER_PREFIX = "orbital-architect-save:";

const browser = () => typeof window !== "undefined" && !!window.localStorage;

export function profileKey(name: string) {
  return USER_PREFIX + name.toLocaleLowerCase();
}

export function normalizeName(raw: string) {
  return raw.trim().replace(/\s+/g, " ").slice(0, 24);
}


function readIndex(): string[] {
  if (!browser()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((name): name is string => typeof name === "string" && name.length > 0)
      : [];
  } catch {
    return [];
  }
}

function writeIndex(names: string[]) {
  if (browser()) window.localStorage.setItem(INDEX_KEY, JSON.stringify(names));
}

function readActive(): string | null {
  if (!browser()) return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

function writeActive(name: string | null) {
  if (!browser()) return;
  if (name) window.localStorage.setItem(ACTIVE_KEY, name);
  else window.localStorage.removeItem(ACTIVE_KEY);
}

function findProfile(name: string, list: string[]) {
  const needle = name.toLocaleLowerCase();
  return list.find((entry) => entry.toLocaleLowerCase() === needle) ?? null;
}

/** Moves the pre-profile save (if any) into a named profile. */
export function migrateLegacySave() {
  if (!browser()) return;
  const legacy = window.localStorage.getItem(LEGACY_KEY);
  if (!legacy) return;

  const list = readIndex();
  let name = "Commander";
  try {
    const parsed = JSON.parse(legacy) as { state?: { playerName?: unknown } };
    const saved = parsed?.state?.playerName;
    if (typeof saved === "string" && normalizeName(saved)) name = normalizeName(saved);
  } catch {
    // keep the fallback name
  }

  if (!findProfile(name, list)) {
    list.push(name);
    writeIndex(list);
  }
  if (!window.localStorage.getItem(profileKey(name))) {
    window.localStorage.setItem(profileKey(name), legacy);
  }
  window.localStorage.removeItem(LEGACY_KEY);
  if (!readActive()) writeActive(name);
}

/** Save slot used by zustand persist. Follows the currently selected profile. */
let activeProfile: string | null = null;

const profileStorage = createJSONStorage(() => ({
  getItem: () => (browser() && activeProfile
    ? window.localStorage.getItem(profileKey(activeProfile))
    : null),
  setItem: (_key: string, value: string) => {
    if (browser() && activeProfile) {
      window.localStorage.setItem(profileKey(activeProfile), value);
    }
  },
  removeItem: () => {
    if (browser() && activeProfile) {
      window.localStorage.removeItem(profileKey(activeProfile));
    }
  },
}));

function freshState() {
  return {
    screen: "vab" as Screen,
    tier: 1,
    unlocked: 1,
    playerName: "",
    build: { ...getVehicle(1).defaults },
    best: {} as Record<string, number>,
    history: [] as HistoryEntry[],
    result: null,
    runId: 0,
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      ...freshState(),
      profiles: [],
      activeProfile: null,
      bootstrapped: false,

      setTier: (tier) => {
        if (tier < 1 || tier > get().unlocked) return;
        set({ tier, build: { ...getVehicle(tier).defaults }, result: null });
      },

      setSlot: (slot, partId) =>
        set((state) => ({ build: { ...state.build, [slot]: partId } })),

      resetBuild: () => set({ build: { ...getVehicle(get().tier).defaults } }),

      launch: () =>
        set((state) => ({ screen: "flight", result: null, runId: state.runId + 1 })),

      finish: (result) =>
        set((state) => ({
          screen: "result",
          result,
          unlocked: result.success
            ? Math.max(state.unlocked, Math.min(MAX_TIER, result.tier + 1))
            : state.unlocked,
          best: {
            ...state.best,
            [result.tier]: Math.max(state.best[result.tier] ?? 0, result.score),
          },
          history: [
            ...state.history,
            { tier: result.tier, success: result.success, score: result.score, at: Date.now() },
          ].slice(-20),
        })),

      backToVab: () => set({ screen: "vab", result: null }),

      bootstrap: () => {
        migrateLegacySave();
        const names = readIndex();
        const diskActive = readActive();
        const active = diskActive ? findProfile(diskActive, names) : null;

        // Clear the module pointer while we reset state so the defaults are never
        // written over the selected profile's save.
        activeProfile = null;
        if (!active) {
          set({
            ...freshState(),
            profiles: names,
            activeProfile: null,
            bootstrapped: true,
          });
          writeActive(null);
          return;
        }

        set({
          ...freshState(),
          profiles: names,
          activeProfile: active,
          playerName: active,
          bootstrapped: true,
        });
        activeProfile = active;
        writeActive(active);
        void useGame.persist.rehydrate();
      },

      createProfile: (raw) => {
        const name = normalizeName(raw);
        if (!name || !browser()) return false;
        const names = readIndex();
        if (findProfile(name, names)) return false;

        const next = [...names, name];
        writeIndex(next);

        activeProfile = null;
        set({
          ...freshState(),
          profiles: next,
          activeProfile: name,
          playerName: name,
          bootstrapped: true,
        });
        activeProfile = name;
        writeActive(name);
        void useGame.persist.rehydrate();
        return true;
      },

      selectProfile: (name) => {
        if (!name) {
          activeProfile = null;
          writeActive(null);
          set({ activeProfile: null, playerName: "" });
          return;
        }
        const names = readIndex();
        const match = findProfile(name, names);
        if (!match) return;

        activeProfile = null;
        set({
          ...freshState(),
          profiles: names,
          activeProfile: match,
          playerName: match,
          bootstrapped: true,
        });
        activeProfile = match;
        writeActive(match);
        void useGame.persist.rehydrate();
      },

      deleteProfile: (name) => {
        if (!browser()) return;
        const names = readIndex();
        const match = findProfile(name, names);
        if (!match) return;

        const next = names.filter((entry) => entry !== match);
        writeIndex(next);
        window.localStorage.removeItem(profileKey(match));

        const isActive = activeProfile
          ? activeProfile.toLocaleLowerCase() === match.toLocaleLowerCase()
          : false;
        if (isActive) {
          activeProfile = null;
          writeActive(null);
          set({
            ...freshState(),
            profiles: next,
            activeProfile: null,
            bootstrapped: true,
          });
        } else {
          set({ profiles: next });
        }
      },
    }),
    {
      name: "orbital-architect-save",
      version: 1,
      skipHydration: true,
      storage: profileStorage,
      partialize: (state) => ({
        unlocked: state.unlocked,
        best: state.best,
        history: state.history,
        tier: state.tier,
        build: state.build,
        playerName: state.playerName,
      }),
    },
  ),
);
