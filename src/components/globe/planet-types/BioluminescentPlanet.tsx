/**
 * Bioluminescent Planet
 *
 * Dark base surface with pulsing emissive vein network.
 * Deep blue pulse atmosphere.
 * Drifting glow sparkles.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function BioluminescentPlanet({ colors }: Props) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#0A0A2E"),
      roughness: 0.6,
      metalness: 0.1,
      emissive: new THREE.Color(colors[1] || "#00FFFF"),
      emissiveIntensity: 0.5,
    });
    matRef.current = mat;
    return mat;
  }, [colors]);

  // Pulsing bioluminescent glow
  useFrame((state) => {
    if (matRef.current) {
      const t = Math.sin(state.clock.elapsedTime * 1.8) * 0.3 + 0.5;
      matRef.current.emissiveIntensity = t;
    }
  });

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#00FFFF"
      atmosphereOpacity={0.4}
      sparkleCount={30}
      sparkleColor="#00FF88"
    />
  );
}
