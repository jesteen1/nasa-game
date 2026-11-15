import type { Part, PartCategory, SlotId } from "../types";
import { SLOT_CATEGORY } from "../data/parts";

export interface PartIconProps {
  part?: Part;
  slot?: SlotId;
  category?: PartCategory;
  size?: number;
  className?: string;
}

export interface PartBadge {
  label: string;
  tone: "cyan" | "amber" | "slate";
}

export function partBadges(part: Part): PartBadge[] {
  if (part.id.startsWith("none_") || part.id === "interstage_none") {
    return [];
  }
  const badges: PartBadge[] = [];

  if (part.category === "engine") {
    if (part.propellant === "SOLID") {
      badges.push({ label: "SOLID", tone: "amber" });
    } else if (part.nozzleType === "vacuum_bell") {
      badges.push({ label: "VAC NOZZLE", tone: "cyan" });
    } else if (part.nozzleType === "sea_level_bell") {
      badges.push({ label: "SEA-LEVEL", tone: "slate" });
    }
    if (part.gimbalRangeDeg > 0) {
      badges.push({ label: `${part.gimbalRangeDeg}° GIMBAL`, tone: "slate" });
    }
  } else if (part.category === "tank") {
    if (part.propellant === "LH2_LOX" || part.propellant === "CH4_LOX") {
      badges.push(
        part.cryoInsulated
          ? { label: "CRYO INSULATED", tone: "cyan" }
          : { label: "UNINSULATED", tone: "amber" },
      );
    } else if (part.propellant === "SOLID") {
      badges.push({ label: "SOLID GRAIN", tone: "amber" });
    } else if (part.propellant === "RP1_LOX") {
      badges.push({ label: "RP-1 / LOX", tone: "slate" });
    }
  } else if (part.category === "booster") {
    badges.push({ label: "TWIN SRB", tone: "amber" });
  } else if (part.category === "fairing") {
    if (part.hammerhead) {
      badges.push({ label: "HAMMERHEAD", tone: "amber" });
    } else {
      badges.push({ label: `Ø ${part.widthM}m`, tone: "slate" });
    }
  } else if (part.category === "interstage") {
    if (part.structuralRatingKpa < 35) {
      badges.push({ label: "LIGHT RING", tone: "amber" });
    } else {
      badges.push({ label: "COMPOSITE", tone: "cyan" });
    }
  } else if (part.category === "fins") {
    if (part.finAreaM2 > 0) {
      badges.push({ label: "PASSIVE AERO", tone: "cyan" });
    }
  } else if (part.category === "ullage") {
    if (part.ullageThrusters) {
      badges.push({ label: "ZERO-G SETTLE", tone: "cyan" });
    }
  } else if (part.category === "avionics") {
    badges.push({ label: "GUIDANCE", tone: "cyan" });
  }

  return badges;
}

