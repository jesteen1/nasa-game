import type { BuildConfig, SlotId, Vehicle } from "../types";
import { getPart, partsForSlot, SLOT_CATEGORY, SLOT_LABEL, SLOT_ORDER } from "./parts";

export interface AssemblyMatch {
  slot: SlotId;
  /** The available part to highlight, or null for a slot-only match. */
  partId: string | null;
  partName: string;
  label: string;
  installed: boolean;
  kind: "slot" | "part";
}

/**
 * Finds assembly slots and tier-available parts for the VAB search bar.
 * Slot matches come first, then part matches in slot order.
 */
export function searchAssembly(
  vehicle: Vehicle,
  build: BuildConfig,
  query: string,
  limit = 6,
): AssemblyMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: AssemblyMatch[] = [];

  for (const slot of SLOT_ORDER) {
    const label = SLOT_LABEL[slot];
    const installedId = build[slot];
    const installedPart = getPart(installedId);

    if (label.toLowerCase().includes(q)) {
      results.push({
        slot,
        partId: null,
        partName: installedPart.name,
        label,
        installed: true,
        kind: "slot",
      });
    }

    for (const part of partsForSlot(SLOT_CATEGORY[slot], vehicle.tier)) {
      if (part.id.startsWith("none_")) continue;
      if (
        part.name.toLowerCase().includes(q) ||
        part.short.toLowerCase().includes(q)
      ) {
        results.push({
          slot,
          partId: part.id,
          partName: part.name,
          label,
          installed: part.id === installedId,
          kind: "part",
        });
      }
    }
  }

  return results.slice(0, limit);
}
