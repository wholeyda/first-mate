/**
 * Forest Planet
 *
 * Deep green canopy across the surface.
 * Misty white-green fog atmosphere.
 * Firefly sparkles.
 */

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function ForestPlanet({ colors }: Props) {
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#1E6B34").multiplyScalar(0.2),
      roughness: 0.85,
      metalness: 0.0,
      emissive: new THREE.Color(colors[1] || "#0D4F1C"),
      emissiveIntensity: 0.15,
    });
  }, [colors]);

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#90EE90"
      atmosphereOpacity={0.3}
      sparkleCount={20}
      sparkleColor="#BFFF00"
      coronaColor="#90EE90"
      glowColor="#1E6B34"
    />
  );
}
