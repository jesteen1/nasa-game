"use client";

import { commsForEvent, type CommsSpeaker } from "../data/comms";
import type { SimEvent } from "../types";
import { fmtTime } from "./format";

const SPEAKER_TONE: Record<CommsSpeaker, string> = {
  FLIGHT: "text-[var(--cyan)]",
  CAPCOM: "text-[var(--amber)]",
  PROPULSION: "text-[#8bd3ff]",
  GUIDANCE: "text-[#b8c6d9]",
  RANGE: "text-[var(--red)]",
  SPACECRAFT: "text-[#7dffc4]",
  MCC: "text-[var(--muted)]",
};

export default function CommsLog({
  events,
  max = 6,
}: {
  events: SimEvent[];
  max?: number;
}) {
  const lines = events.slice(-max).reverse();

  if (lines.length === 0) {
    return (
      <p className="font-mono text-[9px] leading-snug text-[var(--muted)]">
        MCC loop idle — awaiting terminal count.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1" aria-label="Mission control comms loop">
      {lines.map((event, index) => {
        const line = commsForEvent(event);
        return (
          <li
            key={`${event.t}-${event.message}-${index}`}
            className="font-mono text-[9px] leading-snug"
          >
            <span className="mr-1.5 opacity-70 text-[var(--muted)]">{fmtTime(event.t)}</span>
            <span className={`mr-1 font-semibold tracking-[0.08em] ${SPEAKER_TONE[line.speaker]}`}>
              {line.speaker}
            </span>
            <span className="mr-1 text-[var(--muted)]">·</span>
            <span
              className={
                event.tone === "bad"
                  ? "text-[var(--red)]"
                  : event.tone === "warn"
                    ? "text-[var(--amber)]"
                    : event.tone === "good"
                      ? "text-[#d6f6ff]"
                      : "text-[var(--muted)]"
              }
            >
              {line.text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
