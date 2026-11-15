"use client";

import { useEffect, useSyncExternalStore } from "react";
import { FAILURE_GUIDE, findFailureGuide } from "../data/failureGuide";

/**
 * Server snapshot is always empty so SSR/hydration renders the full list; the
 * client then filters down to the deep-linked failure (if any).
 */
function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getHash() {
  return window.location.hash;
}

function getServerHash() {
  return "";
}

function showAllFailures() {
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  window.dispatchEvent(new Event("hashchange"));
}

export default function FailureList() {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const matched = findFailureGuide(hash);
  const entries = matched ? [matched] : FAILURE_GUIDE;

  useEffect(() => {
    if (!matched) return;
    const card = document.getElementById(matched.id);
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [matched]);

  return (
    <div className="flex flex-col gap-3">
      {matched ? (
        <div className="panel flex flex-col gap-2 border-l-2 border-l-[var(--cyan)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--cyan)]">
              Filtered · this flight
            </div>
            <p className="mt-0.5 text-sm text-[var(--ink)]">
              Showing the fix for{" "}
              <span className="font-semibold text-white">{matched.title}</span>
              <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                {matched.code}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={showAllFailures}
            className="shrink-0 rounded-sm border border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.08)] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.16)]"
          >
            Show all {FAILURE_GUIDE.length} failure modes
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        {entries.map((entry) => (
          <article
            key={entry.id}
            id={entry.id}
            className={`panel scroll-mt-24 p-4 sm:p-5 ${
              matched ? "ring-1 ring-[rgba(0,229,255,0.55)] shadow-[0_0_28px_rgba(0,229,255,0.12)]" : ""
            }`}
            aria-labelledby={`${entry.id}-title`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-sm border border-[rgba(255,42,85,0.45)] bg-[rgba(255,42,85,0.08)] font-mono text-[9px] text-[var(--red)]">
                  {String(FAILURE_GUIDE.indexOf(entry) + 1).padStart(2, "0")}
                </span>
                <span className="rounded-sm border border-[var(--line)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--red)]">
                  {entry.code}
                </span>
                {matched ? (
                  <span className="rounded-sm border border-[rgba(0,229,255,0.4)] bg-[rgba(0,229,255,0.08)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--cyan)]">
                    your last failure
                  </span>
                ) : null}
              </div>
              <span className="text-right font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
                {entry.phase}
              </span>
            </div>

            <h2
              id={`${entry.id}-title`}
              className="mt-2 text-base font-semibold tracking-tight text-white"
            >
              {entry.title}
            </h2>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--amber)]">
              {entry.short}
            </p>

            <div className="mt-3 border-t border-[var(--line)] pt-2.5">
              <h3 className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--muted)]">
                Why it happens
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-[#c9d8ea]">{entry.why}</p>
            </div>

            <div className="mt-3">
              <h3 className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--cyan)]">
                What to change
              </h3>
              <ul className="mt-1.5 space-y-1.5">
                {entry.fixes.map((fix) => (
                  <li key={fix} className="flex gap-2 text-[11px] leading-snug text-[#c9d8ea]">
                    <span aria-hidden className="mt-[2px] text-[var(--cyan)]">
                      ▸
                    </span>
                    <span>{fix}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-3 border-t border-[var(--line)] pt-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">
              Telemetry · {entry.telemetry}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
