"use client";

import { motion, AnimatePresence, type TargetAndTransition } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "./Helmet";
import { Torso } from "./Torso";
import { Arms } from "./Arms";
import { Legs } from "./Legs";
import { Aura } from "./Aura";
import { Wings } from "./Wings";
import { CharacterParticles } from "./Particles";
import type { Mood, Category, TierConfig, AvatarCustomization } from "@/lib/avatar-state";

interface SpaceExplorerProps {
  tier: TierConfig;
  mood: Mood;
  category: Category;
  customization: AvatarCustomization;
  onMoodSettled?: () => void;
}

/** Root character component — assembles all body parts with mood-driven animation */
export function SpaceExplorer({ tier, mood, category, customization, onMoodSettled }: SpaceExplorerProps) {
  const [headTurn, setHeadTurn] = useState(0);
  const [visorBlink, setVisorBlink] = useState(false);

  // Random head turn & visor blink
  useEffect(() => {
    if (mood !== "idle" && mood !== "waiting") return;
    const headInterval = setInterval(() => {
      setHeadTurn(Math.random() > 0.5 ? (Math.random() * 6 - 3) : 0);
    }, 4000 + Math.random() * 3000);
    const blinkInterval = setInterval(() => {
      setVisorBlink(true);
      setTimeout(() => setVisorBlink(false), 150);
    }, 6000 + Math.random() * 3000);
    return () => { clearInterval(headInterval); clearInterval(blinkInterval); };
  }, [mood]);

  // Settle happy → idle after 3s
  useEffect(() => {
    if (mood === "happy") {
      const timer = setTimeout(() => onMoodSettled?.(), 3000);
      return () => clearTimeout(timer);
    }
  }, [mood, onMoodSettled]);

  const isShadow = tier.id === 0;
  const scale = tier.scale;
  const hoverHeight = tier.hoverHeight;
  const showWings = tier.id >= 4;
  const showParticles = tier.id >= 3;

  // Mood animation object (not typed as Variants to avoid framer-motion strict typing)
  const moodAnimations: Record<string, object> = {
    idle: {
      y: [0, -hoverHeight, 0],
      scaleY: 1,
      scaleX: 1,
      rotate: 0,
      transition: { y: { duration: 4, repeat: Infinity, ease: "easeInOut" as const }, scaleY: { duration: 0.3 } },
    },
    waiting: {
      y: [0, -4, 0],
      scaleY: 1,
      rotate: [0, -2, 0, 2, 0],
      transition: { y: { duration: 2, repeat: Infinity }, rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" as const } },
    },
    bored: {
      y: 10,
      scaleY: 0.95,
      rotate: -3,
      transition: { duration: 1.5, ease: [0.36, 0, 0.66, -0.56] as const },
    },
    happy: {
      y: [-40, 0],
      scaleY: [1.15, 0.85, 1],
      scaleX: [0.9, 1.1, 1],
      transition: { duration: 0.6, ease: [0.36, 0, 0.66, -0.56] as const },
    },
    excited: {
      y: [0, -6, 0],
      scaleX: [1, 1.02, 1, 0.98, 1],
      transition: { y: { duration: 0.6, repeat: Infinity }, scaleX: { duration: 0.3, repeat: Infinity } },
    },
    celebrating: {
      y: [-60, 0],
      rotate: [0, 360, 720],
      scaleY: [1.15, 0.85, 1.05, 1],
      transition: { duration: 2, ease: [0.36, 0, 0.66, -0.56] as const },
    },
    cinematic: {
      y: 0, scaleY: 1, opacity: 1,
      transition: { duration: 0.5 },
    },
  };

  const handleAnimComplete = useCallback(() => {
    if (mood === "celebrating") {
      setTimeout(() => onMoodSettled?.(), 500);
    }
  }, [mood, onMoodSettled]);

  return (
    <motion.div
      className="relative"
      style={{ width: 280 * scale, height: 420 * scale, transformOrigin: "center bottom" }}
      animate={(moodAnimations[mood] || moodAnimations.idle) as TargetAndTransition}
      onAnimationComplete={handleAnimComplete}
    >
      {/* Floor shadow / aura */}
      <Aura tier={tier} mood={mood} category={category} customization={customization} />

      {/* Wings (tier 4+) */}
      <AnimatePresence>
        {showWings && <Wings tier={tier} category={category} customization={customization} />}
      </AnimatePresence>

      {/* Character body — SVG container */}
      <svg
        viewBox="0 0 280 420"
        className="absolute inset-0 w-full h-full"
        style={{
          filter: isShadow
            ? "brightness(0.15) saturate(0)"
            : `drop-shadow(0 0 ${tier.id >= 4 ? 30 : 15}px ${getCategoryGlow(category)})`,
        }}
      >
        <defs>
          {/* Neon glow filter */}
          <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur1" />
            <feGaussianBlur stdDeviation="8" result="blur2" />
            <feGaussianBlur stdDeviation="15" result="blur3" />
            <feMerge>
              <feMergeNode in="blur3" />
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Body gradient */}
          <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="50%" stopColor="#16213e" />
            <stop offset="100%" stopColor="#0f0f23" />
          </linearGradient>

          {/* Specular highlight */}
          <linearGradient id="specular" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
          </linearGradient>

          {/* Category energy gradient */}
          <linearGradient id="energyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={getCategoryPrimary(category)} />
            <stop offset="100%" stopColor={getCategorySecondary(category)} />
          </linearGradient>

          {/* Inner shadow */}
          <filter id="innerShadow">
            <feOffset dx="0" dy="2" />
            <feGaussianBlur stdDeviation="2" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="black" floodOpacity="0.4" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
        </defs>

        {/* LEGS — y:280 to y:420 */}
        <Legs tier={tier} mood={mood} category={category} isShadow={isShadow} />

        {/* TORSO — y:140 to y:290 */}
        <Torso tier={tier} mood={mood} category={category} customization={customization} isShadow={isShadow} />

        {/* ARMS — y:160 to y:320 */}
        <Arms tier={tier} mood={mood} category={category} isShadow={isShadow} />

        {/* HELMET — y:40 to y:160 */}
        <g transform={`rotate(${headTurn}, 140, 100)`}>
          <Helmet
            tier={tier}
            mood={mood}
            category={category}
            customization={customization}
            isShadow={isShadow}
            visorBlink={visorBlink}
          />
        </g>

        {/* Tier 0 question mark */}
        {isShadow && (
          <text
            x="140" y="115"
            textAnchor="middle"
            fontSize="36"
            fontWeight="bold"
            fill="rgba(100,100,180,0.4)"
            className="animate-pulse"
          >
            ?
          </text>
        )}
      </svg>

      {/* Particles overlay */}
      {showParticles && (
        <CharacterParticles tier={tier} category={category} customization={customization} mood={mood} />
      )}
    </motion.div>
  );
}

function getCategoryGlow(cat: Category): string {
  const map = { fitness: "#FF450066", learning: "#00E5FF66", creative: "#DA70D666", mindfulness: "#2DD4BF66" };
  return map[cat];
}

function getCategoryPrimary(cat: Category): string {
  const map = { fitness: "#FF4500", learning: "#00E5FF", creative: "#DA70D6", mindfulness: "#2DD4BF" };
  return map[cat];
}

function getCategorySecondary(cat: Category): string {
  const map = { fitness: "#FF8C00", learning: "#0080FF", creative: "#FFD700", mindfulness: "#22C55E" };
  return map[cat];
}
