/**
 * Animated Particle Globe
 *
 * A Canvas 2D particle sphere with cyan-to-purple gradient glow.
 * Points are distributed using the Fibonacci/golden-spiral algorithm.
 *
 * - Idle: slow rotation
 * - Active (AI responding): faster rotation + pulsating glow
 *
 * No external dependencies — pure Canvas 2D + requestAnimationFrame.
 */

"use client";

import { useRef, useEffect } from "react";

interface GlobeProps {
  isActive: boolean;
}

// 3D point on a unit sphere
interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Globe configuration
const NUM_POINTS = 900;
const SPHERE_RADIUS = 120; // Visual radius in CSS pixels
const FOCAL_LENGTH = 400;
const CANVAS_SIZE = 600; // Internal canvas resolution (2x for retina)
const CSS_SIZE = 300; // CSS display size
const CENTER = CANVAS_SIZE / 2;

// Rotation speeds (radians per frame)
const IDLE_SPEED = 0.003;
const ACTIVE_SPEED = 0.015;
const SPEED_LERP = 0.04; // How fast to transition between speeds

// Glow settings
const IDLE_GLOW = 6;
const ACTIVE_GLOW_MIN = 8;
const ACTIVE_GLOW_MAX = 22;
const GLOW_LERP = 0.06;

/**
 * Generate evenly-distributed points on a unit sphere
 * using the Fibonacci/golden spiral algorithm.
 */
function generateSpherePoints(count: number): Point3D[] {
  const points: Point3D[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // -1 to 1
    const radius = Math.sqrt(1 - y * y);
    const theta = goldenAngle * i;
    points.push({
      x: Math.cos(theta) * radius,
      y: y,
      z: Math.sin(theta) * radius,
    });
  }

  return points;
}

/**
 * Interpolate between cyan and purple based on a normalized value.
 * Returns an rgba color string.
 */
function getPointColor(normalizedY: number, alpha: number): string {
  // normalizedY: -1 (bottom/purple) to 1 (top/cyan)
  const t = (normalizedY + 1) / 2; // 0 to 1

  // Cyan: rgb(0, 229, 255) -> Purple: rgb(179, 102, 255)
  const r = Math.round(0 + (179 - 0) * (1 - t));
  const g = Math.round(229 + (102 - 229) * (1 - t));
  const b = 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Get glow color (more cyan-biased for a cleaner look)
 */
function getGlowColor(normalizedY: number): string {
  const t = (normalizedY + 1) / 2;
  const r = Math.round(0 + (179 - 0) * (1 - t));
  const g = Math.round(229 + (102 - 229) * (1 - t));
  return `rgba(${r}, ${g}, 255, 0.6)`;
}

export function Globe({ isActive }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point3D[]>(generateSpherePoints(NUM_POINTS));
  const animationRef = useRef<number>(0);
  const angleRef = useRef<number>(0);
  const currentSpeedRef = useRef<number>(IDLE_SPEED);
  const currentGlowRef = useRef<number>(IDLE_GLOW);
  const isActiveRef = useRef<boolean>(isActive);

  // Keep the ref in sync with the prop
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Scale for retina
    ctx.scale(2, 2);

    function animate(timestamp: number) {
      if (!ctx) return;

      // --- Speed transition ---
      const targetSpeed = isActiveRef.current ? ACTIVE_SPEED : IDLE_SPEED;
      currentSpeedRef.current +=
        (targetSpeed - currentSpeedRef.current) * SPEED_LERP;
      angleRef.current += currentSpeedRef.current;

      // --- Glow transition ---
      const targetGlow = isActiveRef.current
        ? ACTIVE_GLOW_MIN +
          (Math.sin(timestamp * 0.004) * 0.5 + 0.5) *
            (ACTIVE_GLOW_MAX - ACTIVE_GLOW_MIN)
        : IDLE_GLOW;
      currentGlowRef.current +=
        (targetGlow - currentGlowRef.current) * GLOW_LERP;

      // --- Clear canvas ---
      ctx.clearRect(0, 0, CSS_SIZE, CSS_SIZE);

      // --- Transform and project all points ---
      const angle = angleRef.current;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      // Add a slight tilt on X-axis for visual interest
      const tiltAngle = 0.3;
      const cosT = Math.cos(tiltAngle);
      const sinT = Math.sin(tiltAngle);

      const projected = pointsRef.current.map((p) => {
        // Rotate around Y axis
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        let ry = p.y;

        // Slight tilt around X axis
        const ry2 = ry * cosT - rz * sinT;
        const rz2 = ry * sinT + rz * cosT;
        ry = ry2;
        const finalZ = rz2;

        // Perspective projection
        const scale = FOCAL_LENGTH / (FOCAL_LENGTH + finalZ * SPHERE_RADIUS);
        const screenX = CSS_SIZE / 2 + rx * SPHERE_RADIUS * scale;
        const screenY = CSS_SIZE / 2 + ry * SPHERE_RADIUS * scale;

        // Depth-based properties
        const depthNorm = (finalZ + 1) / 2; // 0 (far) to 1 (near)

        return {
          screenX,
          screenY,
          depth: finalZ,
          depthNorm,
          originalY: p.y,
          size: 0.6 + depthNorm * 1.6, // 0.6px to 2.2px
          alpha: 0.1 + depthNorm * 0.7, // 0.1 to 0.8
        };
      });

      // Sort back-to-front for proper layering
      projected.sort((a, b) => a.depth - b.depth);

      // --- Draw points ---
      for (const p of projected) {
        const color = getPointColor(p.originalY, p.alpha);
        const glowColor = getGlowColor(p.originalY);

        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, p.size, 0, Math.PI * 2);

        // Glow effect (stronger for front-facing points)
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = currentGlowRef.current * p.depthNorm;

        ctx.fillStyle = color;
        ctx.fill();
      }

      // Reset shadow for next frame
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(animate);
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex justify-center items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="w-[300px] h-[300px]"
      />
    </div>
  );
}
