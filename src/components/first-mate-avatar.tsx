/**
 * First Mate Avatar Component
 *
 * Canvas 2D animated character with a cute 3D vinyl toy aesthetic.
 * Solid filled shapes with gradients — NOT individual spheres/particles.
 * Inspired by cute 3D character designs (clay/vinyl toy look).
 *
 * The avatar evolves with the user:
 *  - More accessories and color as goals are completed
 *  - Animation cycles: idle -> wave -> idle -> dance -> idle
 *
 * Color palette matches the app: cyan/blue tones
 */

"use client";

import { useRef, useEffect, useCallback } from "react";

export interface FirstMateAvatarProps {
  completedGoalCount: number;
  traits?: string[];
}

// Canvas dimensions (2x for retina)
const CANVAS_W = 300;
const CANVAS_H = 420;
const CSS_W = 150;
const CSS_H = 210;

// Animation state durations (in frames at ~60fps)
const IDLE_DURATION = 600; // ~10 seconds
const WAVE_DURATION = 180; // ~3 seconds
const DANCE_DURATION = 120; // ~2 seconds

type AnimState = "idle" | "wave" | "dance";

/**
 * Get evolution level from completed goal count
 */
function getEvolutionLevel(count: number): number {
  if (count >= 11) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1;
}

/**
 * Draw a rounded rectangle path
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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
}

/**
 * Draw a pill/capsule shape
 */
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const r = Math.min(w, h) / 2;
  roundRect(ctx, x, y, w, h, r);
}

