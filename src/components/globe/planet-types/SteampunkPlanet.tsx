/**
 * Steampunk Planet
 *
 * Metallic bronze surface with high metalness.
 * Steam puff atmosphere. Counter-rotating gear ring.
 * Golden sparkles.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function SteampunkPlanet({ colors }: Props) {
  const gearRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#B87333").multiplyScalar(0.2),
      roughness: 0.3,
      metalness: 0.85,
      emissive: new THREE.Color(colors[1] || "#8B6914"),
      emissiveIntensity: 0.15,
    });
  }, [colors]);

  // Counter-rotating gear ring
  useFrame((_, delta) => {
    if (gearRef.current) {
      gearRef.current.rotation.z -= Math.min(delta, 0.1) * 0.6;
    }
  });

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#C8A882"
      atmosphereOpacity={0.25}
      sparkleCount={15}
      sparkleColor="#FFD700"
      hasRings
      ringColor={colors[2] || "#B87333"}
      coronaColor="#FFD700"
      glowColor="#C8A882"
    >
      {/* Gear ring (toroidal) */}
      <mesh ref={gearRef} rotation={[Math.PI * 0.45, 0, 0]}>
        <torusGeometry args={[PLANET_RADIUS * 1.7, PLANET_RADIUS * 0.06, 8, 24]} />
        <meshStandardMaterial
          color="#B87333"
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
    </BasePlanet>
  );
}
