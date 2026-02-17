"use client";

import { motion } from "framer-motion";
import type { Category, TierConfig, AvatarCustomization } from "@/lib/avatar-state";
import { CATEGORY_THEMES } from "@/lib/avatar-state";

interface WingsProps {
  tier: TierConfig;
  category: Category;
  customization: AvatarCustomization;
}

/** Pure energy wings / cape — tier 4+ */
export function Wings({ tier, category }: WingsProps) {
  const theme = CATEGORY_THEMES[category];
  const isLegend = tier.id >= 5;

  // Wing segments for light-trail effect
  const segments = isLegend ? 8 : 5;

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.8, ease: [0.36, 0, 0.66, -0.56] }}
    >
      {/* Left wing */}
      <svg
        viewBox="0 0 140 300"
        className="absolute right-[55%] top-[10%] h-[65%]"
        style={{ filter: `drop-shadow(0 0 15px ${theme.colors.glow}60)`, opacity: isLegend ? 0.6 : 0.4 }}
      >
        {Array.from({ length: segments }, (_, i) => {
          const progress = i / (segments - 1);
          const startY = 80 + progress * 140;
          const endX = 20 - progress * 15;
          const endY = 60 + progress * 160;
          const opacity = 0.15 + (1 - progress) * 0.25;

          return (
            <motion.path
              key={i}
              d={`M 130 ${startY} Q ${70 - progress * 30} ${startY - 20}, ${endX} ${endY}`}
              fill="none"
              stroke={theme.colors.primary}
              strokeWidth={2 - progress * 0.8}
              opacity={opacity}
              animate={{
                opacity: [opacity * 0.6, opacity, opacity * 0.6],
                d: [
                  `M 130 ${startY} Q ${70 - progress * 30} ${startY - 20}, ${endX} ${endY}`,
                  `M 130 ${startY} Q ${65 - progress * 30} ${startY - 30}, ${endX - 5} ${endY - 10}`,
                  `M 130 ${startY} Q ${70 - progress * 30} ${startY - 20}, ${endX} ${endY}`,
                ],
              }}
              transition={{
                duration: 3 + i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}

        {/* Wing glow core */}
        <ellipse cx="130" cy="160" rx="8" ry="60"
          fill={theme.colors.primary} opacity="0.1"
          style={{ filter: "blur(10px)" }}
        />
      </svg>

      {/* Right wing (mirrored) */}
      <svg
        viewBox="0 0 140 300"
        className="absolute left-[55%] top-[10%] h-[65%]"
        style={{
          filter: `drop-shadow(0 0 15px ${theme.colors.glow}60)`,
          opacity: isLegend ? 0.6 : 0.4,
          transform: "scaleX(-1)",
        }}
      >
        {Array.from({ length: segments }, (_, i) => {
          const progress = i / (segments - 1);
          const startY = 80 + progress * 140;
          const endX = 20 - progress * 15;
          const endY = 60 + progress * 160;
          const opacity = 0.15 + (1 - progress) * 0.25;

          return (
            <motion.path
              key={i}
              d={`M 130 ${startY} Q ${70 - progress * 30} ${startY - 20}, ${endX} ${endY}`}
              fill="none"
              stroke={theme.colors.primary}
              strokeWidth={2 - progress * 0.8}
              opacity={opacity}
              animate={{
                opacity: [opacity * 0.6, opacity, opacity * 0.6],
              }}
              transition={{
                duration: 3 + i * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.15,
              }}
            />
          );
        })}

        <ellipse cx="130" cy="160" rx="8" ry="60"
          fill={theme.colors.primary} opacity="0.1"
          style={{ filter: "blur(10px)" }}
        />
      </svg>

      {/* Floating energy orbs (tier 4+) */}
      {Array.from({ length: isLegend ? 5 : 3 }, (_, i) => {
        const angle = (i / (isLegend ? 5 : 3)) * Math.PI * 2;
        return (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full"
            style={{
              width: 6 + (isLegend ? 4 : 0),
              height: 6 + (isLegend ? 4 : 0),
              background: `radial-gradient(circle, ${theme.colors.primary}, ${theme.colors.glow}80)`,
              filter: `drop-shadow(0 0 8px ${theme.colors.glow}) drop-shadow(0 0 20px ${theme.colors.primary}60)`,
              left: "50%",
              top: "40%",
            }}
            animate={{
              x: [Math.cos(angle) * 80, Math.cos(angle + Math.PI) * 80],
              y: [Math.sin(angle) * 50, Math.sin(angle + Math.PI) * 50],
              opacity: [0.5, 0.9, 0.5],
            }}
            transition={{
              duration: 6 + i * 0.5,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.8,
            }}
          />
        );
      })}
    </motion.div>
  );
}