export function FirstMateAvatar({ completedGoalCount }: FirstMateAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const stateRef = useRef<AnimState>("idle");
  const stateFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frame = frameRef.current;
    frameRef.current++;

    const level = getEvolutionLevel(completedGoalCount);

    // Advance animation state machine
    stateFrameRef.current++;
    const sf = stateFrameRef.current;

    if (stateRef.current === "idle" && sf >= IDLE_DURATION) {
      stateRef.current = frame % 2 === 0 ? "wave" : "dance";
      stateFrameRef.current = 0;
    } else if (stateRef.current === "wave" && sf >= WAVE_DURATION) {
      stateRef.current = "idle";
      stateFrameRef.current = 0;
    } else if (stateRef.current === "dance" && sf >= DANCE_DURATION) {
      stateRef.current = "idle";
      stateFrameRef.current = 0;
    }

    const animState = stateRef.current;
    const animProgress = stateFrameRef.current;
    const time = frame * 0.016;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // --- Global transforms ---
    const cx = CANVAS_W / 2;

    // Breathing
    const breathY = Math.sin(time * 1.5) * 2;
    const breathScale = 1 + Math.sin(time * 1.5) * 0.008;

    // Dance
    let danceX = 0;
    let danceY = 0;
    let danceAngle = 0;
    if (animState === "dance") {
      const t = animProgress / DANCE_DURATION;
      danceY = -Math.abs(Math.sin(t * Math.PI * 6)) * 14;
      danceX = Math.sin(t * Math.PI * 4) * 8;
      danceAngle = Math.sin(t * Math.PI * 4) * 0.06;
    }

    // Wave
    let waveAngle = 0;
    if (animState === "wave") {
      const t = animProgress / WAVE_DURATION;
      waveAngle = Math.sin(t * Math.PI * 5) * 0.5;
    }

    ctx.save();
    ctx.translate(cx + danceX, 0);
    ctx.rotate(danceAngle);
    ctx.translate(-cx, 0);

    // --- Color palette based on level ---
    const bodyColor = level >= 4 ? "#00D4FF" : level >= 3 ? "#1CC4D6" : level >= 2 ? "#38B2C9" : "#4ECDC4";
    const bodyHighlight = level >= 4 ? "#66E8FF" : level >= 3 ? "#5CDBE8" : level >= 2 ? "#6DD4E0" : "#7DE3D9";
    const bodyShadow = level >= 4 ? "#009EC4" : level >= 3 ? "#0F94A3" : level >= 2 ? "#228B96" : "#35A99F";
    const faceColor = "#FFFFFF";
    const eyeColor = "#1A1A2E";
    const cheekColor = "rgba(255, 140, 180, 0.35)";
    const mouthColor = "#1A1A2E";

    // --- Body dimensions ---
    const headY = 60 + breathY + danceY;
    const headW = 80;
    const headH = 76;
    const bodyTopY = headY + headH - 8;
    const bodyW = 72;
    const bodyH = 110;
    const legW = 26;
    const legH = 65;
    const armW = 22;
    const armH = 55;
    const footW = 32;
    const footH = 22;

    // --- Shadow on ground ---
    const shadowScaleX = 1 + (animState === "dance" ? 0.1 : 0);
    ctx.save();
    ctx.translate(cx, bodyTopY + bodyH + legH + footH + 8);
    ctx.scale(shadowScaleX * breathScale, 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 52, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.fill();
    ctx.restore();

    // --- Feet ---
    const footY = bodyTopY + bodyH + legH - 6;

    // Left foot
    ctx.save();
    drawPill(ctx, cx - 30 - footW / 2, footY + breathY + danceY, footW, footH);
    const footGradL = ctx.createLinearGradient(cx - 30 - footW / 2, footY, cx - 30 + footW / 2, footY + footH);
    footGradL.addColorStop(0, bodyShadow);
    footGradL.addColorStop(1, bodyColor);
    ctx.fillStyle = footGradL;
    ctx.fill();
    ctx.restore();

    // Right foot
    ctx.save();
    drawPill(ctx, cx + 30 - footW / 2, footY + breathY + danceY, footW, footH);
    const footGradR = ctx.createLinearGradient(cx + 30 - footW / 2, footY, cx + 30 + footW / 2, footY + footH);
    footGradR.addColorStop(0, bodyColor);
    footGradR.addColorStop(1, bodyShadow);
    ctx.fillStyle = footGradR;
    ctx.fill();
    ctx.restore();

    // --- Legs ---
    const legY = bodyTopY + bodyH - 14;

    // Left leg
    drawPill(ctx, cx - 24 - legW / 2, legY + breathY + danceY, legW, legH);
    const legGradL = ctx.createLinearGradient(0, legY, 0, legY + legH);
    legGradL.addColorStop(0, bodyColor);
    legGradL.addColorStop(1, bodyShadow);
    ctx.fillStyle = legGradL;
    ctx.fill();

    // Right leg
    drawPill(ctx, cx + 24 - legW / 2, legY + breathY + danceY, legW, legH);
    const legGradR = ctx.createLinearGradient(0, legY, 0, legY + legH);
    legGradR.addColorStop(0, bodyColor);
    legGradR.addColorStop(1, bodyShadow);
    ctx.fillStyle = legGradR;
    ctx.fill();

    // --- Body (rounded rectangle torso) ---
    const bx = cx - bodyW / 2;
    const by = bodyTopY + breathY + danceY;
    roundRect(ctx, bx, by, bodyW, bodyH, 28);
    const bodyGrad = ctx.createRadialGradient(
      cx - 10, by + 25, 5,
      cx, by + bodyH / 2, bodyW
    );
    bodyGrad.addColorStop(0, bodyHighlight);
    bodyGrad.addColorStop(0.6, bodyColor);
    bodyGrad.addColorStop(1, bodyShadow);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Belly highlight (soft circle)
    ctx.beginPath();
    ctx.ellipse(cx - 5, by + 35, 18, 22, -0.15, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fill();

    // --- Arms ---
    const armOriginY = bodyTopY + 12 + breathY + danceY;

    // Left arm (hangs down, slight idle sway)
    const leftArmAngle = Math.sin(time * 0.8) * 0.05 + 0.15;
    ctx.save();
    ctx.translate(cx - bodyW / 2 + 4, armOriginY);
    ctx.rotate(leftArmAngle);
    drawPill(ctx, -armW, 0, armW, armH);
    const armGradL = ctx.createLinearGradient(-armW, 0, 0, armH);
    armGradL.addColorStop(0, bodyHighlight);
    armGradL.addColorStop(1, bodyShadow);
    ctx.fillStyle = armGradL;
    ctx.fill();
    ctx.restore();

    // Right arm (waves when in wave state)
    const rightArmBaseAngle = -0.15 + Math.sin(time * 0.8 + 1) * 0.05;
    const rightArmAngle = animState === "wave"
      ? -1.2 + waveAngle
      : rightArmBaseAngle;

    ctx.save();
    ctx.translate(cx + bodyW / 2 - 4, armOriginY);
    ctx.rotate(rightArmAngle);
    drawPill(ctx, 0, 0, armW, armH);
    const armGradR = ctx.createLinearGradient(0, 0, armW, armH);
    armGradR.addColorStop(0, bodyHighlight);
    armGradR.addColorStop(1, bodyShadow);
    ctx.fillStyle = armGradR;
    ctx.fill();

    // Hand (small circle at end of arm when waving)
    if (animState === "wave") {
      ctx.beginPath();
      ctx.ellipse(armW / 2, armH + 4, 10, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = bodyColor;
      ctx.fill();
    }
    ctx.restore();

    // --- Head ---
    const hx = cx - headW / 2;
    const hy = headY;
    roundRect(ctx, hx, hy, headW, headH, 32);
    const headGrad = ctx.createRadialGradient(
      cx - 8, hy + 18, 5,
      cx, hy + headH / 2, headW
    );
    headGrad.addColorStop(0, bodyHighlight);
    headGrad.addColorStop(0.5, bodyColor);
    headGrad.addColorStop(1, bodyShadow);
    ctx.fillStyle = headGrad;
    ctx.fill();

    // --- Face area (lighter oval) ---
    ctx.beginPath();
    ctx.ellipse(cx, hy + headH / 2 + 4, 30, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = faceColor;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;

    // --- Eyes ---
    const eyeY = hy + headH / 2 + 2;
    const eyeSpacing = 14;

    // Blink
    const blinkPhase = (time * 0.25) % 1;
    const isBlinking = blinkPhase > 0.95;
    const eyeScaleY = isBlinking ? 0.1 : 1;

    // Left eye
    ctx.save();
    ctx.translate(cx - eyeSpacing, eyeY);
    ctx.scale(1, eyeScaleY);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = eyeColor;
    ctx.fill();
    // Eye shine
    if (!isBlinking) {
      ctx.beginPath();
      ctx.ellipse(-1.5, -2.5, 2, 2.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }
    ctx.restore();

    // Right eye
    ctx.save();
    ctx.translate(cx + eyeSpacing, eyeY);
    ctx.scale(1, eyeScaleY);
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = eyeColor;
    ctx.fill();
    // Eye shine
    if (!isBlinking) {
      ctx.beginPath();
      ctx.ellipse(-1.5, -2.5, 2, 2.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }
    ctx.restore();

    // --- Cheeks ---
    ctx.beginPath();
    ctx.ellipse(cx - 24, eyeY + 10, 7, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = cheekColor;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 24, eyeY + 10, 7, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = cheekColor;
    ctx.fill();

    // --- Mouth ---
    const mouthY = eyeY + 14;
    const smileWidth = animState === "dance" ? 10 : 7;
    ctx.beginPath();
    ctx.arc(cx, mouthY - 3, smileWidth, 0.15, Math.PI - 0.15);
    ctx.strokeStyle = mouthColor;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();

    // --- Accessories based on evolution level ---

    // Level 2+: small antenna/sprout on top of head
    if (level >= 2) {
      const antennaX = cx + 8;
      const antennaBaseY = hy - 2 + breathY + danceY;
      const antennaSway = Math.sin(time * 2) * 4;

      // Stem
      ctx.beginPath();
      ctx.moveTo(antennaX, antennaBaseY + 8);
      ctx.quadraticCurveTo(antennaX + antennaSway, antennaBaseY - 14, antennaX + antennaSway * 0.6, antennaBaseY - 22);
      ctx.strokeStyle = "#4CAF50";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();

      // Leaf/bulb
      ctx.beginPath();
      ctx.ellipse(antennaX + antennaSway * 0.6, antennaBaseY - 26, 7, 5, antennaSway * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = level >= 4 ? "#FFD700" : level >= 3 ? "#66BB6A" : "#81C784";
      ctx.fill();
    }

    // Level 3+: small badge/star on body
    if (level >= 3) {
      const starX = cx + 16;
      const starY = by + 28;
      const starSize = level >= 4 ? 10 : 7;

      // Draw a simple star
      ctx.save();
      ctx.translate(starX, starY);
      ctx.rotate(Math.sin(time * 0.5) * 0.1);
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = i === 0 ? starSize : starSize;
        const method = i === 0 ? "moveTo" : "lineTo";
        ctx[method](Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fillStyle = "#FFD700";
      ctx.fill();
      ctx.strokeStyle = "#FFA000";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Level 4: glowing aura ring
    if (level >= 4) {
      const auraY = by + bodyH / 2;
      const auraPhase = time * 0.8;
      ctx.save();
      ctx.globalAlpha = 0.12 + Math.sin(auraPhase) * 0.05;
      ctx.beginPath();
      ctx.ellipse(cx, auraY, 65 + Math.sin(auraPhase * 1.3) * 4, 90 + Math.sin(auraPhase) * 4, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#00E5FF";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 0.06 + Math.sin(auraPhase + 1) * 0.03;
      ctx.beginPath();
      ctx.ellipse(cx, auraY, 72 + Math.sin(auraPhase * 0.9) * 5, 97 + Math.sin(auraPhase + 0.5) * 5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#7B68EE";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Sparkle particles around the character
      for (let i = 0; i < 6; i++) {
        const sparkAngle = (i / 6) * Math.PI * 2 + time * 0.3;
        const sparkDist = 68 + Math.sin(time * 2 + i * 1.5) * 10;
        const sx = cx + Math.cos(sparkAngle) * sparkDist * 0.7;
        const sy = auraY + Math.sin(sparkAngle) * sparkDist;
        const sparkAlpha = 0.4 + Math.sin(time * 3 + i * 2) * 0.3;
        const sparkSize = 2 + Math.sin(time * 2.5 + i) * 1;

        ctx.beginPath();
        ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${sparkAlpha})`;
        ctx.fill();
      }
    }

    ctx.restore(); // Restore global dance transform

    animRef.current = requestAnimationFrame(draw);
  }, [completedGoalCount]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
    };
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
