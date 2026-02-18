/**
 * Sidebar Character — Self-contained premium space explorer
 *
 * Purpose-built for sidebar display. Clean, compact SVG astronaut
 * with tier-based evolution, neon accent glow, idle breathing animation,
 * visor effects, and smooth personality. All gradients/filters inline.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTier } from "@/lib/avatar-state";

interface SidebarCharacterProps {
  completedGoalCount: number;
  traits?: string[];
  accentColor?: string;
}

/** Derive accent from traits if no color set */
function getDefaultAccent(traits: string[]): string {
  const joined = traits.join(" ").toLowerCase();
  if (joined.includes("creat") || joined.includes("artist")) return "#DA70D6";
  if (joined.includes("learn") || joined.includes("curio") || joined.includes("tech")) return "#00E5FF";
  if (joined.includes("lead") || joined.includes("ambit") || joined.includes("mission")) return "#FF2D55";
  if (joined.includes("analyt") || joined.includes("logic") || joined.includes("strat")) return "#7B61FF";
  if (joined.includes("build") || joined.includes("maker") || joined.includes("connect")) return "#00FF94";
  if (joined.includes("fitness") || joined.includes("health")) return "#FF4500";
  return "#00E5FF";
}

function hexToRGB(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 229, 255];
}

export function SidebarCharacter({ completedGoalCount, traits = [], accentColor }: SidebarCharacterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  const tier = getTier(completedGoalCount);
  const accent = accentColor || getDefaultAccent(traits);
  const [r, g, b] = hexToRGB(accent);

  useEffect(() => { setMounted(true); }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const baseY = h * 0.92; // ground line
    const breathe = Math.sin(t * 1.8) * 2;
    const hover = tier.id >= 4 ? Math.sin(t * 1.2) * 6 : Math.sin(t * 1.8) * 1.5;
    const scale = 0.85;

    ctx.save();
    ctx.translate(cx, baseY);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -baseY);

    // ═══ GROUND SHADOW ═══
    const shadowAlpha = tier.id >= 4 ? 0.15 : 0.35;
    const shadowGrad = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, 55);
    shadowGrad.addColorStop(0, `rgba(${r},${g},${b},${shadowAlpha})`);
    shadowGrad.addColorStop(0.5, `rgba(${r},${g},${b},${shadowAlpha * 0.3})`);
    shadowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, 50, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Apply hover
    const oY = -hover + breathe * 0.3;

    // ═══ AURA GLOW (tier 2+) ═══
    if (tier.id >= 2) {
      const auraAlpha = 0.06 + Math.sin(t * 2) * 0.03;
      const ag = ctx.createRadialGradient(cx, baseY - 95 + oY, 10, cx, baseY - 95 + oY, 90);
      ag.addColorStop(0, `rgba(${r},${g},${b},${auraAlpha * 2})`);
      ag.addColorStop(0.5, `rgba(${r},${g},${b},${auraAlpha})`);
      ag.addColorStop(1, "transparent");
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 95 + oY, 85, 110, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ═══ JETPACK FLAMES (tier 3+) ═══
    if (tier.id >= 3) {
      const flameH = 15 + Math.sin(t * 12) * 8 + Math.sin(t * 7.3) * 5;
      const flameAlpha = 0.5 + Math.sin(t * 10) * 0.2;
      [-12, 12].forEach(offset => {
        const fx = cx + offset;
        const fy = baseY - 30 + oY;
        const fg = ctx.createLinearGradient(fx, fy, fx, fy + flameH);
        fg.addColorStop(0, `rgba(${r},${g},${b},${flameAlpha})`);
        fg.addColorStop(0.4, `rgba(${r},${g},${b},${flameAlpha * 0.4})`);
        fg.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.moveTo(fx - 5, fy);
        ctx.quadraticCurveTo(fx - 3 + Math.sin(t * 15) * 2, fy + flameH * 0.6, fx, fy + flameH);
        ctx.quadraticCurveTo(fx + 3 + Math.sin(t * 13) * 2, fy + flameH * 0.6, fx + 5, fy);
        ctx.fillStyle = fg;
        ctx.fill();
      });
    }

    // ═══ LEGS ═══
    const legTop = baseY - 62 + oY;
    const legBot = baseY - 10 + oY;

    // Left leg
    rRect(ctx, cx - 22, legTop, 16, legBot - legTop, 4, "#161630");
    // Right leg
    rRect(ctx, cx + 6, legTop, 16, legBot - legTop, 4, "#161630");

    // ═══ BOOTS ═══
    const bootH = 18;
    const bootY = legBot - 4;
    [-22, 6].forEach(xOff => {
      const bx = cx + xOff - 2;
      rRect(ctx, bx, bootY, 20, bootH, 5, "#0e0e28");
      // Boot trim glow
      if (tier.id >= 1) {
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 2, bootY + 2);
        ctx.lineTo(bx + 18, bootY + 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Toe glow
        ctx.beginPath();
        ctx.arc(bx + 10, bootY + bootH - 3, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + Math.sin(t * 3 + xOff) * 0.1})`;
        ctx.fill();
      }
    });

    // ═══ TORSO ═══
    const torsoTop = baseY - 130 + oY + breathe * 0.5;
    const torsoBot = legTop + 8;
    const torsoW = 52;

    // Main torso shape
    ctx.beginPath();
    ctx.moveTo(cx - torsoW / 2, torsoTop + 15);
    ctx.quadraticCurveTo(cx - torsoW / 2 - 3, (torsoTop + torsoBot) / 2, cx - torsoW / 2 + 4, torsoBot);
    ctx.lineTo(cx + torsoW / 2 - 4, torsoBot);
    ctx.quadraticCurveTo(cx + torsoW / 2 + 3, (torsoTop + torsoBot) / 2, cx + torsoW / 2, torsoTop + 15);
    ctx.closePath();
    const bodyGrad = ctx.createLinearGradient(0, torsoTop, 0, torsoBot);
    bodyGrad.addColorStop(0, "#1a1a35");
    bodyGrad.addColorStop(0.5, "#16213e");
    bodyGrad.addColorStop(1, "#0f0f28");
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Chest specular highlight
    const specGrad = ctx.createRadialGradient(cx - 5, torsoTop + 30, 2, cx, torsoTop + 40, 20);
    specGrad.addColorStop(0, "rgba(255,255,255,0.08)");
    specGrad.addColorStop(1, "transparent");
    ctx.fillStyle = specGrad;
    ctx.beginPath();
    ctx.ellipse(cx - 3, torsoTop + 35, 18, 15, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // ═══ CHEST PLATE (tier 2+) ═══
    if (tier.id >= 2) {
      ctx.beginPath();
      const cpT = torsoTop + 22;
      const cpB = torsoBot - 15;
      ctx.moveTo(cx - 16, cpT);
      ctx.lineTo(cx - 18, cpB);
      ctx.quadraticCurveTo(cx, cpB + 8, cx + 18, cpB);
      ctx.lineTo(cx + 16, cpT);
      ctx.quadraticCurveTo(cx, cpT - 5, cx - 16, cpT);
      ctx.closePath();
      ctx.fillStyle = "rgba(10,10,30,0.7)";
      ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Center energy core
      const coreY = (cpT + cpB) / 2;
      const coreR = 4 + Math.sin(t * 3) * 1;
      const coreGrad = ctx.createRadialGradient(cx, coreY, 0, cx, coreY, coreR + 4);
      coreGrad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
      coreGrad.addColorStop(0.5, `rgba(${r},${g},${b},0.3)`);
      coreGrad.addColorStop(1, "transparent");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, coreY, coreR + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, coreY, coreR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // V-accent lines on chest
    if (tier.id >= 1) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.4;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx, torsoTop + 18);
      ctx.lineTo(cx - 14, torsoBot - 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, torsoTop + 18);
      ctx.lineTo(cx + 14, torsoBot - 10);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // Belt
    rRect(ctx, cx - torsoW / 2 + 5, torsoBot - 6, torsoW - 10, 6, 2, "#12122a");
    if (tier.id >= 1) {
      // Belt buckle
      ctx.fillStyle = accent;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 8;
      rRect(ctx, cx - 5, torsoBot - 5, 10, 4, 1.5, accent);
      ctx.shadowBlur = 0;
    }

    // ═══ ENERGY VEINS (tier 2+) ═══
    if (tier.id >= 2) {
      ctx.globalAlpha = 0.25 + Math.sin(t * 2.5) * 0.15;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 4;
      // Left vein
      ctx.beginPath();
      ctx.moveTo(cx - 20, torsoTop + 25);
      ctx.quadraticCurveTo(cx - 22, torsoBot - 20, cx - 18, torsoBot);
      ctx.stroke();
      // Right vein
      ctx.beginPath();
      ctx.moveTo(cx + 20, torsoTop + 25);
      ctx.quadraticCurveTo(cx + 22, torsoBot - 20, cx + 18, torsoBot);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // ═══ ARMS ═══
    const armLen = 55;
    const armW = 10;
    const shoulderY = torsoTop + 18;

    // Left arm
    const laAngle = -10 + Math.sin(t * 1.3) * 3;
    ctx.save();
    ctx.translate(cx - torsoW / 2, shoulderY);
    ctx.rotate((laAngle * Math.PI) / 180);
    rRect(ctx, -armW / 2, 0, armW, armLen, 4, "#161630");
    // Glove
    ctx.beginPath();
    ctx.ellipse(0, armLen + 4, 6, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0e0e28";
    ctx.fill();
    // Pauldron (tier 3+)
    if (tier.id >= 3) {
      ctx.beginPath();
      ctx.ellipse(0, -2, 12, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a35";
      ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Pauldron dot
      ctx.beginPath();
      ctx.arc(0, -2, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.4 + Math.sin(t * 2.5) * 0.2})`;
      ctx.fill();
    }
    ctx.restore();

    // Right arm
    const raAngle = 10 - Math.sin(t * 1.3) * 3;
    ctx.save();
    ctx.translate(cx + torsoW / 2, shoulderY);
    ctx.rotate((raAngle * Math.PI) / 180);
    rRect(ctx, -armW / 2, 0, armW, armLen, 4, "#161630");
    ctx.beginPath();
    ctx.ellipse(0, armLen + 4, 6, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#0e0e28";
    ctx.fill();
    if (tier.id >= 3) {
      ctx.beginPath();
      ctx.ellipse(0, -2, 12, 7, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a35";
      ctx.fill();
      ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.lineWidth = 0.8;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, -2, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.4 + Math.sin(t * 2.8) * 0.2})`;
      ctx.fill();
    }
    ctx.restore();

    // ═══ JETPACK (tier 3+) ═══
    if (tier.id >= 3) {
      const jpW = 28;
      const jpH = 40;
      const jpX = cx - jpW / 2;
      const jpY = torsoTop + 20;
      rRect(ctx, jpX - 4, jpY, jpW + 8, jpH, 5, "#1a1a35");
      rRect(ctx, jpX, jpY + 3, jpW, jpH - 10, 3, "#12122a");
      // Thruster nozzles
      rRect(ctx, jpX, jpY + jpH - 5, 10, 8, 2, "#0e0e28");
      rRect(ctx, jpX + jpW - 10, jpY + jpH - 5, 10, 8, 2, "#0e0e28");
      // Accent strip
      ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
      ctx.lineWidth = 1;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(jpX + 4, jpY + 6);
      ctx.lineTo(jpX + jpW - 4, jpY + 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ═══ NECK ═══
    rRect(ctx, cx - 6, torsoTop - 2, 12, 18, 3, "#161630");

    // ═══ HELMET ═══
    const headCY = torsoTop - 32 + breathe * 0.3;
    const headRX = 32;
    const headRY = 36;

    // Head turn
    const headOff = Math.sin(t * 0.4) * 2;

    // Helmet shell
    ctx.beginPath();
    ctx.ellipse(cx + headOff, headCY, headRX, headRY, 0, 0, Math.PI * 2);
    const helmGrad = ctx.createLinearGradient(cx - headRX, headCY - headRY, cx + headRX, headCY + headRY);
    helmGrad.addColorStop(0, "#1e1e3a");
    helmGrad.addColorStop(0.4, "#16213e");
    helmGrad.addColorStop(1, "#0f0f28");
    ctx.fillStyle = helmGrad;
    ctx.fill();

    // Helmet rim
    ctx.strokeStyle = "#2a2a4a";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Helmet dome highlight
    ctx.beginPath();
    ctx.ellipse(cx + headOff - 8, headCY - 14, 16, 12, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();

    // ═══ VISOR ═══
    const visorW = 44;
    const visorH = 20;
    const visorY = headCY + 2;
    const visorX = cx + headOff - visorW / 2;

    // Visor background
    rRect(ctx, visorX, visorY - visorH / 2, visorW, visorH, 6, "#070714");

    if (tier.id >= 1) {
      // Visor glow
      ctx.shadowColor = accent;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      rRectPath(ctx, visorX, visorY - visorH / 2, visorW, visorH, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Visor inner glow
      const vGrad = ctx.createLinearGradient(visorX, visorY - visorH / 2, visorX, visorY + visorH / 2);
      vGrad.addColorStop(0, `rgba(${r},${g},${b},${0.15 + Math.sin(t * 2) * 0.08})`);
      vGrad.addColorStop(0.5, `rgba(${r},${g},${b},${0.08 + Math.sin(t * 2) * 0.05})`);
      vGrad.addColorStop(1, `rgba(${r},${g},${b},0.02)`);
      ctx.fillStyle = vGrad;
      ctx.beginPath();
      rRectPath(ctx, visorX + 1, visorY - visorH / 2 + 1, visorW - 2, visorH - 2, 5);
      ctx.fill();

      // Eye glow dots (the soul — two subtle bright dots)
      const eyeSpacing = 10;
      const eyeY = visorY + 1;
      const eyeBright = 0.6 + Math.sin(t * 3) * 0.15;
      // Blink effect
      const blinkCycle = Math.floor(t * 0.2) % 8;
      const isBlinking = blinkCycle === 0 && (t * 0.2 % 1) < 0.06;

      if (!isBlinking) {
        [cx + headOff - eyeSpacing, cx + headOff + eyeSpacing].forEach(ex => {
          ctx.beginPath();
          ctx.arc(ex, eyeY, 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${eyeBright})`;
          ctx.shadowColor = accent;
          ctx.shadowBlur = 10;
          ctx.fill();
          ctx.shadowBlur = 0;
        });
      }

      // HUD elements (tier 3+)
      if (tier.id >= 3) {
        // Tiny radar sweep
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 0.5;
        const radarX = visorX + 8;
        const radarY = visorY - 2;
        ctx.beginPath();
        ctx.arc(radarX, radarY, 4, 0, Math.PI * 2);
        ctx.stroke();
        const sAngle = (t * 2) % (Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(radarX, radarY);
        ctx.lineTo(radarX + Math.cos(sAngle) * 4, radarY + Math.sin(sAngle) * 4);
        ctx.stroke();

        // Status bars
        const barX = visorX + visorW - 14;
        const barY = visorY - 5;
        for (let i = 0; i < 3; i++) {
          const bW = 8 - i * 2;
          ctx.fillStyle = `rgba(${r},${g},${b},${0.3 + Math.sin(t * 4 + i) * 0.15})`;
          ctx.fillRect(barX, barY + i * 4, bW, 2);
        }
        ctx.globalAlpha = 1;
      }
    }

    // ═══ ANTENNA ═══
    const antX = cx + headOff + headRX - 8;
    const antBase = headCY - headRY + 14;
    ctx.strokeStyle = "#2a2a4a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(antX, antBase);
    ctx.lineTo(antX + 4, antBase - 18);
    ctx.stroke();
    // Antenna tip
    ctx.beginPath();
    ctx.arc(antX + 4, antBase - 20, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // ═══ HELMET ACCENT LINES (tier 1+) ═══
    if (tier.id >= 1) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 4;
      // Center crest
      ctx.beginPath();
      ctx.moveTo(cx + headOff, headCY - headRY + 6);
      ctx.lineTo(cx + headOff, headCY - 12);
      ctx.stroke();
      // Side vents
      ctx.beginPath();
      ctx.moveTo(cx + headOff - headRX + 6, headCY);
      ctx.lineTo(cx + headOff - headRX + 2, headCY + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + headOff + headRX - 6, headCY);
      ctx.lineTo(cx + headOff + headRX - 2, headCY + 5);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    // ═══ ORBITING PARTICLES (tier 4+) ═══
    if (tier.id >= 4) {
      const particleCount = tier.id >= 5 ? 8 : 4;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + t * 0.6;
        const orbitRX = 60 + Math.sin(t * 0.5 + i) * 10;
        const orbitRY = 30 + Math.sin(t * 0.7 + i) * 5;
        const px = cx + Math.cos(angle) * orbitRX;
        const py = baseY - 95 + oY + Math.sin(angle) * orbitRY;
        const pSize = 1.5 + Math.sin(t * 4 + i * 2) * 0.8;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.4 + Math.sin(t * 3 + i) * 0.2})`;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // ═══ LEGEND ENERGY RING (tier 5) ═══
    if (tier.id >= 5) {
      ctx.globalAlpha = 0.15 + Math.sin(t * 1.5) * 0.08;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.shadowColor = accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 90 + oY, 70, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [accent, r, g, b, tier]);

  useEffect(() => {
    if (!mounted) return;
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
  }, [draw, mounted]);

  if (!mounted) {
    return <div style={{ width: "100%", height: 200, background: "#080818", borderRadius: 8 }} />;
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: "100%", height: 200 }}>
      <div
        className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at center bottom, #0e0e24 0%, #080818 50%, #060612 100%)",
        }}
      />
      {/* Subtle stars */}
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        {Array.from({ length: 20 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 1 + (i % 2),
              height: 1 + (i % 2),
              left: `${(i * 37 + 13) % 100}%`,
              top: `${(i * 53 + 7) % 80}%`,
              background: "white",
              opacity: 0.15 + (i % 3) * 0.1,
              animation: `twinkle ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={400}
        className="relative z-10"
        style={{ width: "100%", height: 200, imageRendering: "auto" }}
      />
      {/* Tier badge */}
      {tier.id > 0 && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[8px] font-bold tracking-[0.15em] uppercase"
          style={{
            color: accent,
            opacity: 0.5,
            textShadow: `0 0 8px ${accent}40`,
          }}
        >
          {tier.name}
        </div>
      )}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

/** Draw a filled rounded rect */
function rRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  r = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  rRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Trace a rounded rect path without filling */
function rRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, Math.min(w, h) / 2);
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
}
