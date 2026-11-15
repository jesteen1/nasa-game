import { describe, expect, it } from "vitest";
import type { SimEvent } from "../types";
import { commsForEvent } from "./comms";

function event(message: string, tone: SimEvent["tone"] = "info"): SimEvent {
  return { t: 10, message, tone };
}

describe("comms loop", () => {
  it("maps launch milestones to the right mission-control console", () => {
    expect(commsForEvent(event("LIFTOFF — HOLD-DOWN CLAMPS RELEASED")).speaker).toBe("CAPCOM");
    expect(commsForEvent(event("TOWER CLEAR — PITCH PROGRAM ACTIVE")).speaker).toBe("GUIDANCE");
    expect(commsForEvent(event("MAX Q — THROTTLE DOWN IF STRESS RISES")).speaker).toBe("CAPCOM");
    expect(commsForEvent(event("STAGE SEPARATION CONFIRMED")).speaker).toBe("PROPULSION");
    expect(commsForEvent(event("SES-1 — UPPER STAGE IGNITION")).speaker).toBe("PROPULSION");
    expect(commsForEvent(event("PAYLOAD DEPLOY CONFIRMED")).speaker).toBe("SPACECRAFT");
    expect(commsForEvent(event("S1 SIGNAL LOST — BEACON BELOW HORIZON")).speaker).toBe("MCC");
    expect(commsForEvent(event("SCIENCE DOWNLINK ACQUIRED — DATA FLOWING")).speaker).toBe("MCC");
    expect(commsForEvent(event("ORBIT SHORTFALL — 5237 / 7650 M/S", "bad")).speaker).toBe("GUIDANCE");
    expect(
      commsForEvent(event("FAILURE — PAYLOAD RELEASED IN UNSTABLE ORBIT", "bad")).speaker,
    ).toBe("SPACECRAFT");
  });

  it("always returns a speaker and a non-empty line", () => {
    const messages = [
      "TERMINAL COUNT — HOLD-DOWN CLAMPS ENGAGED",
      "LIFTOFF — HOLD-DOWN CLAMPS RELEASED",
      "TOWER CLEAR — PITCH PROGRAM ACTIVE",
      "KÁRMÁN LINE CROSSED — 100 KM",
      "MECO — MAIN ENGINE CUTOFF",
      "STAGE SEPARATION AVAILABLE — PRESS STAGE",
      "STAGE SEPARATION CONFIRMED",
      "DOWNLINK ACQUIRED — S2 TELEMETRY",
      "NO ULLAGE THRUSTERS — PROPELLANT FLOATING IN ZERO-G",
      "SES-1 — UPPER STAGE IGNITION",
      "SECO — SECOND ENGINE CUTOFF",
      "ORBITAL INSERTION VELOCITY REACHED",
      "FAIRING JETTISON CONFIRMED",
      "FAIRING JETTISON BELOW 80 KM — AERO-THERMAL RISK",
      "PAYLOAD DEPLOY INHIBITED — SECO REQUIRED",
      "SEPARATION INHIBITED — STAGE 1 STILL BURNING",
      "SCIENCE PAYLOAD ALREADY DEPLOYED",
      "MISSION SUCCESS — TARGET ACHIEVED",
    ];

    for (const message of messages) {
      const line = commsForEvent(event(message));
      expect(line.speaker.length).toBeGreaterThan(0);
      expect(line.text.length).toBeGreaterThan(0);
    }
  });

  it("routes a flight failure to range safety", () => {
    const line = commsForEvent(event("FAILURE — STRUCTURAL OVERPRESSURE AT MAX Q", "bad"));
    expect(line.speaker).toBe("RANGE");
    expect(line.text.toLowerCase()).toContain("terminated");
  });
});
