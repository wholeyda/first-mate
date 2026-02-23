/**
 * Floating Planet
 *
 * 5-7 fragmented chunks floating in formation with <Float> bobbing.
 * Energy lines connecting chunks (not implemented as mesh — sparkles bridge).
 * Dust debris between chunks.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_RADIUS } from "../constants";
import { Sparkles } from "@react-three/drei";

interface Props {
  colors: string[];
}

export function FloatingPlanet({ colors }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#8E44AD"),
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(colors[1] || "#B388FF"),
      emissiveIntensity: 0.3,
    });
  }, [colors]);

  // Slow group rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += Math.min(delta, 0.1) * 0.2;
    }
  });

  // Generate chunk positions
  const chunks = useMemo(() => {
    const positions: [number, number, number][] = [];
    const r = PLANET_RADIUS;
    // Central chunk
    positions.push([0, 0, 0]);
    // Surrounding chunks
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const dist = r * 0.7;
      positions.push([
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * r * 0.6,
        Math.sin(angle) * dist,
      ]);
    }
    return positions;
  }, []);

  return (
    <group ref={groupRef}>
      {chunks.map((pos, i) => {
        const size = i === 0 ? PLANET_RADIUS * 0.55 : PLANET_RADIUS * (0.2 + Math.random() * 0.15);
        return (
          <Float
            key={i}
            speed={1.5 + i * 0.3}
            rotationIntensity={0.5}
            floatIntensity={0.8}
          >
            <mesh position={pos} material={material}>
              <dodecahedronGeometry args={[size, 0]} />
            </mesh>
          </Float>
        );
      })}

      {/* Atmosphere approximation — large transparent sphere */}
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.5, 24, 24]} />
        <meshBasicMaterial
          color={colors[2] || "#B388FF"}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>

      {/* Energy sparkles bridging chunks */}
      <Sparkles
        count={30}
        scale={PLANET_RADIUS * 3}
        size={3}
        speed={0.6}
        color={colors[2] || "#CE93D8"}
      />
    </group>
  );
}
