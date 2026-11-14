"use client";

import { useState } from "react";
import { getPart, partsForSlot, SLOT_CATEGORY, SLOT_LABEL } from "../data/parts";
import { sfx } from "../audio/sfx";
import { useGame } from "../store/game";
import type { Part, SlotId, Vehicle } from "../types";
import { fmtInt, fmtMass } from "./format";

const SLOT_ORDER: SlotId[] = [
  "s1Engine",
  "s1Tank",
  "boosters",
  "fins",
  "interstage",
  "s2Engine",
  "s2Tank",
  "ullage",
  "fairing",
  "avionics",
];

function slotDisabled(slot: SlotId, vehicle: Vehicle): boolean {
  if (vehicle.stages === 1) {
    return slot === "s2Engine" || slot === "s2Tank" || slot === "ullage";
  }
  return false;
}

function partSummary(part: Part): string {
  if (part.id.startsWith("none_")) return "No hardware";
  if (part.category === "engine" && part.thrustVacuumKn > 0) {
    return `${fmtInt(part.thrustVacuumKn)} kN · Isp ${part.ispVacuum.toFixed(0)} s`;
  }
  if (part.category === "tank" && part.propellantKg > 0) {
    return `${fmtMass(part.propellantKg)} prop · ${part.cryoInsulated ? "insulated" : "bare"}`;
  }
  if (part.category === "booster" && part.propellantKg > 0) {
    return `${fmtInt(part.thrustSeaLevelKn)} kN each · ${fmtMass(part.propellantKg)}`;
  }
  if (part.category === "fins") {
    return part.finAreaM2 > 0 ? `${part.finAreaM2.toFixed(1)} m² fin area` : "No aerodynamic control";
  }
  return `${fmtMass(part.massKg)} · ${part.short}`;
}

function PartOption({
  part,
  selected,
  onSelect,
}: {
  part: Part;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-md border px-2.5 py-2 text-left transition ${
        selected
          ? "border-[var(--cyan)] bg-[rgba(0,229,255,0.08)]"
          : "border-[var(--line)] bg-[rgba(8,16,30,0.5)] hover:border-[rgba(0,229,255,0.45)] hover:bg-[rgba(0,229,255,0.04)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-[var(--ink)]">{part.name}</span>
        <span
          className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] ${
            selected ? "text-[var(--cyan)]" : "text-[var(--muted)]"
          }`}
        >
          {selected ? "installed" : part.short}
        </span>
      </div>
      <div className="mt-0.5 truncate font-mono text-[9px] text-[var(--muted)]">{partSummary(part)}</div>
      <div className="mt-1 hidden text-[10px] leading-snug text-[var(--muted)] group-hover:block">
        {part.description}
        {part.tradeoff ? ` — ${part.tradeoff}` : ""}
      </div>
    </button>
  );
}

export default function VabPanel({ vehicle }: { vehicle: Vehicle }) {
  const build = useGame((s) => s.build);
  const setSlot = useGame((s) => s.setSlot);
  const resetBuild = useGame((s) => s.resetBuild);
  const launch = useGame((s) => s.launch);
  const [openSlot, setOpenSlot] = useState<SlotId | null>("s1Engine");
  const [confirming, setConfirming] = useState(false);

  const openOptions = openSlot
    ? partsForSlot(SLOT_CATEGORY[openSlot], vehicle.tier)
    : [];

  return (
    <div className="panel flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-3.5 py-2.5">
        <div>
          <h2 className="panel-title">Vehicle Assembly</h2>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {build.s1Engine ? "10-slot configuration" : "assembly bay"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            resetBuild();
          }}
          className="rounded border border-[var(--line)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
        >
          Reset to stock
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2.5">
        <div className="flex flex-col gap-1.5">
          {SLOT_ORDER.map((slot) => {
            const disabled = slotDisabled(slot, vehicle);
            const part = getPart(build[slot]);
            const open = openSlot === slot;
            return (
              <div key={slot} className="rounded-md border border-[var(--line)] bg-[rgba(8,16,30,0.35)]">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setOpenSlot(open ? null : slot)}
                  className={`flex w-full items-center gap-2 px-2.5 py-2 text-left transition ${
                    disabled ? "cursor-not-allowed opacity-35" : "hover:bg-[rgba(0,229,255,0.04)]"
                  }`}
                >
                  <span className="w-24 shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {SLOT_LABEL[slot]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--ink)]">
                    {disabled ? "Not flown on this vehicle" : part.name}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[9px] transition ${
                      open ? "rotate-90 text-[var(--cyan)]" : "text-[var(--muted)]"
                    }`}
                    aria-hidden
                  >
                    ▸
                  </span>
                </button>

                {open && !disabled ? (
                  <div className="border-t border-[var(--line)] p-1.5">
                    <div className="grid gap-1.5">
                      {openOptions.map((option) => (
                        <PartOption
                          key={option.id}
                          part={option}
                          selected={option.id === build[slot]}
                          onSelect={() => {
                            setSlot(slot, option.id);
                            setOpenSlot(null);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-[var(--line)] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Pad status
            </div>
            <div className="truncate text-[11px] text-[var(--ink)]">
              {vehicle.name} — {vehicle.subtitle}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.unlock();
              if (!confirming) {
                sfx.playCue("click");
                setConfirming(true);
                window.setTimeout(() => setConfirming(false), 5000);
                return;
              }
              setConfirming(false);
              launch();
            }}
            className={`shrink-0 rounded-md px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
              confirming
                ? "bg-[var(--amber)] text-[#1a1200] shadow-[0_0_24px_rgba(255,179,0,0.35)]"
                : "bg-[var(--cyan)] text-[#001014] shadow-[0_0_24px_rgba(0,229,255,0.28)] hover:bg-white"
            }`}
          >
            {confirming ? "Confirm launch" : "Initiate launch"}
          </button>
        </div>
        <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
          {confirming
            ? "Warning: configuration will be committed to the flight vehicle."
            : "Launch commits the current build. Warnings do not block launch."}
        </p>
      </footer>
    </div>
  );
}
