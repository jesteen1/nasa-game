import type { Metadata } from "next";
import Link from "next/link";
import { FAILURE_GUIDE } from "@/src/game/data/failureGuide";
import BrandMark from "@/src/game/ui/BrandMark";
import FailureList from "@/src/game/ui/FailureList";

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
          <BrandMark className="h-8 w-8 shrink-0" />
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

        <FailureList />

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
