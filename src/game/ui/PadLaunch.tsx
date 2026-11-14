"use client";

import type { SimSnapshot } from "../types";
import RocketArt from "./RocketArt";

const SMOKE = [
  { left: 45, size: 110, delay: 0 },
  { left: 51, size: 150, delay: 0.18 },
  { left: 57, size: 118, delay: 0.34 },
  { left: 40, size: 86, delay: 0.5 },
  { left: 62, size: 78, delay: 0.64 },
];

function PadSmoke() {
  return (
    <div className="absolute inset-x-0 bottom-2 h-48">
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
  );
}

/**
 * Countdown / ignition presentation shown over the 3D scene: a full 2D rocket
 * on the pad that lifts off at T-0 and cross-fades into the flight render.
 */
export default function PadLaunch({ snap }: { snap: SimSnapshot | null }) {
  if (!snap) return null;
  const countdown = snap.status === "countdown";
  const launching = snap.status === "flying" && snap.t >= 0 && snap.t < 2.6;
  if (!countdown && !launching) return null;

  const fade = launching ? Math.max(0, 1 - snap.t / 1.5) : 1;
  const seconds = Math.max(0, Math.ceil(-snap.t));

  return (
    <div
      className="pad-launch pointer-events-none absolute inset-0 overflow-hidden"
      style={{ opacity: fade }}
      aria-hidden
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_100%,rgba(0,229,255,0.12),transparent_60%),linear-gradient(180deg,rgba(3,7,15,0.97)_0%,rgba(8,17,31,0.96)_55%,rgba(17,42,70,0.95)_100%)]" />

      <div className="absolute inset-x-0 bottom-[7%] top-[10%]">
        <div className="absolute inset-x-0 bottom-0 h-px bg-[rgba(142,163,191,0.35)]" />
        <div className="absolute bottom-0 left-1/2 h-2.5 w-64 -translate-x-1/2 rounded-sm bg-[#3e5470]" />
        <div className="absolute bottom-2.5 left-1/2 h-2 w-40 -translate-x-1/2 rounded-sm bg-[#28374f]" />
        <div className="absolute bottom-2 left-[calc(50%-120px)] h-40 w-2 bg-[#2a3a50]" />
        <div className="absolute bottom-16 left-[calc(50%-132px)] h-1 w-14 bg-[#2a3a50]" />
        <div className="absolute bottom-28 left-[calc(50%-132px)] h-1 w-14 bg-[#2a3a50]" />
        <div className="absolute right-[calc(50%-132px)] bottom-16 h-1 w-14 bg-[#2a3a50]" />

        {launching ? <PadSmoke /> : null}
        <RocketArt mode={launching ? "launching" : "idle"} />
      </div>

      {countdown ? (
        <div className="absolute inset-x-0 top-[17%] flex flex-col items-center gap-1 text-center sm:top-[15%]">
          <div className="font-mono text-[9px] uppercase tracking-[0.5em] text-[var(--amber)] sm:text-[10px]">
            Terminal count
          </div>
          <div className="font-mono text-6xl font-semibold text-white/95 drop-shadow-[0_0_20px_rgba(255,179,0,0.35)] sm:text-7xl">
            T−{seconds}
          </div>
          <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--muted)] sm:text-[9px]">
            All systems nominal · throttle {Math.round(snap.throttle * 100)}%
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-0 top-[17%] text-center font-mono text-[10px] uppercase tracking-[0.5em] text-[var(--amber)]">
          Liftoff
        </div>
      )}
    </div>
  );
}
