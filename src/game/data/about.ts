export interface TeamMember {
  id: string;
  name: string;
  role: string;
  focus: string;
  image: string;
}

/**
 * Replace `name`, `role`, `focus` and `image` when the real team details and
 * photos are available. Images live in `public/team/`.
 */
export const TEAM: TeamMember[] = [
  {
    id: "member-01",
    name: "Team Member 01",
    role: "Mission design & physics",
    focus: "Tiers, parts, deterministic failure rules and mission targets.",
    image: "/team/member-01.svg",
  },
  {
    id: "member-02",
    name: "Team Member 02",
    role: "Vehicle systems & balance",
    focus: "TWR / Δv / CoM-CoP analysis and campaign balancing.",
    image: "/team/member-02.svg",
  },
  {
    id: "member-03",
    name: "Team Member 03",
    role: "3D rendering & animation",
    focus: "three.js scene, procedural sprites, plume, camera and launch FX.",
    image: "/team/member-03.svg",
  },
  {
    id: "member-04",
    name: "Team Member 04",
    role: "Interface, telemetry & audio",
    focus: "VAB, flight HUD, charts, briefing page and Web Audio SFX.",
    image: "/team/member-04.svg",
  },
  {
    id: "member-05",
    name: "Team Member 05",
    role: "Profiles, testing & release",
    focus: "Per-user saves, Vitest suites, builds, docs and failure guide.",
    image: "/team/member-05.svg",
  },
];

export const BUILD_STEPS: { title: string; body: string }[] = [
  {
    title: "Wrote the mission brief",
    body:
      "We locked an arcade-sim scope: real equations with forgiving tolerances, five launch vehicles, a ten-slot assembly bay and eight deterministic failure modes instead of random failures.",
  },
  {
    title: "Built the physics core",
    body:
      "A pure TypeScript, fixed 60 Hz integrator drives altitude, velocity, dynamic pressure and G-load. A U.S. Standard Atmosphere table, per-stage Δv, TWR and CoM-vs-CoP analysis sit beside it.",
  },
  {
    title: "Assembled the VAB",
    body:
      "Ten slots accept real-world-inspired parts. The analysis panel flags incompatible engines, uninsulated hydrogen tanks, weak interstages and stability problems before launch.",
  },
  {
    title: "Rendered the flight",
    body:
      "three.js with an orthographic camera keeps the stack readable at 150 m tall. Parts are drawn as procedural canvas textures; the plume, sky gradient, stars, smoke and camera shake are code, not assets.",
  },
  {
    title: "Wired mission control",
    body:
      "The flight HUD updates at 10 Hz while the sim runs at 60 Hz. Stage, fairing, deploy and abort actions, an event log, a telemetry chart and the result flow turn raw physics into a mission.",
  },
  {
    title: "Proved it could fly",
    body:
      "Vitest covers the failure rules, engine determinism and a campaign autopilot that completes all five stock missions. Every balance change has to keep those tests green.",
  },
  {
    title: "Polished the experience",
    body:
      "Procedural Web Audio SFX, a centred launch animation, per-commander saves, a full failure guide with fixes, and this page. No backend, no external assets required.",
  },
];

export const TECH_STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "three.js",
  "zustand",
  "Tailwind CSS 4",
  "Vitest",
  "Web Audio API",
];
