/**
 * Arctic Planet
 *
 * White/ice-blue surface with frost overlay.
 * Pale aurora borealis-like atmosphere.
 * Snowflake sparkles. Ice ring.
 */

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";

interface Props {
  colors: string[];
}

export function ArcticPlanet({ colors }: Props) {
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#D6EAF8").multiplyScalar(0.25),
      roughness: 0.8,
      metalness: 0.0,
      emissive: new THREE.Color(colors[1] || "#A0D4FF"),
      emissiveIntensity: 0.15,
    });
  }, [colors]);

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#A0D4FF"
      atmosphereOpacity={0.3}
      sparkleCount={35}
      sparkleColor="#FFFFFF"
      hasRings
      ringColor={colors[2] || "#CCE5FF"}
      coronaColor="#B0E0FF"
      glowColor="#A0D4FF"
      glowIntensity={0.9}
    />
  );
}
