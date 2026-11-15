export interface TeamMember {
  id: string;
  name: string;
  role: string;
  focus: string;
  image: string;
}

/**
 * Crew details for the About page. Avatars live in `public/team/` and can be
 * swapped for real photos without changing the component.
 */
export const TEAM: TeamMember[] = [
  {
    id: "member-01",
    name: "Jeorse Barnard",
    role: "Physics",
    focus: "Flight physics, atmosphere model and the deterministic ascent integrator.",
    image: "/team/member-01.svg",
  },
  {
    id: "member-02",
    name: "Karupusamy",
    role: "Testing Analyst",
    focus: "Autopilot campaign, failure-rule coverage and release checks.",
    image: "/team/member-02.svg",
  },
  {
    id: "member-03",
    name: "Elango",
    role: "UI Designer",
    focus: "Mission briefing, VAB layout, flight HUD and responsive design.",
    image: "/team/member-03.svg",
  },
  {
    id: "member-04",
    name: "Partha Sarathi",
    role: "Canva Designer",
    focus: "Slide deck, visual assets and presentation design.",
    image: "/team/member-04.svg",
  },
  {
    id: "member-05",
    name: "Jesteen",
    role: "Full Stack Developer",
    focus: "Next.js app, state, per-user saves, audio and production build.",
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
