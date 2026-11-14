"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LaunchScene from "../render/LaunchScene";
import { SimEngine } from "../sim/engine";
import { computeStats } from "../sim/vehicle";
import { useGame } from "../store/game";
import type { SimSnapshot, TelemetrySample, Vehicle } from "../types";
import FlightHUD from "./FlightHUD";

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

  useEffect(() => {
    const engine = new SimEngine(vehicle, build);
    engineRef.current = engine;

    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    let lastHud = 0;
    let finished = false;
    let finishTimer = 0;

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
        if (
          !finished &&
          (current.status === "success" || current.status === "failure")
        ) {
          finished = true;
          const delay = current.status === "success" ? 1200 : 2400;
          finishTimer = window.setTimeout(() => finish(engine.getResult()), delay);
        }
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      if (finishTimer) window.clearTimeout(finishTimer);
      engineRef.current = null;
    };
  }, [vehicle, build, finish]);

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
      {snap?.status === "countdown" ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 flex flex-col items-center gap-1 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.5em] text-[var(--amber)]">
            Terminal count
          </div>
          <div className="font-mono text-6xl font-semibold text-white/90 drop-shadow-[0_0_20px_rgba(255,179,0,0.35)]">
            T−{Math.max(0, Math.ceil(-snap.t))}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--muted)]">
            All systems nominal · throttle {Math.round(snap.throttle * 100)}%
          </div>
        </div>
      ) : null}
    </div>
  );
}
