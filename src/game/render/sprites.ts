import * as THREE from "three";
import type { Part } from "../types";

const cache = new Map<string, THREE.Texture>();

/** Radial glow sprite used for engine plumes and explosions. */
export function glowTexture(inner: string, outer: string): THREE.Texture {
  const key = `glow:${inner}:${outer}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, outer);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

function pickAccent(part: Part): string {
  switch (part.propellant) {
    case "LH2_LOX":
      return "#7fe3ff";
    case "CH4_LOX":
      return "#8affc1";
    case "RP1_LOX":
      return "#ffb300";
    case "SOLID":
      return "#d7d2c4";
    default:
      return "#8ba3bf";
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function bodyGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tint: string,
) {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "rgba(0,0,0,0.55)");
  grad.addColorStop(0.18, tint);
  grad.addColorStop(0.45, "#f4f6f9");
  grad.addColorStop(0.7, tint);
  grad.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function panelSeams(ctx: CanvasRenderingContext2D, w: number, h: number, rows: number) {
  ctx.strokeStyle = "rgba(11,16,33,0.35)";
  ctx.lineWidth = Math.max(1, w * 0.01);
  for (let i = 1; i < rows; i++) {
    const y = (h / rows) * i;
    ctx.beginPath();
    ctx.moveTo(w * 0.04, y);
    ctx.lineTo(w * 0.96, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(244,246,249,0.5)";
  const dot = Math.max(1, w * 0.012);
  for (let i = 0; i < rows; i++) {
    for (const x of [0.09, 0.91]) {
      ctx.beginPath();
      ctx.arc(w * x, (h / rows) * (i + 0.5), dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function label(ctx: CanvasRenderingContext2D, w: number, h: number, text: string, color: string) {
  if (h < 60) return;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  if (h > w * 3) ctx.rotate(-Math.PI / 2);
  ctx.font = `600 ${Math.max(8, Math.min(16, w * 0.22))}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(11,16,33,0.85)";
  const pad = Math.max(3, w * 0.1);
  const metrics = ctx.measureText(text);
  ctx.fillRect(
    -metrics.width / 2 - pad,
    -Math.max(8, w * 0.16),
    metrics.width + pad * 2,
    Math.max(16, w * 0.32),
  );
  ctx.fillStyle = color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function drawTank(ctx: CanvasRenderingContext2D, w: number, h: number, part: Part) {
  bodyGradient(ctx, w, h, part.tint);
  // Fill the full footprint so stacked tanks/rings join without transparent seams.
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,229,255,0.55)";
  ctx.lineWidth = Math.max(1, w * 0.015);
  ctx.strokeRect(0, 0, w, h);

  panelSeams(ctx, w, h, Math.max(3, Math.round(h / Math.max(18, w * 0.5))));

  const accent = pickAccent(part);
  ctx.fillStyle = accent;
  ctx.fillRect(w * 0.04, h * 0.06, w * 0.92, Math.max(2, h * 0.012));
  ctx.fillRect(w * 0.04, h * 0.93, w * 0.92, Math.max(2, h * 0.012));

  label(ctx, w, h, part.short, "#0b1021");
}

