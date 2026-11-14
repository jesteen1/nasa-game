import { getPart } from "../data/parts";
import type {
  BuildConfig,
  FailureDef,
  FailureEvent,
  FlightStatus,
  MissionResult,
  Part,
  SimEvent,
  SimSnapshot,
  TelemetrySample,
  Vehicle,
  VehicleStats,
  Warning,
} from "../types";
import {
  atmosphere,
  dragCoefficient,
  gravity,
  machNumber,
} from "./atmosphere";
import { evaluateFailure, makeFailure, FAILURE_DEFS, type RuleContext } from "./failures";
import { computeStats, insertionVelocity } from "./vehicle";

const G0 = 9.80665;
const DEG = Math.PI / 180;
const KM = 1000;

export class SimEngine {
  readonly vehicle: Vehicle;
  readonly build: BuildConfig;
  readonly stats: VehicleStats;
  readonly samples: TelemetrySample[] = [];

  private readonly e1: Part;
  private readonly t1: Part;
  private readonly e2: Part;
  private readonly t2: Part;
  private readonly finPart: Part;
  private readonly interstagePart: Part;
  private readonly fairingPart: Part;
  private readonly ullagePart: Part;

  private t = -10;
  private h = 0;
  private x = 0;
  private vx = 0;
  private vy = 0;
  private massKg: number;
  private prop1: number;
  private prop2: number;
  private stage: 1 | 2 = 1;
  private stage1Burnout = false;
  private separated = false;
  private separatedAt = 0;
  private stage2Ignited = false;
  private seco = false;
  private fairingAttached = true;
  private deployed = false;
  private status: FlightStatus = "countdown";
  private failure: FailureEvent | null = null;
  private warnings: Warning[] = [];
  private events: SimEvent[] = [];
  private fired = new Set<string>();
  private eventKeys = new Set<string>();
  private pending: { at: number; id: string; cause: string }[] = [];
  private maxQ = 0;
  private maxG = 0;
  private gForce = 1;
  private deltaVSpent = 0;
  private throttle = 1;
  private sampleClock = 0;
  private snap: SimSnapshot;

  constructor(vehicle: Vehicle, build: BuildConfig) {
    this.vehicle = vehicle;
    this.build = build;
    this.stats = computeStats(vehicle, build);
    this.e1 = getPart(build.s1Engine);
    this.t1 = getPart(build.s1Tank);
    this.e2 = getPart(build.s2Engine);
    this.t2 = getPart(build.s2Tank);
    this.finPart = getPart(build.fins);
    this.interstagePart = getPart(build.interstage);
    this.fairingPart = getPart(build.fairing);
    this.ullagePart = getPart(build.ullage);

    this.massKg = this.stats.totalWetKg;
    this.prop1 = this.stats.stage1.propellantKg;
    this.prop2 = this.stats.stage2.propellantKg;

    this.pushEvent("t-minus", "TERMINAL COUNT — HOLD-DOWN CLAMPS ENGAGED", "info");
    this.samples.push({ t: this.t, h: 0, speed: 0, q: 0, g: 1 });
    this.snap = this.buildSnapshot();
  }

  setThrottle(value: number) {
    this.throttle = Math.max(0.3, Math.min(1, value));
    this.snap = this.buildSnapshot();
  }

  getSnapshot(): SimSnapshot {
    return this.snap;
  }

  getResult(): MissionResult {
    const margin = Math.max(0, this.stats.deltaV - this.vehicle.target.deltaV);
    const discipline = this.maxQ <= 35 ? 250 : this.maxQ <= 45 ? 100 : 0;
    const score = this.snap.status === "success"
      ? Math.round(1000 + margin * 0.2 + discipline + Math.min(this.maxG, 6) * 25)
      : Math.round(150 + this.deltaVSpent * 0.05 + this.maxQ * 2);
    return {
      success: this.snap.status === "success",
      tier: this.vehicle.tier,
      vehicleName: this.vehicle.name,
      score,
      deltaVSpent: this.deltaVSpent,
      maxQ: this.maxQ,
      maxG: this.maxG,
      failure: this.failure,
      timeS: this.t,
    };
  }

