/**
 * Steampunk Planet
 *
 * Bronze glass sphere with golden swirls and metallic sheen.
 * Counter-rotating gear torus. Ring system.
 * Per-instance variation via seed: scale, gear speed, ring tilt, axis tilt.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";
import { makePlanetRng } from "../planetSeed";

interface Props {
  colors: string[];
  seed?: number;
}

export function SteampunkPlanet({ colors, seed = 0 }: Props) {
  const gearRef = useRef<THREE.Mesh>(null);

  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    return {
      scale:      rng.float(0.9, 1.15),
      animSpeed:  rng.float(0.7, 1.4),
      axisTilt:   [rng.float(-0.2, 0.2), 0, rng.float(-0.15, 0.15)] as [number, number, number],
      ringTiltY:  rng.float(0, 0.15),
      ringTiltZ:  rng.float(0.3, 0.6),
      gearSpeed:  rng.float(0.4, 1.0),    // gear rotation speed
      gearTiltX:  rng.float(0.35, 0.55),
      gearRadius: rng.float(1.5, 2.0),    // gear ring radius multiplier
    };
  }, [seed]);

  // Counter-rotate gear
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (gearRef.current) {
      gearRef.current.rotation.z -= dt * v.gearSpeed;
    }
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#B87333"}
      secondaryColor={colors[1] || "#8B6914"}
      accentColor="#FFD700"
      atmosphereTint="#C8A882"
      glowIntensity={0.9}
      scale={v.scale}
      animationSpeed={v.animSpeed}
      axisTilt={v.axisTilt}
      hasRings
      ringTilt={[0, Math.PI * v.ringTiltY, Math.PI * v.ringTiltZ]}
      ringColor={colors[0] || "#B87333"}
      ringSecondaryColor="#FFD700"
    >
      {/* Counter-rotating gear ring */}
      <mesh
        ref={gearRef}
        rotation={[Math.PI * v.gearTiltX, 0, 0]}
      >
        <torusGeometry args={[PLANET_RADIUS * v.gearRadius, PLANET_RADIUS * 0.06, 8, 24]} />
        <meshStandardMaterial color="#B87333" roughness={0.3} metalness={0.9} />
      </mesh>
    </BasePlanet>
  );
}
