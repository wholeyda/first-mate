/**
 * Crystalline Planet
 *
 * Low-poly icosahedron with high metalness and iridescent sheen.
 * Thin rainbow halo atmosphere. Prismatic sparkles.
 * Orbiting crystal shard fragments.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function CrystallinePlanet({ colors }: Props) {
  const shardGroupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(colors[0] || "#E0E0FF"),
      roughness: 0.05,
      metalness: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      iridescence: 1.0,
      iridescenceIOR: 1.5,
      emissive: new THREE.Color("#8888FF"),
      emissiveIntensity: 0.3,
    });
  }, [colors]);

  // Spin crystal shards
  useFrame((_, delta) => {
    if (shardGroupRef.current) {
      shardGroupRef.current.rotation.y += Math.min(delta, 0.1) * 0.5;
      shardGroupRef.current.rotation.x += Math.min(delta, 0.1) * 0.2;
    }
  });

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#E0E0FF"
      atmosphereOpacity={0.2}
      sparkleCount={30}
      sparkleColor="#FFFFFF"
      lowPoly
      detail={2}
    >
      {/* Orbiting crystal shards */}
      <group ref={shardGroupRef}>
        {[0, 1, 2].map((i) => {
          const angle = (i / 3) * Math.PI * 2;
          const dist = PLANET_RADIUS * 1.8;
          return (
            <Float key={i} speed={2} rotationIntensity={2} floatIntensity={0.5}>
              <mesh
                position={[
                  Math.cos(angle) * dist,
                  Math.sin(angle * 1.3) * dist * 0.3,
                  Math.sin(angle) * dist,
                ]}
              >
                <octahedronGeometry args={[PLANET_RADIUS * 0.1, 0]} />
                <meshPhysicalMaterial
                  color={colors[1] || "#CCDDFF"}
                  roughness={0.05}
                  metalness={0.9}
                  iridescence={1.0}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            </Float>
          );
        })}
      </group>
    </BasePlanet>
  );
}
