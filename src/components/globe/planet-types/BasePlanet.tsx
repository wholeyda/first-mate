/**
 * BasePlanet
 *
 * Shared scaffolding for all planet types:
 *   - Sphere geometry with optional vertex displacement
 *   - Fresnel atmosphere shell
 *   - Sparkle/particle ambient layer
 *   - Self-spin animation
 *
 * Each planet type renders this with custom materials, children, and extras.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_RADIUS, PLANET_SPIN_SPEED } from "../constants";

// ---- Atmosphere fresnel shader ----
const atmoVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmoFragmentShader = /* glsl */ `
uniform vec3 uTint;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - dot(viewDir, vNormal);
  fresnel = pow(fresnel, 2.5);
  gl_FragColor = vec4(uTint, fresnel * uOpacity);
}
`;

interface BasePlanetProps {
  /** Surface material (passed as child of <mesh>) */
  surfaceMaterial: THREE.Material;
  /** Atmosphere tint color (hex string like "#FF4500") */
  atmosphereTint: string;
  /** Atmosphere opacity 0-1 */
  atmosphereOpacity: number;
  /** Sparkle count */
  sparkleCount: number;
  /** Sparkle color (hex) */
  sparkleColor: string;
  /** Whether to use icosahedron geometry (low-poly look) vs sphere */
  lowPoly?: boolean;
  /** Geometry detail level */
  detail?: number;
  /** Scale multiplier on PLANET_RADIUS */
  scale?: number;
  /** Unique spin offset for this planet */
  spinOffset?: number;
  /** Extra meshes rendered inside the planet group (rings, moons, etc.) */
  children?: React.ReactNode;
  /** Whether this planet has rings (rendered by parent) */
  hasRings?: boolean;
  /** Ring color */
  ringColor?: string;
}

export function BasePlanet({
  surfaceMaterial,
  atmosphereTint,
  atmosphereOpacity,
  sparkleCount,
  sparkleColor,
  lowPoly = false,
  detail = 32,
  scale = 1,
  spinOffset = 0,
  children,
  hasRings = false,
  ringColor,
}: BasePlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const radius = PLANET_RADIUS * scale;

  // Atmosphere material
  const atmoMaterial = useMemo(() => {
    const color = new THREE.Color(atmosphereTint);
    return new THREE.ShaderMaterial({
      vertexShader: atmoVertexShader,
      fragmentShader: atmoFragmentShader,
      uniforms: {
        uTint: { value: new THREE.Vector3(color.r, color.g, color.b) },
        uOpacity: { value: atmosphereOpacity },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }, [atmosphereTint, atmosphereOpacity]);

  // Ring geometry
  const ringGeometry = useMemo(() => {
    if (!hasRings) return null;
    return new THREE.RingGeometry(radius * 1.4, radius * 2.0, 64);
  }, [hasRings, radius]);

  const ringMaterial = useMemo(() => {
    if (!hasRings || !ringColor) return null;
    const color = new THREE.Color(ringColor);
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [hasRings, ringColor]);

  // Self-spin
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += Math.min(delta, 0.1) * PLANET_SPIN_SPEED + spinOffset * 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Surface */}
      <mesh material={surfaceMaterial}>
        {lowPoly ? (
          <icosahedronGeometry args={[radius, detail]} />
        ) : (
          <sphereGeometry args={[radius, detail, detail]} />
        )}
      </mesh>

      {/* Atmosphere */}
      <mesh material={atmoMaterial}>
        <sphereGeometry args={[radius * 1.18, 32, 32]} />
      </mesh>

      {/* Ring */}
      {hasRings && ringGeometry && ringMaterial && (
        <mesh
          geometry={ringGeometry}
          material={ringMaterial}
          rotation={[Math.PI * 0.4, 0, 0]}
        />
      )}

      {/* Ambient sparkles */}
      {sparkleCount > 0 && (
        <Sparkles
          count={sparkleCount}
          scale={radius * 3.5}
          size={2}
          speed={0.4}
          color={sparkleColor}
        />
      )}

      {/* Type-specific extras (moons, debris, etc.) */}
      {children}
    </group>
  );
}
