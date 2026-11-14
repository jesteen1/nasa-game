export type Propellant = "SOLID" | "RP1_LOX" | "LH2_LOX" | "CH4_LOX" | "NONE";
export type NozzleType = "sea_level_bell" | "vacuum_bell" | "none";
export type PartCategory =
  | "engine"
  | "tank"
  | "booster"
  | "fairing"
  | "interstage"
  | "avionics"
  | "fins"
  | "ullage";

export interface Part {
  id: string;
  name: string;
  short: string;
  category: PartCategory;
  massKg: number;
  heightM: number;
  widthM: number;
  thrustSeaLevelKn: number;
  thrustVacuumKn: number;
  ispSeaLevel: number;
  ispVacuum: number;
  propellant: Propellant;
  propellantKg: number;
  nozzleType: NozzleType;
  expansionRatio: number;
  gimbalRangeDeg: number;
  maxDynamicPressureKpa: number;
  cryoInsulated: boolean;
  ullageThrusters: boolean;
  structuralRatingKpa: number;
  finAreaM2: number;
  hammerhead: boolean;
  tiers: number[];
  description: string;
  tradeoff: string;
  tint: string;
}

export type SlotId =
  | "s1Engine"
  | "s1Tank"
  | "boosters"
  | "fins"
  | "interstage"
  | "s2Engine"
  | "s2Tank"
  | "ullage"
  | "fairing"
  | "avionics";

export type BuildConfig = Record<SlotId, string>;

export interface ReferencePoint {
  t: number;
  altKm: number;
  velMs: number;
}

export interface MissionTarget {
  kind: "suborbital" | "orbit" | "lunar" | "mars";
  altitudeKm: number;
  velocity: number;
  deltaV: number;
}

export interface Vehicle {
  id: string;
  tier: number;
  name: string;
  subtitle: string;
  inspiration: string;
  description: string;
  payloadKg: number;
  payloadName: string;
  stages: 1 | 2;
  s1EngineCount: number;
  s2EngineCount: number;
  boosterCount: number;
  ascent: { pitchStartS: number; pitchRate: number; maxPitchDeg: number };
  target: MissionTarget;
  defaults: BuildConfig;
  reference: ReferencePoint[];
  accent: string;
}

export interface Warning {
  id: string;
  label: string;
  detail: string;
  severity: "warn" | "critical";
}

export interface FailureDef {
  id: string;
  code: string;
  title: string;
  phase: string;
  telemetry: string;
  outcome: string;
}

export interface FailureEvent extends FailureDef {
  at: number;
  cause: string;
}

export interface SimEvent {
  t: number;
  message: string;
  tone: "info" | "good" | "warn" | "bad";
}

export interface TelemetrySample {
  t: number;
  h: number;
  speed: number;
  q: number;
  g: number;
}

export type FlightStatus = "countdown" | "flying" | "success" | "failure";

export interface SimSnapshot {
  t: number;
  h: number;
  downrange: number;
  vx: number;
  vy: number;
  speed: number;
  q: number;
  gForce: number;
  massKg: number;
  throttle: number;
  phase: number;
  phaseLabel: string;
  status: FlightStatus;
  stage: 1 | 2;
  propellant1Kg: number;
  propellant2Kg: number;
  stage1Burnout: boolean;
  separated: boolean;
  stage2Ignited: boolean;
  seco: boolean;
  fairingAttached: boolean;
  deployed: boolean;
  maxQ: number;
  maxG: number;
  deltaVSpent: number;
  warnings: Warning[];
  events: SimEvent[];
  failure: FailureEvent | null;
}

export interface StageStats {
  dryKg: number;
  wetKg: number;
  propellantKg: number;
  thrustSlKn: number;
  thrustVacKn: number;
  isp: number;
  deltaV: number;
}

export interface StackItem {
  part: Part;
  y: number;
  x: number;
  z: number;
  massKg: number;
  count: number;
}

export interface VehicleStats {
  totalWetKg: number;
  totalDryKg: number;
  twr: number;
  deltaV: number;
  stage1: StageStats;
  stage2: StageStats;
  heightM: number;
  coreWidthM: number;
  comY: number;
  copY: number;
  control: "fins" | "gimbal" | "none";
  stable: boolean;
  payloadKg: number;
  warnings: Warning[];
  layout: StackItem[];
}

export interface MissionResult {
  success: boolean;
  tier: number;
  vehicleName: string;
  score: number;
  deltaVSpent: number;
  maxQ: number;
  maxG: number;
  failure: FailureEvent | null;
  timeS: number;
}
