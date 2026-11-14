"use client";

import { getVehicle, MAX_TIER } from "../data/vehicles";
import { useGame } from "../store/game";
import { fmtInt, fmtTime } from "./format";

export default function ResultModal() {
  const result = useGame((s) => s.result);
  const unlocked = useGame((s) => s.unlocked);
  const launch = useGame((s) => s.launch);
  const backToVab = useGame((s) => s.backToVab);
  const setTier = useGame((s) => s.setTier);

  if (!result) return null;

  const success = result.success;
  const nextTier = result.tier + 1;
  const canAdvance = success && nextTier <= MAX_TIER && nextTier <= unlocked;
  const nextVehicle = canAdvance ? getVehicle(nextTier) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,7,15,0.82)] p-4 backdrop-blur-sm">
      <div
        className={`panel w-full max-w-lg overflow-hidden border-t-2 ${
          success ? "border-t-[var(--cyan)]" : "border-t-[var(--red)]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={success ? "Mission success" : "Mission failure"}
      >
        <header
          className={`px-5 py-4 ${
            success
              ? "bg-[radial-gradient(circle_at_top_left,rgba(0,229,255,0.14),transparent_60%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(255,42,85,0.14),transparent_60%)]"
          }`}
        >
          <div
            className={`font-mono text-[9px] uppercase tracking-[0.34em] ${
              success ? "text-[var(--cyan)]" : "text-[var(--red)]"
            }`}
          >
            {success ? "Mission control · success" : "Mission control · failure"}
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            {success ? "Target Achieved" : result.failure?.title ?? "Flight Terminated"}
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            {result.vehicleName} · Tier {result.tier} · {fmtTime(result.timeS)}
          </p>
        </header>

        <div className="px-5 py-4">
          {success ? (
            <p className="text-[12px] leading-relaxed text-[var(--muted)]">
              All flight rules satisfied. The vehicle completed its ascent profile and the payload
              is on target.{" "}
              {nextVehicle
                ? `${nextVehicle.name} is now available in the assembly bay.`
                : "You have completed the available mission set."}
            </p>
          ) : (
            <div className="space-y-2">
              {result.failure ? (
                <>
                  <div className="rounded-md border-l-2 border-[var(--red)] bg-[rgba(255,42,85,0.06)] px-3 py-2">
                    <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--red)]">
                      {result.failure.code} · {result.failure.phase}
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink)]">
                      {result.failure.outcome}
                    </p>
                  </div>
                  <p className="font-mono text-[10px] leading-relaxed text-[var(--muted)]">
                    TELEMETRY: {result.failure.telemetry}
                    <br />
                    CAUSE: {result.failure.cause}
                  </p>
                </>
              ) : (
                <p className="text-[12px] text-[var(--muted)]">The flight ended before target acquisition.</p>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Score", value: fmtInt(result.score) },
              { label: "Δv spent", value: `${fmtInt(result.deltaVSpent)} m/s` },
              { label: "Max Q", value: `${result.maxQ.toFixed(1)} kPa` },
              { label: "Max G", value: `${result.maxG.toFixed(2)} g` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-[var(--line)] bg-[rgba(8,16,30,0.55)] px-2.5 py-2"
              >
                <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {item.label}
                </div>
                <div className="font-mono text-[13px] text-[var(--ink)]">{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-[var(--line)] px-5 py-4 sm:flex-row">
          {success && canAdvance ? (
            <button
              type="button"
              onClick={() => {
                setTier(nextTier);
                launch();
              }}
              className="flex-1 rounded-md bg-[var(--cyan)] px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#001014] transition hover:bg-white"
            >
              Next mission — T{nextTier}
            </button>
          ) : null}
          {!success ? (
            <button
              type="button"
              onClick={backToVab}
              className="flex-1 rounded-md bg-[var(--cyan)] px-3 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#001014] transition hover:bg-white"
            >
              Reconfigure vehicle
            </button>
          ) : null}
          <button
            type="button"
            onClick={launch}
            className="flex-1 rounded-md border border-[var(--line)] px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] transition hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
          >
            Re-fly this build
          </button>
          <button
            type="button"
            onClick={backToVab}
            className="rounded-md border border-[var(--line)] px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--ink)] hover:text-[var(--ink)]"
          >
            VAB
          </button>
        </footer>
      </div>
    </div>
  );
}
