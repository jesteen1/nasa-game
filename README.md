# Orbital Architect

A 2D rocket-engineering and NASA-style telemetry simulation game built with Next.js 16,
React 19, three.js and a deterministic fixed-timestep ascent sim.

Assemble a launch vehicle from real-world parts, verify TWR / Δv / CoM-CoP, then fly a
seven-phase ascent and deploy the payload — or watch it fail for a physically plausible
reason.

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

## Project layout

```
app/                     Next.js routes (briefing, game)
src/game/types.ts        Core types
src/game/data/           Part library and vehicle tiers
src/game/sim/            Atmosphere, vehicle analysis, failures, flight integrator
src/game/store/game.ts   zustand store, per-user profiles and persistence
src/game/render/         three.js orthographic scene and procedural sprites
src/game/ui/             VAB, telemetry, flight HUD, result modal
```
