/**
 * Tropical Planet
 *
 * Ocean blue glass sphere with deep water swirls.
 * Semi-transparent cloud wisps overlay. Sky blue atmosphere.
 * Per-instance variation via seed: scale, anim speed, axis tilt, cloud opacity.
 */

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";
import { makePlanetRng } from "../planetSeed";

interface Props {
  colors: string[];
  seed?: number;
}

export function TropicalPlanet({ colors, seed = 0 }: Props) {
  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:        rng.float(0.88, 1.14),
      animSpeed:    rng.float(0.7, 1.3),
      axisTilt:     [rng.float(-0.2, 0.2), 0, rng.float(-0.12, 0.12)] as [number, number, number],
      cloudOpacity: rng.float(0.06, 0.22),   // how cloudy this world is
      hasMoon:      rng.bool(0.4),
      moonColor:    rng.pick(["#ccddee", "#aabbcc", "#ddeeff"]),
      moonSize:     rng.float(0.12, 0.2),
      moonDist:     rng.float(2.0, 2.7),
      moonOrbit:    rng.float(0.4, 0.9),
      moonTilt:     rng.float(0, Math.PI * 0.3),
    };
  }, [seed]);

  return (
    <BasePlanet
      primaryColor={colors[0] || "#2E86C1"}
      secondaryColor={colors[1] || "#1A5276"}
      accentColor="#87CEEB"
      atmosphereTint="#87CEEB"
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
    >
      {/* Cloud wisps */}
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.03, 24, 24]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={v.cloudOpacity}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </BasePlanet>
  );
}
