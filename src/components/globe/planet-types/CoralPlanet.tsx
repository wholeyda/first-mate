/**
 * Coral Planet
 *
 * Warm coral pink glass sphere with organic swirls.
 * Pink sparkles. High detail geometry.
 */

"use client";

import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function CoralPlanet({ colors }: Props) {
  return (
    <BasePlanet
      primaryColor={colors[0] || "#FF7F7F"}
      secondaryColor={colors[1] || "#FF6B6B"}
      accentColor="#FFB6C1"
      atmosphereTint="#FF7F7F"
      glowIntensity={1.0}
      sparkleCount={20}
      sparkleColor="#FFB6C1"
    />
  );
}
