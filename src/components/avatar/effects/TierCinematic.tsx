"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { TIERS, CATEGORY_THEMES, type Category } from "@/lib/avatar-state";
import { playTierUnlock, playImpact } from "../sounds";

interface TierCinematicProps {
  tierId: number;
  category: Category;
  onComplete: () => void;
}

/** Full-screen cinematic for tier unlock — freezes UI, plays sequence, reveals new form */
export function TierCinematic({ tierId, category, onComplete }: TierCinematicProps) {
  const [phase, setPhase] = useState<"enter" | "flash" | "reveal" | "title" | "exit">("enter");
  const tier = TIERS[tierId];
  const theme = CATEGORY_THEMES[category];

  useEffect(() => {
    playImpact();
    const timers = [
      setTimeout(() => { setPhase("flash"); playTierUnlock(); }, 800),
      setTimeout(() => setPhase("reveal"), 1600),
      setTimeout(() => setPhase("title"), 2400),
      setTimeout(() => setPhase("exit"), 5000),
      setTimeout(onComplete, 5800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Dark overlay */}
      <motion.div
        className="absolute inset-0 bg-[#080818]"
        animate={{
          opacity: phase === "flash" ? 0 : 0.95,
        }}
        transition={{ duration: phase === "flash" ? 0.05 : 0.5 }}
      />

      {/* White flash */}
      <AnimatePresence>
        {phase === "flash" && (
          <motion.div
            className="absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
          />
        )}
      </AnimatePresence>

      {/* Shockwave ring */}
      {(phase === "flash" || phase === "reveal") && (
        <motion.div
          className="absolute rounded-full"
          style={{
            border: `3px solid ${theme.colors.primary}`,
            filter: `drop-shadow(0 0 15px ${theme.colors.glow}) drop-shadow(0 0 40px ${theme.colors.primary}60)`,
          }}
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 800, height: 800, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      )}

      {/* Camera shake during flash */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        animate={
          phase === "flash"
            ? { x: [0, -8, 6, -4, 3, 0], y: [0, 5, -6, 3, -2, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* Tier title card */}
        {(phase === "title" || phase === "exit") && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{
              opacity: phase === "exit" ? 0 : 1,
              y: 0,
              scale: 1,
            }}
            transition={{ duration: 0.6, ease: [0.36, 0, 0.66, -0.56] }}
          >
            {/* Tier number */}
            <motion.div
              className="text-sm font-bold tracking-[0.3em] uppercase mb-2"
              style={{ color: theme.colors.primary, textShadow: `0 0 20px ${theme.colors.glow}` }}
            >
              TIER {tierId}
            </motion.div>

            {/* Tier name */}
            <motion.h1
              className="text-6xl font-black tracking-tight mb-3"
              style={{
                color: "white",
                textShadow: `0 0 30px ${theme.colors.glow}, 0 0 60px ${theme.colors.primary}40`,
              }}
              initial={{ scale: 2, opacity: 0, filter: "blur(20px)" }}
              animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease: [0.36, 0, 0.66, -0.56], delay: 0.2 }}
            >
              {tier?.name}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              className="text-lg font-light tracking-wider"
              style={{ color: `${theme.colors.primary}CC` }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              {tier?.subtitle}
            </motion.p>

            {/* Decorative line */}
            <motion.div
              className="mx-auto mt-6"
              style={{
                height: 2,
                background: `linear-gradient(to right, transparent, ${theme.colors.primary}, transparent)`,
              }}
              initial={{ width: 0 }}
              animate={{ width: 200 }}
              transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
            />
          </motion.div>
        )}
      </motion.div>

      {/* Particle burst */}
      {(phase === "reveal" || phase === "title") && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }, (_, i) => {
            const angle = (i / 30) * Math.PI * 2;
            const dist = 200 + Math.random() * 300;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 3 + Math.random() * 4,
                  height: 3 + Math.random() * 4,
                  left: "50%",
                  top: "50%",
                  background: i % 3 === 0 ? theme.colors.primary : theme.colors.secondary,
                  filter: `drop-shadow(0 0 4px ${theme.colors.glow})`,
                }}
                initial={{ x: 0, y: 0, opacity: 0.8, scale: 1 }}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: 0,
                  scale: 0,
                }}
                transition={{ duration: 1.5 + Math.random(), ease: "easeOut", delay: Math.random() * 0.3 }}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
