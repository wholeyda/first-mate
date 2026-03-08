/**
 * Desert Planet
 *
 * Sandy glass sphere with warm tan swirls.
 * Dusty atmosphere. Ring system like debris belt.
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

export function DesertPlanet({ colors, seed = 0 }: Props) {
  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.88, 1.15),
      animSpeed:  rng.float(0.6, 1.2),
      axisTilt:   [rng.float(0.1, 0.55), 0, rng.float(-0.1, 0.1)] as [number, number, number],
      ringTiltX:  rng.float(0.3, 0.6),
      ringTiltZ:  rng.float(-0.1, 0.1),
      hasMoon:    rng.bool(0.3),
      moonColor:  rng.pick(["#c9a07a", "#a87850", "#e8c89e"]),
      moonSize:   rng.float(0.1, 0.18),
      moonDist:   rng.float(2.0, 2.8),
      moonOrbit:  rng.float(0.4, 0.9),
      moonTilt:   rng.float(0, Math.PI * 0.25),
    };
  }, [seed]);

  return (
    <BasePlanet
      primaryColor={colors[0] || "#D4A574"}
      secondaryColor={colors[1] || "#C8956E"}
      accentColor="#E8C89E"
      atmosphereTint="#D4A574"
      glowIntensity={0.7}
      scale={v.scale}
      animationSpeed={v.animSpeed}
      axisTilt={v.axisTilt}
      hasRings
      ringTilt={[Math.PI * v.ringTiltX, 0, Math.PI * v.ringTiltZ]}
      ringColor={colors[1] || "#C8956E"}
      ringSecondaryColor="#E8C89E"
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
