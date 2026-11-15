"use client";

import { useState } from "react";
import { sfx } from "../audio/sfx";
import { SLOT_LABEL } from "../data/parts";
import { RISK_LABEL, type PreflightPrediction } from "../sim/preflight";
import { missingSlots } from "../sim/validate";
import { useGame } from "../store/game";
import type { BuildConfig, Vehicle, VehicleStats } from "../types";

/**
 * The single launch control for every breakpoint. It lives in its own VAB grid
 * row, so it can never be clipped by a scrolling panel or covered by content.
 */
export default function LaunchDock({
  vehicle,
  build,
  prediction,
  stats,
}: {
  vehicle: Vehicle;
  build: BuildConfig;
  prediction: PreflightPrediction;
  stats: VehicleStats;
}) {
  const launch = useGame((s) => s.launch);
  const [confirming, setConfirming] = useState(false);

  const missing = missingSlots(vehicle, build);
  const complete = missing.length === 0;
  const risky = prediction.risk !== "none" && prediction.risk !== "incomplete";

  const onLaunch = () => {
    sfx.unlock();
    if (!complete) {
      sfx.playCue("warning");
      return;
    }
    if (!confirming) {
      sfx.playCue("click");
      setConfirming(true);
      window.setTimeout(() => setConfirming(false), 5000);
      return;
    }
    setConfirming(false);
    launch();
  };

  const status = !complete
    ? `${missing.length} required slot${missing.length === 1 ? "" : "s"} empty`
    : risky
      ? RISK_LABEL[prediction.risk]
      : "Ready for launch";

  return (
    <section
      aria-label="Launch control"
      className="panel flex min-w-0 items-center gap-2.5 px-3 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[8px] uppercase tracking-[0.14em]">
          <span
            className={
              !complete || risky
                ? "text-[var(--amber)]"
                : "text-[var(--cyan)]"
            }
          >
            {status}
          </span>
          <span className="hidden text-[var(--muted)] sm:inline">·</span>
          <span className="hidden truncate text-[var(--muted)] sm:inline">
            {vehicle.name}
          </span>
        </div>
        <div className="mt-0.5 hidden truncate font-mono text-[9px] text-[var(--muted)] sm:block">
          TWR {stats.twr.toFixed(2)} · Δv {(stats.deltaV / 1000).toFixed(2)} km/s ·{" "}
          {stats.heightM.toFixed(1)} m
        </div>
        <div className="mt-0.5 truncate font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)] sm:hidden">
          {vehicle.name} · TWR {stats.twr.toFixed(2)}
        </div>
      </div>

      {risky ? (
        <button
          type="button"
          onClick={() =>
            document
              .getElementById("assembly-check")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="shrink-0 rounded-sm border border-[rgba(255,179,0,0.4)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--amber)] transition hover:bg-[rgba(255,179,0,0.1)]"
        >
          Clue
        </button>
      ) : !complete ? (
        <p className="hidden min-w-0 max-w-[38%] truncate font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)] lg:block">
          {missing.map((slot) => SLOT_LABEL[slot]).join(" · ")}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onLaunch}
        title={
          complete
            ? risky
              ? "Assembly check flagged a risk — review the clue before launch"
              : "Commit this vehicle to flight"
            : `Install hardware in: ${missing.map((slot) => SLOT_LABEL[slot]).join(", ")}`
        }
        className={`shrink-0 rounded-md px-3.5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] transition ${
          !complete
            ? "border border-[rgba(255,179,0,0.35)] bg-[rgba(255,179,0,0.08)] text-[var(--amber)]"
            : confirming
              ? "bg-[var(--amber)] text-[#1a1200] shadow-[0_0_24px_rgba(255,179,0,0.35)]"
              : risky
                ? "border border-[var(--amber)] bg-[rgba(255,179,0,0.14)] text-[var(--amber)] shadow-[0_0_18px_rgba(255,179,0,0.2)] hover:bg-[rgba(255,179,0,0.22)]"
                : "bg-[var(--cyan)] text-[#001014] shadow-[0_0_24px_rgba(0,229,255,0.28)] hover:bg-white"
        }`}
      >
        {!complete
          ? "Incomplete"
          : confirming
            ? "Confirm launch"
            : risky
              ? "Launch anyway"
              : "Initiate launch"}
      </button>
    </section>
  );
}
