"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { sfx } from "../audio/sfx";
import { getPart, partsForSlot, SLOT_CATEGORY, SLOT_LABEL } from "../data/parts";
import type { SimEngine } from "../sim/engine";
import { computeStats } from "../sim/vehicle";
import { useGame } from "../store/game";
import type { BuildConfig, Part, SimSnapshot, SlotId, Vehicle } from "../types";

interface Props {
  engineRef: MutableRefObject<SimEngine | null>;
  vehicle: Vehicle;
  build: BuildConfig;
}

interface VisualNode {
  slot: SlotId | "payload";
  part: Part;
  label: string;
  stage: 1 | 2;
  width: number;
  height: number;
  empty: boolean;
  shroudWidth?: number;
  radialLeft?: Part | null;
  radialRight?: Part | null;
  finLeft?: Part | null;
  finRight?: Part | null;
}

interface PlacedBox {
  slot: SlotId | "payload";
  node: VisualNode;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

interface SnapNode {
  x: number;
  y: number;
  slot: SlotId;
  type: "top" | "bottom" | "left" | "right" | "core";
  empty: boolean;
  label: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  grow: number;
  life: number;
  maxLife: number;
  type: "flame" | "smoke" | "vacuum" | "ullage" | "spark";
}

interface DebrisPiece {
  kind: "booster" | "stage1" | "interstage" | "fairingLeft" | "fairingRight" | "payload";
  part: Part;
  finPart?: Part | null;
  enginePart?: Part | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  angle: number;
  angularVel: number;
  life: number;
  maxLife: number;
}

interface MilestoneToast {
  id: string;
  title: string;
  subtitle: string;
  createdAt: number;
}

const STARS = Array.from({ length: 220 }, (_, i) => ({
  rx: ((i * 73 + 19) % 997) / 997,
  ry: ((i * 131 + 43) % 991) / 991,
  size: i % 5 === 0 ? 2.1 + (i % 3) * 0.45 : 1.0 + (i % 4) * 0.3,
  phase: (i * 0.7) % (Math.PI * 2),
  hue: i % 5 === 0 ? "#bae6fd" : i % 7 === 0 ? "#fde68a" : "#ffffff",
}));

function shadeColor(hex: string, percent: number): string {
  const clean = hex.startsWith("#") ? hex.slice(1) : "cbd5e1";
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16) || 0xcbd5e1;
  const amt = Math.round(2.55 * percent);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

function lerpColor(a: string, b: string, amount: number): string {
  const t = Math.max(0, Math.min(1, amount));
  const ah = parseInt(a.replace("#", ""), 16);
  const bh = parseInt(b.replace("#", ""), 16);
  const ar = (ah >> 16) & 0xff;
  const ag = (ah >> 8) & 0xff;
  const ab = ah & 0xff;
  const br = (bh >> 16) & 0xff;
  const bg = (bh >> 8) & 0xff;
  const bb = bh & 0xff;
  const rr = Math.round(ar + t * (br - ar));
  const rg = Math.round(ag + t * (bg - ag));
  const rb = Math.round(ab + t * (bb - ab));
  return "#" + ((1 << 24) + (rr << 16) + (rg << 8) + rb).toString(16).slice(1);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function partAccent(part: Part): string {
  if (part.propellant === "LH2_LOX") return "#ea580c";
  if (part.propellant === "CH4_LOX") return "#00e5ff";
  if (part.propellant === "RP1_LOX") return "#0284c7";
  if (part.propellant === "SOLID") return "#ffb300";
  if (part.category === "interstage") return "#f59e0b";
  if (part.category === "avionics") return "#00e5ff";
  return "#38bdf8";
}

export function buildVisualStack(
  vehicle: Vehicle,
  build: BuildConfig,
  snap: SimSnapshot | null,
  includeEmptyVab: boolean,
): VisualNode[] {
  const coreW = vehicle.tier === 1 ? 42 : vehicle.tier === 2 ? 48 : vehicle.tier <= 4 ? 54 : 58;
  const fairing = getPart(build.fairing);
  const avionics = getPart(build.avionics);
  const ullage = getPart(build.ullage);
  const s2Tank = getPart(build.s2Tank);
  const s2Engine = getPart(build.s2Engine);
  const interstage = getPart(build.interstage);
  const s1Tank = getPart(build.s1Tank);
  const boosters = getPart(build.boosters);
  const fins = getPart(build.fins);
  const s1Engine = getPart(build.s1Engine);

  const separated = Boolean(snap?.separated);
  const fairingAttached = snap ? snap.fairingAttached : true;
  const deployed = Boolean(snap?.deployed);

  const nodes: VisualNode[] = [];

  // 1. Fairing or Exposed Payload
  if (fairingAttached) {
    const isEmpty = fairing.id.startsWith("none_");
    if (!isEmpty || includeEmptyVab) {
      const fWidth = fairing.hammerhead ? Math.round(coreW * 1.26) : coreW;
      const fHeight = vehicle.tier === 1 ? 48 : fairing.hammerhead ? 64 : 56;
      nodes.push({
        slot: "fairing",
        part: fairing,
        label: `PAYLOAD FAIRING: ${fairing.name}`,
        stage: vehicle.stages === 2 ? 2 : 1,
        width: fWidth,
        height: fHeight,
        empty: isEmpty,
        shroudWidth: coreW,
      });
    }
  } else if (!deployed) {
    // Exposed satellite/spacecraft payload after fairing jettison
    nodes.push({
      slot: "payload",
      part: {
        ...fairing,
        id: "payload_sat",
        name: vehicle.payloadName,
        short: "PAYLOAD",
        tint: "#f59e0b",
      },
      label: `PAYLOAD: ${vehicle.payloadName}`,
      stage: vehicle.stages === 2 ? 2 : 1,
      width: Math.round(coreW * 0.76),
      height: 36,
      empty: false,
      shroudWidth: coreW,
    });
  }

  // 2. Avionics Ring
  {
    const isEmpty = avionics.id.startsWith("none_");
    if (!isEmpty || includeEmptyVab) {
      nodes.push({
        slot: "avionics",
        part: avionics,
        label: `AVIONICS: ${avionics.name}`,
        stage: vehicle.stages === 2 ? 2 : 1,
        width: coreW,
        height: 15,
        empty: isEmpty,
      });
    }
  }

  // 3. Stage 2 (if 2-stage vehicle)
  if (vehicle.stages === 2) {
    const ullageEmpty = ullage.id.startsWith("none_");
    if (!ullageEmpty || includeEmptyVab) {
      nodes.push({
        slot: "ullage",
        part: ullage,
        label: `ULLAGE SYSTEM: ${ullage.name}`,
        stage: 2,
        width: coreW,
        height: 12,
        empty: ullageEmpty,
      });
    }

    const t2Empty = s2Tank.id.startsWith("none_");
    if (!t2Empty || includeEmptyVab) {
      nodes.push({
        slot: "s2Tank",
        part: s2Tank,
        label: `STAGE 2 TANK: ${s2Tank.name}`,
        stage: 2,
        width: coreW,
        height: 62,
        empty: t2Empty,
      });
    }

    const e2Empty = s2Engine.id.startsWith("none_");
    if (!e2Empty || includeEmptyVab) {
      nodes.push({
        slot: "s2Engine",
        part: s2Engine,
        label: `STAGE 2 ENGINE: ${s2Engine.name}`,
        stage: 2,
        width: Math.round(coreW * 0.86),
        height: 32,
        empty: e2Empty,
        // Enclosed in a flush interstage skirt while Stage 1 is attached
        shroudWidth: !separated ? coreW : undefined,
      });
    }

    if (!separated) {
      const interEmpty = interstage.id.startsWith("none_");
      if (!interEmpty || includeEmptyVab) {
        nodes.push({
          slot: "interstage",
          part: interstage,
          label: `INTERSTAGE: ${interstage.name}`,
          stage: 1,
          width: coreW,
          height: 18,
          empty: interEmpty,
        });
      }
    }
  } else if (!separated && !interstage.id.startsWith("none_")) {
    nodes.push({
      slot: "interstage",
      part: interstage,
      label: `INTERSTAGE: ${interstage.name}`,
      stage: 1,
      width: coreW,
      height: 12,
      empty: false,
    });
  }

  // 4. Stage 1 Core Tank + Radial Boosters & Fins + Stage 1 Engine
  if (!separated) {
    const t1Empty = s1Tank.id.startsWith("none_");
    const hasBoosters = !boosters.id.startsWith("none_");
    const hasFins = !fins.id.startsWith("none_");

    if (!t1Empty || includeEmptyVab) {
      nodes.push({
        slot: "s1Tank",
        part: s1Tank,
        label: `STAGE 1 TANK: ${s1Tank.name}`,
        stage: 1,
        width: coreW,
        height: vehicle.stages === 2 ? 108 : 96,
        empty: t1Empty,
        radialLeft: hasBoosters ? boosters : null,
        radialRight: hasBoosters ? boosters : null,
        finLeft: hasFins ? fins : null,
        finRight: hasFins ? fins : null,
      });
    }

    const e1Empty = s1Engine.id.startsWith("none_");
    if (!e1Empty || includeEmptyVab) {
      nodes.push({
        slot: "s1Engine",
        part: s1Engine,
        label: `STAGE 1 ENGINE: ${s1Engine.name}`,
        stage: 1,
        width: coreW,
        height: 42,
        empty: e1Empty,
      });
    }
  }

  return nodes;
}

function drawSinglePart(
  ctx: CanvasRenderingContext2D,
  node: VisualNode,
  cx: number,
  cy: number,
  gimbalAngle: number,
  isHighlighted: boolean,
  engineCount: number,
  ullageFiring = false,
) {
  const { part, width: w, height: h, empty, slot, shroudWidth } = node;
  ctx.save();
  ctx.translate(cx, cy);

  if (empty) {
    ctx.strokeStyle = isHighlighted ? "#00e5ff" : "rgba(255, 179, 0, 0.7)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    roundRect(ctx, -w / 2, -h / 2, w, h, 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 179, 0, 0.08)";
    ctx.fill();
    ctx.fillStyle = "#ffb300";
    ctx.font = "600 9px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`+ ${SLOT_LABEL[slot as SlotId] ?? slot}`, 0, 0);
    ctx.restore();
    return;
  }

  const primary =
    part.propellant === "LH2_LOX" && part.cryoInsulated
      ? "#ea580c"
      : part.tint || "#e2e8f0";
  const accent = partAccent(part);

  // StarForge 3D metallic cylinder shading gradient
  const bodyGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  bodyGrad.addColorStop(0, shadeColor(primary, -30));
  bodyGrad.addColorStop(0.32, "#ffffff");
  bodyGrad.addColorStop(0.56, primary);
  bodyGrad.addColorStop(1, shadeColor(primary, -42));

  if (slot === "payload") {
    // Exposed satellite / spacecraft bus
    ctx.fillStyle = "#f59e0b";
    roundRect(ctx, -w * 0.35, -h * 0.38, w * 0.7, h * 0.76, 4);
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Solar array panels folded/extended
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(-w * 0.85, -h * 0.22, w * 0.44, h * 0.44);
    ctx.fillRect(w * 0.41, -h * 0.22, w * 0.44, h * 0.44);
    ctx.strokeStyle = "#38bdf8";
    ctx.strokeRect(-w * 0.85, -h * 0.22, w * 0.44, h * 0.44);
    ctx.strokeRect(w * 0.41, -h * 0.22, w * 0.44, h * 0.44);
    // Dish / top sensor
    ctx.beginPath();
    ctx.arc(0, -h * 0.42, w * 0.16, Math.PI, 0);
    ctx.fillStyle = "#e2e8f0";
    ctx.fill();
  } else if (part.category === "fairing") {
    const baseW = shroudWidth ?? w;
    // Conical / ogive aerodynamic nose capsule (flush at baseW)
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.bezierCurveTo(w * 0.28, -h * 0.38, w / 2, -h * 0.08, w / 2, h * 0.26);
    ctx.lineTo(baseW / 2, h / 2);
    ctx.lineTo(-baseW / 2, h / 2);
    ctx.lineTo(-w / 2, h * 0.26);
    ctx.bezierCurveTo(-w / 2, -h * 0.08, -w * 0.28, -h * 0.38, 0, -h / 2);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Nosecap tip
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w * 0.15, -h / 2 + 10);
    ctx.lineTo(-w * 0.15, -h / 2 + 10);
    ctx.closePath();
    ctx.fill();

    // Fairing centerline separation seam
    ctx.strokeStyle = "rgba(15, 23, 42, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2 + 10);
    ctx.lineTo(0, h / 2);
    ctx.stroke();

    // Porthole window
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, h * 0.08, w * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(-w * 0.03, h * 0.06, w * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Base adapter band
    ctx.fillStyle = "#334155";
    ctx.fillRect(-baseW / 2, h / 2 - 4, baseW, 4);
  } else if (part.category === "avionics") {
    // Flush Flight Avionics Ring
    ctx.fillStyle = "#132036";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = i % 2 === 0 ? "#00e5ff" : "#ffb300";
      ctx.beginPath();
      ctx.arc(i * (w * 0.16), 0, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (part.category === "ullage") {
    // Flush Ullage Thruster Collar + external RCS thruster pods
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    for (const side of [-1, 1]) {
      ctx.fillStyle = "#475569";
      ctx.fillRect(side * (w / 2) - (side === 1 ? 0 : 5), -h * 0.38, 5, h * 0.76);
      if (ullageFiring) {
        ctx.fillStyle = "rgba(186, 230, 253, 0.9)";
        ctx.beginPath();
        ctx.moveTo(side * (w / 2 + 2.5), h * 0.38);
        ctx.lineTo(side * (w / 2 + 7), h * 0.38 + 16);
        ctx.lineTo(side * (w / 2 - 1), h * 0.38 + 16);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (part.category === "tank") {
    // Seamless cylindrical propellant tank with structural bands, weld lines & fuel pipe
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);

    // Top & bottom accent stripes
    ctx.fillStyle = accent;
    ctx.fillRect(-w / 2 + 1, -h / 2 + 4, w - 2, 5);
    ctx.fillRect(-w / 2 + 1, h / 2 - 9, w - 2, 5);

    // Circumferential weld seams
    ctx.strokeStyle = "rgba(15, 23, 42, 0.28)";
    ctx.lineWidth = 1;
    const rings = Math.max(2, Math.floor(h / 26));
    for (let r = 1; r < rings; r++) {
      const ry = -h / 2 + (h / rings) * r;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 1, ry);
      ctx.lineTo(w / 2 - 1, ry);
      ctx.stroke();
    }

    // Vertical LOX feedline pipe detail
    ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
    ctx.fillRect(w * 0.25, -h / 2 + 3, 3.5, h - 6);

    // Stencil label
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.font = "700 8px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(part.short, -w * 0.05, 0);
  } else if (part.category === "interstage") {
    // Hazard-striped / composite separation ring (StarForge decoupler + composite weave)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = part.structuralRatingKpa < 40 ? "#ef4444" : "#f59e0b";
    for (let sx = -w / 2 + 4; sx < w / 2 - 4; sx += 9) {
      ctx.fillRect(sx, -h / 2 + 3, 4.5, h - 6);
    }
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  } else if (part.category === "engine") {
    // If enclosed in an interstage shroud (Stage 2 before separation), draw flush shroud skirt
    if (shroudWidth) {
      const shroudGrad = ctx.createLinearGradient(-shroudWidth / 2, 0, shroudWidth / 2, 0);
      shroudGrad.addColorStop(0, "#162133");
      shroudGrad.addColorStop(0.35, "#2b3d59");
      shroudGrad.addColorStop(1, "#0f1726");
      ctx.fillStyle = shroudGrad;
      ctx.fillRect(-shroudWidth / 2, -h / 2, shroudWidth, h);
      ctx.strokeStyle = "rgba(0, 229, 255, 0.38)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-shroudWidth / 2, -h / 2, shroudWidth, h);

      // Cutaway lattice lines so upper engine is visible inside the shroud
      ctx.strokeStyle = "rgba(148, 163, 184, 0.22)";
      ctx.beginPath();
      for (let i = -2; i <= 1; i++) {
        const x0 = (i * shroudWidth) / 4;
        const x1 = ((i + 1) * shroudWidth) / 4;
        ctx.moveTo(x0, -h / 2);
        ctx.lineTo(x1, h / 2);
        ctx.moveTo(x1, -h / 2);
        ctx.lineTo(x0, h / 2);
      }
      ctx.stroke();
    } else {
      // Stage 1 thrust structure adapter & base stability grid fins
      ctx.fillStyle = "#26354a";
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w * 0.42, -h * 0.18);
      ctx.lineTo(-w * 0.42, -h * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Integrated base stability grid panels
      for (const side of [-1, 1]) {
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1;
        const gx = side === -1 ? -w / 2 - 7 : w / 2 + 1;
        ctx.fillRect(gx, -h / 2 + 2, 6, 9);
        ctx.strokeRect(gx, -h / 2 + 2, 6, 9);
      }
    }

    // Draw 1 or 3 gimbaled engine bells
    const bells = engineCount >= 4 ? 3 : 1;
    const bellSpan = bells === 1 ? 0 : w * 0.28;
    for (let b = 0; b < bells; b++) {
      const bx = bells === 1 ? 0 : (b - 1) * bellSpan;
      const bw = bells === 1 ? w * 0.76 : w * 0.36;

      ctx.save();
      ctx.translate(bx, -h * 0.2);
      ctx.rotate(gimbalAngle);

      const bellGrad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
      bellGrad.addColorStop(0, "#0f172a");
      bellGrad.addColorStop(0.38, "#94a3b8");
      bellGrad.addColorStop(0.65, "#334155");
      bellGrad.addColorStop(1, "#090d16");

      ctx.beginPath();
      ctx.moveTo(-bw * 0.28, 0);
      ctx.lineTo(bw * 0.28, 0);
      ctx.quadraticCurveTo(bw * 0.48, h * 0.35, bw * 0.52, h * 0.7);
      ctx.lineTo(-bw * 0.52, h * 0.7);
      ctx.quadraticCurveTo(-bw * 0.48, h * 0.35, -bw * 0.28, 0);
      ctx.closePath();
      ctx.fillStyle = bellGrad;
      ctx.fill();
      ctx.strokeStyle = "#020617";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Cooling ribs on engine bell
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-bw * 0.36, h * 0.32);
      ctx.lineTo(bw * 0.36, h * 0.32);
      ctx.moveTo(-bw * 0.45, h * 0.52);
      ctx.lineTo(bw * 0.45, h * 0.52);
      ctx.stroke();

      ctx.restore();
    }
  }

  if (isHighlighted) {
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6);
  }

  ctx.restore();
}

function drawBoosterShape(
  ctx: CanvasRenderingContext2D,
  part: Part,
  cx: number,
  cy: number,
  w: number,
  h: number,
  isHighlighted: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  const noseH = 18;
  const nozH = 12;
  const cylH = h - noseH - nozH;

  const bodyGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  bodyGrad.addColorStop(0, shadeColor(part.tint, -28));
  bodyGrad.addColorStop(0.34, "#ffffff");
  bodyGrad.addColorStop(0.6, part.tint);
  bodyGrad.addColorStop(1, shadeColor(part.tint, -38));

  // Nose cone
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + noseH);
  ctx.lineTo(-w / 2, -h / 2 + noseH);
  ctx.closePath();
  ctx.fillStyle = "#f97316";
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Main cylinder
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(-w / 2, -h / 2 + noseH, w, cylH);
  ctx.strokeStyle = "#1e293b";
  ctx.strokeRect(-w / 2, -h / 2 + noseH, w, cylH);

  // Accent stripes
  ctx.fillStyle = "#f97316";
  ctx.fillRect(-w / 2 + 1, -h / 2 + noseH + 7, w - 2, 4);
  ctx.fillRect(-w / 2 + 1, h / 2 - nozH - 11, w - 2, 4);

  // Nozzle
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, h / 2 - nozH);
  ctx.lineTo(w * 0.3, h / 2 - nozH);
  ctx.lineTo(w * 0.46, h / 2);
  ctx.lineTo(-w * 0.46, h / 2);
  ctx.closePath();
  ctx.fill();

  if (isHighlighted) {
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  }

  ctx.restore();
}

function drawFinShape(
  ctx: CanvasRenderingContext2D,
  part: Part,
  cx: number,
  cy: number,
  w: number,
  h: number,
  side: -1 | 1,
  isHighlighted: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  if (side === -1) ctx.scale(-1, 1);

  const bodyGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  bodyGrad.addColorStop(0, shadeColor(part.tint, -28));
  bodyGrad.addColorStop(0.5, "#e2e8f0");
  bodyGrad.addColorStop(1, shadeColor(part.tint, -38));

  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.35);
  ctx.lineTo(w / 2, h * 0.15);
  ctx.lineTo(w / 2, h / 2);
  ctx.lineTo(-w / 2, h * 0.35);
  ctx.closePath();
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = "#0284c7";
  ctx.fillRect(-w / 2 + 2, h * 0.2, w - 4, 4);

