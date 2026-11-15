"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { sfx } from "@/src/game/audio/sfx";
import { FAILURE_GUIDE } from "@/src/game/data/failureGuide";
import { useGame } from "@/src/game/store/game";
import BrandMark from "@/src/game/ui/BrandMark";
import RocketArt from "@/src/game/ui/RocketArt";
import SoundToggle from "@/src/game/ui/SoundToggle";

const SLOTS = [
  ["S1 engine", "liftoff thrust and sea-level vs vacuum Isp"],
  ["S1 tank", "propellant type, insulation and Max-Q rating"],
  ["Boosters", "extra liftoff thrust, at the cost of mass"],
  ["Fins", "passive stability when the centre of pressure is ahead"],
  ["Interstage", "load rating for the upper stage and fairing"],
  ["S2 engine", "vacuum-optimised upper-stage thrust"],
  ["S2 tank", "upper-stage propellant and dry mass"],
  ["Ullage", "settles propellant before the second-stage ignition"],
  ["Fairing", "protects the payload through the atmosphere"],
  ["Avionics", "guidance package and vehicle mass"],
];

const CONTROLS = [
  ["SPACE", "Stage", "Separate the booster at MECO, then ignite the upper stage."],
  ["F", "Fairing", "Jettison the fairing — never below 80 km."],
  ["D", "Deploy", "Release the payload after SECO and orbital velocity."],
  ["X", "Abort", "Range-safety abort. Ends the run immediately."],
  ["Throttle", "Slider", "Lower thrust near Max Q to stay under the redline."],
];

const PHASES = [
  ["COUNT", "T−10 s", "Engines spool up. Watch TWR — below 1.0 means a pad burn."],
  ["TOWER", "T+0–12 s", "Vertical rise. Keep the stack stable as it clears the tower."],
  ["MAX Q", "~60–90 s", "Peak aerodynamic pressure. Throttle to about 70 %."],
  ["STAGING", "MECO", "Press SPACE to separate. Ullage valves must work."],
  ["ASCENT", "Upper stage", "Pitch over and build horizontal velocity."],
  ["INSERT", "SECO", "Upper stage cuts off. You now need orbital velocity."],
  ["DEPLOY", "Payload", "Press D once SECO is confirmed and the target velocity is reached."],
];

const PAD_SMOKE = [
  { left: 44, size: 96, delay: 0 },
  { left: 50, size: 128, delay: 0.18 },
  { left: 56, size: 104, delay: 0.36 },
  { left: 39, size: 76, delay: 0.5 },
  { left: 62, size: 70, delay: 0.62 },
];

