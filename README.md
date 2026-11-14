# Rocket Simulator

A 2D rocket-engineering and NASA-style telemetry simulation game built with Next.js 16,
React 19, three.js and a deterministic fixed-timestep ascent sim.

Assemble a launch vehicle from real-world parts, verify TWR / Δv / CoM-CoP, then fly a
seven-phase ascent and deploy the payload — or watch it fail for a physically plausible
reason.

Launch stays locked until the core vehicle is complete: stage engine(s), tank(s), payload
fairing and avionics, plus the interstage and upper-stage hardware on two-stage rockets.
Empty mounts/bays are selectable but cannot fly. Present-but-incompatible hardware is still
allowed — that is what the deterministic physics failures are for.

## Getting started

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page is the mission
briefing; add/select a callsign there and press **Play the game**.

| Route | Contents |
| --- | --- |
| `/` | Mission briefing, commander profiles, how to play |
| `/game` | Vehicle Assembly Building + flight simulation |
| `/failures` | Failure/error guide: why it happens + what to change |
| `/about` | Team, build story and project images |
| `/instructions` | Redirects to `/` (legacy URL) |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (repairs native deps first) |
| `npm run build` / `npm start` | Production build / server |
| `npm test` | Vitest physics, failure-rule, campaign and store tests |
| `npm run lint` | ESLint |
| `npm run fix:native` | Install missing OS-specific native packages |

## Cross-platform installs (Windows + Linux)

Native packages (`lightningcss`, `@next/swc`, `@tailwindcss/oxide`, `@rollup/rollup-*`,
`@esbuild/*`, `sharp`) are OS/CPU-specific. A `node_modules` tree copied between Linux and
Windows is missing the other platform's binaries and fails with errors such as:

```
Cannot find module '../lightningcss.win32-x64-msvc.node'
```

Do **not** copy `node_modules` or `.next` between machines. If a shared folder already
contains them, the project repairs itself:

