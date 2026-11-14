# Rocket Simulator — App Overview (PPT outline)

Companion script for `docs/rocket-simulator-overview.pptx` (15 slides, 16:9).
Each heading is a slide; bullets are the on-slide text, notes are speaker prompts.

---

## 1. Rocket Simulator — App Overview

- A deterministic rocket-engineering and mission-control game for the browser.
- Five-person project · 2026
- Chips: Next.js 16 · three.js · Web Audio · local saves

**Visual:** title artwork (`docs/assets/banner.png`).

---

## 2. The pitch

Build it. Check it. Fly it. Lose it. Learn it.

- Assemble from real-world-inspired parts, verify the physics, then fly a seven-phase ascent.
- Every outcome is deterministic and explainable — no random failures.
- Stats: 5 tiers · 12 documented failures · 10 assembly slots · 60 Hz physics.
- No backend, no downloaded art.

---

## 3. Player loop

1. **Assemble** — pick a tier and fill ten slots.
2. **Analyse** — TWR, Δv budget, CoM vs CoP, compatibility.
3. **Launch** — countdown, ignition, early ascent.
4. **Fly** — throttle, stage, jettison, deploy through 7 phases.
5. **Review** — score, unlock next tier, read the failure guide.

---

## 4. Vehicle assembly

- Ten slots: stage-1 engine/tank, boosters, fins, interstage, stage-2 engine/tank, ullage, fairing, avionics.
- Enforced ratings and compatibility — a vacuum bell on the pad is a hard failure.
- Live analysis: TWR, per-stage Δv, mass, height, CoM/CoP, stability.
- Severity colours: cyan nominal / amber marginal / red critical.
- Launch is locked until required slots are filled: engine(s), tank(s), fairing, avionics, plus interstage/upper stage on two-stage vehicles.
- Height-aware camera keeps 150 m stacks in frame.

**Preflight gates:** TWR ≥ 1.0 · Δv ≥ budget · CoM above CoP · Max-Q rating · insulated LH₂ · ullage kit.

---

## 5. Flight simulation

- Seven phases: COUNT → TOWER → MAX Q → STAGING → ASCENT → INSERT → DEPLOY.
- Pure TypeScript 60 Hz integrator; rendering reads snapshots only.
- Atmosphere, gravity, staging, mass flow, dynamic pressure.
- Controls: SPACE stage · F fairing · D deploy · X abort · throttle slider.
- HUD at ~10 Hz, event log, telemetry chart, result flow.

**Flight profile:** throttle ~70 % near Max Q → stage at MECO → full thrust to SECO → fairing above 80 km → deploy after SECO.

---

## 6. Failure as content

- 8 hardware rules + crash, unstable orbit, timeout, abort = 12 outcomes.
- Each has a phase, code, physics explanation and concrete fixes.
- Failure guide generated from the same rule definitions the sim uses.
- Result modal deep-links to the relevant entry.
- New warnings play a two-beep alert (analysis + in flight).

**Examples:** nozzle flow separation → sea-level engine; TWR < 1 → boosters; Max-Q → throttle 70 %; cavitation → ullage kit; early fairing → wait for 80 km; unstable orbit → deploy after SECO.

---

## 7. Product surfaces

| Screen | What it does |
| --- | --- |
| `/` briefing | Commander profiles, how to play, animated 2D launch pad |
| `/game` VAB | Ten-slot assembly, 3D preview, analysis |
| Flight HUD | Seven-phase telemetry, chart, controls |
| Result modal | Score, failure cause, guide deep-link |
| `/failures` | 12 errors: why + what to change |
| `/about` | Team, build story, replaceable images |

---

## 8. Persistence

- Per-commander saves in `localStorage`.
- Saved: tier, build, unlocked missions, best scores, history, sound preference.
- Add / select / clear profiles; clearing asks for confirmation.
- Legacy single-player save migrates automatically.
- Keys: `orbital-architect-profiles`, `orbital-architect-active`, `orbital-architect-save:<name>`.
- No backend, no login.

---

## 9. Audio & motion

- All SFX synthesised with Web Audio — countdown, ignition, liftoff, staging, fairing, deploy.
- Engine rumble follows throttle; warning alert; per-commander mute.
- 2D SVG rocket: idle hover, flame flicker, auto-liftoff, replay.
- Launch FX overlay + camera shake.
- Reduced-motion users get a calm version.
- **0 downloaded audio files.**

---

## 10. Stack & architecture

Stack: Next.js 16 · React 19 + TypeScript · three.js (orthographic) · zustand · Tailwind 4 · Vitest · Web Audio.

`UI → Store → Sim (60 Hz) → Render`, with the HUD sampling sim snapshots.

- Sim never imports React/three.js.
- Rendering reads every frame; HUD at 10 Hz.
- Fixed steps + deterministic rules make failures reproducible in tests.
- Static assets + browser storage only.

---

## 11. Quality

- **31** automated tests
- **5/5** missions completed by the campaign autopilot
- **0** backends/services
- **12** failure rules covered
- Physics/rule, engine determinism, campaign, HUD/LaunchFX rocket SSR, failure-guide and team-data tests.
- Lint + production build gate every change.

---

## 12. Challenges

| Challenge | Response |
| --- | --- |
| Deterministic physics | Real equations with arcade tolerances; balance checked by autopilot |
| Tall vehicles | Height-aware orthographic camera |
| Explainable failures | Rules, codes, guide and SFX share one source of truth |
| Cross-OS setup | Lockfile-driven native-binary repair for Windows/Linux |

---

## 13. Roadmap

- Real-browser QA: audio mix, launch-FX timing, mobile VAB/HUD.
- Save export/import JSON + run-history panel.
- Optional mission-control voice callouts.
- Particle/mobile/camera polish.
- Replace team placeholders with real names and photos.

**V1 is playable:** 5 tiers · 12 failures · 60 Hz sim · local saves. `npm ci && npm run dev`.

---

## 14. The crew

Five team members:

1. Mission design & physics
2. Vehicle systems & balance
3. 3D rendering & animation
4. Interface, telemetry & audio
5. Profiles, testing & release

Portraits are placeholders — replace `public/team/*` and `src/game/data/about.ts`.

---

## 15. Thank you

Ready for the pad.

- `/` briefing
- `/game` launch console
- `/failures` error guide
- `/about` team

Play the briefing, read the failure guide, then build a rocket that survives Max Q.
