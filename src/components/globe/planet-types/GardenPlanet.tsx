/**
 * Garden Planet
 *
 * Lush green glass sphere with pink flower-like swirls.
 * Pulsing golden glow for bloom effect.
 */

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function GardenPlanet({ colors }: Props) {
  const glowRef = useRef(0.9);

  // Pulse flower bloom glow
  useFrame((state) => {
    glowRef.current = 0.7 + Math.sin(state.clock.elapsedTime * 2.0) * 0.2;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#4CAF50"}
      secondaryColor={colors[1] || "#FF69B4"}
      accentColor="#FFD700"
      atmosphereTint="#FFD700"
      glowIntensity={glowRef.current}
    />
  );
}