  action(kind: "stage" | "fairing" | "deploy" | "abort") {
    if (this.snap.status === "success" || this.snap.status === "failure") return;

    if (kind === "abort") {
      this.trigger(FAILURE_DEFS.abort, "Flight director abort");
      this.refresh();
      return;
    }

    if (kind === "stage") {
      if (this.vehicle.stages === 1) {
        this.pushEvent("stage-single", "SINGLE-STAGE VEHICLE — NO SEPARATION EVENT", "warn");
      } else if (!this.stage1Burnout) {
        this.pushEvent(
          "stage-early",
          "SEPARATION INHIBITED — STAGE 1 STILL BURNING",
          "warn",
        );
      } else if (!this.separated) {
        this.separate();
      }
      this.refresh();
      return;
    }

    if (kind === "fairing") {
      if (!this.fairingAttached) return;
      this.fairingAttached = false;
      this.massKg = Math.max(1, this.massKg - this.fairingPart.massKg);
      if (this.h < 80 * KM) {
        this.pushEvent(
          "fairing-early",
          "FAIRING JETTISON BELOW 80 KM — AERO-THERMAL RISK",
          "warn",
        );
        this.pending.push({
          at: this.t + 3,
          id: "early_fairing",
          cause: "Fairing jettisoned below the 80 km thermal limit",
        });
      } else {
        this.pushEvent("fairing", "FAIRING JETTISON CONFIRMED", "good");
      }
      this.refresh();
      return;
    }

    if (kind === "deploy") {
      if (this.vehicle.stages === 1) {
        this.pushEvent("deploy-single", "SCIENCE PAYLOAD ALREADY DEPLOYED", "info");
        return;
      }
      if (!this.seco) {
        this.pushEvent("deploy-early", "DEPLOY INHIBITED — SECO REQUIRED", "warn");
        return;
      }
      if (this.deployed) return;
      this.deployed = true;
      this.massKg = Math.max(1, this.massKg - this.vehicle.payloadKg);
      const needed = insertionVelocity(this.vehicle);
      if (Math.hypot(this.vx, this.vy) >= needed) {
        this.pushEvent("deploy", "PAYLOAD DEPLOY CONFIRMED", "good");
        this.succeed();
      } else {
        this.trigger(
          FAILURE_DEFS.unstable_orbit,
          "Payload released below orbital velocity",
        );
      }
      this.refresh();
    }
  }

