/** T−0 launch cinematic timing (simulation seconds after liftoff). */
export const CINEMATIC_DURATION_S = 6;

/** Overlay opacity: solid until the final 0.6 s, then fades out. */
export function cinematicOpacity(t: number): number {
  if (t <= CINEMATIC_DURATION_S - 0.6) return 1;
  if (t >= CINEMATIC_DURATION_S) return 0;
  return (CINEMATIC_DURATION_S - t) / 0.6;
}

/** Mission-control callout shown at the top of the cinematic. */
export function cinematicCallout(t: number): string {
  if (t < 2.2) return "LIFTOFF";
  if (t < 4.2) return "TOWER CLEAR";
  return "ASCENT NOMINAL";
}

export function cinematicActive(t: number): boolean {
  return t >= 0 && t < CINEMATIC_DURATION_S;
}
