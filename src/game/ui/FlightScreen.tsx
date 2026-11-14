"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sfx } from "../audio/sfx";
import type { SfxCue } from "../audio/sfx";
import LaunchScene from "../render/LaunchScene";
import { SimEngine } from "../sim/engine";
import { computeStats } from "../sim/vehicle";
import { useGame } from "../store/game";
import type { SimEvent, SimSnapshot, TelemetrySample, Vehicle } from "../types";
import FlightHUD from "./FlightHUD";
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

function cueForEvent(event: SimEvent): SfxCue | null {
  const message = event.message;
  if (message.includes("LIFTOFF")) return "liftoff";
  if (message.includes("STAGE SEPARATION")) return "separation";
  if (message.includes("SES-1")) return "ignition";
  if (message.includes("MECO") || message.includes("SECO")) return "separation";
  if (message.includes("FAIRING JETTISON")) return "fairing";
  if (message.includes("PAYLOAD DEPLOY")) return "deploy";
  if (message.includes("MAX Q")) return "maxq";
  if (message.includes("MISSION SUCCESS")) return "success";
  if (message.includes("ABORT")) return "abort";
  if (event.tone === "bad") return "failure";
  return null;
}

export default function FlightScreen({ vehicle }: { vehicle: Vehicle }) {
  const finish = useGame((s) => s.finish);
  const build = useGame((s) => s.build);
  const stats = useMemo(() => computeStats(vehicle, build), [vehicle, build]);
  const engineRef = useRef<SimEngine | null>(null);
  const [snap, setSnap] = useState<SimSnapshot | null>(null);
  const [samples, setSamples] = useState<TelemetrySample[]>([]);

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
      accumulator += elapsed;

      let guard = 0;
      while (accumulator >= FIXED_STEP && guard < 20) {
        engine.step(FIXED_STEP);
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
          const cue = cueForEvent(event);
          if (cue) sfx.playCue(cue);
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
