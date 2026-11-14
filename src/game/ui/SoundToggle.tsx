"use client";

import { useEffect } from "react";
import { sfx } from "../audio/sfx";
import { useGame } from "../store/game";

export default function SoundToggle({ className = "" }: { className?: string }) {
  const soundOn = useGame((s) => s.soundOn);
  const toggleSound = useGame((s) => s.toggleSound);

  useEffect(() => {
    sfx.setMuted(!soundOn);
  }, [soundOn]);

  return (
    <button
      type="button"
      onClick={() => {
        const next = !soundOn;
        sfx.unlock();
        sfx.setMuted(!next);
        if (next) sfx.playCue("click");
        toggleSound();
      }}
      aria-pressed={soundOn}
      title={soundOn ? "Mute sound effects" : "Enable sound effects"}
      className={`flex items-center gap-1.5 rounded-sm border border-[var(--line)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)] ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        {soundOn ? (
          <>
            <path d="M16 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
          </>
        ) : (
          <>
            <path d="M16.5 9l5 6" />
            <path d="M21.5 9l-5 6" />
          </>
        )}
      </svg>
      <span className="hidden sm:inline">{soundOn ? "SFX on" : "SFX off"}</span>
    </button>
  );
}
