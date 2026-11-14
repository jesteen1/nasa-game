import { getPart } from "../data/parts";
import type { BuildConfig, SlotId, Vehicle } from "../types";

/** Slots that must contain real hardware before the pad will clear a launch. */
const CORE_SLOTS: SlotId[] = ["s1Engine", "s1Tank", "fairing", "avionics"];

export function requiredSlotsFor(vehicle: Vehicle): SlotId[] {
  if (vehicle.stages === 2) {
    return [...CORE_SLOTS, "interstage", "s2Engine", "s2Tank"];
  }
  return CORE_SLOTS;
}

function slotFilled(vehicle: Vehicle, build: BuildConfig, slot: SlotId): boolean {
  try {
    const part = getPart(build[slot]);
    if (part.id.startsWith("none_")) return false;
    return part.tiers.includes(vehicle.tier);
  } catch {
    return false;
  }
}

/** Returns the required slots that are empty, missing or invalid for the tier. */
export function missingSlots(vehicle: Vehicle, build: BuildConfig): SlotId[] {
  return requiredSlotsFor(vehicle).filter((slot) => !slotFilled(vehicle, build, slot));
}

export function isVehicleComplete(vehicle: Vehicle, build: BuildConfig): boolean {
  return missingSlots(vehicle, build).length === 0;
}
