"use client";

import { motion } from "framer-motion";
import type { Mood, Category, TierConfig, AvatarCustomization } from "@/lib/avatar-state";
import { CATEGORY_THEMES } from "@/lib/avatar-state";

interface AuraProps {
  tier: TierConfig;
  mood: Mood;
  category: Category;
  customization: AvatarCustomization;
}

/** Floor shadow and background energy aura */
export function Aura({ tier, mood, category, customization }: AuraProps) {
  const theme = CATEGORY_THEMES[category];
  const isExcited = mood === "excited";
  const isCelebrating = mood === "celebrating" || mood === "happy";
  const isLegend = tier.id >= 5;
  const isOverdrive = tier.id >= 4;

  // Aura pulse speed based on mood
  const pulseDuration = isExcited ? 0.6 : isCelebrating ? 0.8 : 3;

  // Aura shape from customization (tier 5)
  const auraShape = customization.auraShape;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* ═══ FLOOR SHADOW ═══ */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{
          width: "70%",
          height: 12,
          borderRadius: "50%",
          background: tier.id >= 2
            ? `radial-gradient(ellipse, ${theme.colors.primary}30 0%, transparent 70%)`
            : "radial-gradient(ellipse, rgba(0,0,0,0.5) 0%, transparent 70%)",
          filter: "blur(4px)",
        }}
      />

      {/* ═══ BODY AURA GLOW ═══ */}
      {tier.id >= 1 && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "15%",
            width: "60%",
            height: "70%",
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${theme.colors.glow}15 0%, ${theme.colors.primary}08 40%, transparent 70%)`,
            filter: "blur(20px)",
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, isExcited ? 1.15 : 1.05, 1],
          }}
          transition={{
            duration: pulseDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* ═══ OVERDRIVE HUE ROTATION AURA (Tier 4+) ═══ */}
      {isOverdrive && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "10%",
            width: "80%",
            height: "80%",
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, #FF4500, #FFD700, #00E5FF, #DA70D6, #22C55E, #FF4500)",
            filter: "blur(40px)",
            opacity: 0.08,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      )}

      {/* ═══ LEGEND AURA SHAPES (Tier 5) ═══ */}
      {isLegend && auraShape === "sphere" && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            border: `2px solid ${theme.colors.primary}30`,
            filter: `drop-shadow(0 0 10px ${theme.colors.glow}40)`,
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {isLegend && auraShape === "orbital-ring" && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "120%",
            height: "30%",
            borderRadius: "50%",
            border: `1.5px solid ${theme.colors.primary}40`,
            filter: `drop-shadow(0 0 8px ${theme.colors.glow}60)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      )}

      {isLegend && auraShape === "wings" && (
        <>
          <motion.div
            className="absolute"
            style={{
              right: "65%",
              top: "20%",
              width: "40%",
              height: "50%",
              borderRadius: "60% 0% 60% 40%",
              background: `linear-gradient(135deg, ${theme.colors.primary}20, transparent)`,
              filter: `blur(8px)`,
              transformOrigin: "right center",
            }}
            animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute"
            style={{
              left: "65%",
              top: "20%",
              width: "40%",
              height: "50%",
              borderRadius: "0% 60% 40% 60%",
              background: `linear-gradient(-135deg, ${theme.colors.primary}20, transparent)`,
              filter: `blur(8px)`,
              transformOrigin: "left center",
            }}
            animate={{ scaleX: [0.8, 1, 0.8], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
          />
        </>
      )}

      {isLegend && auraShape === "explosion" && (
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "90%",
            height: "90%",
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.colors.primary}15 0%, ${theme.colors.glow}05 40%, transparent 60%)`,
          }}
          animate={{
            scale: [0.8, 1.3, 0.8],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* ═══ ENERGY PULSE OUTWARD (Legend idle) ═══ */}
      {isLegend && mood === "idle" && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: "50%",
                height: "50%",
                borderRadius: "50%",
                border: `1px solid ${theme.colors.primary}20`,
              }}
              animate={{ scale: [0.5, 2.5], opacity: [0.4, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 1,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}
