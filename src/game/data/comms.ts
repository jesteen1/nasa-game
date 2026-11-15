import type { SimEvent } from "../types";

export type CommsSpeaker =
  | "FLIGHT"
  | "CAPCOM"
  | "PROPULSION"
  | "GUIDANCE"
  | "RANGE"
  | "SPACECRAFT"
  | "MCC";

export interface CommsLine {
  speaker: CommsSpeaker;
  text: string;
}

/**
 * Turns a raw sim event into a mission-control voice-loop callout. Rules are
 * ordered most-specific first; unmatched events fall back to the MCC loop so
 * every event always has a speaker.
 */
export function commsForEvent(event: SimEvent): CommsLine {
  const m = event.message;

  if (m.startsWith("FAILURE")) {
    if (m.includes("UNSTABLE ORBIT"))
      return { speaker: "SPACECRAFT", text: "Payload released below orbital velocity — re-entry imminent." };
    return { speaker: "RANGE", text: "Range safety — flight terminated." };
  }

  if (m.includes("TERMINAL COUNT"))
    return { speaker: "FLIGHT", text: "Terminal count — all stations are GO for launch." };
  if (m.includes("LIFTOFF"))
    return { speaker: "CAPCOM", text: "Liftoff — we have liftoff." };
  if (m.includes("TOWER CLEAR"))
    return { speaker: "GUIDANCE", text: "Tower clear. Pitch program is active." };
  if (m.includes("MAX Q"))
    return { speaker: "CAPCOM", text: "Go at throttle up — passing Max Q." };
  if (m.includes("KÁRMÁN"))
    return { speaker: "CAPCOM", text: "Kármán line crossed — 100 kilometres." };
  if (m.includes("MECO — MAIN"))
    return { speaker: "PROPULSION", text: "MECO — main engine cutoff confirmed." };
  if (m.includes("STAGE SEPARATION AVAILABLE"))
    return { speaker: "FLIGHT", text: "Flight, you are GO for staging." };
  if (m.includes("STAGE SEPARATION CONFIRMED"))
    return { speaker: "PROPULSION", text: "Separation confirmed — clean release." };
  if (m.includes("NO ULLAGE"))
    return { speaker: "PROPULSION", text: "Upper-stage propellant is floating. Ullage required." };
  if (m.includes("ORBIT SHORTFALL"))
    return { speaker: "GUIDANCE", text: "We are short of orbital velocity — deploy is inhibited." };
  if (m.includes("SES-1"))
    return { speaker: "PROPULSION", text: "SES-1 — upper-stage ignition confirmed." };
  if (m.includes("SECO"))
    return { speaker: "PROPULSION", text: "SECO — second engine cutoff confirmed." };
  if (m.includes("ORBITAL INSERTION"))
    return { speaker: "GUIDANCE", text: "Orbital insertion velocity reached." };
  if (m.includes("FAIRING JETTISON CONFIRMED"))
    return { speaker: "SPACECRAFT", text: "Fairing jettison confirmed — payload exposed." };
  if (m.includes("FAIRING JETTISON BELOW"))
    return { speaker: "RANGE", text: "Fairing jettison below the thermal limit — aero-thermal risk." };
  if (m.includes("PAYLOAD DEPLOY CONFIRMED"))
    return { speaker: "SPACECRAFT", text: "Payload deploy confirmed — beginning science downlink." };
  if (m.includes("PAYLOAD DEPLOY INHIBITED"))
    return { speaker: "FLIGHT", text: "Deploy inhibited — wait for SECO." };
  if (m.includes("SEPARATION INHIBITED"))
    return { speaker: "FLIGHT", text: "Separation inhibited — stage 1 is still burning." };
  if (m.includes("SINGLE-STAGE"))
    return { speaker: "FLIGHT", text: "Single-stage vehicle — no separation event." };
  if (m.includes("SCIENCE PAYLOAD ALREADY"))
    return { speaker: "SPACECRAFT", text: "Payload already deployed — science downlink active." };
  if (m.includes("DOWNLINK ACQUIRED"))
    return { speaker: "MCC", text: "Downlink acquired — telemetry nominal." };
  if (m.includes("S1 SIGNAL LOST"))
    return { speaker: "MCC", text: "Stage 1 beacon lost below the horizon." };
  if (m.includes("DOWNLINK COMPLETE"))
    return { speaker: "MCC", text: "Science data downlink complete." };
  if (m.includes("MISSION SUCCESS"))
    return { speaker: "FLIGHT", text: "Flight, mission success. Target achieved." };

  return { speaker: "MCC", text: m };
}
