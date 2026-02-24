/**
 * Volcanic Planet
 *
 * Dark basalt glass sphere with glowing orange lava swirls.
 * Pulsing glow intensity. Red-orange atmosphere. Small gray moon.
 */

"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function VolcanicPlanet({ colors }: Props) {
  const glowRef = useRef(1.4);

  // Pulse lava glow
  useFrame((state) => {
    glowRef.current = 1.1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.3;
  });

  return (
    <BasePlanet
      primaryColor={colors[0] || "#2a0a00"}
      secondaryColor={colors[1] || "#FF4500"}
      accentColor="#FF8800"
      atmosphereTint="#FF4500"
      glowIntensity={glowRef.current}
      detail={48}
    >
      {/* Small gray moon */}
      <mesh position={[PLANET_RADIUS * 2.2, PLANET_RADIUS * 0.5, 0]}>
        <sphereGeometry args={[PLANET_RADIUS * 0.18, 12, 12]} />
        <meshStandardMaterial color="#666666" roughness={0.95} />
      </mesh>
    </BasePlanet>
  );
}
