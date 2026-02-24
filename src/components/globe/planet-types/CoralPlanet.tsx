/**
 * Coral Planet
 *
 * Warm pinks/oranges with bumpy coral-like texture.
 * Warm haze atmosphere with caustic shimmer.
 * Bubble particles floating up.
 */

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function CoralPlanet({ colors }: Props) {
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#FF7F7F"),
      roughness: 0.75,
      metalness: 0.0,
      emissive: new THREE.Color(colors[1] || "#FF6B6B"),
      emissiveIntensity: 0.3,
    });
  }, [colors]);

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#FF7F7F"
      atmosphereOpacity={0.3}
      sparkleCount={20}
      sparkleColor="#FFB6C1"
      detail={24}
    />
  );
}
