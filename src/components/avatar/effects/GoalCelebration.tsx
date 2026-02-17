"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { CATEGORY_THEMES, type Category, type TierConfig, getNextTier } from "@/lib/avatar-state";
import { playChime, playChunk } from "../sounds";

interface GoalCelebrationProps {
  category: Category;
  tier: TierConfig;
  goalCount: number;
  onComplete: () => void;
  onTierUnlock?: (tierId: number) => void;
}

/** Theatrical goal completion sequence — flash, icon burst, XP fill, tier check */
export function GoalCelebration({ category, tier, goalCount, onComplete, onTierUnlock }: GoalCelebrationProps) {
  const [phase, setPhase] = useState<"flash" | "armsUp" | "iconBurst" | "xpFill" | "tierCheck" | "done">("flash");
  const [xpFillProgress, setXpFillProgress] = useState(0);
  const theme = CATEGORY_THEMES[category];

  // XP fill target
  const nextTier = getNextTier(goalCount - 1); // before this goal
  const prevCount = goalCount - 1;
  const prevTier = tier; // current tier after completion
  const prevThreshold = prevTier.threshold;
  const nextThreshold = nextTier ? nextTier.threshold : prevThreshold + 10;
  const range = nextThreshold - prevThreshold;
  const prevProgress = range > 0 ? ((prevCount - prevThreshold) / range) * 100 : 100;
  const newProgress = range > 0 ? ((goalCount - prevThreshold) / range) * 100 : 100;

  const shouldUnlockTier = nextTier && goalCount >= nextTier.threshold;

  // Sequence timing
  useEffect(() => {
    playChime();
    const timers = [
      setTimeout(() => setPhase("armsUp"), 80),
      setTimeout(() => setPhase("iconBurst"), 600),
      setTimeout(() => setPhase("xpFill"), 1200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // XP fill animation — stepped chunks
  useEffect(() => {
    if (phase !== "xpFill") return;
    const steps = 8;
    const stepDelay = 80;
    let step = 0;

    const fill = () => {
      step++;
      const progress = prevProgress + (newProgress - prevProgress) * (step / steps);
      setXpFillProgress(Math.min(progress, 100));
      playChunk();

      if (step < steps) {
        setTimeout(fill, stepDelay);
      } else {
        setTimeout(() => setPhase("tierCheck"), 600);
      }
    };
    setTimeout(fill, 200);
  }, [phase, prevProgress, newProgress]);

  // Tier check
  useEffect(() => {
    if (phase !== "tierCheck") return;
    if (shouldUnlockTier && nextTier) {
      setTimeout(() => onTierUnlock?.(nextTier.id), 500);
    } else {
      setTimeout(() => setPhase("done"), 300);
    }
  }, [phase, shouldUnlockTier, nextTier, onTierUnlock]);

  const handleDone = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (phase === "done") {
      const t = setTimeout(handleDone, 800);
      return () => clearTimeout(t);
    }
  }, [phase, handleDone]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* 1. Screen flash white (50ms) */}
      <AnimatePresence>
        {phase === "flash" && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
          />
        )}
      </AnimatePresence>

      {/* 3. Giant category icon bursts outward from center */}
      {(phase === "iconBurst" || phase === "xpFill") && (
        <motion.div
          className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 text-center"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.5, 1], opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, ease: [0.36, 0, 0.66, -0.56] }}
        >
          <span
            className="text-8xl"
            style={{
              filter: `drop-shadow(0 0 20px ${theme.colors.glow}) drop-shadow(0 0 60px ${theme.colors.primary}60)`,
            }}
          >
            {theme.icon}
          </span>
        </motion.div>
      )}

      {/* 4. Particles rain down matching category theme */}
      {phase === "iconBurst" && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 40 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 3 + Math.random() * 5,
                height: 3 + Math.random() * 5,
                left: `${10 + Math.random() * 80}%`,
                top: -10,
                background: i % 2 === 0 ? theme.colors.primary : theme.colors.secondary,
                filter: `drop-shadow(0 0 3px ${theme.colors.glow})`,
              }}
              animate={{ y: window.innerHeight + 50, opacity: [0.8, 0] }}
              transition={{ duration: 1.5 + Math.random() * 2, delay: Math.random() * 0.5, ease: "easeIn" }}
            />
          ))}
        </div>
      )}

      {/* 5. XP bar fills */}
      {(phase === "xpFill" || phase === "tierCheck" || phase === "done") && (
        <motion.div
          className="absolute bottom-[15%] left-1/2 -translate-x-1/2 w-[300px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: phase === "done" ? 0 : 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* XP bar background */}
          <div className="relative h-4 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.1)", border: `1px solid ${theme.colors.primary}30` }}
          >
            {/* Fill */}
            <div
              className="h-full rounded-full transition-none"
              style={{
                width: `${xpFillProgress}%`,
                background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`,
                filter: `drop-shadow(0 0 8px ${theme.colors.glow})`,
                transition: "width 0.06s steps(1)",
              }}
            />
          </div>

          {/* Tier label */}
          <div className="flex justify-between mt-2 text-xs">
            <span style={{ color: theme.colors.primary }}>{tier.name}</span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>
              {nextTier ? nextTier.name : "MAX"}
            </span>
          </div>
        </motion.div>
      )}

      {/* 6. "+1 GOAL" floats up */}
      {phase === "xpFill" && (
        <motion.div
          className="absolute left-1/2 top-[45%] -translate-x-1/2 font-black text-3xl"
          style={{
            color: theme.colors.primary,
            textShadow: `0 0 20px ${theme.colors.glow}`,
          }}
          initial={{ y: 0, opacity: 1, scale: 0.5 }}
          animate={{ y: -80, opacity: 0, scale: 1.2 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        >
          +1 GOAL
        </motion.div>
      )}
    </div>
  );
}