  step(dt: number) {
    if (this.status === "success" || this.status === "failure") return;

    this.t += dt;

    if (this.status === "countdown") {
      if (this.t < 0) {
        this.runRuleChecks();
        this.updateWarnings(0, 0, 0);
        this.refresh();
        return;
      }
      this.status = "flying";
      this.pushEvent("liftoff", "LIFTOFF — HOLD-DOWN CLAMPS RELEASED", "good");
    }

    const atm = atmosphere(this.h);
    const g = gravity(this.h);
    const pRatio = Math.min(1, atm.pressure / 101_325);
    const speed = Math.hypot(this.vx, this.vy);

    let thrustKn = 0;
    let isp = 0;
    let burning = 0;

    if (this.stage === 1 && !this.stage1Burnout && this.prop1 > 0) {
      const sl = this.stats.stage1.thrustSlKn;
      const vac = this.stats.stage1.thrustVacKn;
      thrustKn = (vac + (sl - vac) * pRatio) * this.throttle;
      isp = this.stats.stage1.isp;
      burning = 1;
    } else if (
      this.stage === 2 &&
      this.stage2Ignited &&
      !this.seco &&
      this.prop2 > 0
    ) {
      const sl = this.stats.stage2.thrustSlKn;
      const vac = this.stats.stage2.thrustVacKn;
      thrustKn = (vac + (sl - vac) * pRatio) * this.throttle;
      isp = this.stats.stage2.isp;
      burning = 2;
    }

    if (thrustKn > 0 && isp > 0) {
      const flow = (thrustKn * 1000) / (isp * G0);
      const available = burning === 1 ? this.prop1 : this.prop2;
      const burn = Math.min(available, flow * dt);
      if (burning === 1) this.prop1 -= burn;
      else this.prop2 -= burn;
      this.massKg = Math.max(1, this.massKg - burn);
      this.deltaVSpent += ((thrustKn * 1000) / this.massKg) * dt;
    }

    if (this.stage === 1 && this.prop1 <= 0.5 && !this.stage1Burnout) {
      this.stage1Burnout = true;
      this.prop1 = 0;
      this.pushEvent("meco", "MECO — MAIN ENGINE CUTOFF", "warn");
      this.pushEvent("meco-stage", "STAGE SEPARATION AVAILABLE — PRESS STAGE", "warn");
    }
    if (this.stage === 2 && this.stage2Ignited && this.prop2 <= 0.5 && !this.seco) {
      this.seco = true;
      this.prop2 = 0;
      this.pushEvent("seco", "SECO — SECOND ENGINE CUTOFF", "good");
      if (this.h > 100 * KM) {
        this.pushEvent("orbit", "ORBITAL INSERTION VELOCITY REACHED", "good");
      }
    }

    if (
      this.separated &&
      !this.stage2Ignited &&
      this.t - this.separatedAt >= 2 &&
      this.vehicle.stages === 2 &&
      this.e2.id !== "none_engine"
    ) {
      this.stage2Ignited = true;
      this.pushEvent("ses-1", "SES-1 — UPPER STAGE IGNITION", "good");
    }

    // Ascent pitch program
    const profile = this.vehicle.ascent;
    const pitchDeg =
      this.t < profile.pitchStartS
        ? 0
        : Math.min(profile.maxPitchDeg, (this.t - profile.pitchStartS) * profile.pitchRate);
    const theta = Math.PI / 2 - pitchDeg * DEG;
    const v = Math.max(speed, 0.001);

    const mach = machNumber(v, this.h);
    const cd = dragCoefficient(mach);
    const area = Math.PI * (this.stats.coreWidthM / 2) ** 2 * 1.1;
    const drag = 0.5 * atm.density * v * v * cd * area;
    const dragX = (this.vx / v) * drag;
    const dragY = (this.vy / v) * drag;
    const thrustN = thrustKn * 1000;

    const ax = (thrustN * Math.cos(theta) - dragX) / this.massKg;
    const ay = (thrustN * Math.sin(theta) - dragY) / this.massKg - g;

    this.vx += ax * dt;
    this.vy += ay * dt;
    this.h += this.vy * dt;
    this.x += this.vx * dt;

    if (this.h <= 0 && this.t < 60) {
      this.h = 0;
      if (this.vy < 0) this.vy = 0;
      this.vx = 0;
    }

    const q = 0.5 * atm.density * v * v;
    const qKpa = q / 1000;
    const gForce = Math.hypot(ax, ay) / G0;
    const speedNow = Math.hypot(this.vx, this.vy);
    this.gForce = gForce;

    this.maxQ = Math.max(this.maxQ, qKpa);
    this.maxG = Math.max(this.maxG, gForce);

    if (this.h > 0 && this.h >= 10 * KM) {
      this.pushEvent("tower-clear", "TOWER CLEAR — PITCH PROGRAM ACTIVE", "info");
    }
    if (this.h >= 100 * KM) {
      this.pushEvent("karman", "KÁRMÁN LINE CROSSED — 100 KM", "good");
    }
    if (qKpa >= 28) {
      this.pushEvent("max-q", "MAX Q — THROTTLE DOWN IF STRESS RISES", "warn");
    }

    this.sampleClock += dt;
    if (this.sampleClock >= 0.25) {
      this.sampleClock = 0;
      this.samples.push({
        t: Math.max(0, this.t),
        h: Math.max(0, this.h),
        speed: speedNow,
        q: qKpa,
        g: gForce,
      });
      if (this.samples.length > 4000) this.samples.splice(0, 1000);
    }

    this.updateWarnings(qKpa, speedNow, gForce);
    this.runRuleChecks(qKpa);

    if (this.snap.status !== "failure") {
      if (this.h < 0 && this.t > 20) {
        this.trigger(FAILURE_DEFS.crash, "Trajectory crossed the surface");
      } else if (
        this.vehicle.target.kind === "suborbital" &&
        this.h >= this.vehicle.target.altitudeKm * KM
      ) {
        this.succeed();
      } else if (this.t > 1200) {
        this.trigger(FAILURE_DEFS.timeout, "Target not achieved before propellant exhaustion");
      }
    }

    this.refresh();
  }

