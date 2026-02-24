/**
 * Tropical Planet
 *
 * Green landmasses over blue ocean.
 * Thin white-blue atmosphere. Cloud wisps.
 * Seabird trail sparkles.
 */

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function TropicalPlanet({ colors }: Props) {
  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#2E86C1"),
      roughness: 0.7,
      metalness: 0.0,
      emissive: new THREE.Color(colors[1] || "#1A5276"),
      emissiveIntensity: 0.2,
    });
  }, [colors]);

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#87CEEB"
      atmosphereOpacity={0.25}
      sparkleCount={10}
      sparkleColor="#FFFFFF"
    >
      {/* Cloud wisps — semi-transparent shell slightly offset */}
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.03, 24, 24]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
    </BasePlanet>
  );
}
