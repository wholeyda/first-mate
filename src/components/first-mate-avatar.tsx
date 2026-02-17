/**
 * First Mate Avatar Component
 *
 * Canvas 2D animated character with a Fortnite-inspired space explorer aesthetic.
 * Tall proportions, visor helmet, jetpack, space suit with details.
 * Personalized based on user traits and goals completed.
 * Solid filled shapes with gradients for depth — 3D look without actual 3D.
 *
 * Evolves as user completes goals:
 *  Level 1 (0-2): Basic space suit, simple helmet
 *  Level 2 (3-5): Visor glow, shoulder pads, belt
 *  Level 3 (6-10): Jetpack, chest emblem, wrist tech
 *  Level 4 (11+): Full energy aura, flowing cape, legendary glow
 *
 * Animations: idle breathing → wave → idle → dance → idle
 */

"use client";

import { useRef, useEffect, useCallback } from "react";

export interface FirstMateAvatarProps {
  completedGoalCount: number;
  traits?: string[];
}

const CANVAS_W = 320;
const CANVAS_H = 480;
const CSS_W = 160;
const CSS_H = 240;

const IDLE_FRAMES = 540;
const WAVE_FRAMES = 160;
const DANCE_FRAMES = 180;

type AnimState = "idle" | "wave" | "dance";

function getLevel(count: number) {
  if (count >= 11) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1;
}

/** Trait-based color personalization */
function getSuitColors(traits: string[], level: number) {
  const traitStr = traits.join(" ").toLowerCase();
  let primary: string, secondary: string, accent: string, visor: string;

  if (traitStr.includes("creat") || traitStr.includes("builder") || traitStr.includes("design")) {
    primary = "#6C63FF"; secondary = "#4834D4"; accent = "#A29BFE"; visor = "#C4B5FD";
  } else if (traitStr.includes("learn") || traitStr.includes("curious") || traitStr.includes("research")) {
    primary = "#00B894"; secondary = "#00876B"; accent = "#55E6C1"; visor = "#7EFCD2";
  } else if (traitStr.includes("leader") || traitStr.includes("team") || traitStr.includes("social")) {
    primary = "#E17055"; secondary = "#B33939"; accent = "#FAB1A0"; visor = "#FFCCBC";
  } else if (traitStr.includes("analyt") || traitStr.includes("detail") || traitStr.includes("logic")) {
    primary = "#0984E3"; secondary = "#0652DD"; accent = "#74B9FF"; visor = "#A3D8FF";
  } else {
    primary = "#00CEC9"; secondary = "#0097A7"; accent = "#55EFC4"; visor = "#81ECEC";
  }

  // Brighter at higher levels
  if (level >= 4) {
    accent = "#FFD700";
    visor = "#FFF9C4";
  }

  return { primary, secondary, accent, visor };
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const cr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + cr, y);
  ctx.arcTo(x + w, y, x + w, y + h, cr);
  ctx.arcTo(x + w, y + h, x, y + h, cr);
  ctx.arcTo(x, y + h, x, y, cr);
  ctx.arcTo(x, y, x + w, y, cr);
  ctx.closePath();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    else ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  ctx.closePath();
}