function drawEngine(ctx: CanvasRenderingContext2D, w: number, h: number, part: Part) {
  // Full-width thrust plate seals the engine to the tank above it.
  ctx.fillStyle = "#233247";
  ctx.fillRect(0, 0, w, h * 0.13);
  ctx.strokeStyle = "rgba(0,229,255,0.55)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.strokeRect(0, 0, w, h * 0.13);

  const topY = h * 0.13;
  const botY = h;
  const topHalf = w * 0.17;
  const botHalf = w * 0.47;

  // nozzle bell
  ctx.beginPath();
  ctx.moveTo(w / 2 - topHalf, topY);
  ctx.bezierCurveTo(w / 2 - topHalf * 1.1, h * 0.52, w / 2 - botHalf, h * 0.78, w / 2 - botHalf, botY);
  ctx.lineTo(w / 2 + botHalf, botY);
  ctx.bezierCurveTo(w / 2 + botHalf, h * 0.78, w / 2 + topHalf * 1.1, h * 0.52, w / 2 + topHalf, topY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h);
  grad.addColorStop(0, "#2a3a55");
  grad.addColorStop(0.32, part.tint);
  grad.addColorStop(0.55, "#f4f6f9");
  grad.addColorStop(0.78, part.tint);
  grad.addColorStop(1, "#1a2438");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,229,255,0.75)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.stroke();

  // cooling tubes
  ctx.strokeStyle = "rgba(11,16,33,0.45)";
  ctx.lineWidth = Math.max(0.6, w * 0.008);
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    ctx.beginPath();
    ctx.moveTo(w * (0.2 + t * 0.6), topY + h * 0.04);
    ctx.lineTo(w * (0.05 + t * 0.9), botY - h * 0.01);
    ctx.stroke();
  }

  // power head
  ctx.fillStyle = "#32445f";
  roundRect(ctx, w * 0.26, 0, w * 0.48, h * 0.17, w * 0.04);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,229,255,0.6)";
  ctx.stroke();

  // turbopump
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.1, w * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = "#6d7f96";
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.1, w * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = pickAccent(part);
  ctx.fill();

  // nozzle throat glow
  const glow = ctx.createRadialGradient(w / 2, botY, 1, w / 2, botY, w * 0.4);
  glow.addColorStop(0, "rgba(255,179,0,0.55)");
  glow.addColorStop(1, "rgba(255,179,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(w / 2, botY, w * 0.46, h * 0.02 + 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFairing(ctx: CanvasRenderingContext2D, w: number, h: number, part: Part) {
  const baseY = h;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, baseY);
  ctx.lineTo(w * 0.06, h * 0.34);
  ctx.bezierCurveTo(w * 0.06, h * 0.08, w * 0.5, h * 0.01, w * 0.5, h * 0.01);
  ctx.bezierCurveTo(w * 0.5, h * 0.01, w * 0.94, h * 0.08, w * 0.94, h * 0.34);
  ctx.lineTo(w * 0.94, baseY);
  ctx.closePath();
  bodyGradient(ctx, w, h, part.tint);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,229,255,0.6)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.stroke();

  // separation seam
  ctx.strokeStyle = "rgba(11,16,33,0.5)";
  ctx.lineWidth = Math.max(1, w * 0.014);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.02);
  ctx.lineTo(w * 0.5, baseY);
  ctx.stroke();

  // base adapter band keeps the fairing flush with the avionics ring below
  ctx.fillStyle = "#2a3a50";
  ctx.fillRect(w * 0.06, baseY - Math.max(3, h * 0.02), w * 0.88, Math.max(3, h * 0.02));

  ctx.fillStyle = "rgba(0,229,255,0.7)";
  ctx.fillRect(w * 0.08, h * 0.44, w * 0.84, Math.max(1, h * 0.008));
  label(ctx, w, h, part.hammerhead ? "HH" : "OA", "#0b1021");
}

function drawInterstage(ctx: CanvasRenderingContext2D, w: number, h: number, part: Part) {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, "#0a0f1d");
  grad.addColorStop(0.5, part.tint);
  grad.addColorStop(1, "#0a0f1d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,229,255,0.5)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.strokeRect(w * 0.02, h * 0.06, w * 0.96, h * 0.88);

  ctx.strokeStyle = "rgba(139,163,191,0.5)";
  ctx.lineWidth = Math.max(0.8, w * 0.012);
  const cols = 5;
  const rows = 2;
  for (let i = 1; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const x = (w / cols) * i;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.1 + (h * 0.8 * j) / rows);
      ctx.lineTo(x, h * 0.1 + (h * 0.8 * (j + 1)) / rows);
      ctx.stroke();
    }
  }
  for (let j = 1; j < rows; j++) {
    ctx.beginPath();
    ctx.moveTo(0, (h / rows) * j);
    ctx.lineTo(w, (h / rows) * j);
    ctx.stroke();
  }
}

function drawAvionics(ctx: CanvasRenderingContext2D, w: number, h: number, part: Part) {
  ctx.fillStyle = "#101a2e";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,229,255,0.8)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.strokeRect(0, 0, w, h);

  const accent = part.tint.startsWith("#") ? part.tint : "#00e5ff";
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i % 2 === 0 ? accent : "#ffb300";
    ctx.beginPath();
    ctx.arc(w * (0.18 + i * 0.16), h * 0.5, Math.max(1.2, w * 0.025), 0, Math.PI * 2);
    ctx.fill();
  }
  // antenna
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(0.8, w * 0.01);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, h * 0.1);
  ctx.lineTo(w * 0.5, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w * 0.5, 0, w * 0.04, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
}

