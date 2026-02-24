/**
 * Nebula Planet (Gas Giant)
 *
 * Colorful banded surface with swirling cloud patterns.
 * Thick multi-layer atmosphere. Saturn-like ring system.
 * Occasional lightning flashes as sparkles.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function NebulaPlanet({ colors }: Props) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#9B59B6"),
      roughness: 0.6,
      metalness: 0.0,
      emissive: new THREE.Color(colors[1] || "#6B2FA0"),
      emissiveIntensity: 0.4,
    });
    matRef.current = mat;
    return mat;
  }, [colors]);

  // Subtle color shift
  useFrame((state) => {
    if (matRef.current) {
      const t = Math.sin(state.clock.elapsedTime * 0.5) * 0.1 + 0.4;
      matRef.current.emissiveIntensity = t;
    }
  });

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#9B59B6"
      atmosphereOpacity={0.5}
      sparkleCount={20}
      sparkleColor="#D4A5FF"
      scale={1.15}
      hasRings
      ringColor={colors[2] || "#D4A5FF"}
    />
  );
}
