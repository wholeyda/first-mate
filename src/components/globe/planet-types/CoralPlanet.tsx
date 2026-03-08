/**
 * Coral Planet
 *
 * Warm coral pink glass sphere with organic swirls.
 * Pink sparkles. High detail geometry.
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

export function CoralPlanet({ colors, seed = 0 }: Props) {
  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.86, 1.13),
      animSpeed:  rng.float(0.7, 1.3),
      axisTilt:   [rng.float(-0.22, 0.22), 0, rng.float(-0.12, 0.12)] as [number, number, number],
      glowBase:   rng.float(0.75, 1.25),
      hasMoon:    rng.bool(0.3),
      moonColor:  rng.pick(["#FFB6C1", "#FF9999", "#ffccdd"]),
      moonSize:   rng.float(0.10, 0.17),
      moonDist:   rng.float(1.9, 2.6),
      moonOrbit:  rng.float(0.45, 1.0),
      moonTilt:   rng.float(0, Math.PI * 0.3),
    };
  }, [seed]);

  return (
    <BasePlanet
      primaryColor={colors[0] || "#FF7F7F"}
      secondaryColor={colors[1] || "#FF6B6B"}
      accentColor="#FFB6C1"
      atmosphereTint="#FF7F7F"
      glowIntensity={v.glowBase}
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
