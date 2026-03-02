/**
 * Steampunk Planet
 *
 * Bronze glass sphere with golden swirls and metallic sheen.
 * Counter-rotating gear torus. Ring system.
 */

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function SteampunkPlanet({ colors }: Props) {
  const gearRef = useRef<THREE.Mesh>(null);

  // Counter-rotate gear
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (gearRef.current) {
      gearRef.current.rotation.z -= dt * 0.6;
    }
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#B87333"}
      secondaryColor={colors[1] || "#8B6914"}
      accentColor="#FFD700"
      atmosphereTint="#C8A882"
      glowIntensity={0.9}
      hasRings
      ringTilt={[0, 0, Math.PI * 0.45]}
      ringColor={colors[0] || "#B87333"}
      ringSecondaryColor="#FFD700"
    >
      {/* Counter-rotating gear ring */}
      <mesh
        ref={gearRef}
        rotation={[Math.PI * 0.45, 0, 0]}
      >
        <torusGeometry args={[PLANET_RADIUS * 1.7, PLANET_RADIUS * 0.06, 8, 24]} />
        <meshStandardMaterial color="#B87333" roughness={0.3} metalness={0.9} />
      </mesh>
    </BasePlanet>
  );
}
