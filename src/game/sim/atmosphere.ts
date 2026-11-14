/**
 * U.S. Standard Atmosphere (1976) — density, pressure and temperature lookup
 * from 0 km to 100 km, log-linear interpolation between table points.
 */

const SEA_LEVEL_PRESSURE = 101_325;
const SEA_LEVEL_DENSITY = 1.225;
const SEA_LEVEL_TEMP = 288.15;
const G0 = 9.80665;
const R_SPECIFIC = 287.053;
const EARTH_RADIUS = 6_371_000;

type Row = [altM: number, density: number, pressure: number, tempK: number];

const TABLE: Row[] = [
  [0, 1.225, 101325, 288.15],
  [1000, 1.1117, 89875, 281.65],
  [2000, 1.0066, 79495, 275.15],
  [3000, 0.9091, 70109, 268.65],
  [4000, 0.8191, 61640, 262.15],
  [5000, 0.7361, 54020, 255.65],
  [6000, 0.6597, 47181, 249.15],
  [7000, 0.5895, 41061, 242.65],
  [8000, 0.5258, 35600, 236.15],
  [9000, 0.4671, 30742, 229.65],
  [10000, 0.4135, 26436, 223.25],
  [11000, 0.3648, 22632, 216.65],
  [12000, 0.3119, 19330, 216.65],
  [15000, 0.1948, 12045, 216.65],
  [20000, 0.08891, 5475, 216.65],
  [25000, 0.04008, 2511, 221.55],
  [30000, 0.01841, 1172, 226.5],
  [40000, 0.003996, 287.1, 250.35],
  [50000, 0.001027, 79.78, 270.65],
  [60000, 0.0003097, 21.96, 247.0],
  [70000, 0.00008283, 5.474, 219.6],
  [80000, 0.00001846, 1.052, 198.6],
  [90000, 0.000003416, 0.184, 186.9],
  [100000, 0.00000056, 0.032, 195.1],
];

export interface AtmosphereSample {
  density: number;
  pressure: number;
  temperature: number;
}

function interpolate(value: number): AtmosphereSample {
  const alt = Math.max(0, Math.min(100_000, value));
  let lo = TABLE[0];
  let hi = TABLE[TABLE.length - 1];
  for (let i = 0; i < TABLE.length - 1; i++) {
    if (alt >= TABLE[i][0] && alt <= TABLE[i + 1][0]) {
      lo = TABLE[i];
      hi = TABLE[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0];
  const f = span <= 0 ? 0 : (alt - lo[0]) / span;
  // Density and pressure fall exponentially, so interpolate in log space.
  const density = Math.exp(Math.log(lo[1]) + (Math.log(hi[1]) - Math.log(lo[1])) * f);
  const pressure = Math.exp(Math.log(lo[2]) + (Math.log(hi[2]) - Math.log(lo[2])) * f);
  const temperature = lo[3] + (hi[3] - lo[3]) * f;
  return { density, pressure, temperature };
}

export function atmosphere(altitudeM: number): AtmosphereSample {
  if (altitudeM > 100_000) {
    // Above the table: continue the exponential falloff from 100 km.
    const base = interpolate(100_000);
    const scaleHeight = 7_500;
    const decay = Math.exp(-(altitudeM - 100_000) / scaleHeight);
    return {
      density: Math.max(1e-12, base.density * decay),
      pressure: Math.max(1e-9, base.pressure * decay),
      temperature: base.temperature,
    };
  }
  return interpolate(altitudeM);
}

export function gravity(altitudeM: number): number {
  const r = EARTH_RADIUS + altitudeM;
  return G0 * (EARTH_RADIUS / r) ** 2;
}

export function speedOfSound(altitudeM: number): number {
  const { temperature } = atmosphere(altitudeM);
  return Math.sqrt(1.4 * R_SPECIFIC * temperature);
}

/** Drag coefficient vs Mach number for a slender launch vehicle. */
export function dragCoefficient(mach: number): number {
  if (mach < 0.8) return 0.22;
  if (mach < 1.05) return 0.22 + ((mach - 0.8) / 0.25) * 0.28;
  if (mach < 1.3) return 0.5 - ((mach - 1.05) / 0.25) * 0.16;
  if (mach < 3) return 0.34 - ((mach - 1.3) / 1.7) * 0.14;
  return 0.2;
}

export function dynamicPressure(density: number, speed: number): number {
  return 0.5 * density * speed * speed;
}

export function machNumber(speed: number, altitudeM: number): number {
  return speed / Math.max(1, speedOfSound(altitudeM));
}

export const ATMOSPHERE = {
  SEA_LEVEL_PRESSURE,
  SEA_LEVEL_DENSITY,
  SEA_LEVEL_TEMP,
  G0,
  EARTH_RADIUS,
} as const;
