/**
 * Floating Planet
 *
 * 5-7 fragmented glass chunks floating in formation with <Float> bobbing.
 * Each chunk uses the glass sphere shader for consistent look.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_RADIUS } from "../constants";
import { GLASS_SPHERE_VERTEX, GLASS_SPHERE_FRAGMENT } from "../shaders/glassSphere.glsl";

interface Props {
  colors: string[];
}

export function FloatingPlanet({ colors }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  // Glass chunk material
  const glassMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: GLASS_SPHERE_VERTEX,
      fragmentShader: GLASS_SPHERE_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAnimSpeed: { value: 1.0 },
        uDisplacementStrength: { value: 0.0 },
        uGlowIntensity: { value: 1.5 },
        uColorPrimary: { value: new THREE.Color(colors[0] || "#8E44AD") },
        uColorSecondary: { value: new THREE.Color(colors[1] || "#B388FF") },
        uColorAccent: { value: new THREE.Color(colors[2] || "#CE93D8") },
      },
      transparent: true,
      depthWrite: true,
    });
  }, [colors]);

  // Slow group rotation + time update
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.2;
    }
    glassMaterial.uniforms.uTime.value += dt;
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
            <mesh position={pos} material={glassMaterial}>
              <dodecahedronGeometry args={[size, 0]} />
            </mesh>
          </Float>
        );
      })}

    </group>
  );
}
