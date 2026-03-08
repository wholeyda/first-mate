/**
 * Bioluminescent Planet
 *
 * Dark navy glass sphere with vivid cyan/green bioluminescent swirls.
 * Strong pulsing glow. Cyan atmosphere.
 * Per-instance variation via seed: scale, pulse pattern, axis tilt.
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

export function BioluminescentPlanet({ colors, seed = 0 }: Props) {
  const glowRef = useRef(2.0);

  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.88, 1.14),
      animSpeed:  rng.float(1.0, 2.0),    // bio-luminescence is frenetic
      axisTilt:   [rng.float(-0.3, 0.3), 0, rng.float(-0.15, 0.15)] as [number, number, number],
      pulseFreq:  rng.float(1.2, 2.8),
      pulseAmp:   rng.float(0.3, 0.7),
      baseGlow:   rng.float(1.3, 1.8),
      hasMoon:    rng.bool(0.2),          // rare — dark worlds rarely have visible moons
      moonColor:  rng.pick(["#00FFFF", "#00FF88", "#0088ff"]),
      moonSize:   rng.float(0.09, 0.15),
      moonDist:   rng.float(1.8, 2.5),
      moonOrbit:  rng.float(0.6, 1.4),
      moonTilt:   rng.float(0, Math.PI * 0.4),
    };
  }, [seed]);

  // Bioluminescent pulse
  useFrame((state) => {
    glowRef.current = v.baseGlow + Math.sin(state.clock.elapsedTime * v.pulseFreq) * v.pulseAmp;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#0A0A2E"}
      secondaryColor={colors[1] || "#00FFFF"}
      accentColor="#00FF88"
      atmosphereTint="#00FFFF"
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
