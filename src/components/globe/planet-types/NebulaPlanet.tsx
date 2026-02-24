/**
 * Nebula Planet (Gas Giant)
 *
 * Colorful glass sphere with swirling nebula colors.
 * Pulsing glow. Saturn-like accretion disk ring system.
 */

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function NebulaPlanet({ colors }: Props) {
  const glowRef = useRef(1.2);

  // Subtle color shift pulse
  useFrame((state) => {
    glowRef.current = 1.0 + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#9B59B6"}
      secondaryColor={colors[1] || "#6B2FA0"}
      accentColor={colors[2] || "#D4A5FF"}
      atmosphereTint="#9B59B6"
      glowIntensity={glowRef.current}
      sparkleCount={20}
      sparkleColor="#D4A5FF"
      scale={1.15}
      hasRings
      ringColor={colors[0] || "#9B59B6"}
      ringSecondaryColor={colors[2] || "#D4A5FF"}
    />
  );
}