- `npm run dev|build|test|lint` run `scripts/ensure-native-deps.mjs` first, which reads
  `package-lock.json`, detects the current OS/CPU, and installs only the missing native
  packages into `node_modules` (without touching the other platform's packages).
- Manual repair: `npm run fix:native`
- Pre-warm one tree for several platforms:
  `npm run fix:native -- --platform=win32,linux` (or `--platform=all`)
- Verify without changing anything: `node scripts/ensure-native-deps.mjs --check`
- If a tree is deeply corrupted, delete `node_modules` and `.next`, then `npm ci`.

Run `npm ci` on each machine at least once if you are not sharing a folder.

## Commander profiles and saves

Every username has its own save in `localStorage`.

| Key | Contents |
| --- | --- |
| `orbital-architect-profiles` | JSON array of saved commander names |
| `orbital-architect-active` | last selected commander |
| `orbital-architect-save:<name>` | that commander's tier, build, unlocked tiers, best scores and history |

On `/` you can:

- **Add username** — creates a new profile (unique, max 24 characters) and selects it.
- **Select** a saved commander — restores that user's progress from `localStorage`.
- **Clear** — deletes that commander's profile and save after a confirmation prompt.

The old single-player key (`orbital-architect-save`) is migrated into a named profile the
first time the app loads after this change. Opening `/game` without a selected commander
redirects back to `/`.

The display name is **Rocket Simulator**; storage keys keep the original
`orbital-architect-*` prefix so saves created before the rename keep working.

## Failure guide

`/failures` documents every deterministic failure rule (`FAILURE_DEFS`) with:

- the error code and phase,
- a plain-language “why it happens” explanation,
- concrete build/flight changes (“What to change”),
- the raw telemetry warning.

The page is generated from `src/game/data/failureGuide.ts`, which maps each rule id to its
explanation and fixes; a test fails if a rule is missing from the guide. It is linked from
the briefing, the game footer and the result modal (deep-links to the exact failure).

## About page and team images

`/about` introduces the five-person team, shows the step-by-step build story and lists the
tech stack. It uses the Next.js `Image` component (`unoptimized` for local SVG placeholders).

To add the real content later:

1. Drop portraits into `public/team/` (SVG/PNG/JPG; keep square-ish, e.g. 600×600).
2. Edit `src/game/data/about.ts` — update `name`, `role`, `focus` and `image` for each
   member (or replace the placeholder files and keep the paths).
3. Replace `public/about/banner.svg` with a real screenshot if desired.
4. Keep five entries: a test checks the team count and that every image path exists.

The About link is in the briefing header, the failure-guide header and the game footer.

## Sound effects and launch animation

All audio is synthesised at runtime with the Web Audio API — no asset files.

- **Cues:** countdown beeps, clamp release, ignition, liftoff, MECO/staging, latch + cold-gas
  puff, Max-Q boom, upper-stage ignition, fairing, deploy, success, failure, abort and the
  existing two-beep warning alert.
- **T−0 cinematic (every launch, over live flight):** a 6 s overlay with ignition flash,
  pad smoke, ascent streaks, LIFTOFF → TOWER CLEAR → ASCENT NOMINAL callouts and a live
  altitude/velocity readout. It never pauses the sim, never blocks controls and fades out
  into the normal HUD.
- **Warning alert:** fires once for each new preflight warning in the analysis panel and each
  new in-flight warning (Max Q build-up, MECO, fairing-ready, etc.).
- **Engine rumble:** looping brown noise plus a sub-oscillator; gain and brightness follow
  throttle, and it stops at MECO, SECO, failure or unmount.
- **Mute:** the header speaker button on `/` and `/game` toggles SFX; the preference is
  saved per commander (`soundOn` in the profile save).
- **Gesture-safe:** the `AudioContext` is created/resumed from Play, Launch or the mute
  button; the first pointer/key press in flight also unlocks it.

The briefing hero also has a detailed **2D SVG rocket** (`ui/RocketArt.tsx`) on a launch pad:
it hovers with a flickering exhaust, then climbs slowly to the top edge of the pad panel and
stays there (no fade-out), with a **Replay launch** button. The same art powers the in-flight
countdown overlay (`ui/PadLaunch.tsx`): the 2D rocket holds on the pad through T−10, lifts
at T−0, then cross-fades into the three.js ascent. In flight, the camera stays centred on the
vehicle until **100 km**, then lets it climb to the top edge by ~125 km and keeps it visible
there. The assembled stack renders with full-height part textures (no transparent seams), a
thrust structure bridging the engine to the tank, and small grid fins at the base. Everything
is vector/CSS or procedural canvas — no image assets required.

The launch view also has a centred animation overlay (`LaunchFX`): pulsing countdown rings,
an ignition flash, a `LIFTOFF` banner, exhaust smoke puffs and ascent speed streaks, plus a
camera shake during ignition and explosions. It is disabled under
`prefers-reduced-motion: reduce`.

## Presentation deck

`docs/rocket-simulator-overview.pptx` — 15-slide, 16:9 app overview (problem, loop, VAB,
flight, failures, screens, persistence, audio, stack, quality, challenges, roadmap, team,
thank-you). `docs/rocket-simulator-overview.md` is the editable slide-by-slide outline.
Slide artwork is in `docs/assets/` (rasterised from the in-repo SVGs). Team portraits are
placeholders.

## Troubleshooting

- **Nothing renders in the launch bay / canvas is 0 px tall** — the app shell must use a
  definite height. The shell uses `h-dvh` and the canvas is `absolute inset-0`; if you add
  wrappers, keep `min-h-0`/`flex-1` intact and avoid `min-h-dvh` on ancestors.
- **Vercel preview looks different from `npm run dev`** — always validate with
  `npm run build && npm start` at the same viewport, then redeploy with the build cache
  cleared and a hard refresh.
- **Native module error on a copied tree** — run `npm run fix:native` (or `npm ci` on each
  machine). Do not copy `node_modules` or `.next` between Windows and Linux.
- **Audio is silent on first launch** — browsers require a gesture; click Play, Launch or the
  mute button once. The SFX toggle persists per commander.

```
app/                     Next.js routes (briefing, game, failures, about)
src/game/types.ts        Core types
src/game/data/           Part library, vehicle tiers, failure guide, about/team
src/game/sim/            Atmosphere, vehicle analysis, failures, flight integrator
src/game/store/game.ts   zustand store, per-user profiles and persistence
src/game/audio/sfx.ts    procedural Web Audio cues + engine rumble
src/game/render/         three.js orthographic scene and procedural sprites
src/game/ui/             VAB, telemetry, flight HUD, launch FX, 2D rocket, result modal
docs/                   PPTX app overview + editable outline + slide assets
```
