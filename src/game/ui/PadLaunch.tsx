"use client";

import type { SimSnapshot } from "../types";
import RocketArt from "./RocketArt";

/**
 * Terminal-count presentation shown over the 3D scene. The T−0 cinematic
 * (LaunchCinematic) takes over as soon as the vehicle lifts off.
 */
export default function PadLaunch({ snap }: { snap: SimSnapshot | null }) {
  if (!snap || snap.status !== "countdown") return null;

  const seconds = Math.max(0, Math.ceil(-snap.t));

  return (
    <div
      className="pad-launch pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <div className="sr-only">
        <RocketArt mode="idle" />
      </div>

      <div className="absolute left-1/2 top-[12%] -translate-x-1/2 rounded-xl border border-[rgba(0,229,255,0.35)] bg-[rgba(5,11,21,0.78)] px-5 py-2.5 text-center shadow-2xl backdrop-blur-md">
        <div className="font-mono text-[9px] uppercase tracking-[0.45em] text-[var(--amber)] sm:text-[10px]">
          Terminal count
        </div>
        <div className="font-mono text-4xl font-semibold text-white/95 drop-shadow-[0_0_20px_rgba(255,179,0,0.35)] sm:text-5xl">
          T−{seconds}
        </div>
        <div className="font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--muted)] sm:text-[9px]">
          All systems nominal · throttle {Math.round(snap.throttle * 100)}%
        </div>
      </div>
    </div>
  );
}