  private separate() {
    this.separated = true;
    this.separatedAt = this.t;
    this.stage = 2;
    this.massKg = Math.max(1, this.massKg - this.stats.stage1.dryKg);
    this.pushEvent("separation", "STAGE SEPARATION CONFIRMED", "good");

    const liquidUpper =
      this.e2.propellant !== "SOLID" && this.e2.propellant !== "NONE";
    if (liquidUpper && !this.ullagePart.ullageThrusters) {
      this.pushEvent(
        "ullage-risk",
        "NO ULLAGE THRUSTERS — PROPELLANT FLOATING IN ZERO-G",
        "warn",
      );
      this.pending.push({
        at: this.t + 1.6,
        id: "ullage_cavitation",
        cause: "Upper-stage turbopump ingested gas bubbles during restart",
      });
    }
  }

  private runRuleChecks(qKpa = 0) {
    for (const p of [...this.pending]) {
      if (this.t >= p.at) {
        this.pending = this.pending.filter((item) => item !== p);
        this.trigger(FAILURE_DEFS[p.id], p.cause);
        return;
      }
    }
    if (this.snap.status === "failure" || this.snap.status === "success") return;

    const ctx: RuleContext = {
      t: this.t,
      h: this.h,
      qKpa,
      throttle: this.throttle,
      stage: this.stage,
      twr: this.stats.twr,
      control: this.stats.control,
      fairingAttached: this.fairingAttached,
      separated: this.separated,
      stage1Burnout: this.stage1Burnout,
      s1VacuumNozzle:
        this.e1.nozzleType === "vacuum_bell" && this.e1.expansionRatio > 60,
      s1MaxQKpa: this.e1.maxDynamicPressureKpa,
      tankMaxQKpa: this.t1.structuralRatingKpa,
      hammerhead: this.fairingPart.hammerhead,
      weakInterstage: this.interstagePart.structuralRatingKpa < 40,
      uninsulatedLH2:
        (this.t1.propellant === "LH2_LOX" &&
          !this.t1.cryoInsulated &&
          this.t1.propellantKg > 0) ||
        (this.t2.propellant === "LH2_LOX" &&
          !this.t2.cryoInsulated &&
          this.t2.propellantKg > 0),
      vehicleStages: this.vehicle.stages,
    };
    const def = evaluateFailure(ctx, this.fired);
    if (def) {
      this.trigger(def, def.telemetry);
    }
  }

  private trigger(def: FailureDef, cause: string) {
    if (this.snap.status === "failure" || this.snap.status === "success") return;
    this.fired.add(def.id);
    this.failure = makeFailure(def.id, this.t, cause);
    this.status = "failure";
    this.throttle = 0;
    this.pushEvent(`fail-${def.id}`, `FAILURE — ${def.title.toUpperCase()}`, "bad");
  }

  private succeed() {
    if (this.snap.status === "failure" || this.snap.status === "success") return;
    this.status = "success";
    this.pushEvent("success", "MISSION SUCCESS — TARGET ACHIEVED", "good");
    this.refresh();
  }

