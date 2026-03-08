/**
 * Garden Planet
 *
 * Lush green glass sphere with pink flower-like swirls.
 * Pulsing golden glow for bloom effect.
 * Per-instance variation via seed: scale, pulse rate, axis tilt.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BasePlanet } from "./BasePlanet";
import { makePlanetRng } from "../planetSeed";

interface Props {
  colors: string[];
  seed?: number;
}

export function GardenPlanet({ colors, seed = 0 }: Props) {
  const glowRef = useRef(0.9);

  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.87, 1.12),
      animSpeed:  rng.float(0.8, 1.5),
      axisTilt:   [rng.float(-0.15, 0.15), 0, rng.float(-0.1, 0.1)] as [number, number, number],
      pulseFreq:  rng.float(1.5, 3.0),
      pulseAmp:   rng.float(0.1, 0.3),
      baseGlow:   rng.float(0.55, 0.85),
      hasMoon:    rng.bool(0.25),
      moonColor:  rng.pick(["#FFD700", "#FF69B4", "#98FB98"]),
      moonSize:   rng.float(0.10, 0.16),
      moonDist:   rng.float(1.9, 2.5),
      moonOrbit:  rng.float(0.5, 1.1),
      moonTilt:   rng.float(0, Math.PI * 0.2),
    };
  }, [seed]);

  // Pulse flower bloom glow
  useFrame((state) => {
    glowRef.current = v.baseGlow + Math.sin(state.clock.elapsedTime * v.pulseFreq) * v.pulseAmp;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#4CAF50"}
      secondaryColor={colors[1] || "#FF69B4"}
      accentColor="#FFD700"
      atmosphereTint="#FFD700"
      glowIntensity={glowRef.current}
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