  if (isHighlighted) {
    ctx.strokeStyle = "#00e5ff";
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4);
  }
  ctx.restore();
}

function drawCloudCluster(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.arc(24, -6, 22, 0, Math.PI * 2);
  ctx.arc(48, 2, 24, 0, Math.PI * 2);
  ctx.arc(-22, 4, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function LaunchScene({ engineRef, vehicle, build }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const setSlot = useGame((s) => s.setSlot);
  const isVab = useGame((s) => s.screen === "vab");
  const [hoveredSlot, setHoveredSlot] = useState<SlotId | null>(null);
  const [constructTrigger, setConstructTrigger] = useState(0);
  const constructStartRef = useRef<number>(0);

  // Trigger smooth step-by-step construction animation when vehicle or build changes in VAB
  useEffect(() => {
    constructStartRef.current = performance.now();
  }, [vehicle.id, build, constructTrigger]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = Math.max(1, container.clientWidth);
    let height = Math.max(1, container.clientHeight);

    const syncSize = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();

    const observer = new ResizeObserver(syncSize);
    observer.observe(container);

    // Interactive VAB state
    let placedBoxes: PlacedBox[] = [];
    let snapNodes: SnapNode[] = [];
    let currentHoverSlot: SlotId | null = null;

    // Flight simulation visual state
    let particles: Particle[] = [];
    let debris: DebrisPiece[] = [];
    let milestones: MilestoneToast[] = [];
    const reachedMilestones = new Set<string>();
    let prevSeparated = false;
    let prevFairingAttached = true;
    let prevDeployed = false;
    let lastRunTime = -999;
    let lastFrameTime = performance.now();
    let explosionTimer = -1;
    let lastFailureId: string | null = null;

    const cycleSlotPart = (slot: SlotId, clear = false) => {
      const category = SLOT_CATEGORY[slot];
      const options = partsForSlot(category, vehicle.tier);
      if (options.length === 0) return;
      if (clear) {
        const noneOpt = options.find((o) => o.id.startsWith("none_"));
        if (noneOpt) {
          sfx.unlock();
          sfx.playCue("click");
          setSlot(slot, noneOpt.id);
        }
        return;
      }
      const realOptions = options.filter((o) => !o.id.startsWith("none_"));
      const pool = realOptions.length > 0 ? realOptions : options;
      const currentIdx = pool.findIndex((o) => o.id === build[slot]);
      const next = pool[(currentIdx + 1) % pool.length];
      if (next) {
        sfx.unlock();
        sfx.playCue("click");
        setSlot(slot, next.id);
      }
    };

    const onPointerMove = (e: MouseEvent) => {
      if (engineRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      let hit: SlotId | null = null;
      for (const sn of snapNodes) {
        if (Math.hypot(mx - sn.x, my - sn.y) <= 13) {
          hit = sn.slot;
          break;
        }
      }
      if (!hit) {
        for (const b of placedBoxes) {
          if (b.slot === "payload") continue;
          if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
            hit = b.slot;
            break;
          }
        }
      }
      if (hit !== currentHoverSlot) {
        currentHoverSlot = hit;
        setHoveredSlot(hit);
      }
      canvas.style.cursor = hit ? "pointer" : "default";
    };

    const onClick = (e: MouseEvent) => {
      if (engineRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const sn of snapNodes) {
        if (Math.hypot(mx - sn.x, my - sn.y) <= 14) {
          cycleSlotPart(sn.slot, false);
          return;
        }
      }
      for (const b of placedBoxes) {
        if (b.slot === "payload") continue;
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          cycleSlotPart(b.slot, false);
          return;
        }
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      if (engineRef.current) return;
      e.preventDefault();
      if (currentHoverSlot) {
        cycleSlotPart(currentHoverSlot, true);
      }
    };

    canvas.addEventListener("mousemove", onPointerMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("contextmenu", onContextMenu);

    let raf = 0;

    const renderVAB = (now: number) => {
      // 1. Default Dark Navy Blueprint Background (preserving app theme)
      const bgGrad = ctx.createRadialGradient(
        width * 0.45,
        height * 0.48,
        40,
        width * 0.5,
        height * 0.5,
        Math.max(width, height),
      );
      bgGrad.addColorStop(0, "#0f1c33");
      bgGrad.addColorStop(1, "#070c18");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Blueprint Minor & Major Grid Lines
      const gridSize = 28;
      ctx.strokeStyle = "rgba(0, 229, 255, 0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(0, 229, 255, 0.11)";
      ctx.beginPath();
      for (let x = 0; x < width; x += gridSize * 4) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize * 4) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      const showCalloutColumn = width >= 340;
      const centerX = showCalloutColumn ? Math.round(width * 0.36) : Math.round(width * 0.5);
      const baseY = Math.round(height * 0.82);

      // 3. Left Elevation Reference Scale
      ctx.strokeStyle = "rgba(142, 163, 191, 0.25)";
      ctx.fillStyle = "rgba(142, 163, 191, 0.55)";
      ctx.font = "600 8px ui-monospace, monospace";
      ctx.textAlign = "left";
      for (let m = 0; m <= 125; m += 25) {
        const py = baseY - m * 2.4;
        if (py < 52) break;
        ctx.beginPath();
        ctx.moveTo(10, py);
        ctx.lineTo(22, py);
        ctx.stroke();
        ctx.fillText(`${m}m`, 25, py + 3);
      }

      // 4. VAB Hangar Floor, Launch Pedestal & Exhaust Flame Trench
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(centerX - 110, baseY, 220, 12);
      ctx.fillStyle = "#0b1322";
      ctx.fillRect(0, baseY + 12, width, height - baseY - 12);
      ctx.fillStyle = "#020617";
      ctx.fillRect(centerX - 38, baseY + 2, 76, 18);

      // 5. Strongback Support Tower with Truss Cross-Bracing
      const nodes = buildVisualStack(vehicle, build, null, true);
      const rawTotalH = nodes.reduce((acc, n) => acc + n.height, 0);
      const maxAvailH = Math.max(180, baseY - 82);
      const scale = Math.min(1, maxAvailH / Math.max(1, rawTotalH));

      const towerH = Math.max(190, rawTotalH * scale + 18);
      const towerX = centerX - 66;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.26)";
      ctx.lineWidth = 2.2;
      ctx.strokeRect(towerX, baseY - towerH, 16, towerH);
      ctx.beginPath();
      for (let ty = baseY; ty > baseY - towerH; ty -= 24) {
        ctx.moveTo(towerX, ty);
        ctx.lineTo(towerX + 16, Math.max(baseY - towerH, ty - 24));
        ctx.moveTo(towerX + 16, ty);
        ctx.lineTo(towerX, Math.max(baseY - towerH, ty - 24));
      }
      ctx.stroke();

      // Tower umbilical arm
      ctx.fillStyle = "#334155";
      ctx.fillRect(towerX + 16, baseY - towerH * 0.72, 34, 4);

      // 6. Compute Layout & Draw Rocket Assembly (Bottom-up construction animation)
      placedBoxes = [];
      snapNodes = [];
      const elapsedConstruct = (now - constructStartRef.current) / 1000;
      const totalScaledH = rawTotalH * scale;
      let curY = baseY - totalScaledH;

      nodes.forEach((node, idx) => {
        const revIdx = nodes.length - 1 - idx; // 0 = bottom engine, builds upward
        const partProgress = Math.max(0, Math.min(1, (elapsedConstruct - revIdx * 0.09) / 0.32));
        const ease = 1 - Math.pow(1 - partProgress, 3);
        const dropOffset = (1 - ease) * -28;

        const nh = node.height * scale;
        const nw = node.width * scale;
        const cy = curY + nh / 2 + dropOffset;
        const isHighlighted = currentHoverSlot === node.slot;

        ctx.save();
        ctx.globalAlpha = Math.max(0.15, ease);

        // Draw Radial Boosters (Left & Right) if attached to Stage 1 Tank
        if (node.slot === "s1Tank") {
          const bPart = getPart(build.boosters);
          const fPart = getPart(build.fins);
          const bEmpty = bPart.id.startsWith("none_");
          const fEmpty = fPart.id.startsWith("none_");
          const bw = 20 * scale;
          const bh = nh * 0.88;
          const leftBx = centerX - nw / 2 - bw / 2 - 3;
          const rightBx = centerX + nw / 2 + bw / 2 + 3;
          const by = cy + nh * 0.06;

          if (!bEmpty) {
            // Radial decoupler struts
            ctx.fillStyle = "#475569";
            ctx.fillRect(centerX - nw / 2 - 5, by - bh * 0.28, 6, 5);
            ctx.fillRect(centerX - nw / 2 - 5, by + bh * 0.24, 6, 5);
            ctx.fillRect(centerX + nw / 2 - 1, by - bh * 0.28, 6, 5);
            ctx.fillRect(centerX + nw / 2 - 1, by + bh * 0.24, 6, 5);

            drawBoosterShape(ctx, bPart, leftBx, by, bw, bh, currentHoverSlot === "boosters");
            drawBoosterShape(ctx, bPart, rightBx, by, bw, bh, currentHoverSlot === "boosters");

            placedBoxes.push({
              slot: "boosters",
              node,
              x: leftBx - bw / 2,
              y: by - bh / 2,
              w: bw,
              h: bh,
              cx: leftBx,
              cy: by,
            });
            placedBoxes.push({
              slot: "boosters",
              node,
              x: rightBx - bw / 2,
              y: by - bh / 2,
              w: bw,
              h: bh,
              cx: rightBx,
              cy: by,
            });
          }

          snapNodes.push({
            x: leftBx,
            y: by - 10,
            slot: "boosters",
            type: "left",
            empty: bEmpty,
            label: `SIDE BOOSTERS: ${bPart.name}`,
          });

          const fw = 22 * scale;
          const fh = 36 * scale;
          const leftFx = centerX - nw / 2 - fw / 2;
          const rightFx = centerX + nw / 2 + fw / 2;
          const fy = curY + nh - fh / 2 - 2 + dropOffset;

          if (!fEmpty) {
            drawFinShape(ctx, fPart, leftFx, fy, fw, fh, -1, currentHoverSlot === "fins");
            drawFinShape(ctx, fPart, rightFx, fy, fw, fh, 1, currentHoverSlot === "fins");
            placedBoxes.push({
              slot: "fins",
              node,
              x: leftFx - fw / 2,
              y: fy - fh / 2,
              w: fw,
              h: fh,
              cx: leftFx,
              cy: fy,
            });
            placedBoxes.push({
              slot: "fins",
              node,
              x: rightFx - fw / 2,
              y: fy - fh / 2,
              w: fw,
              h: fy,
              cx: rightFx,
              cy: fy,
            });
          }

          snapNodes.push({
            x: rightFx,
            y: fy,
            slot: "fins",
            type: "right",
            empty: fEmpty,
            label: `AERO SURFACES: ${fPart.name}`,
          });
        }

        // Draw Core Part
        drawSinglePart(
          ctx,
          {
            ...node,
            width: nw,
            height: nh,
            shroudWidth: node.shroudWidth ? node.shroudWidth * scale : undefined,
          },
          centerX,
          cy,
          0,
          isHighlighted,
          node.slot === "s1Engine" ? vehicle.s1EngineCount : 1,
          false,
        );

        // Construction weld pulse ring when snapping into place
        if (partProgress > 0.1 && partProgress < 0.95) {
          ctx.strokeStyle = `rgba(0, 229, 255, ${(1 - partProgress) * 0.9})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(centerX, curY + nh, nw * 0.65, 4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.restore();

        placedBoxes.push({
          slot: node.slot,
          node,
          x: centerX - nw / 2,
          y: curY,
          w: nw,
          h: nh,
          cx: centerX,
          cy: curY + nh / 2,
        });

        if (node.slot !== "payload") {
          snapNodes.push({
            x: centerX,
            y: curY + nh / 2,
            slot: node.slot,
            type: idx === 0 ? "top" : idx === nodes.length - 1 ? "bottom" : "core",
            empty: node.empty,
            label: node.label,
          });
        }

        curY += nh;
      });

      // 7. Draw Glowing Attachment Nodes on the Rocket Stack
      snapNodes.forEach((sn) => {
        const isHover = currentHoverSlot === sn.slot;
        if (!sn.empty && !isHover) return;
        const pulse = 0.7 + 0.3 * Math.sin(now * 0.006);
        ctx.save();
        ctx.beginPath();
        ctx.arc(sn.x, sn.y, isHover ? 9 : 6.5, 0, Math.PI * 2);
        ctx.fillStyle = sn.empty
          ? `rgba(255, 179, 0, ${0.65 * pulse})`
          : "rgba(16, 185, 129, 0.85)";
        ctx.fill();
        ctx.strokeStyle = sn.empty ? "#fde68a" : "#6ee7b7";
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();
      });

      // 8. Right-Hand Technical Engineering Blueprint Labeling Column
      if (showCalloutColumn) {
        const labelX = Math.round(width * 0.56);
        const labelW = Math.max(120, width - labelX - 10);
        let lastLabelY = 58;

        const callouts: { y: number; anchorX: number; text: string; slot: SlotId; empty: boolean }[] = [];
        placedBoxes.forEach((b) => {
          if (b.slot === "payload" || b.slot === "boosters" || b.slot === "fins") return;
          callouts.push({
            y: b.cy,
            anchorX: b.x + b.w,
            text: b.node.label,
            slot: b.slot,
            empty: b.node.empty,
          });
          if (b.slot === "s1Tank") {
            const bPart = getPart(build.boosters);
            const fPart = getPart(build.fins);
            callouts.push({
              y: b.cy - 8,
              anchorX: b.x + b.w + (bPart.id.startsWith("none_") ? 0 : 18 * scale),
              text: `SIDE BOOSTERS: ${bPart.name}`,
              slot: "boosters",
              empty: false,
            });
            callouts.push({
              y: b.cy + 14,
              anchorX: b.x + b.w + (fPart.id.startsWith("none_") ? 0 : 20 * scale),
              text: `AERO SURFACES: ${fPart.name}`,
              slot: "fins",
              empty: false,
            });
          }
        });

        callouts.forEach((c) => {
          const boxY = Math.max(lastLabelY, Math.min(baseY - 12, c.y));
          lastLabelY = boxY + 21;
          const active = currentHoverSlot === c.slot;

          // Pointer line from rocket section to label box
          ctx.strokeStyle = active
            ? "#00e5ff"
            : c.empty
              ? "rgba(255, 179, 0, 0.65)"
              : "rgba(0, 229, 255, 0.32)";
          ctx.lineWidth = active ? 1.5 : 1;
          ctx.beginPath();
          ctx.moveTo(c.anchorX + 3, c.y);
          ctx.lineTo(labelX - 10, c.y);
          ctx.lineTo(labelX - 3, boxY);
          ctx.stroke();

          ctx.fillStyle = active ? "#00e5ff" : "rgba(0, 229, 255, 0.65)";
          ctx.beginPath();
          ctx.arc(c.anchorX + 3, c.y, 2, 0, Math.PI * 2);
          ctx.fill();

          // Callout box
          ctx.fillStyle = active ? "rgba(0, 229, 255, 0.14)" : "rgba(7, 12, 24, 0.82)";
          ctx.strokeStyle = active
            ? "#00e5ff"
            : c.empty
              ? "rgba(255, 179, 0, 0.55)"
              : "rgba(142, 163, 191, 0.24)";
          roundRect(ctx, labelX, boxY - 9, labelW, 18, 3);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = c.empty ? "#ffb300" : active ? "#00e5ff" : "#e2e8f0";
          ctx.font = "600 8px ui-monospace, monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const maxChars = Math.max(16, Math.floor((labelW - 10) / 5.1));
          const txt = c.text.length > maxChars ? c.text.slice(0, maxChars - 1) + "…" : c.text;
          ctx.fillText(txt, labelX + 5, boxY);
        });
      }
    };

    const spawnFlightParticles = (
      snap: SimSnapshot,
      dt: number,
      nozzleY: number,
      coreW: number,
      hasBoosters: boolean,
      visualAngle: number,
      gimbalAngle: number,
    ) => {
      const airDensity = snap.h >= 100_000 ? 0 : Math.exp(-snap.h / 9500);

      // Pre-ignition steam during terminal count
      if (snap.status === "countdown" && snap.t > -3.5) {
        for (let i = 0; i < 2; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          particles.push({
            x: dir * (6 + Math.random() * 14),
            y: nozzleY + 4,
            vx: dir * (28 + Math.random() * 45),
            vy: -8 + Math.random() * 18,
            size: 10 + Math.random() * 12,
            grow: 26,
            life: 0,
            maxLife: 0.75 + Math.random() * 0.5,
            type: "smoke",
          });
        }
      }

      const stage1Firing =
        snap.status === "flying" &&
        snap.stage === 1 &&
        !snap.stage1Burnout &&
        snap.propellant1Kg > 0 &&
        snap.throttle > 0;
      const stage2Firing =
        snap.status === "flying" &&
        snap.stage === 2 &&
        snap.stage2Ignited &&
        !snap.seco &&
        snap.propellant2Kg > 0 &&
        snap.throttle > 0;

      if (!stage1Firing && !stage2Firing) return;

      const sinN = Math.sin(visualAngle + gimbalAngle * 0.7);
      const cosN = Math.cos(visualAngle + gimbalAngle * 0.7);
      const count = stage1Firing ? 5 : 4;

      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * (0.24 + (1 - airDensity) * 0.48);
        const speed = (140 + Math.random() * 90) * Math.max(0.45, snap.throttle);
        particles.push({
          x: -sinN * nozzleY + (Math.random() - 0.5) * (coreW * 0.28),
          y: cosN * nozzleY,
          vx: -Math.sin(visualAngle + spread) * speed,
          vy: Math.cos(visualAngle + spread) * speed,
          size: (stage2Firing ? 7 : 8) + Math.random() * 6,
          grow: 22 + (1 - airDensity) * 38,
          life: 0,
          maxLife: 0.28 + Math.random() * 0.22,
          type: stage2Firing ? "vacuum" : "flame",
        });
      }

      // Twin SRB side booster plumes
      if (stage1Firing && hasBoosters) {
        for (const side of [-1, 1]) {
          const bx = side * (coreW * 0.72);
          particles.push({
            x: bx * cosN - sinN * (nozzleY - 4),
            y: bx * sinN + cosN * (nozzleY - 4),
            vx: -Math.sin(visualAngle + side * 0.08) * 165,
            vy: Math.cos(visualAngle + side * 0.08) * 165,
            size: 7 + Math.random() * 5,
            grow: 26,
            life: 0,
            maxLife: 0.3 + Math.random() * 0.2,
            type: "flame",
          });
        }
      }

      // Pad steam near ground (< 120 m)
      if (snap.h < 120) {
        for (let i = 0; i < 3; i++) {
          const dir = Math.random() < 0.5 ? -1 : 1;
          particles.push({
            x: dir * (10 + Math.random() * 24),
            y: nozzleY + 6,
            vx: dir * (45 + Math.random() * 65),
            vy: -12 + Math.random() * 22,
            size: 12 + Math.random() * 14,
            grow: 34,
            life: 0,
            maxLife: 0.8 + Math.random() * 0.5,
            type: "smoke",
          });
        }
      }
    };

    const renderFlight = (now: number, snap: SimSnapshot) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTime) / 1000));
      lastFrameTime = now;

      // Reset flight visual state on new run
      if (snap.t < lastRunTime - 1) {
        particles = [];
        debris = [];
        milestones = [];
        reachedMilestones.clear();
        prevSeparated = false;
        prevFairingAttached = true;
        prevDeployed = false;
        explosionTimer = -1;
        lastFailureId = null;
      }
      lastRunTime = snap.t;

      const alt = Math.max(0, snap.h);
      const altKm = alt / 1000;
      const spaceBlend = Math.min(1, Math.pow(alt / 100_000, 0.72));

      // 1. Default Dark Navy Atmosphere-to-Space Sky Interpolation
      const skyTop = lerpColor("#0b1528", "#02030a", spaceBlend);
      const skyMid = lerpColor("#122a47", "#050914", Math.min(1, spaceBlend * 1.15));
      const skyBot = lerpColor("#1c4a78", "#070c18", Math.min(1, spaceBlend * 1.3));

      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, skyTop);
      skyGrad.addColorStop(0.55, skyMid);
      skyGrad.addColorStop(1, skyBot);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Parallax Starfield & Cosmic Glow as altitude climbs toward 100 km
      const starAlpha = Math.max(0.08, Math.min(1, (alt - 8000) / 55000));
      if (starAlpha > 0.01) {
        const nebGrad = ctx.createRadialGradient(
          width * 0.72,
          height * 0.25,
          20,
          width * 0.72,
          height * 0.25,
          width * 0.55,
        );
        nebGrad.addColorStop(0, `rgba(0, 229, 255, ${starAlpha * 0.1})`);
        nebGrad.addColorStop(0.5, `rgba(56, 189, 248, ${starAlpha * 0.05})`);
        nebGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, width, height);

        STARS.forEach((st) => {
          const twinkle = 0.65 + 0.35 * Math.sin(now * 0.003 + st.phase);
          ctx.fillStyle = st.hue;
          ctx.globalAlpha = starAlpha * twinkle;
          const sx = (((st.rx * width - snap.downrange * 0.012) % width) + width) % width;
          const sy = (((st.ry * height + alt * 0.035) % height) + height) % height;
          ctx.beginPath();
          ctx.arc(sx, sy, st.size, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // 3. Curved Earth Horizon & Glowing Atmospheric Limb Halo (> 30 km to 100 km+)
      if (alt > 30_000) {
        const earthVis = Math.min(1, (alt - 30_000) / 70_000);
        const earthRadiusPx = Math.max(width, height) * 1.45;
        const earthCenterY = height + earthRadiusPx - (95 + earthVis * 65);

        const atmoGlow = ctx.createRadialGradient(
          width * 0.5,
          earthCenterY,
          earthRadiusPx - 12,
          width * 0.5,
          earthCenterY,
          earthRadiusPx + 38,
        );
        atmoGlow.addColorStop(0, "rgba(0, 229, 255, 0.75)");
        atmoGlow.addColorStop(0.45, "rgba(56, 189, 248, 0.32)");
        atmoGlow.addColorStop(1, "rgba(14, 165, 233, 0)");
        ctx.fillStyle = atmoGlow;
        ctx.beginPath();
        ctx.arc(width * 0.5, earthCenterY, earthRadiusPx + 38, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#08203e";
        ctx.beginPath();
        ctx.arc(width * 0.5, earthCenterY, earthRadiusPx, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Camera & Rocket Screen Climb (rises from pad toward upper-center by 100 km, never hides)
      const climbProgress = Math.min(1, alt / 100_000);
      const baseAnchorY = height * (0.72 - climbProgress * 0.28);
      const shakeMag =
        snap.status === "flying" && snap.t < 4
          ? (1 - snap.t / 4) * 3.5
          : snap.status === "failure" && explosionTimer > 0
            ? Math.max(0, 1 - (now - explosionTimer) / 1400) * 6
            : 0;
      const camScreenX = width * 0.5 + (Math.random() - 0.5) * shakeMag;
      const camScreenY = baseAnchorY + (Math.random() - 0.5) * shakeMag;

      // 5. Parallax Clouds in Troposphere / Stratosphere (< 22 km)
      if (alt < 22_000) {
        const cloudLayers = [
          { altM: 350, scale: 1.0, alpha: 0.42 },
          { altM: 1600, scale: 1.25, alpha: 0.35 },
          { altM: 4800, scale: 1.5, alpha: 0.28 },
          { altM: 11000, scale: 1.75, alpha: 0.2 },
          { altM: 17500, scale: 1.9, alpha: 0.14 },
        ];
        cloudLayers.forEach((cl, idx) => {
          const dy = (alt - cl.altM) * 0.18;
          const screenY = camScreenY + dy;
          if (screenY > -120 && screenY < height + 120) {
            ctx.fillStyle = `rgba(226, 232, 240, ${cl.alpha})`;
            for (let c = -2; c <= 2; c++) {
              const cx =
                (((width * 0.5 + c * 280 + idx * 130 - snap.downrange * 0.08) % (width + 360)) +
                  (width + 360)) %
                  (width + 360) -
                180;
              drawCloudCluster(ctx, cx, screenY, cl.scale);
            }
          }
        });
      }

      // 6. High-speed vertical atmospheric reference streaks while ascending
      if (snap.status === "flying" && snap.speed > 40) {
        const streakAlpha = Math.min(0.32, snap.speed / 4500);
        ctx.strokeStyle = `rgba(0, 229, 255, ${streakAlpha})`;
        ctx.lineWidth = 1;
        for (let i = 0; i < 14; i++) {
          const sx = ((i * 97 + 31) % 100) * 0.01 * width;
          const sy = (((i * 173 + alt * 0.45) % (height + 80)) + (height + 80)) % (height + 80) - 40;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy + 28 + Math.min(45, snap.speed * 0.015));
          ctx.stroke();
        }
      }

      // 7. Build Active Rocket Nodes (all attached parts move together)
      const activeNodes = buildVisualStack(vehicle, build, snap, false);
      const flightScale = 0.78;
      const totalRocketH = activeNodes.reduce((acc, n) => acc + n.height * flightScale, 0);
      const coreW = (vehicle.tier === 1 ? 42 : vehicle.tier === 2 ? 48 : 54) * flightScale;

      // Ground, Launchpad & Retractable Umbilical Gantry when near surface (< 1600 m)
      const ppm = 2.4;
      const groundScreenY = camScreenY + alt * ppm + totalRocketH * 0.5;
      if (groundScreenY < height + 260) {
        const padScreenX = camScreenX - snap.downrange * 0.35;

        // Ground & Launch Pad Deck
        ctx.fillStyle = "#0b172a";
        ctx.fillRect(0, groundScreenY, width, height - groundScreenY + 260);
        ctx.fillStyle = "#334155";
        ctx.fillRect(padScreenX - 130, groundScreenY - 6, 260, 12);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(padScreenX - 42, groundScreenY - 4, 84, 12);

        // Umbilical Tower & Retracting Strongback Gantry Arm
        const towerX = padScreenX - 78;
        const towerH = Math.max(175, totalRocketH + 22);
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(towerX, groundScreenY - towerH, 18, towerH - 6);
        ctx.beginPath();
        for (let ty = groundScreenY - 6; ty > groundScreenY - towerH; ty -= 24) {
          ctx.moveTo(towerX, ty);
          ctx.lineTo(towerX + 18, Math.max(groundScreenY - towerH, ty - 24));
          ctx.moveTo(towerX + 18, ty);
          ctx.lineTo(towerX, Math.max(groundScreenY - towerH, ty - 24));
        }
        ctx.stroke();

        const gantryOpen =
          snap.status === "countdown"
            ? Math.max(0, Math.min(1, (10 + snap.t) / 8.5))
            : 1;
        ctx.save();
        ctx.translate(towerX + 18, groundScreenY - towerH * 0.65);
        ctx.rotate(-gantryOpen * 0.72);
        ctx.fillStyle = "#ffb300";
        ctx.fillRect(0, -3, 54, 6);
        ctx.restore();
      }

      // 8. Detect Stage Separation, Fairing Jettison & Payload Deploy to Spawn Tumbling Debris
      const rawPitchRad =
        snap.speed > 15 ? Math.atan2(snap.vx, Math.max(1, snap.vy)) : 0;
      const visualAngle = Math.max(-0.52, Math.min(0.52, rawPitchRad * 0.45));
      const gimbalAngle =
        snap.status === "flying" ? Math.sin(now * 0.008) * 0.06 - visualAngle * 0.15 : 0;

      if (snap.separated && !prevSeparated) {
        prevSeparated = true;
        const bPart = getPart(build.boosters);
        const fPart = getPart(build.fins);
        const s1Tank = getPart(build.s1Tank);
        const s1Engine = getPart(build.s1Engine);
        const interstage = getPart(build.interstage);

        // Side Boosters peel outward left and right
        if (!bPart.id.startsWith("none_")) {
          for (const side of [-1, 1] as const) {
            debris.push({
              kind: "booster",
              part: bPart,
              x: side * (coreW * 0.8),
              y: 35,
              vx: side * 26,
              vy: 42,
              w: 18 * flightScale,
              h: 84 * flightScale,
              angle: visualAngle,
              angularVel: side * 0.75,
              life: 0,
              maxLife: 9,
            });
          }
        }

        // Interstage ring detaches
        if (!interstage.id.startsWith("none_")) {
          debris.push({
            kind: "interstage",
            part: interstage,
            x: 0,
            y: 18,
            vx: (Math.random() - 0.5) * 8,
            vy: 34,
            w: coreW,
            h: 15 * flightScale,
            angle: visualAngle,
            angularVel: (Math.random() - 0.5) * 0.6,
            life: 0,
            maxLife: 8,
          });
        }

        // Stage 1 core (tank + fins + main engine) detaches and falls away
        debris.push({
          kind: "stage1",
          part: s1Tank,
          finPart: fPart.id.startsWith("none_") ? null : fPart,
          enginePart: s1Engine,
          x: 0,
          y: 62,
          vx: -Math.sin(visualAngle) * 14,
          vy: 48,
          w: coreW,
          h: 96 * flightScale,
          angle: visualAngle,
          angularVel: 0.28,
          life: 0,
          maxLife: 11,
        });

        // Cold-gas separation puff burst
        for (let i = 0; i < 14; i++) {
          const a = (i / 14) * Math.PI * 2;
          particles.push({
            x: Math.cos(a) * (coreW * 0.4),
            y: 14,
            vx: Math.cos(a) * 55,
            vy: Math.sin(a) * 25 + 15,
            size: 5,
            grow: 18,
            life: 0,
            maxLife: 0.55,
            type: "ullage",
          });
        }
      }

      if (!snap.fairingAttached && prevFairingAttached) {
        prevFairingAttached = false;
        const fairingPart = getPart(build.fairing);
        if (!fairingPart.id.startsWith("none_")) {
          for (const side of [-1, 1] as const) {
            debris.push({
              kind: side === -1 ? "fairingLeft" : "fairingRight",
              part: fairingPart,
              x: side * (coreW * 0.35),
              y: -totalRocketH * 0.35,
              vx: side * 38,
              vy: 26,
              w: coreW * 0.52,
              h: 48 * flightScale,
              angle: visualAngle + side * 0.15,
              angularVel: side * 1.1,
              life: 0,
              maxLife: 8,
            });
          }
        }
      }

      if (snap.deployed && !prevDeployed) {
        prevDeployed = true;
        debris.push({
          kind: "payload",
          part: {
            ...getPart(build.fairing),
            id: "payload_sat",
            name: vehicle.payloadName,
            short: "PAYLOAD",
            tint: "#f59e0b",
          },
          x: Math.sin(visualAngle) * 18,
          y: -totalRocketH * 0.55,
          vx: Math.sin(visualAngle) * 12,
          vy: -22, // drifts ahead into orbit!
          w: coreW * 0.8,
          h: 30 * flightScale,
          angle: visualAngle,
          angularVel: 0.05,
          life: 0,
          maxLife: 12,
        });
      }

      // 9. Check 100 km Ascent Milestones
      const milestoneDefs = [
        { id: "1km", cond: alt >= 1000, title: "1 KM — TOWER CLEARED", sub: "Ascending through troposphere" },
        { id: "mach1", cond: snap.speed >= 343 && alt < 50_000, title: "MACH 1 — SUPERSONIC", sub: "Sound barrier broken" },
        { id: "12km", cond: alt >= 12_000, title: "12 KM — STRATOSPHERE", sub: "Above dense weather layer" },
        { id: "50km", cond: alt >= 50_000, title: "50 KM — MESOSPHERE", sub: "Halfway to the Kármán line" },
        { id: "100km", cond: alt >= 100_000, title: "100 KM — KÁRMÁN LINE!", sub: "Outer space boundary reached" },
      ];
      for (const m of milestoneDefs) {
        if (m.cond && !reachedMilestones.has(m.id)) {
          reachedMilestones.add(m.id);
          milestones.push({ id: m.id, title: m.title, subtitle: m.sub, createdAt: now });
        }
      }
      milestones = milestones.filter((m) => now - m.createdAt < 3800);

      // 10. Spawn & Update Exhaust Plume Particles
      const hasBoosters = !snap.separated && !getPart(build.boosters).id.startsWith("none_");
      spawnFlightParticles(
        snap,
        dt,
        totalRocketH * 0.5,
        coreW,
        hasBoosters,
        visualAngle,
        gimbalAngle,
      );

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.size += p.grow * dt;

        const ratio = p.life / p.maxLife;
        ctx.save();
        if (p.type === "flame") {
          if (ratio < 0.22) ctx.fillStyle = `rgba(255, 255, 240, ${1 - ratio})`;
          else if (ratio < 0.52) ctx.fillStyle = `rgba(251, 191, 36, ${0.95 - ratio * 0.6})`;
          else if (ratio < 0.8) ctx.fillStyle = `rgba(249, 115, 22, ${0.85 - ratio * 0.7})`;
          else ctx.fillStyle = `rgba(148, 163, 184, ${(1 - ratio) * 0.45})`;
        } else if (p.type === "vacuum") {
          if (ratio < 0.3) ctx.fillStyle = `rgba(224, 242, 254, ${0.95 - ratio})`;
          else if (ratio < 0.7) ctx.fillStyle = `rgba(56, 189, 248, ${0.75 - ratio * 0.6})`;
          else ctx.fillStyle = `rgba(251, 191, 36, ${(1 - ratio) * 0.5})`;
        } else if (p.type === "ullage") {
          ctx.fillStyle = `rgba(186, 230, 253, ${(1 - ratio) * 0.8})`;
        } else {
          ctx.fillStyle = `rgba(226, 232, 240, ${(1 - ratio) * 0.42})`;
        }
        ctx.beginPath();
        ctx.arc(camScreenX + p.x, camScreenY + p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 11. Update & Draw Separated Debris (Boosters, Stage 1 Core, Interstage, Fairing Halves, Payload)
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i];
        d.life += dt;
        if (d.life >= d.maxLife) {
          debris.splice(i, 1);
          continue;
        }
        if (d.kind !== "payload") {
          d.vy += 18 * dt;
        }
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        d.angle += d.angularVel * dt;

        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - d.life / d.maxLife);
        ctx.translate(camScreenX + d.x, camScreenY + d.y);
        ctx.rotate(d.angle);

        if (d.kind === "booster") {
          drawBoosterShape(ctx, d.part, 0, 0, d.w, d.h, false);
        } else if (d.kind === "stage1") {
          if (d.finPart) {
            drawFinShape(ctx, d.finPart, -d.w * 0.75, d.h * 0.25, 18, 28, -1, false);
            drawFinShape(ctx, d.finPart, d.w * 0.75, d.h * 0.25, 18, 28, 1, false);
          }
          drawSinglePart(
            ctx,
            {
              slot: "s1Tank",
              part: d.part,
              label: "",
              stage: 1,
              width: d.w,
              height: d.h,
              empty: false,
            },
            0,
            0,
            0,
            false,
            1,
          );
          if (d.enginePart) {
            drawSinglePart(
              ctx,
              {
                slot: "s1Engine",
                part: d.enginePart,
                label: "",
                stage: 1,
                width: d.w,
                height: 30,
                empty: false,
              },
              0,
              d.h / 2 + 15,
              0,
              false,
              vehicle.s1EngineCount,
            );
          }
        } else if (d.kind === "fairingLeft" || d.kind === "fairingRight") {
          const dir = d.kind === "fairingLeft" ? -1 : 1;
          ctx.fillStyle = d.part.tint || "#cbd5e1";
          ctx.strokeStyle = "#1e293b";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -d.h / 2);
          ctx.quadraticCurveTo(dir * d.w, -d.h * 0.1, dir * d.w, d.h / 2);
          ctx.lineTo(0, d.h / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (d.kind === "payload") {
          drawSinglePart(
            ctx,
            {
              slot: "payload",
              part: d.part,
              label: "",
              stage: 2,
              width: d.w,
              height: d.h,
              empty: false,
            },
            0,
            0,
            0,
            false,
            1,
          );
        } else {
          drawSinglePart(
            ctx,
            {
              slot: "interstage",
              part: d.part,
              label: "",
              stage: 1,
              width: d.w,
              height: d.h,
              empty: false,
            },
            0,
            0,
            0,
            false,
            1,
          );
        }
        ctx.restore();
      }

      // 12. Draw Active Assembled Rocket Vehicle (all remaining parts connected)
      if (snap.failure && snap.failure.id !== lastFailureId) {
        lastFailureId = snap.failure.id;
        const noExplosion = ["timeout", "unstable_orbit", "cryo_boiloff"].includes(snap.failure.id);
        if (!noExplosion) explosionTimer = now;
      }

      const hideRocket =
        snap.status === "failure" &&
        explosionTimer > 0 &&
        now - explosionTimer > 120;

      if (!hideRocket) {
        ctx.save();
        ctx.translate(camScreenX, camScreenY);
        ctx.rotate(visualAngle);

        let curY = -totalRocketH / 2;
        const ullageFiring =
          snap.separated && !snap.stage2Ignited && !getPart(build.ullage).id.startsWith("none_");

        activeNodes.forEach((node) => {
          const nh = node.height * flightScale;
          const nw = node.width * flightScale;
          const cy = curY + nh / 2;

          if (node.slot === "s1Tank") {
            if (node.radialLeft && node.radialRight) {
              const bw = 18 * flightScale;
              const bh = nh * 0.88;
              const by = cy + nh * 0.06;
              ctx.fillStyle = "#475569";
              ctx.fillRect(-nw / 2 - 5, by - bh * 0.25, 6, 4);
              ctx.fillRect(nw / 2 - 1, by - bh * 0.25, 6, 4);
              drawBoosterShape(ctx, node.radialLeft, -nw / 2 - bw / 2 - 3, by, bw, bh, false);
              drawBoosterShape(ctx, node.radialRight, nw / 2 + bw / 2 + 3, by, bw, bh, false);
            }
            if (node.finLeft && node.finRight) {
              const fw = 20 * flightScale;
              const fh = 32 * flightScale;
              const fy = curY + nh - fh / 2 - 2;
              drawFinShape(ctx, node.finLeft, -nw / 2 - fw / 2, fy, fw, fh, -1, false);
              drawFinShape(ctx, node.finRight, nw / 2 + fw / 2, fy, fw, fh, 1, false);
            }
          }

          drawSinglePart(
            ctx,
            {
              ...node,
              width: nw,
              height: nh,
              shroudWidth: node.shroudWidth ? node.shroudWidth * flightScale : undefined,
            },
            0,
            cy,
            node.slot === "s1Engine" || node.slot === "s2Engine" ? gimbalAngle : 0,
            false,
            node.slot === "s1Engine" ? vehicle.s1EngineCount : 1,
            ullageFiring,
          );

          curY += nh;
        });

        ctx.restore();
      }

      // 13. Mach Shockwave Cone near speed of sound (290 - 420 m/s below 35 km)
      if (snap.status === "flying" && snap.speed > 290 && snap.speed < 420 && alt < 35_000) {
        const machAlpha = Math.max(0, 1 - Math.abs(snap.speed - 355) / 65);
        ctx.save();
        ctx.translate(camScreenX, camScreenY);
        ctx.rotate(visualAngle);
        ctx.strokeStyle = `rgba(255, 255, 255, ${machAlpha * 0.55})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-64, totalRocketH * 0.12);
        ctx.quadraticCurveTo(0, -totalRocketH * 0.52, 64, totalRocketH * 0.12);
        ctx.stroke();
        ctx.restore();
      }

      // 14. Explosion Fireball on Structural / Pad Failure
      if (explosionTimer > 0) {
        const elapsed = (now - explosionTimer) / 1000;
        if (elapsed < 2.2) {
          const rad = 28 + elapsed * 135;
          const alpha = Math.max(0, 1 - elapsed / 2.2);
          const expGrad = ctx.createRadialGradient(
            camScreenX,
            camScreenY,
            4,
            camScreenX,
            camScreenY,
            rad,
          );
          expGrad.addColorStop(0, `rgba(255, 255, 240, ${alpha})`);
          expGrad.addColorStop(0.35, `rgba(255, 179, 0, ${alpha * 0.85})`);
          expGrad.addColorStop(0.7, `rgba(255, 42, 85, ${alpha * 0.55})`);
          expGrad.addColorStop(1, "rgba(255, 42, 85, 0)");
          ctx.fillStyle = expGrad;
          ctx.beginPath();
          ctx.arc(camScreenX, camScreenY, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 15. Center Viewport 0–100 km Space Progress Bar & Atmospheric Zone Badge (StarForge Reference)
      const zoneLabel =
        altKm >= 100
          ? "OUTER SPACE · KÁRMÁN LINE+"
          : altKm >= 50
            ? "MESOSPHERE"
            : altKm >= 12
              ? "STRATOSPHERE"
              : "TROPOSPHERE";
      const progressPct = Math.min(1, altKm / 100);
      const barW = Math.min(260, width * 0.46);
      const barX = (width - barW) / 2;
      const barY = 14;

      ctx.save();
      ctx.fillStyle = "rgba(5, 11, 21, 0.78)";
      ctx.strokeStyle = "rgba(0, 229, 255, 0.28)";
      ctx.lineWidth = 1;
      roundRect(ctx, barX - 12, barY - 6, barW + 24, 34, 6);
      ctx.fill();
      ctx.stroke();

      ctx.font = "600 8px ui-monospace, monospace";
      ctx.fillStyle = "#00e5ff";
      ctx.textAlign = "left";
      ctx.fillText(zoneLabel, barX - 4, barY + 5);
      ctx.fillStyle = "#f4f6f9";
      ctx.textAlign = "right";
      ctx.fillText(`${altKm.toFixed(1)} / 100 KM`, barX + barW + 4, barY + 5);

      ctx.fillStyle = "#020617";
      roundRect(ctx, barX - 4, barY + 12, barW + 8, 6, 3);
      ctx.fill();

      const progGrad = ctx.createLinearGradient(barX - 4, 0, barX + barW + 4, 0);
      progGrad.addColorStop(0, "#00e5ff");
      progGrad.addColorStop(0.7, "#38bdf8");
      progGrad.addColorStop(1, "#ffb300");
      ctx.fillStyle = progGrad;
      roundRect(ctx, barX - 4, barY + 12, Math.max(4, (barW + 8) * progressPct), 6, 3);
      ctx.fill();
      ctx.restore();

      // 16. Milestone Celebration Toasts
      milestones.forEach((m, idx) => {
        const age = (now - m.createdAt) / 1000;
        const alpha = age < 0.25 ? age / 0.25 : age > 3.2 ? Math.max(0, (3.8 - age) / 0.6) : 1;
        const ty = 58 + idx * 34;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "rgba(7, 12, 24, 0.9)";
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 1.2;
        roundRect(ctx, width / 2 - 125, ty, 250, 28, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#00e5ff";
        ctx.font = "700 9px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(`★ ${m.title}`, width / 2, ty + 11);
        ctx.fillStyle = "#8ea3bf";
        ctx.font = "600 8px ui-monospace, monospace";
        ctx.fillText(m.subtitle, width / 2, ty + 21);
        ctx.restore();
      });
    };

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      const snap = engineRef.current?.getSnapshot() ?? null;
      if (!snap) {
        renderVAB(now);
      } else {
        renderFlight(now, snap);
      }
    };

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("mousemove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("contextmenu", onContextMenu);
    };
  }, [vehicle, build, engineRef, setSlot, constructTrigger]);

  const stats = computeStats(vehicle, build);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#0b1021]"
      aria-label="Launch vehicle viewport"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Interactive VAB Construction Helper Controls */}
      {isVab ? (
        <div className="pointer-events-none absolute inset-x-3 top-14 flex items-center justify-between gap-2">
          <div className="rounded border border-[var(--line)] bg-[rgba(7,12,24,0.82)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {hoveredSlot
              ? `Click to cycle ${SLOT_LABEL[hoveredSlot]} · Right-click to clear`
              : `Click any rocket section to construct · ${stats.layout.length} modules`}
          </div>
          <button
            type="button"
            onClick={() => {
              sfx.unlock();
              sfx.playCue("click");
              setConstructTrigger((n) => n + 1);
            }}
            className="pointer-events-auto rounded border border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.1)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[var(--cyan)] transition hover:bg-[rgba(0,229,255,0.2)]"
          >
            Construct rocket
          </button>
        </div>
      ) : null}
    </div>
  );
}
