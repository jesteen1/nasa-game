"use client";

import type { SimSnapshot } from "../types";
import {
  cinematicActive,
  cinematicCallout,
  cinematicOpacity,
} from "../sim/launchTimeline";

const SMOKE = [
  { left: 42, size: 120, delay: 0 },
  { left: 50, size: 160, delay: 0.16 },
  { left: 58, size: 128, delay: 0.32 },
  { left: 36, size: 92, delay: 0.46 },
  { left: 64, size: 84, delay: 0.58 },
];

const STREAKS = Array.from({ length: 16 }, (_, i) => ({
  left: 6 + ((i * 37) % 88),
  height: 40 + ((i * 53) % 96),
  duration: 0.5 + ((i * 17) % 40) / 100,
  delay: ((i * 29) % 80) / 100,
}));

/**
 * T−0 launch cinematic, played over live flight on every launch.
 * Uses the default mission-control palette and existing FX keyframes.
 */
export default function LaunchCinematic({ snap }: { snap: SimSnapshot | null }) {
  if (!snap || snap.status !== "flying" || !cinematicActive(snap.t)) return null;

  const t = snap.t;
  const altitudeKm = Math.max(0, snap.h) / 1000;
  const velocityKms = Math.max(0, snap.speed) / 1000;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: cinematicOpacity(t) }}
      aria-hidden
      data-testid="launch-cinematic"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_38%,rgba(3,7,15,0.62)_100%)]" />

      {t < 0.9 ? (
        <div className="fx-flash absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(255,255,255,0.9),rgba(255,179,0,0.55)_26%,rgba(255,92,51,0.18)_48%,transparent_68%)]" />
      ) : null}

      {t < 3.2 ? (
        <div className="absolute inset-x-0 bottom-0 h-64">
          {SMOKE.map((puff, index) => (
            <span
              key={index}
              className="fx-smoke"
              style={{
                left: `${puff.left}%`,
                width: `${puff.size}px`,
                height: `${puff.size}px`,
                animationDelay: `${puff.delay}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      {t > 0.6 ? (
        <div className="absolute inset-y-0 left-1/2 w-[340px] -translate-x-1/2 sm:w-[560px]">
          {STREAKS.map((streak, index) => (
            <span
              key={index}
              className="fx-streak"
              style={{
                left: `${streak.left}%`,
                height: `${streak.height}px`,
                animationDuration: `${streak.duration}s`,
                animationDelay: `${streak.delay}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="absolute inset-x-0 top-[21%] flex flex-col items-center gap-1.5 text-center">
        <div className="rounded-sm border border-[rgba(0,229,255,0.4)] bg-[rgba(4,9,18,0.62)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.42em] text-[var(--cyan)] shadow-[0_0_18px_rgba(0,229,255,0.12)]">
          {cinematicCallout(t)}
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
          ALT {altitudeKm.toFixed(1)} KM · VEL {velocityKms.toFixed(2)} KM/S
        </div>
      </div>
    </div>
  );
}
