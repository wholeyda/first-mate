/**
 * Garden Planet
 *
 * Lush greens with soft rolling terrain and emissive flower highlights.
 * Soft golden glow atmosphere.
 * Petal/pollen sparkles.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function GardenPlanet({ colors }: Props) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#4CAF50").multiplyScalar(0.2),
      roughness: 0.7,
      metalness: 0.0,
      emissive: new THREE.Color(colors[1] || "#FF69B4"),
      emissiveIntensity: 0.15,
    });
    matRef.current = mat;
    return mat;
  }, [colors]);

  // Gentle emissive pulsing (flowers blooming)
  useFrame((state) => {
    if (matRef.current) {
      const t = Math.sin(state.clock.elapsedTime * 2.0) * 0.08 + 0.15;
      matRef.current.emissiveIntensity = t;
    }
  });

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#FFD700"
      atmosphereOpacity={0.2}
      sparkleCount={25}
      sparkleColor="#FFB6C1"
      coronaColor="#FFD700"
      glowColor="#FF69B4"
    />
  );
}
