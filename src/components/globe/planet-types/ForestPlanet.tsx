/**
 * Forest Planet
 *
 * Deep green glass sphere with canopy-like swirls.
 * Lime green sparkles. Light green atmosphere.
 * Per-instance variation via seed: scale, anim speed, axis tilt, optional moon.
 */

"use client";

import { useMemo } from "react";
import { BasePlanet } from "./BasePlanet";
import { makePlanetRng } from "../planetSeed";

interface Props {
  colors: string[];
  seed?: number;
}

export function ForestPlanet({ colors, seed = 0 }: Props) {
  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.88, 1.14),
      animSpeed:  rng.float(0.6, 1.2),
      axisTilt:   [rng.float(-0.18, 0.18), 0, rng.float(-0.1, 0.1)] as [number, number, number],
      hasMoon:    rng.bool(0.3),
      moonColor:  rng.pick(["#90EE90", "#5a8a5a", "#aaddaa"]),
      moonSize:   rng.float(0.11, 0.18),
      moonDist:   rng.float(1.9, 2.6),
      moonOrbit:  rng.float(0.4, 1.0),
      moonTilt:   rng.float(0, Math.PI * 0.25),
    };
  }, [seed]);

  return (
    <BasePlanet
      primaryColor={colors[0] || "#1E6B34"}
      secondaryColor={colors[1] || "#0D4F1C"}
      accentColor="#BFFF00"
      atmosphereTint="#90EE90"
      glowIntensity={0.8}
      scale={v.scale}
      animationSpeed={v.animSpeed}
      axisTilt={v.axisTilt}
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
