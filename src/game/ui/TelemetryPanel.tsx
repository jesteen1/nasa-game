"use client";

import { useEffect, useRef } from "react";
import { sfx } from "../audio/sfx";
import type { Vehicle, VehicleStats } from "../types";
import { fmtInt, fmtKm, fmtMass, fmtSpeed } from "./format";

interface Props {
  vehicle: Vehicle;
  stats: VehicleStats;
}

function Stat({
  label,
  value,
  unit,
  tone = "default",
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: "default" | "good" | "warn" | "bad";
  hint?: string;
}) {
  const color =
    tone === "bad"
      ? "text-[var(--red)]"
      : tone === "warn"
        ? "text-[var(--amber)]"
        : tone === "good"
          ? "text-[var(--cyan)]"
          : "text-[var(--ink)]";
  return (
    <div className="rounded-md border border-[var(--line)] bg-[rgba(8,16,30,0.55)] px-3 py-2">
      <div className="text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className={`font-mono text-lg leading-tight ${color}`}>
        {value}
        {unit ? <span className="ml-1 text-[10px] text-[var(--muted)]">{unit}</span> : null}
      </div>
      {hint ? <div className="mt-0.5 text-[10px] leading-tight text-[var(--muted)]">{hint}</div> : null}
    </div>
  );
}

function deltaVTone(stats: VehicleStats, vehicle: Vehicle): "good" | "warn" {
  return stats.deltaV >= vehicle.target.deltaV ? "good" : "warn";
}

function twrTone(twr: number): "good" | "warn" | "bad" {
  if (twr < 1) return "bad";
  if (twr < 1.2) return "warn";
  return "good";
}

export default function TelemetryPanel({ vehicle, stats }: Props) {
  const margin = stats.deltaV - vehicle.target.deltaV;
  const warnings = stats.warnings;
  const seenWarnings = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (warnings.length === 0) {
      seenWarnings.current.clear();
      return;
    }
    let added = false;
    for (const warning of warnings) {
      if (seenWarnings.current.has(warning.id)) continue;
      seenWarnings.current.add(warning.id);
      added = true;
    }
    if (added) sfx.playCue("warning");
  }, [warnings]);

  return (
    <div className="flex flex-col gap-3">
      <section className="panel p-3.5">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="panel-title">Vehicle Analysis</h2>
          <span className="rounded-sm border border-[var(--line)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {stats.control === "none" ? "uncontrolled" : `${stats.control} control`}
          </span>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Liftoff TWR"
            value={stats.twr.toFixed(2)}
            tone={twrTone(stats.twr)}
            hint={stats.twr >= 1.2 ? "Flight rule satisfied" : "Flight rule: ≥ 1.20"}
          />
          <Stat
            label="Total Δv"
            value={fmtInt(stats.deltaV)}
            unit="m/s"
            tone={deltaVTone(stats, vehicle)}
            hint={`Need ${fmtInt(vehicle.target.deltaV)} m/s`}
          />
          <Stat label="Wet Mass" value={fmtMass(stats.totalWetKg)} hint={`Dry ${fmtMass(stats.totalDryKg)}`} />
          <Stat label="Stack Height" value={fmtKm(stats.heightM)} hint={`Ø ${stats.coreWidthM.toFixed(1)} m`} />
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">Δv margin</span>
            <span
              className={`font-mono text-[11px] ${
                margin >= 0 ? "text-[var(--cyan)]" : "text-[var(--amber)]"
              }`}
            >
              {margin >= 0 ? "+" : ""}
              {fmtInt(margin)} m/s
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(142,163,191,0.16)]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.min(100, (stats.deltaV / Math.max(1, vehicle.target.deltaV)) * 100)}%`,
                background:
                  margin >= 0
                    ? "linear-gradient(90deg,#007c8a,#00e5ff)"
                    : "linear-gradient(90deg,#7a4b00,#ffb300)",
              }}
            />
          </div>
        </div>
      </section>

      <section className="panel p-3.5">
        <h2 className="panel-title mb-3">Stage Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[11px]">
            <thead>
              <tr className="text-left text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
                <th className="pb-1.5 font-normal">Stage</th>
                <th className="pb-1.5 text-right font-normal">Prop</th>
                <th className="pb-1.5 text-right font-normal">Thrust SL</th>
                <th className="pb-1.5 text-right font-normal">Isp</th>
                <th className="pb-1.5 text-right font-normal">Δv</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "S1", data: stats.stage1 },
                { name: "S2", data: stats.stage2 },
              ].map(({ name, data }) => (
                <tr key={name} className="border-t border-[var(--line)]">
                  <td className="py-1.5 text-[var(--cyan)]">{name}</td>
                  <td className="py-1.5 text-right">{fmtMass(data.propellantKg)}</td>
                  <td className="py-1.5 text-right">{fmtInt(data.thrustSlKn)} kN</td>
                  <td className="py-1.5 text-right">{data.isp.toFixed(0)} s</td>
                  <td className="py-1.5 text-right">{fmtInt(data.deltaV)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-[var(--line)] pt-2 font-mono text-[10px] text-[var(--muted)]">
          <span>
            CoM {stats.comY.toFixed(1)} m · CoP {stats.copY.toFixed(1)} m
          </span>
          <span className={stats.stable ? "text-[var(--cyan)]" : "text-[var(--red)]"}>
            {stats.stable ? "STABLE" : "UNSTABLE"}
          </span>
        </div>
      </section>

      <section className="panel p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="panel-title">Mission Profile</h2>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
            {vehicle.target.kind}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Target"
            value={
              vehicle.target.kind === "suborbital"
                ? `${vehicle.target.altitudeKm} km`
                : `${(vehicle.target.velocity / 1000).toFixed(2)} km/s`
            }
            hint={vehicle.payloadName}
          />
          <Stat label="Payload" value={fmtMass(vehicle.payloadKg)} hint={`${vehicle.stages}-stage vehicle`} />
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">{vehicle.description}</p>
      </section>

      <section className="panel p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="panel-title">Flight Rules</h2>
          <span
            className={`font-mono text-[9px] uppercase tracking-[0.16em] ${
              warnings.length === 0 ? "text-[var(--cyan)]" : "text-[var(--amber)]"
            }`}
          >
            {warnings.length === 0 ? "all clear" : `${warnings.length} warning${warnings.length > 1 ? "s" : ""}`}
          </span>
        </div>
        {warnings.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            No preflight violations detected. The stack is cleared for terminal count.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {warnings.map((warning) => (
              <li
                key={warning.id}
                className={`rounded-md border-l-2 bg-[rgba(8,16,30,0.55)] px-2.5 py-1.5 ${
                  warning.severity === "critical"
                    ? "border-[var(--red)]"
                    : "border-[var(--amber)]"
                }`}
              >
                <div
                  className={`font-mono text-[10px] tracking-[0.08em] ${
                    warning.severity === "critical" ? "text-[var(--red)]" : "text-[var(--amber)]"
                  }`}
                >
                  {warning.label}
                </div>
                <div className="text-[10px] leading-snug text-[var(--muted)]">{warning.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex items-center justify-between px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
        <span>Ref: {vehicle.reference[vehicle.reference.length - 1].altKm} km / {fmtSpeed(vehicle.reference[vehicle.reference.length - 1].velMs)}</span>
        <span>{vehicle.inspiration}</span>
      </div>
    </div>
  );
}
