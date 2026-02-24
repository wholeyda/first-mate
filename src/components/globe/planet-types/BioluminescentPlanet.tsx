/**
 * Bioluminescent Planet
 *
 * Dark navy glass sphere with vivid cyan/green bioluminescent swirls.
 * Strong pulsing glow. Cyan atmosphere.
 */

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function BioluminescentPlanet({ colors }: Props) {
  const glowRef = useRef(2.0);

  // Bioluminescent pulse
  useFrame((state) => {
    glowRef.current = 1.5 + Math.sin(state.clock.elapsedTime * 1.8) * 0.5;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#0A0A2E"}
      secondaryColor={colors[1] || "#00FFFF"}
      accentColor="#00FF88"
      atmosphereTint="#00FFFF"
      glowIntensity={glowRef.current}
      sparkleCount={30}
      sparkleColor="#00FF88"
    />
  );
}
