"use client";

import type { DownlinkStatus, SimSnapshot, TelemetrySample, Vehicle } from "../types";
import CommsLog from "./CommsLog";
import DownlinkPanel from "./DownlinkPanel";
import TelemetryChart from "./TelemetryChart";
import { fmtInt, fmtKm, fmtMass, fmtTime } from "./format";

type ActionKind = "stage" | "fairing" | "deploy" | "abort";

interface Props {
  snap: SimSnapshot;
  vehicle: Vehicle;
  samples: TelemetrySample[];
  initialProp1Kg: number;
  initialProp2Kg: number;
  onThrottle: (value: number) => void;
  onAction: (kind: ActionKind) => void;
  onHold: () => void;
}

const PHASES = ["COUNT", "TOWER", "MAX Q", "STAGING", "ASCENT", "INSERT", "DEPLOY", "DONE"];

const LINK_DOT: Record<DownlinkStatus, string> = {
  standby: "bg-[rgba(142,163,191,0.45)]",
  locked: "bg-[var(--cyan)] shadow-[0_0_5px_var(--cyan)]",
  weak: "bg-[var(--amber)]",
  lost: "bg-[var(--red)]",
};

function metricTone(value: number, warn: number, bad: number): string {
  if (value >= bad) return "text-[var(--red)]";
  if (value >= warn) return "text-[var(--amber)]";
  return "text-[var(--ink)]";
}

function Metric({
  label,
  value,
  unit,
  className = "",
}: {
  label: string;
  value: string;
  unit?: string;
  className?: string;
}) {
  return (
    <div className="min-w-[72px]">
      <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className={`font-mono text-[15px] leading-tight ${className}`}>
        {value}
        {unit ? <span className="ml-0.5 text-[8px] text-[var(--muted)]">{unit}</span> : null}
      </div>
    </div>
  );
}

