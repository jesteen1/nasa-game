import { describe, expect, it } from "vitest";
import { evaluateFailure, type RuleContext } from "../sim/failures";

const base: RuleContext = {
  t: 0,
  h: 0,
  qKpa: 0,
  throttle: 1,
  stage: 1,
  twr: 1.4,
  control: "fins",
  fairingAttached: true,
  separated: false,
  stage1Burnout: false,
  s1VacuumNozzle: false,
  s1MaxQKpa: 60,
  tankMaxQKpa: 80,
  hammerhead: false,
  weakInterstage: false,
  uninsulatedLH2: false,
  vehicleStages: 1,
};

describe("evaluateFailure", () => {
  it("returns null for a nominal flight state", () => {
    expect(evaluateFailure({ ...base, t: 30 }, new Set())).toBeNull();
  });

  it("detects a vacuum nozzle firing at sea level", () => {
    const def = evaluateFailure({ ...base, t: 1, s1VacuumNozzle: true }, new Set());
    expect(def?.id).toBe("nozzle_overexpanded");
  });

  it("detects cryogenic boil-off before ignition", () => {
    const def = evaluateFailure({ ...base, t: 5, uninsulatedLH2: true }, new Set());
    expect(def?.id).toBe("cryo_boiloff");
  });

  it("detects a pad burn at TWR < 1", () => {
    const def = evaluateFailure({ ...base, t: 9, twr: 0.82 }, new Set());
    expect(def?.id).toBe("pad_burn");
  });

  it("detects pitch divergence without attitude control", () => {
    const def = evaluateFailure({ ...base, t: 13, control: "none", h: 5000 }, new Set());
    expect(def?.id).toBe("pitch_divergence");
  });

  it("snaps a hammerhead fairing on a weak interstage at Max Q", () => {
    const def = evaluateFailure(
      { ...base, t: 70, h: 14000, qKpa: 33, hammerhead: true, weakInterstage: true },
      new Set(),
    );
    expect(def?.id).toBe("interstage_snap");
  });

  it("exceeds the structural redline at high dynamic pressure", () => {
    const def = evaluateFailure({ ...base, t: 65, qKpa: 72, throttle: 1 }, new Set());
    expect(def?.id).toBe("max_q_exceeded");
  });

  it("does not re-fire an already handled failure", () => {
    const fired = new Set(["pad_burn"]);
    expect(evaluateFailure({ ...base, t: 9, twr: 0.82 }, fired)).toBeNull();
  });
});
