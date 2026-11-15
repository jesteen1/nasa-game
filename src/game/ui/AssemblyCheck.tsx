"use client";

import { useState } from "react";
import { debriefFor } from "../data/hints";
import type { AssemblyRisk, PreflightPrediction } from "../sim/preflight";
import type { BuildConfig, Vehicle, VehicleStats } from "../types";
import { fmtInt } from "./format";

const META: Record<
  AssemblyRisk,
  { label: string; line: string; border: string; text: string; dot: string }
> = {
  none: {
    label: "CLEAR",
    line: "No problems spotted — this build should fly.",
    border: "border-l-[rgba(0,229,255,0.55)]",
    text: "text-[var(--cyan)]",
    dot: "bg-[var(--cyan)]",
  },
  incomplete: {
    label: "INCOMPLETE",
    line: "Fill every required slot and the check will run itself.",
    border: "border-l-[var(--line)]",
    text: "text-[var(--muted)]",
    dot: "bg-[rgba(142,163,191,0.5)]",
  },
  payload: {
    label: "PAYLOAD RISK",
    line: "This stack may not reach orbital velocity — the payload could come back down.",
    border: "border-l-[var(--amber)]",
    text: "text-[var(--amber)]",
    dot: "bg-[var(--amber)]",
  },
  orbit: {
    label: "ORBIT RISK",
    line: "This stack is expected to fall short of the mission target.",
    border: "border-l-[var(--amber)]",
    text: "text-[var(--amber)]",
    dot: "bg-[var(--amber)]",
  },
  pad: {
    label: "PAD RISK",
    line: "Liftoff thrust may not be enough to leave the pad.",
    border: "border-l-[var(--red)]",
    text: "text-[var(--red)]",
    dot: "bg-[var(--red)]",
  },
  control: {
    label: "CONTROL RISK",
    line: "The vehicle may not be able to hold its attitude.",
    border: "border-l-[var(--red)]",
    text: "text-[var(--red)]",
    dot: "bg-[var(--red)]",
  },
  structure: {
    label: "STRUCTURE RISK",
    line: "The airframe may not survive the loads it will meet.",
    border: "border-l-[var(--red)]",
    text: "text-[var(--red)]",
    dot: "bg-[var(--red)]",
  },
  restart: {
    label: "RESTART RISK",
    line: "The upper stage may not relight cleanly after separation.",
    border: "border-l-[var(--red)]",
    text: "text-[var(--red)]",
    dot: "bg-[var(--red)]",
  },
  heat: {
    label: "HEAT RISK",
    line: "The payload may be exposed to aero-thermal heating.",
    border: "border-l-[var(--red)]",
    text: "text-[var(--red)]",
    dot: "bg-[var(--red)]",
  },
};

export default function AssemblyCheck({
  prediction,
  vehicle,
  build,
  stats,
}: {
  prediction: PreflightPrediction;
  vehicle: Vehicle;
  build: BuildConfig;
  stats: VehicleStats;
}) {
  const [revealed, setRevealed] = useState(1);
  const meta = META[prediction.risk];
  const debrief =
    prediction.failureId
      ? debriefFor(prediction.failureId, vehicle, build, stats)
      : null;
  const clues = debrief ? debrief.clues.slice(0, Math.min(revealed, 3)) : [];
  const risky = prediction.risk !== "none" && prediction.risk !== "incomplete";

  return (
    <section
      id="assembly-check"
      className={`panel scroll-mt-4 border-l-2 px-3.5 py-3 ${meta.border}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="panel-title">Assembly check</h2>
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] ${meta.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-[#c9d8ea]">{meta.line}</p>

      {risky && prediction.neededSpeed > 0 ? (
        <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--muted)]">
          <span>Predicted orbital speed</span>
          <span className={meta.text}>
            {fmtInt(prediction.secoSpeed)} / {fmtInt(prediction.neededSpeed)} m/s
          </span>
        </div>
      ) : null}

      {clues.length > 0 ? (
        <div className="mt-2 flex flex-col gap-1 border-t border-[var(--line)] pt-2">
          {clues.map((clue, index) => (
            <p
              key={clue}
              className="font-mono text-[10px] leading-snug text-[var(--muted)]"
            >
              <span className={`mr-1.5 uppercase tracking-[0.1em] ${meta.text}`}>
                Clue {index + 1}/{debrief?.clues.length ?? 3}
              </span>
              {clue}
            </p>
          ))}
          {debrief && revealed < debrief.clues.length ? (
            <button
              type="button"
              onClick={() => setRevealed((value) => Math.min(debrief.clues.length, value + 1))}
              className="mt-0.5 self-start rounded-sm border border-[var(--line)] px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
            >
              Another clue →
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
