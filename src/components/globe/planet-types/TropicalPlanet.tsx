/**
 * Tropical Planet
 *
 * Ocean blue glass sphere with deep water swirls.
 * Semi-transparent cloud wisps overlay. Sky blue atmosphere.
 */

"use client";

import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function TropicalPlanet({ colors }: Props) {
  return (
    <BasePlanet
      primaryColor={colors[0] || "#2E86C1"}
      secondaryColor={colors[1] || "#1A5276"}
      accentColor="#87CEEB"
      atmosphereTint="#87CEEB"
      glowIntensity={0.8}
    >
      {/* Cloud wisps */}
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.03, 24, 24]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </BasePlanet>
  );
}
