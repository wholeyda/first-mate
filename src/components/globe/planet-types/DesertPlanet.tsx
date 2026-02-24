/**
 * Desert Planet
 *
 * Sandy glass sphere with warm tan swirls.
 * Dusty atmosphere. Ring system like debris belt.
 */

"use client";

import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function DesertPlanet({ colors }: Props) {
  return (
    <BasePlanet
      primaryColor={colors[0] || "#D4A574"}
      secondaryColor={colors[1] || "#C8956E"}
      accentColor="#E8C89E"
      atmosphereTint="#D4A574"
      glowIntensity={0.7}
      hasRings
      ringColor={colors[1] || "#C8956E"}
      ringSecondaryColor="#E8C89E"
    />
  );
}
