/**
 * Nebula Planet (Gas Giant)
 *
 * Colorful glass sphere with swirling nebula colors.
 * Pulsing glow. Saturn-like accretion disk ring system.
 * Per-instance variation via seed: scale, ring tilt, pulse rate, axis tilt.
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

export function NebulaPlanet({ colors, seed = 0 }: Props) {
  const glowRef = useRef(1.2);

  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(1.0, 1.3),
      animSpeed:  rng.float(0.4, 0.9),
      axisTilt:   [rng.float(-0.4, 0.4), 0, rng.float(-0.2, 0.2)] as [number, number, number],
      ringTiltX:  rng.float(0.05, 0.35),
      ringTiltZ:  rng.float(0.1, 0.5),
      pulseFreq:  rng.float(0.3, 0.8),
      pulseAmp:   rng.float(0.1, 0.3),
      hasMoon:    rng.bool(0.45),
      moonColor:  rng.pick(["#9B59B6", "#D4A5FF", "#6B2FA0", "#ccaaff"]),
      moonSize:   rng.float(0.14, 0.20),
      moonDist:   rng.float(3.2, 4.2),
      moonOrbit:  rng.float(0.3, 0.7),
      moonTilt:   rng.float(0, Math.PI * 0.5),
    };
  }, [seed]);

  useFrame((state) => {
    glowRef.current = 1.0 + Math.sin(state.clock.elapsedTime * v.pulseFreq) * v.pulseAmp;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#9B59B6"}
      secondaryColor={colors[1] || "#6B2FA0"}
      accentColor={colors[2] || "#D4A5FF"}
      atmosphereTint="#9B59B6"
      glowIntensity={glowRef.current}
      scale={v.scale}
      animationSpeed={v.animSpeed}
      axisTilt={v.axisTilt}
      hasRings
      ringTilt={[Math.PI * v.ringTiltX, 0, Math.PI * v.ringTiltZ]}
      ringColor={colors[0] || "#9B59B6"}
      ringSecondaryColor={colors[2] || "#D4A5FF"}
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
