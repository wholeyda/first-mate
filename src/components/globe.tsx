/**
 * Animated Particle Globe with Island Support
 *
 * A Canvas 2D particle sphere with cyan-to-purple gradient glow.
 * Points are distributed using the Fibonacci/golden-spiral algorithm.
 * Islands are rendered as clusters of colorful larger particles at
 * specific positions on the sphere surface.
 *
 * - Idle: slow rotation
 * - Active (AI responding): faster rotation + pulsating glow
 * - Islands: colorful clusters that orbit with the globe
 *
 * No external dependencies — pure Canvas 2D + requestAnimationFrame.
 */

"use client";

import { useRef, useEffect, useCallback } from "react";
import { Island } from "@/types/database";

interface GlobeProps {
  isActive: boolean;
  islands?: Island[];
  onIslandClick?: (island: Island) => void;
}

// 3D point on a unit sphere
interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Globe configuration (3x scale)
const NUM_POINTS = 2500;
const SPHERE_RADIUS = 360;
const FOCAL_LENGTH = 1200;
const CANVAS_SIZE = 1800;
const CSS_SIZE = 900;

// Rotation speeds
const IDLE_SPEED = 0.003;
const ACTIVE_SPEED = 0.015;
const SPEED_LERP = 0.04;

// Glow settings
const IDLE_GLOW = 18;
const ACTIVE_GLOW_MIN = 24;
const ACTIVE_GLOW_MAX = 66;
const GLOW_LERP = 0.06;

// Island rendering
const ISLAND_PARTICLES_PER = 18;
const ISLAND_SPREAD = 0.12; // Spread radius on unit sphere

