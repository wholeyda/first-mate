/**
 * Animated Particle Globe — Solar System
 *
 * A Canvas 2D particle sphere (the "sun") with cyan-to-purple gradient glow.
 * Completed goals orbit as mini planets — small spinning particle spheres
 * in unique colors. Some planets have Saturn-like rings.
 *
 * - Idle: slow rotation
 * - Active (AI responding): faster rotation + pulsating glow
 * - Planets: mini spinning globes orbiting at (theta, phi) positions
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

// Planet rendering
const PLANET_RADIUS = 40; // Radius of the mini planet in screen pixels
const PLANET_ORBIT_DISTANCE = 1.6; // How far from center (fraction of SPHERE_RADIUS)
const PLANET_POINTS = 200; // Points per mini planet
const PLANET_SPIN_SPEED = 0.012; // Each planet spins on its own axis

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

/** Generate evenly distributed points for a mini planet */
function generateMiniSpherePoints(count: number): Point3D[] {
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

/** Determine if a planet should have rings based on its island_type */
function planetHasRings(islandType: string): boolean {
  const ringedTypes = ["volcanic", "crystalline", "nebula", "steampunk", "arctic", "desert"];
  return ringedTypes.includes(islandType);
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
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
  const planetPointsRef = useRef<Map<string, Point3D[]>>(new Map());
  const projectedPlanetCentersRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    islandsRef.current = islands;
    // Generate mini-sphere points for each planet
    const newMap = new Map<string, Point3D[]>();
    for (const island of islands) {
      if (planetPointsRef.current.has(island.id)) {
        newMap.set(island.id, planetPointsRef.current.get(island.id)!);
      } else {
        newMap.set(island.id, generateMiniSpherePoints(PLANET_POINTS));
      }
    }
    planetPointsRef.current = newMap;
  }, [islands]);

  // Handle clicks on planets
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

      for (const island of islandsRef.current) {
        const center = projectedPlanetCentersRef.current.get(island.id);
        if (center) {
          const dist = Math.sqrt(
            (clickX - center.x) ** 2 + (clickY - center.y) ** 2
          );
          if (dist < 50) {
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
        return { screenX, screenY, depth: finalZ, depthNorm, scale, originalY: p.y };
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
          glowMult: 1,
        };
      });

      // Set globe colors
      for (const p of projected) {
        p.color = getPointColor(p.originalY, p.alpha);
        p.glowColor = getGlowColor(p.originalY);
      }

      // Draw globe particles (back half first, sorted by depth)
      projected.sort((a, b) => a.depth - b.depth);

      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, p.size, 0, Math.PI * 2);
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = currentGlowRef.current * p.depthNorm;
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;

      // --- Draw orbit paths ---
      for (const island of islandsRef.current) {
        const orbitPhi = island.position_phi;
        const orbitDist = PLANET_ORBIT_DISTANCE;

        // Draw orbit ellipse
        ctx.save();
        ctx.translate(CSS_SIZE / 2, CSS_SIZE / 2);

        // The orbit is a circle in 3D, projected as an ellipse
        const orbitRadius = orbitDist * SPHERE_RADIUS * (FOCAL_LENGTH / (FOCAL_LENGTH));
        const tiltedRadius = orbitRadius * Math.abs(Math.sin(orbitPhi));

        ctx.beginPath();
        ctx.ellipse(0, 0, orbitRadius, tiltedRadius * cosT, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // --- Draw orbiting planets ---
      for (const island of islandsRef.current) {
        const planetPts = planetPointsRef.current.get(island.id);
        if (!planetPts) continue;

        const colors = island.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];
        const hasRings = planetHasRings(island.island_type);

        // Planet orbit position on the main sphere
        // Use island theta/phi + main rotation to orbit around the globe
        const orbitTheta = island.position_theta + angle * 0.4;
        const orbitPhi = island.position_phi;

        // Convert to 3D position on orbit sphere
        const orbitX = Math.sin(orbitPhi) * Math.cos(orbitTheta) * PLANET_ORBIT_DISTANCE;
        const orbitY = Math.cos(orbitPhi) * PLANET_ORBIT_DISTANCE;
        const orbitZ = Math.sin(orbitPhi) * Math.sin(orbitTheta) * PLANET_ORBIT_DISTANCE;

        // Project the orbit center
        const centerProj = project({ x: orbitX, y: orbitY, z: orbitZ });

        // Store projected center for click detection
        projectedPlanetCentersRef.current.set(island.id, {
          x: centerProj.screenX,
          y: centerProj.screenY,
        });

        // Scale the planet based on depth (closer = bigger)
        const planetScale = centerProj.scale * 0.9;
        const scaledRadius = PLANET_RADIUS * planetScale;

        // Planet's own spin angle
        const planetAngle = timestamp * PLANET_SPIN_SPEED + island.position_theta * 10;
        const cosPlanet = Math.cos(planetAngle);
        const sinPlanet = Math.sin(planetAngle);

        // Planet tilt (each planet has a unique tilt based on phi)
        const planetTilt = island.position_phi * 0.5;
        const cosPT = Math.cos(planetTilt);
        const sinPT = Math.sin(planetTilt);

        // Depth-based alpha for the whole planet
        const planetAlpha = 0.3 + centerProj.depthNorm * 0.7;

        // Draw planet particles
        const planetProjected: Array<{
          sx: number; sy: number; sz: number; size: number; color: string; glow: string;
        }> = [];

        for (let i = 0; i < planetPts.length; i++) {
          const p = planetPts[i];

          // Rotate planet point around its own axis
          const rx = p.x * cosPlanet - p.z * sinPlanet;
          const rz = p.x * sinPlanet + p.z * cosPlanet;
          let ry = p.y;

          // Apply planet tilt
          const ry2 = ry * cosPT - rz * sinPT;
          const rz2 = ry * sinPT + rz * cosPT;

          // Depth sort within the planet
          const pointDepth = rz2;
          const pointAlpha = (0.2 + ((pointDepth + 1) / 2) * 0.8) * planetAlpha;

          // Color gradient across the planet
          const colorIdx = i % colors.length;
          const rgb = hexToRgb(colors[colorIdx]);

          // Blend with neighboring color for smooth gradient
          const t = (p.y + 1) / 2;
          const nextColorIdx = (colorIdx + 1) % colors.length;
          const nextRgb = hexToRgb(colors[nextColorIdx]);
          const blendR = Math.round(rgb.r + (nextRgb.r - rgb.r) * t);
          const blendG = Math.round(rgb.g + (nextRgb.g - rgb.g) * t);
          const blendB = Math.round(rgb.b + (nextRgb.b - rgb.b) * t);

          const size = (1.2 + ((pointDepth + 1) / 2) * 2.8) * planetScale;

          planetProjected.push({
            sx: centerProj.screenX + rx * scaledRadius,
            sy: centerProj.screenY + ry2 * scaledRadius,
            sz: pointDepth,
            size,
            color: `rgba(${blendR}, ${blendG}, ${blendB}, ${pointAlpha})`,
            glow: `rgba(${blendR}, ${blendG}, ${blendB}, ${pointAlpha * 0.6})`,
          });
        }

        // Sort planet particles by depth
        planetProjected.sort((a, b) => a.sz - b.sz);

        // Draw ring behind planet if applicable
        if (hasRings) {
          const ringColor = colors[0];
          const ringRgb = hexToRgb(ringColor);

          // Draw ring as an ellipse
          ctx.save();
          ctx.translate(centerProj.screenX, centerProj.screenY);
          ctx.rotate(planetTilt * 0.3);

          // Back half of ring (behind planet)
          ctx.beginPath();
          ctx.ellipse(0, 0, scaledRadius * 2.0, scaledRadius * 0.45, 0, Math.PI, Math.PI * 2);
          ctx.strokeStyle = `rgba(${ringRgb.r}, ${ringRgb.g}, ${ringRgb.b}, ${planetAlpha * 0.3})`;
          ctx.lineWidth = 2.5 * planetScale;
          ctx.shadowColor = `rgba(${ringRgb.r}, ${ringRgb.g}, ${ringRgb.b}, 0.3)`;
          ctx.shadowBlur = 8 * planetScale;
          ctx.stroke();

          ctx.restore();
        }

        // Draw planet particles
        for (const pp of planetProjected) {
          ctx.beginPath();
          ctx.arc(pp.sx, pp.sy, pp.size, 0, Math.PI * 2);
          ctx.shadowColor = pp.glow;
          ctx.shadowBlur = currentGlowRef.current * 0.3 * planetScale;
          ctx.fillStyle = pp.color;
          ctx.fill();
        }

        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Draw ring in front of planet if applicable
        if (hasRings) {
          const ringColor = colors[0];
          const ringRgb = hexToRgb(ringColor);

          ctx.save();
          ctx.translate(centerProj.screenX, centerProj.screenY);
          ctx.rotate(planetTilt * 0.3);

          // Front half of ring (in front of planet)
          ctx.beginPath();
          ctx.ellipse(0, 0, scaledRadius * 2.0, scaledRadius * 0.45, 0, 0, Math.PI);
          ctx.strokeStyle = `rgba(${ringRgb.r}, ${ringRgb.g}, ${ringRgb.b}, ${planetAlpha * 0.5})`;
          ctx.lineWidth = 2.5 * planetScale;
          ctx.shadowColor = `rgba(${ringRgb.r}, ${ringRgb.g}, ${ringRgb.b}, 0.4)`;
          ctx.shadowBlur = 8 * planetScale;
          ctx.stroke();

          // Second thinner ring
          ctx.beginPath();
          ctx.ellipse(0, 0, scaledRadius * 1.6, scaledRadius * 0.35, 0, 0, Math.PI);
          ctx.strokeStyle = `rgba(${ringRgb.r}, ${ringRgb.g}, ${ringRgb.b}, ${planetAlpha * 0.25})`;
          ctx.lineWidth = 1.5 * planetScale;
          ctx.stroke();

          ctx.restore();
        }
      }

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
