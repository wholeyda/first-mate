/**
 * Arctic Planet
 *
 * Pale ice-blue glass sphere with frosty swirls.
 * High sparkle count for snowflake effect. Ice ring system.
 * Per-instance variation via seed: scale, ring tilt, axis tilt, optional moon.
 */

"use client";

import { useMemo } from "react";
import { BasePlanet } from "./BasePlanet";
import { makePlanetRng } from "../planetSeed";

interface Props {
  colors: string[];
  seed?: number;
}

export function ArcticPlanet({ colors, seed = 0 }: Props) {
  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.85, 1.12),
      animSpeed:  rng.float(0.5, 1.0),
      axisTilt:   [rng.float(0.2, 0.7), rng.float(0.1, 0.35), 0] as [number, number, number],
      ringTiltX:  rng.float(0.35, 0.65),
      ringTiltY:  rng.float(0.1, 0.4),
      hasMoon:    rng.bool(0.35),
      moonColor:  rng.pick(["#cce5ff", "#ffffff", "#a0d4ff"]),
      moonSize:   rng.float(0.11, 0.19),
      moonDist:   rng.float(2.1, 2.9),
      moonOrbit:  rng.float(0.3, 0.8),
      moonTilt:   rng.float(0, Math.PI * 0.4),
    };
  }, [seed]);

  return (
    <BasePlanet
      primaryColor={colors[0] || "#D6EAF8"}
      secondaryColor={colors[1] || "#A0D4FF"}
      accentColor="#FFFFFF"
      atmosphereTint="#A0D4FF"
      glowIntensity={1.0}
      scale={v.scale}
      animationSpeed={v.animSpeed}
      axisTilt={v.axisTilt}
      hasRings
      ringTilt={[Math.PI * v.ringTiltX, Math.PI * v.ringTiltY, 0]}
      ringColor="#CCE5FF"
      ringSecondaryColor="#FFFFFF"
      moon={v.hasMoon ? {
        color:      v.moonColor,
        size:       v.moonSize,
        distance:   v.moonDist,
        orbitSpeed: v.moonOrbit,
        orbitTilt:  v.moonTilt,
      } : undefined}
    />
  );
}
