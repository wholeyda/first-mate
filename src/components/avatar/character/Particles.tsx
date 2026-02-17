"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { Mood, Category, TierConfig, AvatarCustomization } from "@/lib/avatar-state";
import { CATEGORY_THEMES } from "@/lib/avatar-state";

interface ParticlesProps {
  tier: TierConfig;
  category: Category;
  customization: AvatarCustomization;
  mood: Mood;
}

/** Category-themed particles — embers, code, paint, petals */
export function CharacterParticles({ tier, category, customization, mood }: ParticlesProps) {
  const theme = CATEGORY_THEMES[category];
  const particleCount = tier.id >= 5 ? 20 : tier.id >= 4 ? 14 : 8;
  const isCelebrating = mood === "happy" || mood === "celebrating";

  // Generate stable particle configs
  const particles = useMemo(() =>
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      startX: -40 + Math.random() * 80,
      startY: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      drift: -20 + Math.random() * 40,
    })),
  [particleCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => {
        const style = getParticleStyle(category, customization.particleStyle, p.size, theme);

        return (
          <motion.div
            key={p.id}
            className="absolute"
            style={{
              left: `calc(50% + ${p.startX}px)`,
              bottom: `${5 + p.startY * 0.8}%`,
              ...style.css,
            }}
            animate={
              isCelebrating
                ? {
                    y: [-20, -200 - Math.random() * 100],
                    x: [0, p.drift * 2],
                    opacity: [0.8, 0],
                    scale: [1, 0.3],
                  }
                : category === "fitness"
                ? { y: [0, -120 - Math.random() * 80], opacity: [0.7, 0], x: [0, p.drift] }
                : category === "learning"
                ? {
                    x: [0, Math.cos(p.id) * 40],
                    y: [0, Math.sin(p.id) * 30 - 20],
                    opacity: [0.3, 0.7, 0.3],
                    rotate: [0, 180],
                  }
                : category === "creative"
                ? {
                    y: [0, -60 - Math.random() * 40],
                    x: [0, p.drift * 1.5],
                    opacity: [0.6, 0],
                    scale: [0.5, 1.5, 0],
                  }
                : {
                    y: [0, -80],
                    x: [0, p.drift, 0],
                    opacity: [0.5, 0.8, 0],
                    rotate: [0, 180, 360],
                  }
            }
            transition={{
              duration: isCelebrating ? 1.5 : p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
}

function getParticleStyle(
  category: Category,
  _style: string,
  size: number,
  theme: { colors: { primary: string; secondary: string; glow: string } }
): { css: React.CSSProperties } {
  switch (category) {
    case "fitness":
      return {
        css: {
          width: size,
          height: size,
          borderRadius: "30%",
          background: `radial-gradient(circle, ${theme.colors.primary}, ${theme.colors.secondary})`,
          filter: `drop-shadow(0 0 3px ${theme.colors.glow})`,
        },
      };
    case "learning":
      return {
        css: {
          width: size * 1.5,
          height: size * 0.8,
          borderRadius: "2px",
          background: theme.colors.primary,
          opacity: 0.5,
          filter: `drop-shadow(0 0 4px ${theme.colors.glow})`,
        },
      };
    case "creative":
      return {
        css: {
          width: size * 1.2,
          height: size * 1.2,
          borderRadius: "50%",
          background: `linear-gradient(45deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
          filter: "blur(1px)",
        },
      };
    case "mindfulness":
      return {
        css: {
          width: size,
          height: size * 1.3,
          borderRadius: "50% 0% 50% 50%",
          background: `linear-gradient(to bottom, ${theme.colors.primary}80, ${theme.colors.secondary}60)`,
          filter: "blur(0.5px)",
        },
      };
  }
}
