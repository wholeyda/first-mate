/**
 * First Mate Avatar Component
 *
 * Canvas 2D animated particle-based humanoid character.
 * Uses the same golden-spiral point distribution as the globe
 * for a consistent aesthetic across the app.
 *
 * The avatar evolves with the user:
 *  - More particles and brighter glow as goals are completed
 *  - Particle accessories (hat, cape, aura) at higher levels
 *  - Animation cycles: idle -> wave -> idle -> dance -> idle
 *
 * Color palette matches the globe: cyan/blue tones
 * (#00E5FF, #4ECDC4, #45B7D1, etc.)
 */

"use client";

import { useRef, useEffect, useCallback } from "react";

export interface FirstMateAvatarProps {
  completedGoalCount: number;
  traits?: string[];
}

// Canvas dimensions (2x for retina)
const CANVAS_W = 300;
const CANVAS_H = 400;
const CSS_W = 150;
const CSS_H = 200;

// Color palette matching the globe
const COLORS = {
  cyan: "#00E5FF",
  teal: "#4ECDC4",
  sky: "#45B7D1",
  blue: "#0077B6",
  deepBlue: "#023E8A",
  purple: "#7B68EE",
  gold: "#FFD700",
  white: "#FFFFFF",
};

// Animation state durations (in frames at ~60fps)
const IDLE_DURATION = 600; // ~10 seconds
const WAVE_DURATION = 180; // ~3 seconds
const DANCE_DURATION = 120; // ~2 seconds

type AnimState = "idle" | "wave" | "dance";

interface Particle {
  // Base position relative to body part center
  baseX: number;
  baseY: number;
  // Current offset for animation
  offsetX: number;
  offsetY: number;
  // Rendering
  size: number;
  color: string;
  alpha: number;
  // Random drift seed
  seed: number;
}

interface BodyPart {
  centerX: number;
  centerY: number;
  particles: Particle[];
}

/**
 * Golden-spiral distribution for circular regions (matching globe)
 */
function goldenSpiralCircle(count: number, radius: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt(i / count);
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r,
    });
  }
  return points;
}

/**
 * Golden-spiral distribution for rectangular/elliptical shapes
 */
function goldenSpiralEllipse(
  count: number,
  radiusX: number,
  radiusY: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(i / count);
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * r * radiusX,
      y: Math.sin(theta) * r * radiusY,
    });
  }
  return points;
}

/**
 * Generate particles for a limb (arm or leg) along a line
 */
function goldenSpiralLine(
  count: number,
  length: number,
  thickness: number,
  angle: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const along = (t - 0.5) * length;
    const perpTheta = goldenAngle * i;
    const perp = Math.sin(perpTheta) * thickness * (1 - t * 0.3);
    const baseX = along * cos - perp * sin;
    const baseY = along * sin + perp * cos;
    points.push({ x: baseX, y: baseY });
  }
  return points;
}

/**
 * Pick a color from the palette based on index and evolution level
 */
function pickColor(index: number, level: number): string {
  const baseColors = [COLORS.cyan, COLORS.teal, COLORS.sky, COLORS.blue];
  const evolvedColors = [
    COLORS.cyan,
    COLORS.teal,
    COLORS.sky,
    COLORS.blue,
    COLORS.purple,
    COLORS.gold,
  ];
  const palette = level >= 3 ? evolvedColors : level >= 2 ? [...baseColors, COLORS.purple] : baseColors;
  return palette[index % palette.length];
}

/**
 * Get evolution level from completed goal count
 * 0-2: Level 1 (basic)
 * 3-5: Level 2 (enhanced)
 * 6-10: Level 3 (detailed)
 * 11+: Level 4 (maximum)
 */
function getEvolutionLevel(count: number): number {
  if (count >= 11) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1;
}

/**
 * Get particle multiplier based on evolution level
 */
function getParticleMultiplier(level: number): number {
  switch (level) {
    case 1:
      return 0.6;
    case 2:
      return 0.8;
    case 3:
      return 1.0;
    case 4:
      return 1.3;
    default:
      return 0.6;
  }
}

/**
 * Get base alpha (brightness) based on level
 */
