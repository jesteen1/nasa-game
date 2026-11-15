"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { getVehicle, VEHICLES } from "../data/vehicles";
import LaunchScene from "../render/LaunchScene";
import { predictMission } from "../sim/preflight";
import { computeStats } from "../sim/vehicle";
import type { SimEngine } from "../sim/engine";
import { useGame } from "../store/game";
import FlightScreen from "./FlightScreen";
import LaunchDock from "./LaunchDock";
import ResultModal from "./ResultModal";
import SoundToggle from "./SoundToggle";
import TelemetryPanel from "./TelemetryPanel";
import VabPanel from "./VabPanel";
import { fmtScore } from "./format";

function TierTabs() {
  const tier = useGame((s) => s.tier);
  const unlocked = useGame((s) => s.unlocked);
  const best = useGame((s) => s.best);
  const setTier = useGame((s) => s.setTier);

  return (
    <nav className="flex min-w-0 items-center gap-1 overflow-x-auto" aria-label="Mission tiers">
      {VEHICLES.map((vehicle) => {
        const locked = vehicle.tier > unlocked;
        const active = vehicle.tier === tier;
        return (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => setTier(vehicle.tier)}
            disabled={locked}
            title={locked ? "Complete the previous mission to unlock" : vehicle.name}
            className={`group flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1.5 transition sm:px-2.5 ${
              active
                ? "border-[var(--cyan)] bg-[rgba(0,229,255,0.08)]"
                : locked
                  ? "cursor-not-allowed border-[var(--line)] opacity-40"
                  : "border-[var(--line)] hover:border-[rgba(0,229,255,0.45)]"
            }`}
          >
            <span
              className={`font-mono text-[9px] uppercase tracking-[0.12em] ${
                active ? "text-[var(--cyan)]" : "text-[var(--muted)]"
              }`}
            >
              T{vehicle.tier}
            </span>
            <span className="hidden max-w-[104px] truncate text-[11px] text-[var(--ink)] md:block">
              {vehicle.name}
            </span>
            {locked ? (
              <span className="text-[9px] text-[var(--muted)]" aria-label="locked">
                ▣
              </span>
            ) : best[vehicle.tier] ? (
              <span className="hidden font-mono text-[8px] text-[var(--amber)] lg:block">
                {fmtScore(best[vehicle.tier])}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

function VabScreen({ previewRef }: { previewRef: MutableRefObject<SimEngine | null> }) {
  const tier = useGame((s) => s.tier);
  const build = useGame((s) => s.build);
  const vehicle = getVehicle(tier);
  const stats = useMemo(() => computeStats(vehicle, build), [vehicle, build]);
  const prediction = useMemo(() => predictMission(vehicle, build), [vehicle, build]);
  const [showBrief, setShowBrief] = useState(false);

  return (
    <section className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2.5 p-2.5">
      <div className="min-h-0 min-w-0 flex-col gap-2.5 overflow-y-auto md:grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-1">
        <section className="panel relative h-[380px] min-h-[380px] shrink-0 overflow-hidden sm:h-[400px] sm:min-h-[400px] md:col-start-1 md:row-span-2 md:h-full md:min-h-0 lg:col-start-1 lg:row-span-1 lg:min-h-[420px]">
          <LaunchScene engineRef={previewRef} vehicle={vehicle} build={build} />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 bg-gradient-to-b from-[rgba(3,7,15,0.92)] via-[rgba(3,7,15,0.55)] to-transparent p-2 pb-6 md:p-3 md:pb-8">
            <div className="min-w-0">
              <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--cyan)]">
                Rocket Simulator
              </div>
              <h1 className="mt-0.5 truncate text-base font-semibold tracking-tight text-white drop-shadow md:text-lg">
                {vehicle.name}
              </h1>
              <p className="truncate font-mono text-[8px] uppercase tracking-[0.16em] text-[#c9d8ea] md:text-[9px]">
                Tier {vehicle.tier} · {vehicle.subtitle}
              </p>
            </div>
            <span className="hidden shrink-0 rounded-sm border border-white/15 bg-black/25 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-white/70 sm:inline">
              VAB bay 01
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-2 bg-gradient-to-t from-[rgba(3,7,15,0.92)] via-[rgba(3,7,15,0.5)] to-transparent p-2 pt-8 md:p-3 md:pt-10">
            <div className="min-w-0 font-mono text-[8px] leading-relaxed text-[#c9d8ea] md:text-[9px]">
              <div className="truncate">
                STACK {stats.heightM.toFixed(1)} m · MASS {(stats.totalWetKg / 1000).toFixed(1)} t
              </div>
              <div className="truncate">
                TWR {stats.twr.toFixed(2)} · Δv {(stats.deltaV / 1000).toFixed(2)} km/s
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowBrief((value) => !value)}
              className="pointer-events-auto shrink-0 rounded border border-white/20 bg-black/40 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-white/80 transition hover:border-[var(--cyan)] hover:text-[var(--cyan)]"
            >
              {showBrief ? "Close brief" : "Mission brief"}
            </button>
          </div>
          {showBrief ? (
            <div className="absolute inset-x-2 top-12 z-10 max-h-[calc(100%-5.5rem)] overflow-y-auto rounded-md border border-[var(--line)] bg-[rgba(7,12,24,0.96)] p-3 shadow-2xl md:inset-x-3 md:top-16">
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--cyan)]">
                Mission brief · Tier {vehicle.tier}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--ink)]">{vehicle.description}</p>
              <ul className="mt-2 space-y-1 font-mono text-[9px] leading-relaxed text-[var(--muted)]">
                <li>
                  TARGET ·{" "}
                  {vehicle.target.kind === "suborbital"
                    ? `reach ${vehicle.target.altitudeKm} km altitude`
                    : `reach ${(vehicle.target.velocity / 1000).toFixed(2)} km/s orbital velocity`}
                </li>
                <li>PAYLOAD · {vehicle.payloadName} ({vehicle.payloadKg.toLocaleString()} kg)</li>
                <li>INSPIRATION · {vehicle.inspiration}</li>
                <li>KEYS · SPACE stage · F fairing · D deploy · X abort</li>
              </ul>
            </div>
          ) : null}
        </section>

        <div className="min-h-0 min-w-0 md:col-start-2 md:row-start-1 md:overflow-hidden lg:col-start-2 lg:row-start-1">
          <VabPanel vehicle={vehicle} />
        </div>

        <div className="min-h-0 min-w-0 md:col-start-2 md:row-start-2 md:overflow-y-auto lg:col-start-3 lg:row-start-1 lg:pr-1">
          <TelemetryPanel vehicle={vehicle} stats={stats} build={build} prediction={prediction} />
        </div>
      </div>

      <LaunchDock vehicle={vehicle} build={build} prediction={prediction} stats={stats} />
    </section>
  );
}

