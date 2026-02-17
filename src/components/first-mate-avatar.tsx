/**
 * First Mate Avatar
 *
 * Dark Voyager-inspired space character rendered on Canvas 2D.
 * Dark tactical spacesuit with neon accent lighting strips.
 * Reflective visor helmet, glowing accents on chest, boots, belt.
 * Evolution levels (1-4) add armor, jetpack, energy effects.
 * Gender toggle and customizable accent color scheme.
 *
 * Props:
 *  completedGoalCount - controls evolution level
 *  traits - array for personality-based default accent color
 *  gender - "male" | "female" | "neutral"
 *  accentColor - hex color for neon accents
 */

"use client";

import { useRef, useEffect, useCallback } from "react";

interface FirstMateAvatarProps {
  completedGoalCount: number;
  traits?: string[];
  gender?: "male" | "female" | "neutral";
  accentColor?: string;
}

function getLevel(count: number): number {
  if (count >= 10) return 4;
  if (count >= 5) return 3;
  if (count >= 3) return 2;
  return 1;
}

function getDefaultAccent(traits: string[]): string {
  const joined = traits.join(" ").toLowerCase();
  if (joined.includes("creat") || joined.includes("artist")) return "#FF6B00";
  if (joined.includes("learn") || joined.includes("curio")) return "#00E5FF";
  if (joined.includes("lead") || joined.includes("ambit")) return "#FF2D55";
  if (joined.includes("analyt") || joined.includes("logic")) return "#7B61FF";
  if (joined.includes("build") || joined.includes("maker")) return "#00FF94";
  return "#FF9500";
}

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 255, g: 149, b: 0 };
}

function drawRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  r = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function FirstMateAvatar({ completedGoalCount, traits = [], gender = "neutral", accentColor }: FirstMateAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const level = getLevel(completedGoalCount);
  const accent = accentColor || getDefaultAccent(traits);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    ctx.clearRect(0, 0, w, h);
    const fem = gender === "female";
    const cx = w / 2;
    const breathY = Math.sin(t * 2) * 1.5;
    const sd = "#1a1e2e", sm = "#262b3d", sl = "#323850";
    const rgb = hexToRGB(accent);

    // -- Legs --
    const legT = 290 + breathY, legB = 400, legW = fem ? 22 : 26, hip = fem ? 20 : 24;
    drawRR(ctx, cx - hip - legW / 2, legT, legW, legB - legT, 4, sd);
    drawRR(ctx, cx + hip - legW / 2, legT, legW, legB - legT, 4, sd);
    if (level >= 2) {
      drawRR(ctx, cx - hip - legW / 2 - 1, legT + 45, legW + 2, 14, 3, sl);
      drawRR(ctx, cx + hip - legW / 2 - 1, legT + 45, legW + 2, 14, 3, sl);
    }

    // -- Boots --
    const bT = legB - 10, bW = legW + 8;
    [-1, 1].forEach(s => {
      const bx = cx + s * hip - bW / 2;
      drawRR(ctx, bx, bT, bW, 38, 5, sm);
      drawRR(ctx, bx + 3, bT + 3, bW - 6, 4, 2, accent);
      drawRR(ctx, bx - 1, bT + 30, bW + 2, 8, 3, sl);
      ctx.shadowColor = accent; ctx.shadowBlur = 8;
      drawRR(ctx, cx + s * hip - 4, bT + 28, 8, 3, 1, accent);
      ctx.shadowBlur = 0;
    });

    // -- Torso --
    const tT = 160 + breathY, tB = legT + 10;
    const sw = fem ? 60 : 70, ww = fem ? 42 : 55;
    ctx.beginPath();
    ctx.moveTo(cx - sw / 2, tT + 15);
    ctx.lineTo(cx - ww / 2, tB);
    ctx.lineTo(cx + ww / 2, tB);
    ctx.lineTo(cx + sw / 2, tT + 15);
    ctx.closePath();
    ctx.fillStyle = sd; ctx.fill();

    const cw = fem ? 50 : 58;
    drawRR(ctx, cx - cw / 2, tT + 20, cw, 45, 6, sm);

    // V accent on chest
    ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
    ctx.shadowColor = accent; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.moveTo(cx, tT + 25); ctx.lineTo(cx - 18, tT + 55); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, tT + 25); ctx.lineTo(cx + 18, tT + 55); ctx.stroke();

    // Horizontal accent
    ctx.beginPath();
    ctx.moveTo(cx - cw / 2 + 5, tT + 50);
    ctx.lineTo(cx + cw / 2 - 5, tT + 50);
    ctx.lineWidth = 2; ctx.shadowBlur = 8; ctx.stroke();
    ctx.shadowBlur = 0;

    // Belt
    const bY = tB - 15;
    drawRR(ctx, cx - ww / 2, bY, ww, 12, 3, sl);
    drawRR(ctx, cx - 8, bY + 2, 16, 8, 2, accent);
    ctx.shadowColor = accent; ctx.shadowBlur = 6;
    drawRR(ctx, cx - 5, bY + 4, 10, 4, 1, accent);
    ctx.shadowBlur = 0;

    // Level 3+ chest emblem
    if (level >= 3) {
      drawRR(ctx, cx - 10, tT + 30, 8, 10, 2, "#0a1628");
      ctx.beginPath(); ctx.arc(cx - 6, tT + 35, 3, 0, Math.PI * 2);
      ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      drawRR(ctx, cx + sw / 2 + 8, tT + 80, 16, 10, 3, accent);
      ctx.shadowColor = accent; ctx.shadowBlur = 6; ctx.fillStyle = accent;
      ctx.fillRect(cx + sw / 2 + 10, tT + 82, 12, 2);
      ctx.fillRect(cx + sw / 2 + 10, tT + 86, 8, 2);
      ctx.shadowBlur = 0;
    }

    // -- Arms --
    const aL = 110, aW = fem ? 16 : 20;
    drawRR(ctx, cx - sw / 2 - aW + 5, tT + 18, aW, aL, 6, sd);
    drawRR(ctx, cx + sw / 2 - 5, tT + 18, aW, aL, 6, sd);

    if (level >= 2) {
      const pW = aW + 10, pH = 16;
      drawRR(ctx, cx - sw / 2 - pW / 2 + 5, tT + 12, pW, pH, 4, sl);
      drawRR(ctx, cx - sw / 2 - pW / 2 + 8, tT + 14, pW - 6, 3, 1, accent);
      drawRR(ctx, cx + sw / 2 - pW / 2 - 5, tT + 12, pW, pH, 4, sl);
      drawRR(ctx, cx + sw / 2 - pW / 2 - 2, tT + 14, pW - 6, 3, 1, accent);
    }

    // Gloves
    const gY = tT + 18 + aL - 20, gW = aW + 4;
    drawRR(ctx, cx - sw / 2 - gW / 2 + 3, gY, gW, 22, 5, sm);
    drawRR(ctx, cx + sw / 2 - gW / 2 - 3, gY, gW, 22, 5, sm);

    // -- Jetpack (L3+) --
    if (level >= 3) {
      const jpW = 36, jpH = 55, jpX = cx - jpW / 2, jpY = tT + 20;
      drawRR(ctx, jpX - 8, jpY, jpW + 16, jpH, 6, sl);
      drawRR(ctx, jpX - 4, jpY + 5, jpW + 8, jpH - 15, 4, sm);
      drawRR(ctx, jpX - 2, jpY + jpH - 8, 14, 10, 3, sl);
      drawRR(ctx, jpX + jpW - 12, jpY + jpH - 8, 14, 10, 3, sl);

      const fL = 15 + Math.sin(t * 8) * 8;
      const fg = ctx.createLinearGradient(0, jpY + jpH, 0, jpY + jpH + fL);
      fg.addColorStop(0, accent);
      fg.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`);
      fg.addColorStop(1, "transparent");

      [jpX + 2, jpX + jpW - 10].forEach(fx => {
        ctx.beginPath();
        ctx.moveTo(fx, jpY + jpH + 2);
        ctx.lineTo(fx + 4, jpY + jpH + fL);
        ctx.lineTo(fx + 8, jpY + jpH + 2);
        ctx.fillStyle = fg; ctx.fill();
      });
    }

    // -- Neck --
    const nW = fem ? 16 : 20;
    drawRR(ctx, cx - nW / 2, tT - 5 + breathY, nW, 25, 4, sd);

    // -- Helmet --
    const hCY = 100 + breathY, hRX = fem ? 38 : 42, hRY = fem ? 44 : 48;
    ctx.beginPath(); ctx.ellipse(cx, hCY, hRX, hRY, 0, 0, Math.PI * 2);
    ctx.fillStyle = sd; ctx.fill();

    ctx.beginPath(); ctx.ellipse(cx, hCY, hRX + 2, hRY + 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = sl; ctx.lineWidth = 2; ctx.stroke();

    // Visor
    const vW = hRX * 1.0, vH = hRY * 0.55;
    ctx.beginPath(); ctx.ellipse(cx, hCY + 4, vW, vH, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0e1a"; ctx.fill();

    const vg = ctx.createRadialGradient(cx - 10, hCY - 5, 5, cx, hCY + 4, vW);
    vg.addColorStop(0, "rgba(100,180,255,0.3)");
    vg.addColorStop(0.5, "rgba(60,120,200,0.1)");
    vg.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.ellipse(cx, hCY + 4, vW, vH, 0, 0, Math.PI * 2);
    ctx.fillStyle = vg; ctx.fill();

    ctx.beginPath(); ctx.ellipse(cx, hCY + 4, vW, vH, 0, 0, Math.PI * 2);
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.shadowColor = accent; ctx.shadowBlur = level >= 2 ? 15 : 8;
    ctx.stroke(); ctx.shadowBlur = 0;

    // Helmet ridge
    ctx.beginPath();
    ctx.moveTo(cx - 15, hCY - hRY + 12);
    ctx.quadraticCurveTo(cx, hCY - hRY + 2, cx + 15, hCY - hRY + 12);
    ctx.strokeStyle = sl; ctx.lineWidth = 3; ctx.stroke();

    // Antenna
    const aX = cx + hRX - 8, aBase = hCY - hRY + 20;
    ctx.beginPath(); ctx.moveTo(aX, aBase); ctx.lineTo(aX + 4, aBase - 25);
    ctx.strokeStyle = sl; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(aX + 4, aBase - 27, 3, 0, Math.PI * 2);
    ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 10;
    ctx.fill(); ctx.shadowBlur = 0;

    // -- Level 4: Cape + aura --
    if (level >= 4) {
      const capeW = sw * 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - capeW / 2, tT + 15);
      ctx.quadraticCurveTo(cx - capeW / 2 - 10, legB - 20, cx - capeW / 2 + 5, legB + 20 + Math.sin(t * 1.5) * 8);
      ctx.lineTo(cx + capeW / 2 - 5, legB + 20 + Math.sin(t * 1.5 + 1) * 8);
      ctx.quadraticCurveTo(cx + capeW / 2 + 10, legB - 20, cx + capeW / 2, tT + 15);
      ctx.closePath();
      const cg = ctx.createLinearGradient(0, tT, 0, legB + 30);
      cg.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`);
      cg.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`);
      ctx.fillStyle = cg; ctx.fill();

      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + t * 0.5;
        const r2 = 85 + Math.sin(t * 3 + i) * 15;
        const px = cx + Math.cos(a) * r2;
        const py = 220 + Math.sin(a) * r2 * 0.6;
        const sz = 1.5 + Math.sin(t * 4 + i * 2) * 1;
        ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = accent; ctx.shadowColor = accent; ctx.shadowBlur = 8;
        ctx.fill(); ctx.shadowBlur = 0;
      }
    }
  }, [accent, gender, level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let running = true;
    function animate() {
      if (!running || !ctx || !canvas) return;
      timeRef.current += 0.016;
      draw(ctx, canvas.width, canvas.height, timeRef.current);
      animRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={480}
      className="w-[160px] h-[240px]"
      style={{ imageRendering: "auto" }}
    />
  );
}