function getBaseAlpha(level: number): number {
  switch (level) {
    case 1:
      return 0.5;
    case 2:
      return 0.65;
    case 3:
      return 0.8;
    case 4:
      return 0.95;
    default:
      return 0.5;
  }
}

/**
 * Get glow intensity based on level
 */
function getGlowIntensity(level: number): number {
  switch (level) {
    case 1:
      return 2;
    case 2:
      return 5;
    case 3:
      return 10;
    case 4:
      return 16;
    default:
      return 2;
  }
}

function createParticle(
  baseX: number,
  baseY: number,
  color: string,
  size: number,
  alpha: number
): Particle {
  return {
    baseX,
    baseY,
    offsetX: 0,
    offsetY: 0,
    size,
    color,
    alpha,
    seed: Math.random() * Math.PI * 2,
  };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const val = hex.replace("#", "");
  return {
    r: parseInt(val.substring(0, 2), 16),
    g: parseInt(val.substring(2, 4), 16),
    b: parseInt(val.substring(4, 6), 16),
  };
}

/**
 * Build the humanoid figure from particles
 */
function buildFigure(completedGoalCount: number): {
  head: BodyPart;
  body: BodyPart;
  leftArm: BodyPart;
  rightArm: BodyPart;
  leftLeg: BodyPart;
  rightLeg: BodyPart;
  hat: BodyPart | null;
  cape: BodyPart | null;
  aura: BodyPart | null;
} {
  const level = getEvolutionLevel(completedGoalCount);
  const mult = getParticleMultiplier(level);
  const baseAlpha = getBaseAlpha(level);

  // Center of canvas
  const cx = CANVAS_W / 2;

  // Head
  const headCount = Math.round(40 * mult);
  const headRadius = 28;
  const headCenterY = 80;
  const headPoints = goldenSpiralCircle(headCount, headRadius);
  const headParticles = headPoints.map((p, i) =>
    createParticle(p.x, p.y, pickColor(i, level), 2.5 + Math.random() * 1.5, baseAlpha)
  );

  // Body (torso)
  const bodyCount = Math.round(60 * mult);
  const bodyCenterY = 160;
  const bodyPoints = goldenSpiralEllipse(bodyCount, 30, 48);
  const bodyParticles = bodyPoints.map((p, i) =>
    createParticle(p.x, p.y, pickColor(i, level), 2.2 + Math.random() * 1.2, baseAlpha)
  );

  // Left arm
  const armCount = Math.round(22 * mult);
  const leftArmPoints = goldenSpiralLine(armCount, 60, 8, Math.PI * 0.55);
  const leftArmParticles = leftArmPoints.map((p, i) =>
    createParticle(p.x, p.y, pickColor(i + 2, level), 2.0 + Math.random(), baseAlpha * 0.9)
  );

  // Right arm
  const rightArmPoints = goldenSpiralLine(armCount, 60, 8, -Math.PI * 0.55);
  const rightArmParticles = rightArmPoints.map((p, i) =>
    createParticle(p.x, p.y, pickColor(i + 3, level), 2.0 + Math.random(), baseAlpha * 0.9)
  );

  // Left leg
  const legCount = Math.round(20 * mult);
  const leftLegPoints = goldenSpiralLine(legCount, 55, 9, Math.PI * 0.52);
  const leftLegParticles = leftLegPoints.map((p, i) =>
    createParticle(p.x, p.y, pickColor(i + 1, level), 2.0 + Math.random(), baseAlpha * 0.85)
  );

  // Right leg
  const rightLegPoints = goldenSpiralLine(legCount, 55, 9, -Math.PI * 0.52);
  const rightLegParticles = rightLegPoints.map((p, i) =>
    createParticle(p.x, p.y, pickColor(i + 4, level), 2.0 + Math.random(), baseAlpha * 0.85)
  );

  // Accessories based on level
  let hat: BodyPart | null = null;
  let cape: BodyPart | null = null;
  let aura: BodyPart | null = null;

  // Hat (level 3+)
  if (level >= 3) {
    const hatCount = Math.round(25 * mult);
    const hatPoints = goldenSpiralEllipse(hatCount, 32, 14);
    const hatParticles = hatPoints.map((p, i) =>
      createParticle(
        p.x,
        p.y - 8,
        i % 3 === 0 ? COLORS.gold : pickColor(i, level),
        2.8 + Math.random(),
        baseAlpha
      )
    );
    hat = { centerX: cx, centerY: 48, particles: hatParticles };
  }

  // Cape (level 4)
  if (level >= 4) {
    const capeCount = Math.round(45 * mult);
    const capeParticles: Particle[] = [];
    for (let i = 0; i < capeCount; i++) {
      const t = i / capeCount;
      const spreadX = (Math.random() - 0.5) * (40 + t * 30);
      const y = t * 100;
      capeParticles.push(
        createParticle(
          spreadX,
          y,
          i % 4 === 0 ? COLORS.purple : i % 4 === 1 ? COLORS.gold : pickColor(i, level),
          2.0 + Math.random() * 1.5,
          baseAlpha * (0.4 + t * 0.3)
        )
      );
    }
    cape = { centerX: cx, centerY: 120, particles: capeParticles };
  }

  // Aura (level 2+)
  if (level >= 2) {
    const auraCount = Math.round(20 * (level - 1));
    const auraParticles: Particle[] = [];
    for (let i = 0; i < auraCount; i++) {
      const angle = (i / auraCount) * Math.PI * 2;
      const dist = 55 + Math.random() * 20 + (level >= 4 ? 10 : 0);
      auraParticles.push(
        createParticle(
          Math.cos(angle) * dist,
          Math.sin(angle) * dist * 1.6,
          pickColor(i, level),
          1.5 + Math.random(),
          baseAlpha * 0.25
        )
      );
    }
    aura = { centerX: cx, centerY: 140, particles: auraParticles };
  }

  return {
    head: { centerX: cx, centerY: headCenterY, particles: headParticles },
    body: { centerX: cx, centerY: bodyCenterY, particles: bodyParticles },
    leftArm: { centerX: cx - 38, centerY: 135, particles: leftArmParticles },
    rightArm: { centerX: cx + 38, centerY: 135, particles: rightArmParticles },
    leftLeg: { centerX: cx - 16, centerY: 225, particles: leftLegParticles },
    rightLeg: { centerX: cx + 16, centerY: 225, particles: rightLegParticles },
    hat,
    cape,
    aura,
  };
}

