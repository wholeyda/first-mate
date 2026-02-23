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
      color: new THREE.Color(baseColor).multiplyScalar(0.3),
      roughness: 0.9,
      metalness: 0.1,
      emissive: new THREE.Color(colors[1] || "#FF4500"),
      emissiveIntensity: 0.6,
    });
    matRef.current = mat;
    return mat;
  }, [colors]);

  // Pulse emissive lava glow
  useFrame((state) => {
    if (matRef.current) {
      const t = Math.sin(state.clock.elapsedTime * 1.5) * 0.3 + 0.6;
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
    >
      {/* Small gray moon */}
      <mesh position={[PLANET_RADIUS * 2.2, PLANET_RADIUS * 0.5, 0]}>
        <sphereGeometry args={[PLANET_RADIUS * 0.18, 12, 12]} />
        <meshStandardMaterial color="#666666" roughness={0.95} />
      </mesh>
    </BasePlanet>
  );
}
