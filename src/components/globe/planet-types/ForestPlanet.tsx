/**
 * Forest Planet
 *
 * Deep green glass sphere with canopy-like swirls.
 * Lime green sparkles. Light green atmosphere.
 */

"use client";

import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function ForestPlanet({ colors }: Props) {
  return (
    <BasePlanet
      primaryColor={colors[0] || "#1E6B34"}
      secondaryColor={colors[1] || "#0D4F1C"}
      accentColor="#BFFF00"
      atmosphereTint="#90EE90"
      glowIntensity={0.8}
      sparkleCount={20}
      sparkleColor="#BFFF00"
    />
  );
}
