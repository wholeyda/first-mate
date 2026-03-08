/**
 * Crystalline Planet
 *
 * Low-poly glass sphere with iridescent crystal shards orbiting.
 * Bright white sparkles for crystalline shimmer.
 * Per-instance variation via seed: scale, shard count/speed, axis tilt.
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

export function CrystallinePlanet({ colors, seed = 0 }: Props) {
  const shardsRef = useRef<THREE.Group>(null);

  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    const shardCount = rng.int(2, 5);           // 2–5 shards
    const orbitDist  = rng.float(1.6, 2.1);     // how far out shards orbit
    const spinSpeedY = rng.float(0.3, 0.8);
    const spinSpeedX = rng.float(0.1, 0.35);
    return {
      scale:      rng.float(0.85, 1.12),
      axisTilt:   [rng.float(-0.2, 0.2), 0, rng.float(-0.12, 0.12)] as [number, number, number],
      shardCount,
      orbitDist,
      spinSpeedY,
      spinSpeedX,
      shardPositions: Array.from({ length: shardCount }, (_, i) => {
        const angle = (i / shardCount) * Math.PI * 2;
        const dist  = PLANET_RADIUS * orbitDist;
        return [Math.cos(angle) * dist, 0, Math.sin(angle) * dist] as [number, number, number];
      }),
    };
  }, [seed]);

  // Rotate shard group
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (shardsRef.current) {
      shardsRef.current.rotation.y += dt * v.spinSpeedY;
      shardsRef.current.rotation.x += dt * v.spinSpeedX;
    }
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#E0E0FF"}
      secondaryColor="#8888FF"
      accentColor="#FFFFFF"
      atmosphereTint="#E0E0FF"
      glowIntensity={1.0}
      lowPoly
      detail={2}
      scale={v.scale}
      axisTilt={v.axisTilt}
    >
      {/* Orbiting crystal shards */}
      <group ref={shardsRef}>
        {v.shardPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <octahedronGeometry args={[PLANET_RADIUS * 0.1, 0]} />
            <meshPhysicalMaterial
              color="#CCDDFF"
              metalness={0.9}
              roughness={0.05}
              iridescence={1.0}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    </BasePlanet>
  );
}
