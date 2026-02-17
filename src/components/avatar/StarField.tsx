"use client";

import { useEffect, useRef } from "react";
import type { TierConfig } from "@/lib/avatar-state";

interface StarFieldProps {
  tier: TierConfig;
  category: string;
  isNebula?: boolean;
}

/** Living star-field background — 200 particles that react to tier */
export function StarField({ tier, isNebula }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<{ x: number; y: number; z: number; size: number; speed: number; twinkleOffset: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize 200 stars
    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 200 }, () => ({
        x: Math.random(),
        y: Math.random(),
        z: Math.random(),
        size: 0.5 + Math.random() * 2,
        speed: 0.0001 + Math.random() * 0.0003,
        twinkleOffset: Math.random() * Math.PI * 2,
      }));
    }

    let frame: number;
    const animate = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Nebula overlay for tier 5
      if (isNebula) {
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.6);
        grad.addColorStop(0, "rgba(80, 20, 120, 0.15)");
        grad.addColorStop(0.4, "rgba(20, 40, 100, 0.1)");
        grad.addColorStop(0.7, "rgba(10, 60, 80, 0.06)");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Second nebula cloud
        const grad2 = ctx.createRadialGradient(w * 0.7, h * 0.6, 0, w * 0.7, h * 0.6, w * 0.4);
        grad2.addColorStop(0, "rgba(120, 20, 80, 0.1)");
        grad2.addColorStop(0.5, "rgba(40, 10, 60, 0.06)");
        grad2.addColorStop(1, "transparent");
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, w, h);
      }

      const density = tier.starDensity;
      const brightness = tier.starBrightness;
      const time = t * 0.001;

      for (const star of starsRef.current) {
        // Skip some stars based on density
        if (star.z > density) continue;

        star.y += star.speed;
        if (star.y > 1) star.y = 0;

        const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(time * 0.5 + star.twinkleOffset));
        const alpha = twinkle * brightness * (0.4 + star.z * 0.6);
        const size = star.size * (0.5 + star.z * 0.5);

        const sx = star.x * w;
        const sy = star.y * h;

        // Star core
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 210, 255, ${alpha})`;
        ctx.fill();

        // Glow for brighter stars
        if (size > 1.2 && alpha > 0.5) {
          ctx.beginPath();
          ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 200, 255, ${alpha * 0.15})`;
          ctx.fill();
        }
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [tier, isNebula]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 1 }}
    />
  );
}
