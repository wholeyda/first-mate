/**
 * Floating Planet
 *
 * 5-7 fragmented glass chunks floating in formation with <Float> bobbing.
 * Each chunk uses the glass sphere shader for consistent look.
 * Per-instance variation via seed: chunk count, spread, float speed.
 *
 * Theme-aware via useSceneTheme():
 *   Dark mode  — full color glass
 *   Light mode — B&W with dark fresnel outline
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_RADIUS } from "../constants";
import { useSceneTheme } from "../SceneThemeContext";
import { GLASS_SPHERE_VERTEX, GLASS_SPHERE_FRAGMENT } from "../shaders/glassSphere.glsl";
import { makePlanetRng } from "../planetSeed";

interface Props {
  colors: string[];
  seed?: number;
}

export function FloatingPlanet({ colors, seed = 0 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const isDark = useSceneTheme();

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
        uIsDark: { value: 1.0 },
        uColorPrimary: { value: new THREE.Color(colors[0] || "#8E44AD") },
        uColorSecondary: { value: new THREE.Color(colors[1] || "#B388FF") },
        uColorAccent: { value: new THREE.Color(colors[2] || "#CE93D8") },
      },
      transparent: true,
      depthWrite: true,
    });
  }, [colors]);

  const v = useMemo(() => {
    const rng = makePlanetRng(String(seed));
    const chunkCount = rng.int(4, 7);
    const spread     = rng.float(0.5, 0.9);
    const axisTiltX  = rng.float(-0.3, 0.3);
    const rotSpeed   = rng.float(0.1, 0.35);
    const chunks = [
      [0, 0, 0] as [number, number, number],
      ...Array.from({ length: chunkCount - 1 }, (_, i) => {
        const angle = (i / (chunkCount - 1)) * Math.PI * 2;
        const dist  = PLANET_RADIUS * spread;
        return [
          Math.cos(angle) * dist,
          rng.float(-0.3, 0.3) * PLANET_RADIUS,
          Math.sin(angle) * dist,
        ] as [number, number, number];
      }),
    ];
    const sizes = chunks.map((_, i) =>
      i === 0
        ? PLANET_RADIUS * rng.float(0.45, 0.65)
        : PLANET_RADIUS * rng.float(0.15, 0.32)
    );
    return { chunkCount, chunks, sizes, axisTiltX, rotSpeed };
  }, [seed]);

  // Slow group rotation + time + theme update
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * v.rotSpeed;
    }
    glassMaterial.uniforms.uTime.value += dt;
    glassMaterial.uniforms.uIsDark.value = isDark ? 1.0 : 0.0;
  });

  return (
    <group rotation={[v.axisTiltX, 0, 0]}>
      <group ref={groupRef}>
        {v.chunks.map((pos, i) => (
          <Float
            key={i}
            speed={1.5 + i * 0.3}
            rotationIntensity={0.5}
            floatIntensity={0.8}
          >
            <mesh position={pos} material={glassMaterial}>
              <dodecahedronGeometry args={[v.sizes[i], 0]} />
            </mesh>
          </Float>
        ))}
      </group>
    </group>
  );
}
