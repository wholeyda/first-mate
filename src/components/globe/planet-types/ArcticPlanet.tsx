/**
 * Arctic Planet
 *
 * Pale ice-blue glass sphere with frosty swirls.
 * High sparkle count for snowflake effect. Ice ring system.
 */

"use client";

import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function ArcticPlanet({ colors }: Props) {
  return (
    <BasePlanet
      primaryColor={colors[0] || "#D6EAF8"}
      secondaryColor={colors[1] || "#A0D4FF"}
      accentColor="#FFFFFF"
      atmosphereTint="#A0D4FF"
      glowIntensity={1.0}
      hasRings
      ringColor="#CCE5FF"
      ringSecondaryColor="#FFFFFF"
    />
  );
}
