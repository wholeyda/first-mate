"use client";

import { motion } from "framer-motion";
import { CATEGORY_THEMES, type Category } from "@/lib/avatar-state";

interface CompleteButtonProps {
  category: Category;
  onClick: () => void;
  disabled?: boolean;
  goalCount: number;
}

/** Large satisfying COMPLETE GOAL button — glows and pulses */
export function CompleteButton({ category, onClick, disabled, goalCount }: CompleteButtonProps) {
  const theme = CATEGORY_THEMES[category];

  if (goalCount === 0) return null;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="relative px-8 py-4 rounded-2xl text-white font-black text-lg tracking-wider cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${theme.colors.primary}CC, ${theme.colors.secondary}CC)`,
      }}
      whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${theme.colors.glow}60` }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Pulsing glow behind */}
      <motion.div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: `radial-gradient(circle, ${theme.colors.glow}30, transparent)`,
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
        }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: "easeInOut" }}
      />

      {/* Text */}
      <span className="relative z-10" style={{ textShadow: `0 0 20px ${theme.colors.glow}` }}>
        COMPLETE GOAL
      </span>

      {/* Neon border */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          border: `1.5px solid ${theme.colors.primary}60`,
          boxShadow: `inset 0 0 15px ${theme.colors.glow}10, 0 0 15px ${theme.colors.glow}20, 0 0 30px ${theme.colors.glow}10`,
        }}
      />
    </motion.button>
  );
}
