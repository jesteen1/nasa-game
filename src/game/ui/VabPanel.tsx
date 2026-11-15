"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchAssembly, type AssemblyMatch } from "../data/assemblySearch";
import {
  getPart,
  partsForSlot,
  SLOT_CATEGORY,
  SLOT_LABEL,
  SLOT_ORDER,
} from "../data/parts";
import { sfx } from "../audio/sfx";
import { useGame } from "../store/game";
import { missingSlots } from "../sim/validate";
import type { Part, SlotId, Vehicle } from "../types";
import { fmtInt, fmtMass } from "./format";
import PartIcon, { partBadges } from "./PartIcon";

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
  highlighted,
  onSelect,
}: {
  part: Part;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const isEmpty = part.id.startsWith("none_") || part.id === "interstage_none";
  const badges = partBadges(part);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-start gap-2.5 rounded-md border px-2.5 py-2 text-left transition ${
        highlighted
          ? "border-[var(--cyan)] bg-[rgba(0,229,255,0.12)] shadow-[0_0_16px_rgba(0,229,255,0.18)]"
          : selected
            ? "border-[var(--cyan)] bg-[rgba(0,229,255,0.08)]"
            : "border-[var(--line)] bg-[rgba(8,16,30,0.5)] hover:border-[rgba(0,229,255,0.45)] hover:bg-[rgba(0,229,255,0.04)]"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border transition ${
          selected || highlighted
            ? "border-[rgba(0,229,255,0.55)] bg-[rgba(0,229,255,0.12)]"
            : isEmpty
              ? "border-dashed border-[var(--line)] bg-[rgba(8,16,30,0.45)]"
              : "border-[var(--line)] bg-[rgba(12,24,44,0.75)] group-hover:border-[rgba(0,229,255,0.4)]"
        }`}
      >
        <PartIcon part={part} size={22} />
      </span>

      <div className="min-w-0 flex-1">
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
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-[9px] text-[var(--muted)]">
          <span className="truncate">{partSummary(part)}</span>
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={`rounded px-1 py-0.2 text-[8px] uppercase tracking-[0.08em] ${
                badge.tone === "cyan"
                  ? "border border-[rgba(0,229,255,0.35)] bg-[rgba(0,229,255,0.1)] text-[var(--cyan)]"
                  : badge.tone === "amber"
                    ? "border border-[rgba(255,179,0,0.35)] bg-[rgba(255,179,0,0.1)] text-[var(--amber)]"
                    : "border border-[var(--line)] bg-[rgba(142,163,191,0.08)] text-[var(--muted)]"
              }`}
            >
              {badge.label}
            </span>
          ))}
        </div>
        <div className="mt-1 hidden text-[10px] leading-snug text-[var(--muted)] group-hover:block">
          {part.description}
          {part.tradeoff ? ` — ${part.tradeoff}` : ""}
        </div>
      </div>
    </button>
  );
}

export default function VabPanel({ vehicle }: { vehicle: Vehicle }) {
  const build = useGame((s) => s.build);
  const setSlot = useGame((s) => s.setSlot);
  const resetBuild = useGame((s) => s.resetBuild);
  const [openSlot, setOpenSlot] = useState<SlotId | null>("s1Engine");
  const [query, setQuery] = useState("");
  const [pulseSlot, setPulseSlot] = useState<SlotId | null>(null);
  const [pulsePart, setPulsePart] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const missing = missingSlots(vehicle, build);
  const complete = missing.length === 0;
  const searching = query.trim().length > 0;
  const matches = useMemo(
    () => searchAssembly(vehicle, build, query),
    [vehicle, build, query],
  );

  const openOptions = useMemo(() => {
    if (!openSlot) return [];
    const options = partsForSlot(SLOT_CATEGORY[openSlot], vehicle.tier);
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (part) =>
        part.name.toLowerCase().includes(q) || part.short.toLowerCase().includes(q),
    );
  }, [openSlot, vehicle.tier, query]);

  // Clear the focus ring when the player taps outside the assembly panel.
  useEffect(() => {
    if (!focused) return;
    const onDown = (event: PointerEvent) => {
      const panel = panelRef.current;
      if (panel && !panel.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [focused]);

  const alignPanel = () => {
    const panel = panelRef.current;
    if (!panel || typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const jumpToSlot = (match: AssemblyMatch) => {
    setQuery("");
    setOpenSlot(match.slot);
    setPulseSlot(match.slot);
    setPulsePart(match.partId);
    window.setTimeout(() => {
      setPulseSlot(null);
      setPulsePart(null);
    }, 1800);
    window.requestAnimationFrame(() => {
      document
        .getElementById(`slot-${match.slot}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (match.partId) {
        document
          .getElementById(`part-${match.slot}-${match.partId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  };

  return (
    <div
      ref={panelRef}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocused(false);
        }
      }}
      onPointerDownCapture={(event) => {
        setFocused(true);
        const target = event.target as HTMLElement;
        if (!target.closest("button") && !target.closest("input")) alignPanel();
      }}
      className={`panel flex scroll-mt-2 flex-col transition-shadow md:h-full md:min-h-0 ${
        focused ? "ring-1 ring-[rgba(0,229,255,0.35)] md:ring-0" : ""
      }`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5">
        <div className="min-w-0">
          <h2 className="panel-title">Vehicle Assembly</h2>
          <p className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {complete
              ? "flight ready"
              : `${missing.length} required slot${missing.length === 1 ? "" : "s"} empty`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            resetBuild();
          }}
          className="shrink-0 rounded border border-[var(--line)] px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted)] transition hover:border-[var(--amber)] hover:text-[var(--amber)]"
        >
          Clear
        </button>
      </header>

      <div className="shrink-0 border-b border-[var(--line)] px-2.5 py-2" role="search">
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Find
          </span>
          <input
            type="text"
            inputMode="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              setFocused(true);
              alignPanel();
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setQuery("");
              if (event.key === "Enter" && matches[0]) {
                event.preventDefault();
                jumpToSlot(matches[0]);
              }
            }}
            placeholder="Search part or slot…"
            aria-label="Search vehicle assembly"
            enterKeyHint="go"
            className="w-full rounded-md border border-[var(--line)] bg-[rgba(8,16,30,0.6)] py-1.5 pl-10 pr-8 font-mono text-[10px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[rgba(0,229,255,0.55)]"
          />
          {searching ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] transition hover:text-[var(--cyan)]"
            >
              ×
            </button>
          ) : null}
        </div>

        {searching ? (
          <div className="mt-1.5 max-h-48 overflow-y-auto rounded-md border border-[var(--line)] bg-[rgba(5,11,21,0.72)]">
            {matches.length === 0 ? (
              <p className="px-2.5 py-2 font-mono text-[9px] text-[var(--muted)]">
                No matches for “{query.trim()}”.
              </p>
            ) : (
              matches.map((match, index) => (
                <button
                  key={`${match.slot}-${match.partId ?? "slot"}-${index}`}
                  type="button"
                  onClick={() => jumpToSlot(match)}
                  className="flex w-full items-center justify-between gap-2 border-b border-[rgba(38,54,79,0.6)] px-2.5 py-1.5 text-left transition last:border-0 hover:bg-[rgba(0,229,255,0.06)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      {match.label}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--ink)]">
                      {match.partName}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[7px] uppercase tracking-[0.1em] ${
                      match.installed ? "text-[var(--cyan)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {match.kind === "slot" ? "slot" : match.installed ? "installed" : "go"}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      <div className="px-2.5 py-2.5 md:min-h-0 md:flex-1 md:overflow-y-auto">
        <div className="flex flex-col gap-1.5">
          {SLOT_ORDER.map((slot) => {
            const disabled = slotDisabled(slot, vehicle);
            const part = getPart(build[slot]);
            const open = openSlot === slot;
            const isMissingRequired = missing.includes(slot);
            const isEmpty = part.id.startsWith("none_") || part.id === "interstage_none";
            return (
              <div
                key={slot}
                id={`slot-${slot}`}
                className={`scroll-mt-2 rounded-md border bg-[rgba(8,16,30,0.35)] transition ${
                  pulseSlot === slot
                    ? "border-[var(--cyan)] shadow-[0_0_18px_rgba(0,229,255,0.2)]"
                    : "border-[var(--line)]"
                }`}
              >
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setOpenSlot(open ? null : slot);
                    if (!open && window.matchMedia("(max-width: 767px)").matches) {
                      window.requestAnimationFrame(() => {
                        document
                          .getElementById(`slot-${slot}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }
                  }}
                  className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition ${
                    disabled ? "cursor-not-allowed opacity-35" : "hover:bg-[rgba(0,229,255,0.04)]"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border transition ${
                      disabled
                        ? "border-[var(--line)] bg-[rgba(8,16,30,0.3)]"
                        : isMissingRequired
                          ? "border-[rgba(255,179,0,0.45)] bg-[rgba(255,179,0,0.1)]"
                          : !isEmpty
                            ? "border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.1)]"
                            : "border-dashed border-[var(--line)] bg-[rgba(8,16,30,0.45)]"
                    }`}
                  >
                    <PartIcon part={disabled ? undefined : part} slot={slot} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted)]">
                        {SLOT_LABEL[slot]}
                      </span>
                      {!disabled && isMissingRequired ? (
                        <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--amber)]">
                          required
                        </span>
                      ) : !disabled && !isEmpty ? (
                        <span className="shrink-0 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--cyan)]">
                          ready
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-[11px] text-[var(--ink)]">
                      {disabled ? "Not flown on this vehicle" : part.name}
                    </div>
                  </div>
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
                    <div className="grid max-h-[40vh] gap-1.5 overflow-y-auto md:max-h-[45vh]">
                      {openOptions.length === 0 ? (
                        <p className="px-1 py-1.5 font-mono text-[9px] text-[var(--muted)]">
                          No parts match “{query.trim()}”.
                        </p>
                      ) : (
                        openOptions.map((option) => (
                          <div key={option.id} id={`part-${slot}-${option.id}`}>
                            <PartOption
                              part={option}
                              selected={option.id === build[slot]}
                              highlighted={pulsePart === option.id}
                              onSelect={() => {
                                sfx.unlock();
                                setSlot(slot, option.id);
                                setOpenSlot(null);
                                setQuery("");
                              }}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
