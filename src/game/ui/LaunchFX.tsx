"use client";

import type { SimSnapshot } from "../types";

const STREAKS = Array.from({ length: 16 }, (_, i) => ({
  left: 6 + ((i * 37) % 88),
  height: 34 + ((i * 53) % 96),
  duration: 0.55 + ((i * 17) % 45) / 100,
  delay: ((i * 29) % 90) / 100,
}));

const SMOKE = Array.from({ length: 7 }, (_, i) => ({
  left: 18 + i * 11,
  size: 96 + ((i * 41) % 72),
  delay: (i * 0.17) % 1.2,
  duration: 2.4 + ((i * 13) % 60) / 100,
}));

/**
 * Centered launch animation overlay: countdown rings, ignition flash,
 * liftoff banner, exhaust smoke and ascent speed streaks.
 * Purely decorative; never intercepts input.
 */
export default function LaunchFX({ snap }: { snap: SimSnapshot | null }) {
  if (!snap) return null;

  const countdown = snap.status === "countdown";
  const liftoff = snap.status === "flying" && snap.t >= 0 && snap.t <= 5;
  const ascent = snap.status === "flying" && snap.h > 120 && snap.h < 80_000;
  const failed = snap.status === "failure";

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      data-testid="launch-fx"
    >
      {(countdown || liftoff) && (
        <>
          <span className={`fx-ring ${liftoff ? "fx-ring--fast" : ""}`} />
          <span className={`fx-ring fx-ring--delay ${liftoff ? "fx-ring--fast" : ""}`} />
          <span className={`fx-ring fx-ring--delay2 ${liftoff ? "fx-ring--fast" : ""}`} />
        </>
      )}

      {liftoff && (
        <div className="fx-flash absolute inset-0 bg-[radial-gradient(circle_at_50%_58%,rgba(255,255,255,0.85),rgba(255,179,0,0.5)_26%,rgba(255,92,51,0.18)_48%,transparent_68%)]" />
      )}

      {ascent && (
        <div className="absolute inset-y-0 left-1/2 w-[320px] -translate-x-1/2 sm:w-[520px]">
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
      )}

      {liftoff && (
        <div className="absolute inset-x-0 bottom-0 h-72">
          {SMOKE.map((puff, index) => (
            <span
              key={index}
              className="fx-smoke"
              style={{
                left: `${puff.left}%`,
                width: `${puff.size}px`,
                height: `${puff.size}px`,
                animationDelay: `${puff.delay}s`,
                animationDuration: `${puff.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      {failed && (
        <div className="fx-failure absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,rgba(255,42,85,0.55),rgba(120,10,30,0.25)_35%,transparent_70%)]" />
      )}
    </div>
  );
}
