"use client";

import { useMemo, useState } from "react";
import { debriefFor } from "../data/hints";
import { computeStats } from "../sim/vehicle";
import type { BuildConfig, FailureEvent, Vehicle } from "../types";

export default function FlightDebrief({
  failure,
  vehicle,
  build,
}: {
  failure: FailureEvent;
  vehicle: Vehicle;
  build: BuildConfig;
}) {
  const stats = useMemo(() => computeStats(vehicle, build), [vehicle, build]);
  const debrief = useMemo(
    () => debriefFor(failure.id, vehicle, build, stats),
    [failure.id, vehicle, build, stats],
  );
  const [revealed, setRevealed] = useState(1);
  const clues = debrief.clues.slice(0, Math.min(revealed, debrief.clues.length));

  return (
    <div className="mt-3 rounded-md border border-[var(--line)] bg-[rgba(8,16,30,0.55)] px-3 py-2.5">
      <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--amber)]">
        Flight debrief
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-[#c9d8ea]">{debrief.why}</p>

      <div className="mt-2 flex flex-col gap-1">
        {clues.map((clue, index) => (
          <p key={clue} className="font-mono text-[10px] leading-snug text-[var(--muted)]">
            <span className="mr-1.5 uppercase tracking-[0.1em] text-[var(--cyan)]">
              Clue {index + 1}/{debrief.clues.length}
            </span>
            {clue}
          </p>
        ))}
      </div>

      {revealed < debrief.clues.length ? (
        <button
          type="button"
          onClick={() => setRevealed((value) => Math.min(debrief.clues.length, value + 1))}
          className="mt-2 rounded-sm border border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.05)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.12)]"
        >
          Another clue →
        </button>
      ) : (
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
          Full fix guide below
        </p>
      )}
    </div>
  );
}
