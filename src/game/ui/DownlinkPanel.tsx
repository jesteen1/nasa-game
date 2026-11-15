"use client";

import type { DownlinkStatus, SimSnapshot } from "../types";
import { fmtInt } from "./format";

const STATUS_LABEL: Record<DownlinkStatus, string> = {
  standby: "STANDBY",
  locked: "LOCKED",
  weak: "WEAK",
  lost: "LOST",
};

const STATUS_TONE: Record<DownlinkStatus, string> = {
  standby: "text-[var(--muted)]",
  locked: "text-[var(--cyan)]",
  weak: "text-[var(--amber)]",
  lost: "text-[var(--red)]",
};

const DOT_TONE: Record<DownlinkStatus, string> = {
  standby: "bg-[rgba(142,163,191,0.45)]",
  locked: "bg-[var(--cyan)] shadow-[0_0_6px_var(--cyan)]",
  weak: "bg-[var(--amber)]",
  lost: "bg-[var(--red)]",
};

export default function DownlinkPanel({ snap }: { snap: SimSnapshot }) {
  const d = snap.downlink;
  const links: { label: string; status: DownlinkStatus }[] = [
    { label: "S1 beacon", status: d.s1 },
    { label: "S2 telemetry", status: d.s2 },
    { label: "Payload science", status: d.payload },
  ];

  return (
    <div className="hud-panel px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Downlink · MCC
        </span>
        <span className="font-mono text-[9px] text-[var(--cyan)]">
          {fmtInt(d.packets)} pkt
        </span>
      </div>

      <div className="mt-1 flex flex-col gap-0.5">
        {links.map(({ label, status }) => (
          <div key={label} className="flex items-center justify-between gap-2 font-mono text-[9px]">
            <span className="flex items-center gap-1.5 text-[var(--muted)]">
              <span className={`h-1.5 w-1.5 rounded-full ${DOT_TONE[status]}`} />
              {label}
            </span>
            <span className={STATUS_TONE[status]}>{STATUS_LABEL[status]}</span>
          </div>
        ))}
      </div>

      {snap.deployed ? (
        <div className="mt-1.5">
          <div className="flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
            <span>Science data</span>
            <span className="text-[var(--cyan)]">
              {snap.downlink.payload === "lost" ? "partial" : "received"}
            </span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[rgba(142,163,191,0.18)]">
            <div
              className="downlink-fill h-full rounded-full"
              style={{ background: "linear-gradient(90deg,#007c8a,#00e5ff)" }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-1 truncate font-mono text-[8px] text-[var(--muted)] opacity-80">
        {d.frameHex}
      </div>
    </div>
  );
}