function Section({
  index,
  title,
  kicker,
  children,
}: {
  index: string;
  title: string;
  kicker: string;
  children: ReactNode;
}) {
  return (
    <section className="panel p-4 sm:p-5">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] text-[var(--cyan)]">{index}</span>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
          <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {kicker}
          </p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Home() {
  const profiles = useGame((s) => s.profiles);
  const activeProfile = useGame((s) => s.activeProfile);
  const bootstrapped = useGame((s) => s.bootstrapped);
  const bootstrap = useGame((s) => s.bootstrap);
  const createProfile = useGame((s) => s.createProfile);
  const selectProfile = useGame((s) => s.selectProfile);
  const deleteProfile = useGame((s) => s.deleteProfile);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [launchKey, setLaunchKey] = useState(0);
  const [showSmoke, setShowSmoke] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!showSmoke) return;
    const timer = window.setTimeout(() => setShowSmoke(false), 3600);
    return () => window.clearTimeout(timer);
  }, [showSmoke, launchKey]);

  const replayLaunch = () => {
    sfx.unlock();
    sfx.playCue("liftoff");
    setShowSmoke(true);
    setLaunchKey((key) => key + 1);
  };

  const canPlay = bootstrapped && Boolean(activeProfile);
  const focusName = () => {
    setError("Add or select a commander before launching the mission.");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const addProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) {
      setError("Enter a new commander name.");
      inputRef.current?.focus();
      return;
    }
    if (!createProfile(draft)) {
      setError("That commander already exists — select it from the list.");
      return;
    }
    setDraft("");
    setError(null);
  };

  const clearProfile = (name: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Clear all saved progress for "${name}"? This cannot be undone.`)
    ) {
      return;
    }
    deleteProfile(name);
  };

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
              Mission briefing · read before launch
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)] sm:block">
            Call sign
          </span>
          <span
            className={`rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
              canPlay
                ? "border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.07)] text-[var(--cyan)]"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {activeProfile ?? (bootstrapped ? "Guest" : "…")}
          </span>
          <Link
            href="/failures"
            className="hidden rounded-sm border border-[var(--line)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)] sm:block"
          >
            Failure guide
          </Link>
          <Link
            href="/about"
            className="hidden rounded-sm border border-[var(--line)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[rgba(0,229,255,0.45)] hover:text-[var(--cyan)] sm:block"
          >
            About
          </Link>
          <SoundToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-3 py-5 sm:px-5 lg:py-8">
        <section className="panel relative overflow-hidden p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.16),transparent_65%)]" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-start">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--cyan)]">
                Flight director briefing
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                {activeProfile ? `Welcome, ${activeProfile}.` : "Welcome, commander."}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#c9d8ea]">
                You are the chief engineer and flight director. Assemble a launch vehicle from
                real-world parts, verify that the physics can actually fly, then run a
                deterministic seven-phase ascent and put the payload on target.
              </p>
              <ul className="mt-4 grid gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)] sm:grid-cols-3">
                <li className="rounded-sm border border-[var(--line)] bg-black/20 px-2 py-1.5">
                  1 · Assemble
                </li>
                <li className="rounded-sm border border-[var(--line)] bg-black/20 px-2 py-1.5">
                  2 · Analyse
                </li>
                <li className="rounded-sm border border-[var(--line)] bg-black/20 px-2 py-1.5">
                  3 · Launch
                </li>
              </ul>

              <div className="relative mt-5 h-64 overflow-hidden rounded-md border border-[var(--line)] bg-[linear-gradient(180deg,#04070f_0%,#0a1626_55%,#123152_100%)] sm:h-72">
                <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(142,163,191,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(142,163,191,0.2)_1px,transparent_1px)] [background-size:30px_30px]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_100%,rgba(0,229,255,0.14),transparent_70%)]" />

                <div className="absolute inset-x-0 bottom-6 h-px bg-[rgba(142,163,191,0.25)]" />
                <div className="absolute bottom-6 left-1/2 h-2 w-44 -translate-x-1/2 rounded-sm bg-[#3e5470]" />
                <div className="absolute bottom-6 left-[calc(50%-88px)] h-32 w-1.5 bg-[#2a3a50]" />
                <div className="absolute bottom-16 left-[calc(50%-98px)] h-1 w-11 bg-[#2a3a50]" />
                <div className="absolute bottom-28 left-[calc(50%-98px)] h-1 w-11 bg-[#2a3a50]" />

                {showSmoke ? (
                  <div className="absolute inset-x-0 bottom-6 h-44">
                    {PAD_SMOKE.map((puff, index) => (
                      <span
                        key={`${launchKey}-${index}`}
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
                ) : null}

                <RocketArt key={launchKey} mode="launching" />

                <div className="absolute left-3 top-3 font-mono text-[8px] uppercase tracking-[0.18em] text-[#c9d8ea]">
                  Pad 39A · vehicle RS-01
                </div>
                <div
                  className={`absolute right-3 top-3 rounded-sm border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] ${
                    showSmoke
                      ? "border-[rgba(255,179,0,0.5)] text-[var(--amber)]"
                      : "border-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  {showSmoke ? "Liftoff" : "Ascent"}
                </div>

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-2.5">
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    {showSmoke ? "T+00:00:03 · nominal" : "Ascent nominal · replay available"}
                  </span>
                  <button
                    type="button"
                    onClick={replayLaunch}
                    className="pointer-events-auto rounded-sm border border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.08)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.16)]"
                  >
                    Replay launch
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-[var(--line)] bg-[rgba(4,9,18,0.7)] p-4">
              <div className="flex items-center justify-between">
                <span className="panel-title">Commander profile</span>
                <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {bootstrapped ? `${profiles.length} saved` : "…"}
                </span>
              </div>

              {!bootstrapped ? (
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  Reading local saves…
                </p>
              ) : profiles.length > 0 ? (
                <ul className="mt-3 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                  {profiles.map((name) => {
                    const selected =
                      activeProfile?.toLocaleLowerCase() === name.toLocaleLowerCase();
                    return (
                      <li
                        key={name}
                        className={`flex items-stretch overflow-hidden rounded-sm border ${
                          selected
                            ? "border-[rgba(0,229,255,0.5)] bg-[rgba(0,229,255,0.07)]"
                            : "border-[var(--line)] bg-black/20"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectProfile(name)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              selected
                                ? "bg-[var(--cyan)] shadow-[0_0_6px_var(--cyan)]"
                                : "bg-[var(--muted)]/50"
                            }`}
                          />
                          <span className="min-w-0">
                            <span
                              className={`block truncate font-mono text-[11px] uppercase tracking-[0.12em] ${
                                selected ? "text-[var(--cyan)]" : "text-[var(--ink)]"
                              }`}
                            >
                              {name}
                            </span>
                            <span className="block font-mono text-[7px] uppercase tracking-[0.14em] text-[var(--muted)]">
                              {selected ? "Selected · saved locally" : "Select to load save"}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => clearProfile(name)}
                          title={`Clear saved data for ${name}`}
                          className="shrink-0 border-l border-[var(--line)] px-2 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)] transition hover:bg-[rgba(255,42,85,0.12)] hover:text-[var(--red)]"
                        >
                          Clear
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 rounded-sm border border-dashed border-[var(--line)] px-2.5 py-3 text-center text-[11px] text-[var(--muted)]">
                  No commanders saved yet. Add a name below to create your pilot.
                </p>
              )}

              <form onSubmit={addProfile} className="mt-3 space-y-2">
                <label htmlFor="callsign" className="sr-only">
                  New commander name
                </label>
                <input
                  ref={inputRef}
                  id="callsign"
                  name="callsign"
                  type="text"
                  value={draft}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Add commander — e.g. ARMSTRONG"
                  className="w-full rounded-sm border border-[var(--line)] bg-[rgba(2,6,13,0.85)] px-2.5 py-2 font-mono text-[13px] uppercase tracking-[0.12em] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)]/60 focus:border-[rgba(0,229,255,0.6)] focus:shadow-[0_0_0_2px_rgba(0,229,255,0.08)]"
                />
                <button
                  type="submit"
                  className="w-full rounded-sm border border-[rgba(0,229,255,0.55)] bg-[rgba(0,229,255,0.1)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.18)]"
                >
                  + Add username
                </button>
                <p className="font-mono text-[8px] leading-relaxed text-[var(--muted)]">
                  Every commander has a separate save in this browser (localStorage). Up to 24
                  characters.
                </p>
                {error ? (
                  <p role="alert" className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--red)]">
                    {error}
                  </p>
                ) : null}
              </form>

              <Link
                href="/game"
                onClick={(event) => {
                  sfx.unlock();
                  if (!canPlay) {
                    event.preventDefault();
                    focusName();
                  }
                }}
                aria-disabled={!canPlay}
                className={`mt-4 flex items-center justify-between gap-3 rounded-sm border px-3 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                  canPlay
                    ? "border-[rgba(0,229,255,0.55)] bg-[rgba(0,229,255,0.1)] text-[var(--cyan)] shadow-[0_0_18px_rgba(0,229,255,0.12)] hover:bg-[rgba(0,229,255,0.18)]"
                    : "cursor-not-allowed border-[var(--line)] text-[var(--muted)] opacity-70"
                }`}
              >
                Play the game
                <span aria-hidden>→</span>
              </Link>
              <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
                {canPlay
                  ? `Playing as ${activeProfile} · launch control unlocked`
                  : "Select or add a commander to unlock launch"}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section index="01" title="Assemble the vehicle" kicker="Vehicle Assembly Building">
            <p className="text-[13px] leading-relaxed text-[#c9d8ea]">
              Pick a mission tier, then fill each available slot. Single-stage vehicles disable the
              upper-stage slots. Each part has a mass, a thrust or a structural rating, and the
              combination — not any single part — decides whether the rocket flies.
            </p>
            <p className="mt-2 rounded-sm border border-[rgba(255,179,0,0.35)] bg-[rgba(255,179,0,0.06)] px-2.5 py-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-[var(--amber)]">
              Launch is locked until the core vehicle is complete: stage engine(s), tank(s),
              payload fairing and avionics — plus the interstage and upper-stage engine/tank on
              two-stage vehicles. Empty mounts and empty bays can be selected, but the pad will
              not clear them.
            </p>
            <dl className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {SLOTS.map(([slot, note]) => (
                <div key={slot} className="flex flex-col border-b border-[var(--line)]/60 pb-1">
                  <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink)]">
                    {slot}
                  </dt>
                  <dd className="text-[11px] leading-snug text-[var(--muted)]">{note}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-[var(--amber)]">
              Slots marked “Not flown on this vehicle” are disabled for this tier. Hover a part to
              read its description and trade-off before installing it.
            </p>
          </Section>

          <Section index="02" title="Analyse before launch" kicker="Numbers that must pass">
            <ul className="space-y-2.5 text-[13px] leading-relaxed text-[#c9d8ea]">
              <li>
                <strong className="text-[var(--ink)]">TWR ≥ 1.0 at liftoff.</strong> Below 1.0 the
                rocket cannot leave the pad and burns on the mount. 1.2–1.6 is comfortable.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Δv budget.</strong> The stack must produce
                more Δv than the mission requires. The analysis panel shows both numbers and flags
                a shortfall.
              </li>
              <li>
                <strong className="text-[var(--ink)]">CoM above CoP.</strong> Keep fins when the
                stack is passively stable, or rely on engine gimbal. Unstable stacks pitch over.
              </li>
              <li>
                <strong className="text-[var(--ink)]">Mass and height matter.</strong> Every extra
                kilogram and metre costs thrust and increases aerodynamic loads.
              </li>
            </ul>
            <p className="mt-3 rounded-sm border border-[var(--line)] bg-black/20 px-2.5 py-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-[var(--muted)]">
              Green = nominal · amber = marginal · red = will fail. Fix red items before launch.
            </p>
          </Section>

          <Section index="03" title="Fly the ascent" kicker="Flight controls">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--line)] font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    <th className="py-1.5 pr-3 font-normal">Input</th>
                    <th className="py-1.5 pr-3 font-normal">Action</th>
                    <th className="py-1.5 font-normal">When</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTROLS.map(([key, action, when]) => (
                    <tr key={key} className="border-b border-[var(--line)]/50 align-top">
                      <td className="py-2 pr-3">
                        <kbd className="rounded-[3px] border border-[rgba(142,163,191,0.35)] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--ink)]">
                          {key}
                        </kbd>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--cyan)]">
                        {action}
                      </td>
                      <td className="py-2 text-[11px] leading-snug text-[var(--muted)]">{when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-[var(--amber)]">
              Tip: drop the throttle to ~70 % as Q approaches its peak, then return to full
              thrust after the vehicle clears the dense air.
            </p>
            <p className="mt-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-[var(--muted)]">
              The launch button stays locked until the required slots are installed. Present but
              incompatible hardware is allowed — that is what the physics failures are for.
            </p>
          </Section>

          <Section index="04" title="Seven ascent phases" kicker="Mission timeline">
            <ol className="space-y-2">
              {PHASES.map(([phase, time, note]) => (
                <li key={phase} className="flex gap-3 border-b border-[var(--line)]/50 pb-2 last:border-0">
                  <span className="w-16 shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--cyan)]">
                    {phase}
                  </span>
                  <span className="w-16 shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--muted)]">
                    {time}
                  </span>
                  <span className="text-[11px] leading-snug text-[#c9d8ea]">{note}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section index="05" title="Failure guide" kicker="Symptom → fix">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--line)] font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    <th className="py-1.5 pr-3 font-normal">Failure</th>
                    <th className="py-1.5 font-normal">Prevention</th>
                  </tr>
                </thead>
                <tbody>
                  {FAILURE_GUIDE.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--line)]/50 align-top">
                      <td className="py-1.5 pr-3 text-[11px] leading-snug text-[#e6b3b3]">
                        {entry.short}
                      </td>
                      <td className="py-1.5 text-[11px] leading-snug text-[var(--muted)]">
                        {entry.fixes[0]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link
              href="/failures"
              className="mt-3 flex items-center justify-between gap-2 rounded-sm border border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.05)] px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.12)]"
            >
              Full failure guide — cause &amp; fix for every error
              <span aria-hidden>→</span>
            </Link>
          </Section>

          <Section index="06" title="Win the mission" kicker="Targets and scoring">
            <div className="space-y-2.5 text-[13px] leading-relaxed text-[#c9d8ea]">
              <p>
                <strong className="text-[var(--ink)]">Tier 1</strong> is suborbital: pass the
                target altitude shown in the mission brief (120 km for the Ares-I) before the
                flight timer expires.
              </p>
              <p>
                <strong className="text-[var(--ink)]">Tiers 2–5</strong> are orbital: reach SECO,
                then deploy the payload once velocity exceeds the mission target. Deploying early
                or too slow destroys the payload.
              </p>
              <p>
                Success unlocks the next tier and records your best score. Δv margin, peak
                dynamic pressure and peak G-load feed the score.
              </p>
              <p className="rounded-sm border border-[var(--line)] bg-black/20 px-2.5 py-2 font-mono text-[8px] uppercase leading-relaxed tracking-[0.1em] text-[var(--muted)]">
                Progress, best scores, history and your callsign are saved in this browser. Reload
                any time and continue from the Vehicle Assembly Building.
              </p>
            </div>
          </Section>
        </div>

        <div className="panel flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-[0.24em] text-[var(--cyan)]">
              Briefing complete
            </div>
            <p className="mt-1 text-sm text-[#c9d8ea]">
              {canPlay
                ? `Launch control is ready, ${activeProfile}. Build the stack and fly the mission.`
                : "Select or add a commander above, then continue to launch control."}
            </p>
          </div>
          <Link
            href="/game"
            onClick={(event) => {
              sfx.unlock();
              if (!canPlay) {
                event.preventDefault();
                focusName();
              }
            }}
            className="w-full rounded-sm border border-[rgba(0,229,255,0.55)] bg-[rgba(0,229,255,0.1)] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.18)] sm:w-auto"
          >
            Play the game →
          </Link>
        </div>
      </main>

      <footer className="border-t border-[var(--line)] px-4 py-2 text-center font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted)]">
        Rocket Simulator · arcade physics · deterministic 60 Hz sim · no backend
      </footer>
    </div>
  );
}
