/**
 * Desert Planet
 *
 * Sandy tan surface with dune ridges.
 * Dusty orange-brown atmosphere.
 * Ring of dust/debris. Sand particle sparkles with lateral drift.
 */

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function DesertPlanet({ colors }: Props) {
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#D4A574"),
      roughness: 0.95,
      metalness: 0.0,
      emissive: new THREE.Color(colors[1] || "#C8956E"),
      emissiveIntensity: 0.15,
    });
  }, [colors]);

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#D4A574"
      atmosphereOpacity={0.4}
      sparkleCount={25}
      sparkleColor="#E8C89E"
      hasRings
      ringColor={colors[2] || "#C8956E"}
    />
  );
}
