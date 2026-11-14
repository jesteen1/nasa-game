"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cuesForEvent } from "../audio/cues";
import { sfx } from "../audio/sfx";
import LaunchScene from "../render/LaunchScene";
import { SimEngine } from "../sim/engine";
import { computeStats } from "../sim/vehicle";
import { useGame } from "../store/game";
import type { SimSnapshot, TelemetrySample, Vehicle } from "../types";
import FlightHUD from "./FlightHUD";
import LaunchCinematic from "./LaunchCinematic";
import LaunchFX from "./LaunchFX";
import PadLaunch from "./PadLaunch";

const FIXED_STEP = 1 / 60;
const HUD_INTERVAL = 100;
const MAX_CHART_POINTS = 420;

function downsample(samples: TelemetrySample[]): TelemetrySample[] {
  if (samples.length <= MAX_CHART_POINTS) return samples.slice();
  const stride = Math.ceil(samples.length / MAX_CHART_POINTS);
  const out: TelemetrySample[] = [];
  for (let i = 0; i < samples.length; i += stride) out.push(samples[i]);
  const last = samples[samples.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export default function FlightScreen({ vehicle }: { vehicle: Vehicle }) {
  const finish = useGame((s) => s.finish);
  const build = useGame((s) => s.build);
  const stats = useMemo(() => computeStats(vehicle, build), [vehicle, build]);
  const engineRef = useRef<SimEngine | null>(null);
  const [snap, setSnap] = useState<SimSnapshot | null>(null);
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [timeWarp, setTimeWarp] = useState<1 | 2 | 4>(2);
  const [autoAssist, setAutoAssist] = useState(true);
  const timeWarpRef = useRef<1 | 2 | 4>(2);
  const autoAssistRef = useRef(true);

  useEffect(() => {
    timeWarpRef.current = timeWarp;
  }, [timeWarp]);

  useEffect(() => {
    autoAssistRef.current = autoAssist;
  }, [autoAssist]);

  useEffect(() => {
    const engine = new SimEngine(vehicle, build);
    engineRef.current = engine;

    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let lastHud = 0;
    let finished = false;
    let finishTimer = 0;
    let lastCount: number | null = null;
    const seenEvents = new Set<string>();
    const seenWarnings = new Set<string>();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = Math.min(0.25, Math.max(0, (now - last) / 1000));
      last = now;
      const curStatus = engine.getSnapshot().status;
      const mult = curStatus === "flying" ? timeWarpRef.current : 1;
      accumulator += elapsed * mult;

      let guard = 0;
      while (accumulator >= FIXED_STEP && guard < 80) {
        engine.step(FIXED_STEP);
        if (autoAssistRef.current) {
          const s = engine.getSnapshot();
          if (s.status === "flying") {
            if (s.q > 38 && s.throttle > 0.7) engine.setThrottle(0.7);
            else if (s.q < 32 && s.throttle < 1) engine.setThrottle(1);
            if (s.stage1Burnout && !s.separated && vehicle.stages === 2) {
              engine.action("stage");
            }
            if (s.fairingAttached && s.h > 82_000 && vehicle.stages === 2) {
              engine.action("fairing");
            }
            if (s.seco && !s.deployed && vehicle.stages === 2) {
              engine.action("deploy");
            }
          }
        }
        accumulator -= FIXED_STEP;
        guard += 1;
      }

      if (now - lastHud >= HUD_INTERVAL) {
        lastHud = now;
        const current = engine.getSnapshot();
        setSnap(current);
        setSamples(downsample(engine.samples));

        // Countdown beeps -------------------------------------------------
        if (current.status === "countdown") {
          const seconds = Math.max(0, Math.ceil(-current.t));
          if (seconds !== lastCount) {
            lastCount = seconds;
            sfx.playCue(seconds <= 1 ? "final" : "beep");
          }
        }

        // Engine rumble ---------------------------------------------------
        const thrusting =
          current.status === "flying" &&
          ((current.stage === 1 &&
            !current.stage1Burnout &&
            current.propellant1Kg > 0) ||
            (current.stage === 2 &&
              current.stage2Ignited &&
              !current.seco &&
              current.propellant2Kg > 0));
        const rumble = thrusting
          ? current.throttle
          : current.status === "countdown" && current.t > -3
            ? 0.16
            : 0;
        sfx.setEngine(rumble);

        // Mission event cues ---------------------------------------------
        for (const event of current.events) {
          const key = `${event.t.toFixed(2)}|${event.message}`;
          if (seenEvents.has(key)) continue;
          seenEvents.add(key);
          for (const cue of cuesForEvent(event)) sfx.playCue(cue);
        }

        // Warning cues ----------------------------------------------------
        for (const warning of current.warnings) {
          if (seenWarnings.has(warning.id)) continue;
          seenWarnings.add(warning.id);
          sfx.playCue("warning");
        }

        if (
          !finished &&
          (current.status === "success" || current.status === "failure")
        ) {
          finished = true;
          sfx.setEngine(0);
          const delay = current.status === "success" ? 1200 : 2400;
          finishTimer = window.setTimeout(() => finish(engine.getResult()), delay);
        }
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      if (finishTimer) window.clearTimeout(finishTimer);
      sfx.setEngine(0);
      engineRef.current = null;
    };
  }, [vehicle, build, finish]);

  // Browsers only allow audio after a gesture; resume on the first one.
  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const onThrottle = useCallback((value: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setThrottle(value);
    setSnap(engine.getSnapshot());
  }, []);

  const onAction = useCallback((kind: "stage" | "fairing" | "deploy" | "abort") => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.action(kind);
    setSnap(engine.getSnapshot());
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.code === "Space") {
        event.preventDefault();
        onAction("stage");
      } else if (event.key === "f" || event.key === "F") {
        onAction("fairing");
      } else if (event.key === "d" || event.key === "D") {
        onAction("deploy");
      } else if (event.key === "x" || event.key === "X") {
        onAction("abort");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAction]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <LaunchScene engineRef={engineRef} vehicle={vehicle} build={build} />
      <LaunchFX snap={snap} />
      <PadLaunch snap={snap} />
      <LaunchCinematic snap={snap} />
      <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-md border border-[var(--line)] bg-[rgba(5,11,21,0.82)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] backdrop-blur sm:flex">
        <button
          type="button"
          onClick={() => setAutoAssist((v) => !v)}
          className={`rounded px-1.5 py-0.5 transition ${
            autoAssist
              ? "border border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.12)] text-[var(--cyan)]"
              : "text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
          title="Auto-stage, fairing jettison & Max-Q throttle assist"
        >
          {autoAssist ? "Flight assist: auto" : "Flight assist: manual"}
        </button>
        <span className="text-[var(--line)]">|</span>
        <span className="text-[var(--muted)]">Warp</span>
        {([1, 2, 4] as const).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setTimeWarp(w)}
            className={`rounded px-1.5 py-0.5 transition ${
              timeWarp === w
                ? "border border-[rgba(255,179,0,0.5)] bg-[rgba(255,179,0,0.14)] text-[var(--amber)]"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }`}
          >
            {w}×
          </button>
        ))}
      </div>
      {snap ? (
        <FlightHUD
          snap={snap}
          vehicle={vehicle}
          samples={samples}
          initialProp1Kg={stats.stage1.propellantKg}
          initialProp2Kg={stats.stage2.propellantKg}
          onThrottle={onThrottle}
          onAction={onAction}
        />
      ) : null}
    </div>
  );
}
