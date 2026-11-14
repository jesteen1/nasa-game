"use client";

import { useEffect, useRef } from "react";
import type { ReferencePoint, TelemetrySample } from "../types";
import { getVehicle } from "../data/vehicles";

interface Props {
  samples: TelemetrySample[];
  reference: ReferencePoint[];
  targetAltKm: number;
  accent: string;
}

const PAD = { left: 44, right: 44, top: 18, bottom: 24 };

export default function TelemetryChart({
  samples,
  reference,
  targetAltKm,
  accent,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const draw = () => {
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const innerW = width - PAD.left - PAD.right;
      const innerH = height - PAD.top - PAD.bottom;

      const maxT = Math.max(
        120,
        reference[reference.length - 1]?.t ?? 0,
        samples[samples.length - 1]?.t ?? 0,
      );
      const maxAltM = Math.max(
        60_000,
        targetAltKm * 1000 * 1.05,
        ...samples.map((s) => s.h),
      );
      const maxSpeed = Math.max(2000, ...samples.map((s) => s.speed));

      const x = (t: number) => PAD.left + (t / maxT) * innerW;
      const yAlt = (m: number) => PAD.top + innerH - (m / maxAltM) * innerH;
      const ySpeed = (v: number) =>
        PAD.top + innerH - (v / maxSpeed) * innerH;

      // Grid
      ctx.strokeStyle = "rgba(142,163,191,0.14)";
      ctx.lineWidth = 1;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillStyle = "rgba(142,163,191,0.75)";
      for (let i = 0; i <= 4; i++) {
        const gy = PAD.top + (innerH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(PAD.left, gy);
        ctx.lineTo(PAD.left + innerW, gy);
        ctx.stroke();
        const altLabel = ((1 - i / 4) * maxAltM) / 1000;
        ctx.textAlign = "right";
        ctx.fillText(`${altLabel.toFixed(0)}`, PAD.left - 6, gy + 3);
        const velLabel = ((1 - i / 4) * maxSpeed) / 1000;
        ctx.textAlign = "left";
        ctx.fillText(`${velLabel.toFixed(1)}`, PAD.left + innerW + 6, gy + 3);
      }
      for (let i = 0; i <= 4; i++) {
        const gx = PAD.left + (innerW / 4) * i;
        ctx.beginPath();
        ctx.moveTo(gx, PAD.top);
        ctx.lineTo(gx, PAD.top + innerH);
        ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(142,163,191,0.75)";
        ctx.fillText(`${Math.round((maxT / 4) * i)}`, gx, PAD.top + innerH + 15);
      }

      // Axis captions
      ctx.fillStyle = "rgba(142,163,191,0.8)";
      ctx.textAlign = "left";
      ctx.fillText("ALT km", 4, PAD.top - 6);
      ctx.textAlign = "right";
      ctx.fillText("VEL km/s", width - 4, PAD.top - 6);
      ctx.textAlign = "center";
      ctx.fillText("MISSION ELAPSED TIME — s", PAD.left + innerW / 2, height - 3);

      // Reference altitude (dashed)
      if (reference.length > 1) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(255,179,0,0.5)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        reference.forEach((p, i) => {
          const px = x(p.t);
          const py = yAlt(p.altKm * 1000);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Target altitude
      if (targetAltKm > 0 && targetAltKm * 1000 <= maxAltM) {
        ctx.save();
        ctx.setLineDash([2, 6]);
        ctx.strokeStyle = "rgba(0,229,255,0.35)";
        ctx.beginPath();
        const ty = yAlt(targetAltKm * 1000);
        ctx.moveTo(PAD.left, ty);
        ctx.lineTo(PAD.left + innerW, ty);
        ctx.stroke();
        ctx.restore();
      }

      // Speed line
      if (samples.length > 1) {
        ctx.strokeStyle = "rgba(139,211,255,0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const px = x(s.t);
          const py = ySpeed(s.speed);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // Altitude line
      if (samples.length > 1) {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        samples.forEach((s, i) => {
          const px = x(s.t);
          const py = yAlt(s.h);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        const last = samples[samples.length - 1];
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(x(last.t), yAlt(last.h), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(parent);
    return () => observer.disconnect();
  }, [samples, reference, targetAltKm, accent]);

  return (
    <div className="relative h-44 w-full">
      <canvas ref={canvasRef} className="block" aria-label="Telemetry chart" />
    </div>
  );
}

export function ReferenceNote({ tier }: { tier: number }) {
  const vehicle = getVehicle(tier);
  return (
    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
      Amber dashed: {vehicle.name} reference profile
    </p>
  );
}