function renderCategoryGlyph(
  category: PartCategory,
  part: Part | undefined,
  stroke: string,
  accent: string,
  isEmpty: boolean,
) {
  switch (category) {
    case "engine": {
      const isVac = part?.nozzleType === "vacuum_bell";
      const isSolid = part?.propellant === "SOLID";

      if (isSolid && !isEmpty) {
        return (
          <g>
            {/* Solid motor casing + nozzle */}
            <rect x="8" y="3" width="8" height="11" rx="1.2" fill={accent} fillOpacity="0.22" stroke={stroke} strokeWidth="1.5" />
            <line x1="8" y1="6.5" x2="16" y2="6.5" stroke={stroke} strokeWidth="1" strokeOpacity="0.6" />
            <line x1="8" y1="10" x2="16" y2="10" stroke={stroke} strokeWidth="1" strokeOpacity="0.6" />
            <path d="M9.5 14 L7 19.5 H17 L14.5 14 Z" fill={accent} fillOpacity="0.35" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M9.5 20.5 L12 23 L14.5 20.5" stroke="#ffb300" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </g>
        );
      }

      if (isVac && !isEmpty) {
        return (
          <g>
            {/* Turbopump / powerhead */}
            <rect x="8.5" y="2.5" width="7" height="4.5" rx="1" fill={accent} fillOpacity="0.2" stroke={stroke} strokeWidth="1.5" />
            <line x1="12" y1="1.2" x2="12" y2="2.5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
            {/* Wide high-expansion vacuum bell nozzle */}
            <path
              d="M9.2 7 C7.2 10.5 5 15 4.5 19.5 H19.5 C19 15 16.8 10.5 14.8 7 Z"
              fill={accent}
              fillOpacity="0.32"
              stroke={stroke}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            {/* Cooling channels */}
            <line x1="6.2" y1="13" x2="17.8" y2="13" stroke={stroke} strokeWidth="1" strokeOpacity="0.55" />
            <line x1="5.3" y1="16.2" x2="18.7" y2="16.2" stroke={stroke} strokeWidth="1" strokeOpacity="0.55" />
            {/* Vacuum plume */}
            <path d="M8.5 20.8 L12 23 L15.5 20.8" stroke="#00e5ff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          </g>
        );
      }

      // Default / Sea-level bell engine
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Gimbal mount + combustion chamber */}
          <line x1="12" y1="1.5" x2="12" y2="3.5" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="8" y="3.5" width="8" height="5" rx="1.2" fill={accent} fillOpacity={isEmpty ? "0.06" : "0.24"} stroke={stroke} strokeWidth="1.5" />
          {/* Sea-level bell nozzle */}
          <path
            d="M9.2 8.5 L6.2 18 H17.8 L14.8 8.5 Z"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.32"}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="7.4" y1="14" x2="16.6" y2="14" stroke={stroke} strokeWidth="1.1" strokeOpacity="0.6" />
          {!isEmpty && (
            <path d="M9 19.5 L12 22.8 L15 19.5" stroke="#ffb300" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </g>
      );
    }

    case "tank": {
      const isCryo = part?.propellant === "LH2_LOX" || part?.propellant === "CH4_LOX";
      const isBareCryo = isCryo && part && !part.cryoInsulated;
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Cylindrical pressurized tank with upper/lower domes */}
          <rect
            x="6.5"
            y="2.5"
            width="11"
            height="19"
            rx="3.2"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.25"}
            stroke={stroke}
            strokeWidth="1.5"
          />
          {/* Internal dome bulkheads */}
          <line x1="6.8" y1="7.5" x2="17.2" y2="7.5" stroke={stroke} strokeWidth="1.1" strokeOpacity="0.65" />
          <line x1="6.8" y1="16.5" x2="17.2" y2="16.5" stroke={stroke} strokeWidth="1.1" strokeOpacity="0.65" />
          {/* Feedline / pressurization pipe */}
          <line x1="12" y1="4.5" x2="12" y2="19.5" stroke={stroke} strokeWidth="1.1" strokeOpacity="0.5" />
          {/* Cryo frost / warning marker for bare tank */}
          {!isEmpty && isBareCryo && (
            <path d="M9.5 12 L12 9.5 L14.5 12 L12 14.5 Z" fill="#ffb300" stroke="#ffb300" strokeWidth="0.8" />
          )}
          {!isEmpty && isCryo && !isBareCryo && (
            <circle cx="12" cy="12" r="2" fill="#00e5ff" fillOpacity="0.5" stroke={stroke} strokeWidth="1" />
          )}
        </g>
      );
    }

    case "booster": {
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Left SRB */}
          <path
            d="M4.5 6.5 L6.5 3 L8.5 6.5 V18.5 H4.5 Z"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.28"}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M5 18.5 L4.2 21 H8.8 L8 18.5" stroke={stroke} strokeWidth="1.3" fill="none" />
          {/* Right SRB */}
          <path
            d="M15.5 6.5 L17.5 3 L19.5 6.5 V18.5 H15.5 Z"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.28"}
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path d="M16 18.5 L15.2 21 H19.8 L19 18.5" stroke={stroke} strokeWidth="1.3" fill="none" />
          {/* Radial attach struts to center core */}
          <line x1="8.5" y1="9.5" x2="15.5" y2="9.5" stroke={stroke} strokeWidth="1.3" strokeOpacity="0.7" />
          <line x1="8.5" y1="15.5" x2="15.5" y2="15.5" stroke={stroke} strokeWidth="1.3" strokeOpacity="0.7" />
        </g>
      );
    }

    case "fins": {
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Center body tube */}
          <rect x="9.5" y="4" width="5" height="16" rx="1" fill={accent} fillOpacity={isEmpty ? "0.05" : "0.18"} stroke={stroke} strokeWidth="1.4" />
          {/* Left swept aero fin */}
          <path
            d="M9.5 9 L3 16.5 L3 20 L9.5 18 Z"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.35"}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Right swept aero fin */}
          <path
            d="M14.5 9 L21 16.5 L21 20 L14.5 18 Z"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.35"}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>
      );
    }

    case "interstage": {
      const isWeak = part && part.structuralRatingKpa < 35;
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Upper and lower stage flange rings */}
          <rect x="5" y="5" width="14" height="2.5" rx="0.6" fill={accent} fillOpacity="0.3" stroke={stroke} strokeWidth="1.4" />
          <rect x="5" y="16.5" width="14" height="2.5" rx="0.6" fill={accent} fillOpacity="0.3" stroke={stroke} strokeWidth="1.4" />
          {/* Cross-braced interstage lattice */}
          <line x1="6" y1="7.5" x2="6" y2="16.5" stroke={stroke} strokeWidth="1.4" />
          <line x1="18" y1="7.5" x2="18" y2="16.5" stroke={stroke} strokeWidth="1.4" />
          <line x1="6.5" y1="7.8" x2="12" y2="16.2" stroke={isWeak ? "#ffb300" : stroke} strokeWidth="1.2" />
          <line x1="12" y1="7.8" x2="6.5" y2="16.2" stroke={isWeak ? "#ffb300" : stroke} strokeWidth="1.2" />
          <line x1="12" y1="7.8" x2="17.5" y2="16.2" stroke={isWeak ? "#ffb300" : stroke} strokeWidth="1.2" />
          <line x1="17.5" y1="7.8" x2="12" y2="16.2" stroke={isWeak ? "#ffb300" : stroke} strokeWidth="1.2" />
        </g>
      );
    }

    case "ullage": {
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Stage skirt band */}
          <rect x="7.5" y="6" width="9" height="11" rx="1.2" fill={accent} fillOpacity={isEmpty ? "0.05" : "0.18"} stroke={stroke} strokeWidth="1.4" />
          {/* Left & right ullage thruster pods */}
          <rect x="4" y="8.5" width="3.5" height="5.5" rx="0.8" fill={accent} fillOpacity="0.35" stroke={stroke} strokeWidth="1.3" />
          <rect x="16.5" y="8.5" width="3.5" height="5.5" rx="0.8" fill={accent} fillOpacity="0.35" stroke={stroke} strokeWidth="1.3" />
          {/* Settling thrust jets */}
          {!isEmpty && (
            <>
              <path d="M4.5 15.5 L5.7 19.5 L7 15.5" stroke="#00e5ff" strokeWidth="1.3" strokeLinecap="round" fill="none" />
              <path d="M17 15.5 L18.3 19.5 L19.5 15.5" stroke="#00e5ff" strokeWidth="1.3" strokeLinecap="round" fill="none" />
            </>
          )}
        </g>
      );
    }

    case "fairing": {
      const isHammerhead = Boolean(part?.hammerhead);
      if (isHammerhead && !isEmpty) {
        return (
          <g>
            {/* Bulbous Hammerhead Fairing */}
            <path
              d="M12 2.5 C7.5 5 4.5 8.5 4.5 13 C4.5 15.5 6.8 17 7.8 18.5 H16.2 C17.2 17 19.5 15.5 19.5 13 C19.5 8.5 16.5 5 12 2.5 Z"
              fill={accent}
              fillOpacity="0.3"
              stroke="#ffb300"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="12" y1="3" x2="12" y2="18.5" stroke="#ffb300" strokeWidth="1.1" strokeDasharray="2 1.5" />
            <rect x="7.8" y="18.5" width="8.4" height="2.5" fill={accent} fillOpacity="0.2" stroke={stroke} strokeWidth="1.3" />
          </g>
        );
      }
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Ogive clamshell payload fairing */}
          <path
            d="M12 2.5 C8.5 6 6.5 10.5 6.5 16.5 V20.5 H17.5 V16.5 C17.5 10.5 15.5 6 12 2.5 Z"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.28"}
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Clamshell separation seam */}
          <line x1="12" y1="3" x2="12" y2="20.5" stroke={stroke} strokeWidth="1.1" strokeOpacity="0.65" strokeDasharray="2 1.5" />
          <line x1="6.5" y1="16.5" x2="17.5" y2="16.5" stroke={stroke} strokeWidth="1.1" strokeOpacity="0.55" />
        </g>
      );
    }

    case "avionics": {
      return (
        <g strokeDasharray={isEmpty ? "2 1.5" : undefined}>
          {/* Guidance ring chassis */}
          <rect
            x="4.5"
            y="7.5"
            width="15"
            height="9"
            rx="2"
            fill={accent}
            fillOpacity={isEmpty ? "0.06" : "0.22"}
            stroke={stroke}
            strokeWidth="1.5"
          />
          {/* Flight computer core + telemetry traces */}
          <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" fill={stroke} fillOpacity={isEmpty ? "0.15" : "0.35"} stroke={stroke} strokeWidth="1.2" />
          <line x1="6.5" y1="12" x2="9.5" y2="12" stroke={stroke} strokeWidth="1.2" />
          <line x1="14.5" y1="12" x2="17.5" y2="12" stroke={stroke} strokeWidth="1.2" />
          {/* Telemetry antenna */}
          <line x1="12" y1="4" x2="12" y2="7.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="12" cy="3.5" r="1.1" fill={stroke} />
        </g>
      );
    }
  }
}

export default function PartIcon({
  part,
  slot,
  category,
  size = 24,
  className = "",
}: PartIconProps) {
  const resolvedCategory: PartCategory =
    part?.category ?? category ?? (slot ? SLOT_CATEGORY[slot] : "engine");
  const isEmpty = Boolean(
    part && (part.id.startsWith("none_") || part.id === "interstage_none"),
  );

  const stroke = isEmpty
    ? "#6e84a3"
    : part?.category === "avionics"
      ? "#00e5ff"
      : part?.tint || "#9fb3c8";
  const accent = isEmpty ? "#3a4d68" : part?.tint || "#00e5ff";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
      data-part-icon={part?.id ?? resolvedCategory}
      data-slot-icon={slot ?? undefined}
    >
      {renderCategoryGlyph(resolvedCategory, part, stroke, accent, isEmpty)}
    </svg>
  );
}
