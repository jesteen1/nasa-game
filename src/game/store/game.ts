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
}

const memory: Record<string, string> = {};
const memoryStorage = {
  getItem: (key: string) => memory[key] ?? null,
  setItem: (key: string, value: string) => {
    memory[key] = value;
  },
  removeItem: (key: string) => {
    delete memory[key];
  },
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      screen: "vab",
      tier: 1,
      unlocked: 1,
      build: { ...getVehicle(1).defaults },
      best: {},
      history: [],
      result: null,
      runId: 0,

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
    }),
    {
      name: "orbital-architect-save",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : memoryStorage,
      ),
      partialize: (state) => ({
        unlocked: state.unlocked,
        best: state.best,
        history: state.history,
        tier: state.tier,
        build: state.build,
      }),
    },
  ),
);

export function rehydrateGame() {
  void useGame.persist.rehydrate();
}
