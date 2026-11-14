import type { Metadata } from "next";
import Link from "next/link";
import { FAILURE_GUIDE } from "@/src/game/data/failureGuide";

export const metadata: Metadata = {
  title: "Failure Guide — Rocket Simulator",
  description:
    "Every failure mode in Rocket Simulator: why it happens, which rule fires, and the build or flight changes that prevent it.",
};

export default function FailuresPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--navy)] text-[var(--ink)]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[var(--line)] bg-[rgba(5,10,20,0.92)] px-3 py-2.5 backdrop-blur sm:px-5">
        <Link href="/" className="flex items-center gap-2" aria-label="Rocket Simulator home">
          <span className="grid h-8 w-8 place-items-center rounded-sm border border-[var(--cyan)] bg-[rgba(0,229,255,0.08)] font-mono text-[11px] text-[var(--cyan)]">
            RS
          </span>
          <span className="leading-none">
            <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.24em]">
              Rocket Simulator
            </span>
            <span className="mt-0.5 block font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Failure &amp; fix guide
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-2" aria-label="Guide navigation">
          <Link
            href="/"
            className="rounded-sm border border-[var(--line)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
          >
            Briefing
          </Link>
          <Link
            href="/about"
            className="rounded-sm border border-[var(--line)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
          >
            About
          </Link>
          <Link
            href="/game"
            className="rounded-sm border border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.08)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.16)]"
          >
            Launch console
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-5 sm:px-5 lg:py-8">
        <section className="panel relative overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,42,85,0.14),transparent_65%)]" />
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--red)]">
            Error library · deterministic rules
          </div>
          <h1 className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-white sm:text-4xl">
            Why missions fail — and what to change
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#c9d8ea]">
            Every failure in Rocket Simulator comes from a concrete rule in the physics engine,
            not a random roll. This page lists each error code, the phase it fires in, the reason
            the vehicle is destroyed, and the build or flight changes that prevent it. Incomplete
            vehicles never reach the pad — if a required slot is empty, launch stays locked.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <span className="rounded-sm border border-[var(--line)] bg-black/20 px-2 py-1">
              {FAILURE_GUIDE.length} failure modes
            </span>
            <span className="rounded-sm border border-[var(--line)] bg-black/20 px-2 py-1">
              TWR / Δv / Max Q / staging
            </span>
            <span className="rounded-sm border border-[var(--line)] bg-black/20 px-2 py-1">
              Analysis panel = preflight check
            </span>
          </div>
        </section>

        <div className="grid gap-3 lg:grid-cols-2">
          {FAILURE_GUIDE.map((entry, index) => (
            <article
              key={entry.id}
              id={entry.id}
              className="panel scroll-mt-24 p-4 sm:p-5"
              aria-labelledby={`${entry.id}-title`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-sm border border-[rgba(255,42,85,0.45)] bg-[rgba(255,42,85,0.08)] font-mono text-[9px] text-[var(--red)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="rounded-sm border border-[var(--line)] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--red)]">
                    {entry.code}
                  </span>
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

        <section className="panel flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--cyan)]">
              Still failing a mission?
            </div>
            <p className="mt-1 text-sm text-[#c9d8ea]">
              Run the analysis panel before launch: green means nominal, amber is marginal and red
              will fail. Most errors above are visible there before you press launch.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/"
              className="rounded-sm border border-[var(--line)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
            >
              Back to briefing
            </Link>
            <Link
              href="/game"
              className="rounded-sm border border-[rgba(0,229,255,0.55)] bg-[rgba(0,229,255,0.1)] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.18)]"
            >
              Open launch console
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] px-4 py-2 text-center font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Rocket Simulator · failure guide · deterministic 60 Hz physics
      </footer>
    </div>
  );
}
