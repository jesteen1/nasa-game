export function fmtInt(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function fmtMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(kg >= 100_000 ? 0 : 1)} t`;
  return `${Math.round(kg)} kg`;
}

export function fmtKm(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(m >= 100_000 ? 0 : m >= 10_000 ? 1 : 2)} km`;
  return `${Math.round(m)} m`;
}

export function fmtSpeed(ms: number): string {
  return `${fmtInt(ms)} m/s`;
}

export function fmtTime(s: number): string {
  const sign = s < 0 ? "−" : "+";
  const abs = Math.abs(s);
  const m = Math.floor(abs / 60);
  const sec = abs - m * 60;
  return `T${sign}${String(m).padStart(2, "0")}:${sec.toFixed(1).padStart(4, "0")}`;
}

export function fmtScore(score: number): string {
  return fmtInt(score);
}