function generateSpherePoints(count: number): Point3D[] {
  const points: Point3D[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
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
 * Generate island particle positions on the sphere surface
 * clustered around a (theta, phi) anchor point.
 */
function generateIslandParticles(
  theta: number,
  phi: number,
  count: number
): Point3D[] {
  const particles: Point3D[] = [];
  // Center point from spherical coordinates
  const cx = Math.sin(phi) * Math.cos(theta);
  const cy = Math.cos(phi);
  const cz = Math.sin(phi) * Math.sin(theta);

  for (let i = 0; i < count; i++) {
    // Random offset in tangent plane
    const offsetTheta = (Math.random() - 0.5) * ISLAND_SPREAD * 2;
    const offsetPhi = (Math.random() - 0.5) * ISLAND_SPREAD * 2;

    const t = theta + offsetTheta;
    const p = phi + offsetPhi;

    // Convert back to unit sphere
    const x = Math.sin(p) * Math.cos(t);
    const y = Math.cos(p);
    const z = Math.sin(p) * Math.sin(t);

    // Normalize to unit sphere
    const len = Math.sqrt(x * x + y * y + z * z);
    particles.push({
      x: x / len,
      y: y / len,
      z: z / len,
    });
  }

  // Add center point
  particles.push({ x: cx, y: cy, z: cz });

  return particles;
}

function getPointColor(normalizedY: number, alpha: number): string {
  const t = (normalizedY + 1) / 2;
  const r = Math.round(0 + (179 - 0) * (1 - t));
  const g = Math.round(229 + (102 - 229) * (1 - t));
  const b = 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getGlowColor(normalizedY: number): string {
  const t = (normalizedY + 1) / 2;
  const r = Math.round(0 + (179 - 0) * (1 - t));
  const g = Math.round(229 + (102 - 229) * (1 - t));
  return `rgba(${r}, ${g}, 255, 0.6)`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function Globe({ isActive, islands = [], onIslandClick }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<Point3D[]>(generateSpherePoints(NUM_POINTS));
  const animationRef = useRef<number>(0);
  const angleRef = useRef<number>(0);
  const currentSpeedRef = useRef<number>(IDLE_SPEED);
  const currentGlowRef = useRef<number>(IDLE_GLOW);
  const isActiveRef = useRef<boolean>(isActive);
  const islandsRef = useRef<Island[]>(islands);
  const islandParticlesRef = useRef<Map<string, Point3D[]>>(new Map());
  const projectedIslandCentersRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    islandsRef.current = islands;
    // Regenerate island particles when islands change
    const newMap = new Map<string, Point3D[]>();
    for (const island of islands) {
      if (!islandParticlesRef.current.has(island.id)) {
        newMap.set(
          island.id,
          generateIslandParticles(
            island.position_theta,
            island.position_phi,
            ISLAND_PARTICLES_PER
          )
        );
      } else {
        newMap.set(island.id, islandParticlesRef.current.get(island.id)!);
      }
    }
    islandParticlesRef.current = newMap;
  }, [islands]);

  // Handle clicks on islands
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onIslandClick) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CSS_SIZE / rect.width;
      const scaleY = CSS_SIZE / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      // Check if click is near any island center
      for (const island of islandsRef.current) {
        const center = projectedIslandCentersRef.current.get(island.id);
        if (center) {
          const dist = Math.sqrt(
            (clickX - center.x) ** 2 + (clickY - center.y) ** 2
          );
          if (dist < 40) {
            onIslandClick(island);
            return;
          }
        }
      }
    },
    [onIslandClick]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(2, 2);

    function animate(timestamp: number) {
      if (!ctx) return;

      const targetSpeed = isActiveRef.current ? ACTIVE_SPEED : IDLE_SPEED;
      currentSpeedRef.current +=
        (targetSpeed - currentSpeedRef.current) * SPEED_LERP;
      angleRef.current += currentSpeedRef.current;

      const targetGlow = isActiveRef.current
        ? ACTIVE_GLOW_MIN +
          (Math.sin(timestamp * 0.004) * 0.5 + 0.5) *
            (ACTIVE_GLOW_MAX - ACTIVE_GLOW_MIN)
        : IDLE_GLOW;
      currentGlowRef.current +=
        (targetGlow - currentGlowRef.current) * GLOW_LERP;

      ctx.clearRect(0, 0, CSS_SIZE, CSS_SIZE);

      const angle = angleRef.current;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const tiltAngle = 0.3;
      const cosT = Math.cos(tiltAngle);
      const sinT = Math.sin(tiltAngle);

      // Helper: transform and project a 3D point
      function project(p: Point3D) {
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        let ry = p.y;

        const ry2 = ry * cosT - rz * sinT;
        const rz2 = ry * sinT + rz * cosT;
        ry = ry2;
        const finalZ = rz2;

        const scale = FOCAL_LENGTH / (FOCAL_LENGTH + finalZ * SPHERE_RADIUS);
        const screenX = CSS_SIZE / 2 + rx * SPHERE_RADIUS * scale;
        const screenY = CSS_SIZE / 2 + ry * SPHERE_RADIUS * scale;

        const depthNorm = (finalZ + 1) / 2;
        return { screenX, screenY, depth: finalZ, depthNorm, originalY: p.y };
      }

      // Project globe points
      const projected = pointsRef.current.map((p) => {
        const proj = project(p);
        return {
          ...proj,
          size: 1.8 + proj.depthNorm * 4.8,
          alpha: 0.1 + proj.depthNorm * 0.7,
          type: "globe" as const,
          color: "",
          glowColor: "",
        };
      });

      // Set globe colors
      for (const p of projected) {
        p.color = getPointColor(p.originalY, p.alpha);
        p.glowColor = getGlowColor(p.originalY);
      }

      // Project island particles
      const islandProjected: Array<{
        screenX: number;
        screenY: number;
        depth: number;
        depthNorm: number;
        originalY: number;
        size: number;
        alpha: number;
        type: "island";
        color: string;
        glowColor: string;
      }> = [];

      for (const island of islandsRef.current) {
        const particles = islandParticlesRef.current.get(island.id);
        if (!particles) continue;

        const colors = island.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];
        let centerX = 0;
        let centerY = 0;
        let centerCount = 0;

        for (let i = 0; i < particles.length; i++) {
          const proj = project(particles[i]);
          const colorIdx = i % colors.length;
          const islandAlpha = 0.3 + proj.depthNorm * 0.7;

          islandProjected.push({
            ...proj,
            size: 4 + proj.depthNorm * 8, // Larger than globe particles
            alpha: islandAlpha,
            type: "island",
            color: hexToRgba(colors[colorIdx], islandAlpha),
            glowColor: hexToRgba(colors[colorIdx], 0.6),
          });

          if (proj.depthNorm > 0.3) {
            centerX += proj.screenX;
            centerY += proj.screenY;
            centerCount++;
          }
        }

        if (centerCount > 0) {
          projectedIslandCentersRef.current.set(island.id, {
            x: centerX / centerCount,
            y: centerY / centerCount,
          });
        }
      }

      // Merge and sort all particles
      const allParticles = [...projected, ...islandProjected];
      allParticles.sort((a, b) => a.depth - b.depth);

      // Draw all particles
      for (const p of allParticles) {
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, p.size, 0, Math.PI * 2);

        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur =
          p.type === "island"
            ? currentGlowRef.current * p.depthNorm * 1.5
            : currentGlowRef.current * p.depthNorm;

        ctx.fillStyle = p.color;
        ctx.fill();
      }

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
        className="w-[900px] h-[900px]"
        onClick={handleClick}
        style={{ cursor: onIslandClick && islands.length > 0 ? "pointer" : "default" }}
      />
    </div>
  );
}