export function FirstMateAvatar({ completedGoalCount, traits = [] }: FirstMateAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const frameRef = useRef(0);
  const stateRef = useRef<AnimState>("idle");
  const sfRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = frameRef.current++;
    const level = getLevel(completedGoalCount);
    const colors = getSuitColors(traits, level);

    sfRef.current++;
    const sf = sfRef.current;
    if (stateRef.current === "idle" && sf >= IDLE_FRAMES) {
      stateRef.current = frame % 3 === 0 ? "dance" : "wave";
      sfRef.current = 0;
    } else if (stateRef.current === "wave" && sf >= WAVE_FRAMES) {
      stateRef.current = "idle"; sfRef.current = 0;
    } else if (stateRef.current === "dance" && sf >= DANCE_FRAMES) {
      stateRef.current = "idle"; sfRef.current = 0;
    }

    const anim = stateRef.current;
    const t = frame * 0.016;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    const cx = CANVAS_W / 2;

    // Breathing
    const breathY = Math.sin(t * 1.4) * 2.5;

    // Dance motion
    let dx = 0, dy = 0, dRot = 0;
    if (anim === "dance") {
      const p = sfRef.current / DANCE_FRAMES;
      dy = -Math.abs(Math.sin(p * Math.PI * 7)) * 16;
      dx = Math.sin(p * Math.PI * 5) * 10;
      dRot = Math.sin(p * Math.PI * 5) * 0.05;
    }

    // Wave
    let waveAng = 0;
    if (anim === "wave") {
      const p = sfRef.current / WAVE_FRAMES;
      waveAng = Math.sin(p * Math.PI * 6) * 0.55;
    }

    ctx.save();
    ctx.translate(cx + dx, 0);
    ctx.rotate(dRot);
    ctx.translate(-cx, 0);

    const baseY = 52 + breathY + dy;

    // === LEVEL 4: ENERGY AURA ===
    if (level >= 4) {
      const auraPhase = t * 0.7;
      for (let ring = 0; ring < 3; ring++) {
        ctx.save();
        ctx.globalAlpha = 0.06 - ring * 0.015;
        ctx.beginPath();
        ctx.ellipse(cx, baseY + 170, 85 + ring * 12 + Math.sin(auraPhase + ring) * 5,
          180 + ring * 14 + Math.cos(auraPhase * 0.8 + ring) * 5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = ring === 0 ? colors.accent : ring === 1 ? "#FFD700" : "#7B68EE";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }
      // Sparkles
      for (let i = 0; i < 8; i++) {
        const sa = (i / 8) * Math.PI * 2 + t * 0.4;
        const sd = 80 + Math.sin(t * 2 + i * 1.7) * 15;
        const sx = cx + Math.cos(sa) * sd * 0.65;
        const sy = baseY + 170 + Math.sin(sa) * sd;
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5 + Math.sin(t * 3 + i) * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${0.5 + Math.sin(t * 2.5 + i * 2) * 0.3})`;
        ctx.fill();
      }
    }

    // === LEVEL 4: CAPE ===
    if (level >= 4) {
      const capeTop = baseY + 90;
      const capeSway = Math.sin(t * 1.2) * 6;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - 32, capeTop);
      ctx.quadraticCurveTo(cx - 40 + capeSway, capeTop + 100, cx - 28 + capeSway * 1.3, capeTop + 180);
      ctx.lineTo(cx + 28 - capeSway * 1.3, capeTop + 180);
      ctx.quadraticCurveTo(cx + 40 - capeSway, capeTop + 100, cx + 32, capeTop);
      ctx.closePath();
      const capeGrad = ctx.createLinearGradient(0, capeTop, 0, capeTop + 180);
      capeGrad.addColorStop(0, "#7B68EE");
      capeGrad.addColorStop(0.5, "#6C5CE7");
      capeGrad.addColorStop(1, "rgba(108,92,231,0.3)");
      ctx.fillStyle = capeGrad;
      ctx.fill();
      ctx.restore();
    }

    // === SHADOW ===
    ctx.save();
    ctx.translate(cx, baseY + 355);
    ctx.scale(1 + (anim === "dance" ? 0.08 : 0), 0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 48, 48, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();
    ctx.restore();

    // === BOOTS ===
    const bootH = 36;
    const bootY = baseY + 310;
    // Left boot
    rr(ctx, cx - 40, bootY, 34, bootH, 8);
    let bootG = ctx.createLinearGradient(0, bootY, 0, bootY + bootH);
    bootG.addColorStop(0, "#333"); bootG.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = bootG; ctx.fill();
    // Boot highlight strip
    rr(ctx, cx - 38, bootY + 2, 8, bootH - 6, 4);
    ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;

    // Right boot
    rr(ctx, cx + 6, bootY, 34, bootH, 8);
    bootG = ctx.createLinearGradient(0, bootY, 0, bootY + bootH);
    bootG.addColorStop(0, "#333"); bootG.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = bootG; ctx.fill();
    rr(ctx, cx + 8, bootY + 2, 8, bootH - 6, 4);
    ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;

    // === LEGS ===
    const legH = 80;
    const legY = baseY + 235;
    // Left leg
    rr(ctx, cx - 36, legY, 28, legH, 10);
    let legG = ctx.createLinearGradient(0, legY, 0, legY + legH);
    legG.addColorStop(0, colors.primary); legG.addColorStop(1, colors.secondary);
    ctx.fillStyle = legG; ctx.fill();
    // Knee pad
    ctx.beginPath();
    ctx.ellipse(cx - 22, legY + 42, 10, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.secondary; ctx.fill();

    // Right leg
    rr(ctx, cx + 8, legY, 28, legH, 10);
    legG = ctx.createLinearGradient(0, legY, 0, legY + legH);
    legG.addColorStop(0, colors.primary); legG.addColorStop(1, colors.secondary);
    ctx.fillStyle = legG; ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 22, legY + 42, 10, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.secondary; ctx.fill();

    // === BELT (level 2+) ===
    if (level >= 2) {
      rr(ctx, cx - 38, baseY + 228, 76, 12, 4);
      ctx.fillStyle = "#333"; ctx.fill();
      // Belt buckle
      rr(ctx, cx - 8, baseY + 229, 16, 10, 3);
      ctx.fillStyle = level >= 4 ? "#FFD700" : colors.accent; ctx.fill();
    }

    // === TORSO ===
    rr(ctx, cx - 38, baseY + 100, 76, 135, 16);
    const torsoG = ctx.createRadialGradient(cx - 10, baseY + 130, 8, cx, baseY + 170, 80);
    torsoG.addColorStop(0, colors.accent);
    torsoG.addColorStop(0.3, colors.primary);
    torsoG.addColorStop(1, colors.secondary);
    ctx.fillStyle = torsoG; ctx.fill();

    // Center chest line
    ctx.beginPath();
    ctx.moveTo(cx, baseY + 108);
    ctx.lineTo(cx, baseY + 225);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // === CHEST EMBLEM (level 3+) ===
    if (level >= 3) {
      ctx.save();
      ctx.translate(cx, baseY + 145);
      ctx.rotate(Math.sin(t * 0.4) * 0.05);
      // Emblem circle
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      const embG = ctx.createRadialGradient(0, -3, 2, 0, 0, 14);
      embG.addColorStop(0, "#FFF9C4"); embG.addColorStop(0.5, "#FFD700"); embG.addColorStop(1, "#FFA000");
      ctx.fillStyle = embG; ctx.fill();
      // Star inside
      drawStar(ctx, 0, 0, 5, 8, 4);
      ctx.fillStyle = colors.secondary;
      ctx.fill();
      ctx.restore();
    }

    // Belly highlight
    ctx.beginPath();
    ctx.ellipse(cx - 8, baseY + 140, 20, 28, -0.1, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();

    // === SHOULDER PADS (level 2+) ===
    if (level >= 2) {
      // Left
      ctx.beginPath();
      ctx.ellipse(cx - 42, baseY + 105, 16, 10, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = colors.secondary; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 42, baseY + 105, 12, 7, -0.3, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.3; ctx.fill(); ctx.globalAlpha = 1;
      // Right
      ctx.beginPath();
      ctx.ellipse(cx + 42, baseY + 105, 16, 10, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = colors.secondary; ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 42, baseY + 105, 12, 7, 0.3, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.3; ctx.fill(); ctx.globalAlpha = 1;
    }

    // === JETPACK (level 3+) ===
    if (level >= 3) {
      // Main body
      rr(ctx, cx - 18, baseY + 115, 36, 55, 8);
      const jpG = ctx.createLinearGradient(0, baseY + 115, 0, baseY + 170);
      jpG.addColorStop(0, "#555"); jpG.addColorStop(1, "#333");
      ctx.fillStyle = jpG; ctx.fill();
      // Thrusters
      for (const sx of [-10, 10]) {
        ctx.beginPath();
        ctx.ellipse(cx + sx, baseY + 172, 8, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#222"; ctx.fill();
        // Flame (subtle idle)
        const flameH = 8 + Math.sin(t * 8) * 3;
        const flameGrad = ctx.createLinearGradient(0, baseY + 175, 0, baseY + 175 + flameH);
        flameGrad.addColorStop(0, "rgba(255,165,0,0.6)");
        flameGrad.addColorStop(0.5, "rgba(255,100,0,0.3)");
        flameGrad.addColorStop(1, "rgba(255,50,0,0)");
        ctx.beginPath();
        ctx.moveTo(cx + sx - 5, baseY + 175);
        ctx.quadraticCurveTo(cx + sx, baseY + 175 + flameH, cx + sx + 5, baseY + 175);
        ctx.fillStyle = flameGrad; ctx.fill();
      }
      // Jetpack light
      ctx.beginPath();
      ctx.arc(cx, baseY + 130, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,200,${0.5 + Math.sin(t * 3) * 0.3})`;
      ctx.fill();
    }

    // === ARMS ===
    const armOY = baseY + 108;
    const armLen = 62;
    const armThick = 22;

    // Left arm
    const lArmAng = 0.18 + Math.sin(t * 0.7) * 0.04;
    ctx.save();
    ctx.translate(cx - 42, armOY);
    ctx.rotate(lArmAng);
    rr(ctx, -armThick, 0, armThick, armLen, 9);
    const laG = ctx.createLinearGradient(0, 0, 0, armLen);
    laG.addColorStop(0, colors.primary); laG.addColorStop(1, colors.secondary);
    ctx.fillStyle = laG; ctx.fill();
    // Glove
    rr(ctx, -armThick + 2, armLen - 4, armThick - 4, 16, 6);
    ctx.fillStyle = "#333"; ctx.fill();
    // Wrist tech (level 3+)
    if (level >= 3) {
      rr(ctx, -armThick + 1, armLen - 18, armThick - 2, 8, 3);
      ctx.fillStyle = "#222"; ctx.fill();
      ctx.beginPath();
      ctx.arc(-armThick / 2, armLen - 14, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,200,${0.6 + Math.sin(t * 4) * 0.3})`;
      ctx.fill();
    }
    ctx.restore();

    // Right arm (waves)
    const rArmBase = -0.18 + Math.sin(t * 0.7 + 1) * 0.04;
    const rArmAng = anim === "wave" ? -1.3 + waveAng : rArmBase;
    ctx.save();
    ctx.translate(cx + 42, armOY);
    ctx.rotate(rArmAng);
    rr(ctx, 0, 0, armThick, armLen, 9);
    const raG = ctx.createLinearGradient(0, 0, 0, armLen);
    raG.addColorStop(0, colors.primary); raG.addColorStop(1, colors.secondary);
    ctx.fillStyle = raG; ctx.fill();
    // Glove
    rr(ctx, 2, armLen - 4, armThick - 4, 16, 6);
    ctx.fillStyle = "#333"; ctx.fill();
    // Wave hand
    if (anim === "wave") {
      ctx.beginPath();
      ctx.ellipse(armThick / 2, armLen + 14, 10, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#444"; ctx.fill();
    }
    if (level >= 3) {
      rr(ctx, 1, armLen - 18, armThick - 2, 8, 3);
      ctx.fillStyle = "#222"; ctx.fill();
    }
    ctx.restore();

    // === HELMET ===
    const hW = 78, hH = 82;
    const hy = baseY;
    const hx = cx - hW / 2;

    // Helmet outer
    rr(ctx, hx, hy, hW, hH, 30);
    const hG = ctx.createRadialGradient(cx - 8, hy + 20, 6, cx, hy + hH / 2, hW);
    hG.addColorStop(0, "#E0E0E0");
    hG.addColorStop(0.5, "#B0BEC5");
    hG.addColorStop(1, "#78909C");
    ctx.fillStyle = hG; ctx.fill();

    // Helmet ridge/rim
    ctx.beginPath();
    ctx.ellipse(cx, hy + hH - 4, hW / 2 - 2, 6, 0, 0, Math.PI);
    ctx.fillStyle = "#607D8B"; ctx.fill();

    // Visor
    const vW = 52, vH = 38;
    rr(ctx, cx - vW / 2, hy + 22, vW, vH, 16);
    const vG = ctx.createLinearGradient(cx - vW / 2, hy + 22, cx + vW / 2, hy + 22 + vH);
    vG.addColorStop(0, colors.visor);
    vG.addColorStop(0.5, colors.primary);
    vG.addColorStop(1, colors.secondary);
    ctx.fillStyle = vG; ctx.fill();

    // Visor shine
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(cx - 10, hy + 32, 16, 8, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Visor glow (level 2+)
    if (level >= 2) {
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(t * 2) * 0.05;
      ctx.shadowColor = colors.visor;
      ctx.shadowBlur = 15;
      rr(ctx, cx - vW / 2, hy + 22, vW, vH, 16);
      ctx.fillStyle = colors.visor;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Helmet antenna
    const antX = cx + 22;
    const antBaseY = hy + 6;
    const antSway = Math.sin(t * 2.5) * 3;
    ctx.beginPath();
    ctx.moveTo(antX, antBaseY);
    ctx.lineTo(antX + antSway, antBaseY - 18);
    ctx.strokeStyle = "#90A4AE";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(antX + antSway, antBaseY - 20, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,255,200,${0.6 + Math.sin(t * 3) * 0.35})`;
    ctx.fill();

    // Side lights on helmet
    ctx.beginPath();
    ctx.ellipse(hx + 5, hy + hH / 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.7 + Math.sin(t * 2.5) * 0.3; ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(hx + hW - 5, hy + hH / 2, 4, 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = colors.accent; ctx.globalAlpha = 0.7 + Math.sin(t * 2.5 + 1) * 0.3; ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore(); // Global transform

    animRef.current = requestAnimationFrame(draw);
  }, [completedGoalCount, traits]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: CSS_W, height: CSS_H }}
      className="block"
    />
  );
}