export function FirstMateAvatar({ completedGoalCount, traits = [] }: FirstMateAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const stateRef = useRef<AnimState>("idle");
  const stateFrameRef = useRef<number>(0);
  const figureRef = useRef(buildFigure(completedGoalCount));
  const prevGoalCountRef = useRef(completedGoalCount);

  // Rebuild figure when goal count changes
  useEffect(() => {
    if (completedGoalCount !== prevGoalCountRef.current) {
      figureRef.current = buildFigure(completedGoalCount);
      prevGoalCountRef.current = completedGoalCount;
    }
  }, [completedGoalCount]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;

    const frame = frameRef.current;
    frameRef.current++;

    const level = getEvolutionLevel(completedGoalCount);
    const glowIntensity = getGlowIntensity(level);

    // Advance animation state machine
    stateFrameRef.current++;
    const sf = stateFrameRef.current;

    if (stateRef.current === "idle" && sf >= IDLE_DURATION) {
      // Cycle: after idle, alternate between wave and dance
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

    c.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const figure = figureRef.current;
    const time = frame * 0.016; // approx seconds

    // Global breathing offset (idle)
    const breathY = Math.sin(time * 1.2) * 3;
    const breathScale = 1 + Math.sin(time * 1.2) * 0.01;

    // Dance offsets
    let danceX = 0;
    let danceY = 0;
    let danceRotation = 0;
    if (animState === "dance") {
      const t = animProgress / DANCE_DURATION;
      danceY = -Math.abs(Math.sin(t * Math.PI * 6)) * 12;
      danceX = Math.sin(t * Math.PI * 4) * 6;
      danceRotation = Math.sin(t * Math.PI * 4) * 0.08;
    }

    // Wave offset for right arm
    let waveAngle = 0;
    if (animState === "wave") {
      const t = animProgress / WAVE_DURATION;
      waveAngle = Math.sin(t * Math.PI * 4) * 0.6;
    }

    /**
     * Draw a body part's particles
     */
    function drawPart(
      part: BodyPart,
      extraOffsetX: number,
      extraOffsetY: number,
      rotation?: number
    ) {
      const cos = rotation ? Math.cos(rotation) : 1;
      const sin = rotation ? Math.sin(rotation) : 0;

      for (const p of part.particles) {
        // Idle micro-drift
        const drift = Math.sin(time * 0.8 + p.seed) * 1.5;
        const driftY = Math.cos(time * 0.6 + p.seed * 1.3) * 1.0;

        let px = p.baseX + drift;
        let py = p.baseY + driftY;

        // Apply rotation if any
        if (rotation) {
          const rx = px * cos - py * sin;
          const ry = px * sin + py * cos;
          px = rx;
          py = ry;
        }

        const finalX = part.centerX + px + extraOffsetX + danceX;
        const finalY = part.centerY + py + extraOffsetY + breathY + danceY;

        const rgb = hexToRgb(p.color);
        const alpha = p.alpha * (0.8 + Math.sin(time + p.seed) * 0.2);

        // Glow
        if (glowIntensity > 3) {
          c.shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`;
          c.shadowBlur = glowIntensity;
        }

        c.beginPath();
        c.arc(finalX, finalY, p.size * breathScale, 0, Math.PI * 2);
        c.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        c.fill();
      }

      // Reset shadow
      c.shadowColor = "transparent";
      c.shadowBlur = 0;
    }

    // Draw order: aura (back), cape (back), legs, body, arms, head, hat

    // Aura
    if (figure.aura) {
      drawPart(figure.aura, 0, 0);
    }

    // Cape
    if (figure.cape) {
      // Cape flows with a wave effect
      const capeWave = Math.sin(time * 1.5) * 0.05;
      drawPart(figure.cape, 0, 0, capeWave + danceRotation);
    }

    // Legs
    drawPart(figure.leftLeg, 0, 0);
    drawPart(figure.rightLeg, 0, 0);

    // Body
    drawPart(figure.body, 0, 0, danceRotation);

    // Arms
    drawPart(figure.leftArm, 0, 0);
    // Right arm waves
    drawPart(figure.rightArm, 0, 0, -waveAngle);

    // Head
    drawPart(figure.head, 0, 0);

    // Eyes (two bright dots on the head)
    const eyeY = figure.head.centerY - 2 + breathY + danceY;
    const eyeLeftX = figure.head.centerX - 9 + danceX;
    const eyeRightX = figure.head.centerX + 9 + danceX;

    // Blink every ~4 seconds
    const blinkPhase = (time * 0.25) % 1;
    const isBlinking = blinkPhase > 0.95;
    const eyeHeight = isBlinking ? 0.5 : 2.5;

    c.fillStyle = COLORS.white;
    c.shadowColor = COLORS.white;
    c.shadowBlur = 4;

    // Left eye
    c.beginPath();
    c.ellipse(eyeLeftX, eyeY, 2.5, eyeHeight, 0, 0, Math.PI * 2);
    c.fill();

    // Right eye
    c.beginPath();
    c.ellipse(eyeRightX, eyeY, 2.5, eyeHeight, 0, 0, Math.PI * 2);
    c.fill();

    c.shadowColor = "transparent";
    c.shadowBlur = 0;

    // Smile (small arc of particles)
    const smileY = figure.head.centerY + 10 + breathY + danceY;
    const smileCx = figure.head.centerX + danceX;
    const smileWidth = animState === "dance" ? 12 : 8;
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      const sx = smileCx - smileWidth + t * smileWidth * 2;
      const sy = smileY + Math.sin(t * Math.PI) * 4;
      c.beginPath();
      c.arc(sx, sy, 1.2, 0, Math.PI * 2);
      c.fillStyle = `rgba(255, 255, 255, 0.7)`;
      c.fill();
    }

    // Hat
    if (figure.hat) {
      drawPart(figure.hat, 0, 0);
    }

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
