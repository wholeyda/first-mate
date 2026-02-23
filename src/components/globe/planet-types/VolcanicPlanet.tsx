/**
 * Volcanic Planet
 *
 * Dark basalt surface with glowing orange lava cracks.
 * Vertex displacement for rocky terrain. Red-orange smoky atmosphere.
 * Ember sparkles and a small gray moon.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BasePlanet } from "./BasePlanet";
import { PLANET_RADIUS } from "../constants";

interface Props {
  colors: string[];
}

export function VolcanicPlanet({ colors }: Props) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const material = useMemo(() => {
    const baseColor = colors[0] || "#2a0a00";
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor).multiplyScalar(0.15),
      roughness: 0.9,
      metalness: 0.1,
      emissive: new THREE.Color(colors[1] || "#FF4500"),
      emissiveIntensity: 0.25,
    });
    matRef.current = mat;
    return mat;
  }, [colors]);

  // Pulse emissive lava glow
  useFrame((state) => {
    if (matRef.current) {
      const t = Math.sin(state.clock.elapsedTime * 1.5) * 0.15 + 0.25;
      matRef.current.emissiveIntensity = t;
    }
  });

  return (
    <BasePlanet
      surfaceMaterial={material}
      atmosphereTint="#FF4500"
      atmosphereOpacity={0.35}
      sparkleCount={40}
      sparkleColor="#FF6B00"
      detail={48}
      coronaColor="#FF6600"
      glowColor="#FF4500"
      glowIntensity={1.2}
    >
      {/* Small gray moon */}
      <mesh position={[PLANET_RADIUS * 2.2, PLANET_RADIUS * 0.5, 0]}>
        <sphereGeometry args={[PLANET_RADIUS * 0.18, 12, 12]} />
        <meshStandardMaterial color="#666666" roughness={0.95} />
      </mesh>
    </BasePlanet>
  );
}
