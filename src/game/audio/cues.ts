import type { SfxCue } from "./sfx";
import type { SimEvent } from "../types";

/**
 * Maps a simulation event to one or more sound cues. Order matters: cues are
 * played in array order so mechanical sounds (clamp/latch) precede the boom.
 */
export function cuesForEvent(event: SimEvent): SfxCue[] {
  const message = event.message;
  if (message.includes("LIFTOFF")) return ["clamp", "liftoff"];
  if (message.includes("STAGE SEPARATION")) return ["latch", "puff"];
  if (message.includes("SES-1")) return ["ignition"];
  if (message.includes("MECO") || message.includes("SECO")) return ["separation"];
  if (message.includes("FAIRING JETTISON")) return ["fairing"];
  if (message.includes("PAYLOAD DEPLOY")) return ["deploy"];
  if (message.includes("MAX Q")) return ["boom"];
  if (message.includes("MISSION SUCCESS")) return ["success"];
  if (message.includes("ABORT")) return ["abort"];
  if (event.tone === "bad") return ["failure"];
  return [];
}
