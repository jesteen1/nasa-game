import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getVehicle } from "../data/vehicles";
import { SimEngine } from "../sim/engine";
import LaunchScene, { buildVisualStack, vabLayout } from "./LaunchScene";

const STEP = 1 / 60;

const CALLOUT_STEP = 21;
const MAX_CALLOUT_ROWS = 10;
const HELPER_ROW_BOTTOM = 116; // title block + helper chip live in the first 116 px

describe("vabLayout chrome-safe zones", () => {
  it("keeps the phone preview free of the title/helper/stats overlays", () => {
    const phone = vabLayout(355, 380);
    expect(phone.showCallouts).toBe(false);
    expect(phone.centerX).toBe(178); // centred stack when the callout column is hidden
    expect(phone.topSafe).toBeGreaterThanOrEqual(HELPER_ROW_BOTTOM);
    expect(phone.baseY - phone.topSafe).toBeGreaterThanOrEqual(150); // usable rocket height
    expect(phone.baseY).toBeLessThanOrEqual(380 - 60); // stats bar stays clear
  });

  it("only shows the callout column when every label row fits", () => {
    expect(vabLayout(400, 459).showCallouts).toBe(false);
    const desktop = vabLayout(400, 460);
    expect(desktop.showCallouts).toBe(true);
    expect(desktop.labelStartY).toBeGreaterThan(HELPER_ROW_BOTTOM);
    const lastRowTop = desktop.labelStartY + (MAX_CALLOUT_ROWS - 1) * CALLOUT_STEP;
    expect(lastRowTop).toBeLessThanOrEqual(desktop.labelEndY);

    const tall = vabLayout(420, 700);
    expect(tall.showCallouts).toBe(true);
    expect(tall.labelStartY + (MAX_CALLOUT_ROWS - 1) * CALLOUT_STEP).toBeLessThanOrEqual(
      tall.labelEndY,
    );
  });

  it("handles the tablet 2x2 cell and very short panels without going negative", () => {
    const tablet = vabLayout(400, 409);
    expect(tablet.showCallouts).toBe(false);
    expect(tablet.baseY - tablet.topSafe).toBeGreaterThan(0);

    const tiny = vabLayout(300, 210);
    expect(tiny.baseY).toBeGreaterThan(tiny.topSafe);
    expect(tiny.baseY).toBeLessThanOrEqual(210);
  });
});

describe("LaunchScene & buildVisualStack", () => {
  it("constructs all rocket parts in the VAB and initial flight stack", () => {
    const vehicle = getVehicle(3); // Artemis Heavy (2 stages + SRB boosters)
    const nodes = buildVisualStack(vehicle, vehicle.defaults, null, true);
    const slots = nodes.map((n) => n.slot);

    expect(slots).toEqual([
      "fairing",
      "avionics",
      "ullage",
      "s2Tank",
      "s2Engine",
      "interstage",
      "s1Tank",
      "s1Engine",
    ]);

    const s1TankNode = nodes.find((n) => n.slot === "s1Tank");
    expect(s1TankNode?.radialLeft?.id).toBe("booster_srb_5seg");
    expect(s1TankNode?.radialRight?.id).toBe("booster_srb_5seg");
  });

  it("keeps all parts together during Stage 1 flight, detaches Stage 1 at separation, and exposes payload past 100 km", () => {
    const vehicle = getVehicle(2);
    const engine = new SimEngine(vehicle, vehicle.defaults);

    // Step into Stage 1 flight
    for (let i = 0; i < 25 / STEP; i++) engine.step(STEP);
    const s1Nodes = buildVisualStack(vehicle, vehicle.defaults, engine.getSnapshot(), false);
    expect(s1Nodes.map((n) => n.slot)).toEqual([
      "fairing",
      "avionics",
      "ullage",
      "s2Tank",
      "s2Engine",
      "interstage",
      "s1Tank",
      "s1Engine",
    ]);

    // Step until MECO, then stage and climb past 100 km
    while (!engine.getSnapshot().stage1Burnout) {
      engine.step(STEP);
    }
    engine.action("stage");
    while (engine.getSnapshot().h < 100_000) {
      engine.step(STEP);
    }
    engine.action("fairing");

    const snap = engine.getSnapshot();
    expect(snap.h).toBeGreaterThanOrEqual(100_000);
    const s2Nodes = buildVisualStack(vehicle, vehicle.defaults, snap, false);
    expect(s2Nodes.map((n) => n.slot)).toEqual([
      "payload",
      "avionics",
      "ullage",
      "s2Tank",
      "s2Engine",
    ]);
  });

  it("renders the viewport shell on the server without crashing", () => {
    const vehicle = getVehicle(1);
    const engineRef = { current: null };
    const html = renderToStaticMarkup(
      <LaunchScene engineRef={engineRef} vehicle={vehicle} build={vehicle.defaults} />,
    );
    expect(html).toContain("Launch vehicle viewport");
    expect(html).toContain("Construct rocket");
    expect(html).toContain("Tap a section to build");
    expect(html).toContain("Click any rocket section to construct");
  });
});
