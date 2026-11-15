import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getPart, PARTS, SLOT_LABEL } from "../data/parts";
import { VEHICLES } from "../data/vehicles";
import type { SlotId } from "../types";
import PartIcon, { partBadges } from "./PartIcon";
import VabPanel from "./VabPanel";

describe("PartIcon & VabPanel icons", () => {
  it("renders a valid SVG icon for every rocket part in the library", () => {
    for (const part of PARTS) {
      const markup = renderToStaticMarkup(<PartIcon part={part} />);
      expect(markup).toContain("<svg");
      expect(markup).toContain(`data-part-icon="${part.id}"`);
    }
  });

  it("renders a slot icon for all 10 VAB slots", () => {
    const slots = Object.keys(SLOT_LABEL) as SlotId[];
    for (const slot of slots) {
      const markup = renderToStaticMarkup(<PartIcon slot={slot} />);
      expect(markup).toContain("<svg");
      expect(markup).toContain(`data-slot-icon="${slot}"`);
    }
  });

  it("produces informative hardware badges for distinct part variants", () => {
    expect(partBadges(getPart("none_engine"))).toEqual([]);
    expect(partBadges(getPart("eng_merlin_vac")).map((b) => b.label)).toContain("VAC NOZZLE");
    expect(partBadges(getPart("eng_merlin_1d")).map((b) => b.label)).toContain("SEA-LEVEL");
    expect(partBadges(getPart("eng_htpb_solid")).map((b) => b.label)).toContain("SOLID");
    expect(partBadges(getPart("tank_t3_lh2")).map((b) => b.label)).toContain("CRYO INSULATED");
    expect(partBadges(getPart("tank_lh2_uninsulated")).map((b) => b.label)).toContain("UNINSULATED");
    expect(partBadges(getPart("fairing_hammerhead")).map((b) => b.label)).toContain("HAMMERHEAD");
  });

  it("renders VabPanel with slot icons and open part option icons", () => {
    const markup = renderToStaticMarkup(<VabPanel vehicle={VEHICLES[0]} />);
    expect(markup).toContain('data-slot-icon="s1Engine"');
    expect(markup).toContain('data-slot-icon="s1Tank"');
    expect(markup).toContain('data-part-icon="eng_merlin_1d"');
    expect(markup).toContain('data-part-icon="eng_merlin_vac"');
  });
});