  private updateWarnings(qKpa: number, speed: number, gForce: number) {
    const list: Warning[] = [...this.stats.warnings];
    if (qKpa > 25 && this.throttle > 0.85) {
      list.push({
        id: "max-q-live",
        label: `MAX Q BUILDING — ${qKpa.toFixed(1)} kPa`,
        detail: "Throttle down to 70% to hold dynamic pressure below the structural redline.",
        severity: "critical",
      });
    }
    if (this.stage1Burnout && !this.separated && this.vehicle.stages === 2) {
      list.push({
        id: "meco-live",
        label: "MECO — STAGE SEPARATION READY",
        detail: "Press STAGE to separate and trigger upper-stage ignition.",
        severity: "warn",
      });
    }
    if (this.separated && !this.stage2Ignited) {
      list.push({
        id: "coast-live",
        label: "ULLAGE COAST",
        detail: "Upper stage is coasting. Ignition in 2 seconds.",
        severity: "warn",
      });
    }
    if (this.fairingAttached && this.h > 80 * KM && this.vehicle.stages === 2) {
      list.push({
        id: "fairing-ready",
        label: "FAIRING JETTISON READY",
        detail: "Altitude above 80 km. Jettison the fairing to release mass.",
        severity: "warn",
      });
    }
    if (this.seco && !this.deployed && this.vehicle.stages === 2) {
      const needed = insertionVelocity(this.vehicle);
      list.push({
        id: "deploy-ready",
        label: "DEPLOY PAYLOAD",
        detail:
          speed >= needed
            ? `Orbital velocity ${(speed / 1000).toFixed(2)} km/s. Deploy when ready.`
            : `Need ${(needed / 1000).toFixed(2)} km/s; currently ${(speed / 1000).toFixed(2)} km/s.`,
        severity: speed >= needed ? "warn" : "critical",
      });
    }
    if (this.prop2 > 0 && this.prop2 < this.stats.stage2.propellantKg * 0.15) {
      list.push({
        id: "prop-low",
        label: "UPPER STAGE PROPELLANT LOW",
        detail: "Prepare for SECO.",
        severity: "warn",
      });
    }
    if (gForce > 6) {
      list.push({
        id: "g-high",
        label: `HIGH G-LOAD — ${gForce.toFixed(1)} g`,
        detail: "Throttle down to protect the payload.",
        severity: "warn",
      });
    }
    this.warnings = list;
  }

  private pushEvent(key: string, message: string, tone: SimEvent["tone"]) {
    if (this.eventKeys.has(key)) return;
    this.eventKeys.add(key);
    this.events.push({ t: Math.max(0, this.t), message, tone });
    if (this.events.length > 30) this.events.shift();
  }

  private refresh() {
    this.snap = this.buildSnapshot();
  }

  private buildSnapshot(): SimSnapshot {
    const speed = Math.hypot(this.vx, this.vy);
    const q = 0.5 * atmosphere(this.h).density * speed * speed;
    const phase = this.phaseInfo();
    return {
      t: this.t,
      h: Math.max(0, this.h),
      downrange: this.x,
      vx: this.vx,
      vy: this.vy,
      speed,
      q: q / 1000,
      gForce: this.gForce,
      massKg: this.massKg,
      throttle: this.throttle,
      phase: phase.phase,
      phaseLabel: phase.label,
      status: this.status,
      stage: this.stage,
      propellant1Kg: this.prop1,
      propellant2Kg: this.prop2,
      stage1Burnout: this.stage1Burnout,
      separated: this.separated,
      stage2Ignited: this.stage2Ignited,
      seco: this.seco,
      fairingAttached: this.fairingAttached,
      deployed: this.deployed,
      maxQ: this.maxQ,
      maxG: this.maxG,
      deltaVSpent: this.deltaVSpent,
      warnings: this.warnings,
      events: [...this.events],
      failure: this.failure,
    };
  }

  private phaseInfo(): { phase: number; label: string } {
    if (this.status === "failure") return { phase: -1, label: "FLIGHT TERMINATED" };
    if (this.status === "success") return { phase: 7, label: "MISSION COMPLETE" };
    if (this.t < 0) return { phase: 0, label: "PHASE 0 · TERMINAL COUNT" };
    if (this.t < 30) return { phase: 1, label: "PHASE 1 · TOWER CLEAR" };
    if (this.t < 90) return { phase: 2, label: "PHASE 2 · MAX Q" };
    if (!this.separated && this.vehicle.stages === 2)
      return { phase: 3, label: "PHASE 3 · STAGING" };
    if (this.h < 100 * KM) return { phase: 4, label: "PHASE 4 · ASCENT" };
    if (!this.seco) return { phase: 5, label: "PHASE 5 · ORBITAL INSERTION" };
    return { phase: 6, label: "PHASE 6 · DEPLOYMENT" };
  }
}
