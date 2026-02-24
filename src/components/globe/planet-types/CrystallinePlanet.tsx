/**
 * Crystalline Planet
 *
 * Low-poly glass sphere with iridescent crystal shards orbiting.
 * Bright white sparkles for crystalline shimmer.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function CrystallinePlanet({ colors }: Props) {
  const shardsRef = useRef<THREE.Group>(null);

  // 3 orbiting crystal shard positions
  const shardPositions = useMemo(() => {
    return [0, 1, 2].map((i) => {
      const angle = (i / 3) * Math.PI * 2;
      const dist = PLANET_RADIUS * 1.8;
      return [Math.cos(angle) * dist, 0, Math.sin(angle) * dist] as [number, number, number];
    });
  }, []);

  // Rotate shard group
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (shardsRef.current) {
      shardsRef.current.rotation.y += dt * 0.5;
      shardsRef.current.rotation.x += dt * 0.2;
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
    >
      {/* Orbiting crystal shards */}
      <group ref={shardsRef}>
        {shardPositions.map((pos, i) => (
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
