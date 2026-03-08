/**
 * Volcanic Planet
 *
 * Dark basalt glass sphere with glowing orange lava swirls.
 * Pulsing glow intensity. Red-orange atmosphere.
 * Per-instance variation via seed: scale, spin speed, axis tilt, optional moon.
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

export function VolcanicPlanet({ colors, seed = 0 }: Props) {
  const glowRef = useRef(1.4);

  // Derive per-instance variation from seed (deterministic)
  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.88, 1.14),
      animSpeed:  rng.float(0.8, 1.6),   // faster = more turbulent lava
      axisTilt:   [rng.float(-0.28, 0.28), 0, rng.float(-0.15, 0.15)] as [number, number, number],
      pulseFreq:  rng.float(1.1, 2.0),   // lava pulse rate
      pulseAmp:   rng.float(0.2, 0.45),  // lava pulse magnitude
      hasMoon:    rng.bool(0.6),          // 60% chance — volcanic worlds often have debris moons
      moonColor:  rng.pick(["#5a5a5a", "#7a4a3a", "#3a3a3a", "#8a6a5a"]),
      moonSize:   rng.float(0.13, 0.22),
      moonDist:   rng.float(1.9, 2.6),
      moonOrbit:  rng.float(0.5, 1.2),
      moonTilt:   rng.float(0, Math.PI * 0.35),
    };
  }, [seed]);

  // Pulse lava glow — rate varies per planet
  useFrame((state) => {
    glowRef.current = 1.1 + Math.sin(state.clock.elapsedTime * v.pulseFreq) * v.pulseAmp;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#2a0a00"}
      secondaryColor={colors[1] || "#FF4500"}
      accentColor="#FF8800"
      atmosphereTint="#FF4500"
      glowIntensity={glowRef.current}
      detail={48}
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
