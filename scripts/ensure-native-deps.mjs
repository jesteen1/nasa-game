#!/usr/bin/env node
/**
 * ensure-native-deps.mjs
 *
 * npm installs platform-specific native packages (lightningcss, @next/swc,
 * @tailwindcss/oxide, @rollup/rollup-*, @esbuild/*, sharp, unrs, ...) as
 * optional dependencies, chosen from the OS/CPU it is running on. If a
 * node_modules tree is created on Linux and then opened on Windows (or the
 * other way round), the native package for that OS is missing and the app
 * crashes at require() time, e.g.:
 *
 *   Cannot find module '../lightningcss.win32-x64-msvc.node'
 *
 * This script reads package-lock.json, finds the optional native packages that
 * match the current platform, and quietly installs + copies any that are
 * missing. It never runs `npm install` in the project root, so it cannot prune
 * the other platform's packages: both sets can live in the same tree.
 *
 * Usage:
 *   node scripts/ensure-native-deps.mjs                  # repair current platform
 *   node scripts/ensure-native-deps.mjs --platform=all   # pre-warm every platform in the lockfile
 *   node scripts/ensure-native-deps.mjs --platform=win32 --arch=x64
 *   node scripts/ensure-native-deps.mjs --check          # exit 1 if anything is missing
 *
 * Wired to predev / prebuild / pretest / prelint, so a tree copied from the
 * other OS repairs itself on the next `npm run dev`.
 */

import { existsSync, mkdirSync, cpSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

const checkOnly = Boolean(opt("check", false));
const verbose = Boolean(opt("verbose", false));
const quiet = !verbose && !checkOnly;

const log = (...a) => {
  if (!quiet) console.log("[native]", ...a);
};

function currentLibc() {
  if (process.platform !== "linux") return null;
  try {
    const report = process.report?.getReport?.();
    return report?.header?.glibcVersionRuntime ? "glibc" : "musl";
  } catch {
    return "glibc";
  }
}

/** npm's os/cpu/libc semantics: ["!win32"] excludes, ["linux"] restricts. */
function matches(field, value) {
  if (!Array.isArray(field) || field.length === 0) return true;
  const negated = field.filter((v) => v.startsWith("!")).map((v) => v.slice(1));
  if (negated.includes(value)) return false;
  const positive = field.filter((v) => !v.startsWith("!"));
  return positive.length === 0 || positive.includes(value);
}

const requestedPlatform = opt("platform", process.platform);
const requestedArch = opt("arch", process.arch);
const platformList = String(requestedPlatform)
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
const allPlatforms = platformList.includes("all");

const platforms = allPlatforms
  ? [...new Set(["linux", "win32", "darwin"])]
  : platformList;
const libc = currentLibc();

function collectTargets() {
  const lockPath = join(root, "package-lock.json");
  if (!existsSync(lockPath)) {
    log("no package-lock.json - run `npm install` first");
    return [];
  }
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  const out = [];
  for (const [key, meta] of Object.entries(lock.packages ?? {})) {
    if (!key.startsWith("node_modules/")) continue;
    const name = key.slice("node_modules/".length);
    if (name.includes("node_modules/")) continue; // only top-level packages
    if (!meta.optional || !meta.version || meta.link) continue;
    // Native packages are the ones gated by os/cpu (e.g. lightningcss-linux-x64-gnu).
    // Optional plain-JS fallbacks (e.g. @emnapi/runtime) have neither and are not
    // platform binaries - leave them to npm.
    if (!meta.os && !meta.cpu) continue;

    const platformMatch = allPlatforms
      ? (meta.os ?? []).some((o) => !o.startsWith("!"))
      : platforms.some((p) => matches(meta.os, p));
    if (!platformMatch) continue;
    if (!matches(meta.cpu, requestedArch)) continue;
    if (libc && !matches(meta.libc, libc)) continue;

    out.push({ name, version: meta.version, dir: join(root, key) });
  }
  return out;
}

const targets = collectTargets();
const missing = targets.filter((t) => !existsSync(join(t.dir, "package.json")));

if (missing.length === 0) {
  log(`ok (${targets.length} native packages present)`);
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `[native] missing ${missing.length} package(s): ${missing.map((m) => m.name).join(", ")}\n` +
      `[native] run: npm run fix:native${allPlatforms ? " -- --platform=all" : ""}`,
  );
  process.exit(1);
}

if (!existsSync(join(root, "node_modules"))) {
  console.error("[native] node_modules is missing - run `npm install` first.");
  process.exit(1);
}

log(`installing ${missing.length} missing native package(s):`);
for (const m of missing) log(`  - ${m.name}@${m.version}`);

const tmp = mkdtempSync(join(tmpdir(), "oa-native-"));
try {
  const specs = missing.map((m) => `${m.name}@${m.version}`);
  const npmExecPath = process.env.npm_execpath;
  const useNodeCli = npmExecPath && /\.(c?js|mjs)$/.test(npmExecPath);
  const cmd = useNodeCli ? process.execPath : "npm";
  const baseArgs = useNodeCli ? [npmExecPath] : [];
  const npmArgs = [
    ...baseArgs,
    "install",
    "--prefix",
    tmp,
    "--no-save",
    "--package-lock=false",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--force", // allow foreign-platform packages to be fetched
    "--loglevel=error",
    ...specs,
  ];

  const res = spawnSync(cmd, npmArgs, {
    stdio: verbose ? "inherit" : "pipe",
    shell: process.platform === "win32" && !useNodeCli,
    encoding: "utf8",
  });
  if (res.status !== 0) {
    if (res.stdout) process.stderr.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    throw new Error(`npm install exited with ${res.status ?? res.signal}`);
  }

  for (const m of missing) {
    const from = join(tmp, "node_modules", m.name);
    if (!existsSync(from)) throw new Error(`npm did not produce ${m.name}`);
    mkdirSync(dirname(m.dir), { recursive: true });
    rmSync(m.dir, { recursive: true, force: true });
    cpSync(from, m.dir, { recursive: true, force: true });
    if (!existsSync(join(m.dir, "package.json"))) {
      throw new Error(`copy verification failed for ${m.name}`);
    }
    log(`  + ${m.name}`);
  }
} catch (err) {
  console.error(`[native] repair failed: ${err.message}`);
  console.error("[native] falling back to a clean install for this platform: npm ci");
  process.exit(1);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

log(`done (${targets.length} native packages present for ${platforms.join(", ")})`);