function drawFins(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fin = (dir: 1 | -1) => {
    ctx.beginPath();
    const baseX = dir === 1 ? w * 0.5 : w * 0.5;
    ctx.moveTo(baseX + dir * w * 0.02, h * 0.92);
    ctx.lineTo(baseX + dir * w * 0.48, h * 0.86);
    ctx.lineTo(baseX + dir * w * 0.44, h * 0.22);
    ctx.lineTo(baseX + dir * w * 0.04, h * 0.6);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "#3c4d68");
    grad.addColorStop(0.5, "#c4cfdd");
    grad.addColorStop(1, "#3c4d68");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,229,255,0.8)";
    ctx.lineWidth = Math.max(1, w * 0.012);
    ctx.stroke();
  };
  fin(1);
  fin(-1);
}

function drawBooster(ctx: CanvasRenderingContext2D, w: number, h: number, part: Part) {
  bodyGradient(ctx, w, h * 0.82, part.tint);
  roundRect(ctx, w * 0.08, 0, w * 0.84, h * 0.82, w * 0.1);
  ctx.strokeStyle = "rgba(0,229,255,0.6)";
  ctx.lineWidth = Math.max(1, w * 0.02);
  ctx.stroke();
  panelSeams(ctx, w * 0.84, h * 0.82, 8);
  ctx.translate(w * 0.08, 0);

  // nozzle
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.82);
  ctx.lineTo(w * 0.12, h * 0.97);
  ctx.lineTo(w * 0.88, h * 0.97);
  ctx.lineTo(w * 0.7, h * 0.82);
  ctx.closePath();
  const grad = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h);
  grad.addColorStop(0, "#202c42");
  grad.addColorStop(0.5, part.tint);
  grad.addColorStop(1, "#202c42");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,229,255,0.5)";
  ctx.stroke();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = pickAccent(part);
  ctx.fillRect(w * 0.1, h * 0.06, w * 0.8, Math.max(2, h * 0.01));
}

function drawGeneric(ctx: CanvasRenderingContext2D, w: number, h: number, part: Part) {
  bodyGradient(ctx, w, h, part.tint);
  roundRect(ctx, w * 0.04, h * 0.06, w * 0.92, h * 0.88, w * 0.08);
  ctx.strokeStyle = "rgba(0,229,255,0.5)";
  ctx.stroke();
  label(ctx, w, h, part.short, "#0b1021");
}

export function partTexture(part: Part): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const key = `${part.id}:${part.heightM}:${part.widthM}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const aspect = part.widthM / Math.max(part.heightM, 0.1);
  let height = 512;
  let width = Math.round(height * aspect);
  if (width > 256) {
    width = 256;
    height = Math.round(width / aspect);
  }
  width = Math.max(32, Math.min(256, width));
  height = Math.max(24, Math.min(512, height));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);

  switch (part.category) {
    case "engine":
      drawEngine(ctx, width, height, part);
      break;
    case "tank":
      drawTank(ctx, width, height, part);
      break;
    case "fairing":
      drawFairing(ctx, width, height, part);
      break;
    case "interstage":
      drawInterstage(ctx, width, height, part);
      break;
    case "avionics":
      drawAvionics(ctx, width, height, part);
      break;
    case "fins":
      drawFins(ctx, width, height);
      break;
    case "booster":
      drawBooster(ctx, width, height, part);
      break;
    default:
      drawGeneric(ctx, width, height, part);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}

export function gridFinTexture(): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const hit = cache.get("grid-fin");
  if (hit) return hit;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  ctx.fillStyle = "#1a2637";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(142,163,191,0.8)";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, size - 4, size - 4);
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) {
    const p = (size / 5) * i;
    ctx.beginPath();
    ctx.moveTo(p, 4);
    ctx.lineTo(p, size - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, p);
    ctx.lineTo(size - 4, p);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,229,255,0.22)";
  ctx.fillRect(0, size * 0.42, size, size * 0.16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  cache.set("grid-fin", texture);
  return texture;
}

export function disposeSpriteCache() {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