export default function   GameShell() {
  const screen = useGame((s) => s.screen);
  const tier = useGame((s) => s.tier);
  const unlocked = useGame((s) => s.unlocked);
  const playerName = useGame((s) => s.playerName);
  const activeProfile = useGame((s) => s.activeProfile);
  const bootstrapped = useGame((s) => s.bootstrapped);
  const bootstrap = useGame((s) => s.bootstrap);
  const runId = useGame((s) => s.runId);
  const router = useRouter();
  const previewRef = useRef<SimEngine | null>(null);
  const vehicle = getVehicle(tier);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (bootstrapped && !activeProfile) router.replace("/");
  }, [bootstrapped, activeProfile, router]);

  if (!bootstrapped) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--navy)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
          Loading mission control…
        </p>
      </div>
    );
  }

  if (!activeProfile) return null;

  return (
    <div className="grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-[var(--navy)] text-[var(--ink)]">
      <header className="flex min-w-0 flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[rgba(5,10,20,0.85)] px-2.5 py-2 backdrop-blur sm:flex-nowrap sm:gap-4 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-sm border border-[var(--cyan)] bg-[rgba(0,229,255,0.08)] font-mono text-[11px] text-[var(--cyan)]">
            RS
          </div>
          <div className="leading-none">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--ink)]">
              Rocket Simulator
            </div>
            <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Mission control · Tier {tier}
            </div>
          </div>
        </div>

        <div className="ml-auto order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1 sm:justify-center">
          <div className="flex justify-start sm:justify-center">
            <TierTabs />
          </div>
        </div>

        <div className="ml-auto order-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] sm:order-none sm:ml-0 sm:gap-3">
          <Link
            href="/"
            title="Mission briefing — change callsign"
            className="flex items-center gap-1.5 rounded-sm border border-[var(--line)] px-2 py-1 transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)]"
          >
            <span className="text-[8px] tracking-[0.16em] text-[var(--muted)]">Cmdr</span>
            <span className="max-w-[92px] truncate text-[var(--ink)]">
              {playerName || "Guest"}
            </span>
          </Link>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--cyan)] shadow-[0_0_6px_var(--cyan)]" />
            Save local
          </span>
          <SoundToggle />
          <span className="hidden lg:inline">Unlocked {unlocked}/5</span>
        </div>
      </header>

      {screen === "vab" ? (
        <VabScreen previewRef={previewRef} />
      ) : (
        <main className="flex min-h-0 flex-col overflow-hidden">
          <FlightScreen key={runId} vehicle={vehicle} />
        </main>
      )}

      <footer className="hidden shrink-0 items-center justify-between border-t border-[var(--line)] px-4 py-1.5 font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)] sm:flex">
        <span>
          Sim 60 Hz fixed step · deterministic rules engine ·{" "}
          <Link href="/failures" className="underline decoration-dotted hover:text-[var(--cyan)]">
            failure guide
          </Link>
          {" · "}
          <Link href="/about" className="underline decoration-dotted hover:text-[var(--cyan)]">
            about
          </Link>
        </span>
        <span>
          {screen === "vab"
            ? "Assemble · analyse · launch"
            : "SPACE stage · F fairing · D deploy · X abort"}
        </span>
      </footer>

      {screen === "result" ? <ResultModal /> : null}
    </div>
  );
}