export default function FlightHUD({
  snap,
  vehicle,
  samples,
  initialProp1Kg,
  initialProp2Kg,
  onThrottle,
  onAction,
  onHold,
}: Props) {
  const stageReady =
    vehicle.stages === 2 && snap.stage1Burnout && !snap.separated;
  const deployReady = snap.seco && !snap.deployed && vehicle.stages === 2;
  const prop1Pct = Math.max(0, Math.min(100, (snap.propellant1Kg / Math.max(1, initialProp1Kg)) * 100));
  const prop2Pct = Math.max(0, Math.min(100, (snap.propellant2Kg / Math.max(1, initialProp2Kg)) * 100));
  const warnings = snap.warnings;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top row ----------------------------------------------------------- */}
      <div className="flex items-start justify-between gap-2">
        <div className="hud-panel pointer-events-auto max-w-[calc(100%_-_8rem)] px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                snap.status === "failure"
                  ? "border-[var(--red)] text-[var(--red)]"
                  : snap.status === "success"
                    ? "border-[var(--cyan)] text-[var(--cyan)]"
                    : "border-[var(--amber)] text-[var(--amber)]"
              }`}
            >
              <span className="status-dot" />
              {snap.status === "countdown" ? "terminal count" : snap.status}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink)]">
              {snap.phaseLabel}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1.5">
            <Metric label="Altitude" value={fmtKm(snap.h)} />
            <Metric label="Velocity" value={fmtInt(snap.speed)} unit="m/s" />
            <Metric label="Dyn press" value={snap.q.toFixed(1)} unit="kPa" className={metricTone(snap.q, 28, 45)} />
            <Metric label="G-load" value={snap.gForce.toFixed(2)} unit="g" className={metricTone(snap.gForce, 4, 6)} />
            <Metric label="Mass" value={fmtMass(snap.massKg)} />
            <Metric label="Downrange" value={fmtKm(snap.downrange)} />
          </div>

          <div className="mt-2 flex items-center gap-1">
            {PHASES.map((phase, index) => {
              const active = snap.phase === index;
              const done =
                snap.status === "success"
                  ? index <= 7
                  : index < snap.phase && snap.phase >= 0;
              return (
                <div
                  key={phase}
                  className={`h-1 flex-1 rounded-full ${
                    active
                      ? "bg-[var(--cyan)] shadow-[0_0_8px_var(--cyan)]"
                      : done
                        ? "bg-[rgba(0,229,255,0.45)]"
                        : "bg-[rgba(142,163,191,0.18)]"
                  }`}
                  title={phase}
                />
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="hud-panel pointer-events-auto px-3 py-2 text-right">
            <div className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">Mission clock</div>
            <div className="font-mono text-xl leading-tight text-[var(--cyan)]">{fmtTime(snap.t)}</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
              Max Q {snap.maxQ.toFixed(1)} kPa · Max G {snap.maxG.toFixed(2)}
            </div>
            <div className="mt-1 flex items-center justify-end gap-2 font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
              <span>MCC link</span>
              {[
                { label: "S1", status: snap.downlink.s1 },
                { label: "S2", status: snap.downlink.s2 },
                { label: "PL", status: snap.downlink.payload },
              ].map(({ label, status }) => (
                <span key={label} className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${LINK_DOT[status]}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="hud-panel pointer-events-auto min-w-[180px] px-2.5 py-2">
            <div className="mb-1 font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Propellant
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-mono text-[9px] ${snap.stage === 1 ? "text-[var(--cyan)]" : "text-[var(--muted)]"}`}>
                S1
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(142,163,191,0.18)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${prop1Pct}%`,
                    background: "linear-gradient(90deg,#007c8a,#00e5ff)",
                  }}
                />
              </div>
              <span className="w-14 text-right font-mono text-[9px] text-[var(--muted)]">
                {fmtMass(snap.propellant1Kg)}
              </span>
            </div>
            {vehicle.stages === 2 ? (
              <div className="mt-1 flex items-center gap-2">
                <span className={`font-mono text-[9px] ${snap.stage === 2 ? "text-[var(--amber)]" : "text-[var(--muted)]"}`}>
                  S2
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(142,163,191,0.18)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${prop2Pct}%`,
                      background: "linear-gradient(90deg,#7a4b00,#ffb300)",
                    }}
                  />
                </div>
                <span className="w-14 text-right font-mono text-[9px] text-[var(--muted)]">
                  {fmtMass(snap.propellant2Kg)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom row -------------------------------------------------------- */}
      <div className="flex items-end justify-between gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">

        <div className="pointer-events-auto hidden w-[min(430px,42vw)] flex-col gap-1.5 lg:flex">
          <DownlinkPanel snap={snap} />

          <div className="hud-panel px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Ascent profile
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
                <span className="text-[var(--cyan)]">— alt</span>{" "}
                <span className="text-[#8bd3ff]">— vel</span>
              </span>
            </div>
            <TelemetryChart
              samples={samples}
              reference={vehicle.reference}
              targetAltKm={vehicle.target.kind === "suborbital" ? vehicle.target.altitudeKm : 0}
              accent={vehicle.accent}
            />
          </div>

          <div className="hud-panel max-h-32 overflow-y-auto px-3 py-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">
                Comms loop
              </span>
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--cyan)]">
                MCC
              </span>
            </div>
            <CommsLog events={snap.events} max={6} />
          </div>
        </div>

        <div className="pointer-events-auto ml-auto flex w-full max-w-xl flex-col gap-1.5">
          {warnings.length > 0 ? (
            <div className="hud-panel border-l-2 border-l-[var(--amber)] px-2.5 py-1.5">
              {warnings.slice(0, 3).map((warning) => (
                <div
                  key={warning.id}
                  className={`font-mono text-[9px] leading-snug ${
                    warning.severity === "critical" ? "text-[var(--red)]" : "text-[var(--amber)]"
                  }`}
                >
                  {warning.label}
                </div>
              ))}
            </div>
          ) : null}

          <div className="hud-panel px-3 py-2.5">
            {snap.status === "countdown" ? (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-sm border border-[var(--line)] bg-[rgba(8,16,30,0.55)] px-2 py-1.5">
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.14em] ${
                    snap.hold ? "text-[var(--amber)]" : "text-[var(--muted)]"
                  }`}
                >
                  {snap.hold ? "Count hold — clock paused" : "Terminal count running"}
                </span>
                <button
                  type="button"
                  onClick={onHold}
                  className={`rounded-sm border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] transition ${
                    snap.hold
                      ? "border-[rgba(0,229,255,0.55)] bg-[rgba(0,229,255,0.1)] text-[var(--cyan)]"
                      : "border-[var(--line)] text-[var(--ink)] hover:border-[var(--amber)] hover:text-[var(--amber)]"
                  }`}
                >
                  {snap.hold ? "Resume" : "Hold"}
                  <span className="ml-1.5 rounded-sm border border-[rgba(142,163,191,0.28)] px-1 py-px text-[7px] opacity-75">
                    H
                  </span>
                </button>
              </div>
            ) : null}

            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">Throttle</span>
              <input
                type="range"
                min={30}
                max={100}
                step={1}
                value={Math.round(snap.throttle * 100)}
                onChange={(event) => onThrottle(Number(event.target.value) / 100)}
                className="throttle-slider flex-1"
                aria-label="Engine throttle"
              />
              <span className="w-9 text-right font-mono text-[11px] text-[var(--cyan)]">
                {Math.round(snap.throttle * 100)}%
              </span>
            </div>

            <div className="mb-2 flex items-center gap-1">
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Preset
              </span>
              {[1, 0.7].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onThrottle(value)}
                  disabled={snap.status === "success" || snap.status === "failure"}
                  className="rounded-sm border border-[var(--line)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--muted)] transition hover:border-[var(--cyan)] hover:text-[var(--cyan)] disabled:opacity-30"
                >
                  {value * 100}%
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => onAction("stage")}
                disabled={!stageReady}
                className={`hud-button ${stageReady ? "hud-button--hot" : ""}`}
              >
                Stage
                <span className="key">SPACE</span>
              </button>
              <button
                type="button"
                onClick={() => onAction("fairing")}
                disabled={!snap.fairingAttached || vehicle.stages === 1}
                className={`hud-button ${snap.fairingAttached && vehicle.stages === 2 ? "hud-button--hot" : ""}`}
              >
                Fairing
                <span className="key">F</span>
              </button>
              <button
                type="button"
                onClick={() => onAction("deploy")}
                disabled={!deployReady}
                className={`hud-button ${deployReady ? "hud-button--hot" : ""}`}
              >
                Deploy
                <span className="key">D</span>
              </button>
              <button
                type="button"
                onClick={() => onAction("abort")}
                disabled={snap.status !== "flying" && snap.status !== "countdown"}
                className="hud-button border-[rgba(255,42,85,0.4)] text-[var(--red)] hover:border-[var(--red)] disabled:opacity-30"
              >
                Abort
                <span className="key">X</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
