/**
 * BasePlanet
 *
 * Glass sphere planet with animated internal swirling colors,
 * subsurface scattering, FrontSide atmosphere rim, optional
 * accretion disk ring, sparkles, and self-spin animation.
 *
 * Each planet type passes 3 colors + config to customize the look.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_RADIUS, PLANET_SPIN_SPEED } from "../constants";
import { GLASS_SPHERE_VERTEX, GLASS_SPHERE_FRAGMENT } from "../shaders/glassSphere.glsl";
import { ATMOSPHERE_RIM_VERTEX, ATMOSPHERE_RIM_FRAGMENT } from "../shaders/atmosphereRim.glsl";
import { ACCRETION_DISK_VERTEX, ACCRETION_DISK_FRAGMENT } from "../shaders/accretionDisk.glsl";

export interface BasePlanetProps {
  /** Deep interior swirl color */
  primaryColor: string;
  /** Mid-tone swirl color */
  secondaryColor: string;
  /** Bright emission / SSS accent color */
  accentColor: string;
  /** Atmosphere rim glow color */
  atmosphereTint: string;
  /** Bloom multiplier (default 1.0) */
  glowIntensity?: number;
  /** Sparkle count */
  sparkleCount: number;
  /** Sparkle color (hex) */
  sparkleColor: string;
  /** Use icosahedron geometry for low-poly look */
  lowPoly?: boolean;
  /** Geometry detail level */
  detail?: number;
  /** Scale multiplier on PLANET_RADIUS */
  scale?: number;
  /** Unique spin offset */
  spinOffset?: number;
  /** Extra meshes (moons, debris, etc.) */
  children?: React.ReactNode;
  /** Whether this planet has an accretion disk ring */
  hasRings?: boolean;
  /** Primary ring color */
  ringColor?: string;
  /** Secondary ring color */
  ringSecondaryColor?: string;
  /** Noise animation speed multiplier (default 1.0) */
  animationSpeed?: number;
}

export function BasePlanet({
  primaryColor,
  secondaryColor,
  accentColor,
  atmosphereTint,
  glowIntensity = 1.0,
  sparkleCount,
  sparkleColor,
  lowPoly = false,
  detail = 32,
  scale = 1,
  spinOffset = 0,
  children,
  hasRings = false,
  ringColor,
  ringSecondaryColor,
  animationSpeed = 1.0,
}: BasePlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const radius = PLANET_RADIUS * scale;

  // ---- Glass sphere material ----
  const glassMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: GLASS_SPHERE_VERTEX,
      fragmentShader: GLASS_SPHERE_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAnimSpeed: { value: animationSpeed },
        uDisplacementStrength: { value: 0.02 },
        uGlowIntensity: { value: glowIntensity },
        uColorPrimary: { value: new THREE.Color(primaryColor) },
        uColorSecondary: { value: new THREE.Color(secondaryColor) },
        uColorAccent: { value: new THREE.Color(accentColor) },
      },
      transparent: true,
      depthWrite: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- FrontSide atmosphere rim ----
  const atmosphereMaterial = useMemo(() => {
    const tint = new THREE.Color(atmosphereTint);
    return new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_RIM_VERTEX,
      fragmentShader: ATMOSPHERE_RIM_FRAGMENT,
      uniforms: {
        uTint: { value: new THREE.Vector3(tint.r, tint.g, tint.b) },
        uIntensity: { value: glowIntensity },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Accretion disk ring material ----
  const ringMaterial = useMemo(() => {
    if (!hasRings) return null;
    const c1 = new THREE.Color(ringColor || primaryColor);
    const c2 = new THREE.Color(ringSecondaryColor || accentColor);
    return new THREE.ShaderMaterial({
      vertexShader: ACCRETION_DISK_VERTEX,
      fragmentShader: ACCRETION_DISK_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAnimSpeed: { value: animationSpeed },
        uRingColor1: { value: new THREE.Vector3(c1.r, c1.g, c1.b) },
        uRingColor2: { value: new THREE.Vector3(c2.r, c2.g, c2.b) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Animation loop ----
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Self-spin
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * PLANET_SPIN_SPEED + spinOffset * 0.001;
    }

    // Update glass sphere uniforms
    glassMaterial.uniforms.uTime.value += dt;
    glassMaterial.uniforms.uGlowIntensity.value = glowIntensity;
    glassMaterial.uniforms.uAnimSpeed.value = animationSpeed;
    glassMaterial.uniforms.uColorPrimary.value.set(primaryColor);
    glassMaterial.uniforms.uColorSecondary.value.set(secondaryColor);
    glassMaterial.uniforms.uColorAccent.value.set(accentColor);

    // Update atmosphere
    const tint = new THREE.Color(atmosphereTint);
    atmosphereMaterial.uniforms.uTint.value.set(tint.r, tint.g, tint.b);
    atmosphereMaterial.uniforms.uIntensity.value = glowIntensity;

    // Update ring
    if (ringMaterial) {
      ringMaterial.uniforms.uTime.value = glassMaterial.uniforms.uTime.value;
      ringMaterial.uniforms.uAnimSpeed.value = animationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Glass sphere surface */}
      <mesh material={glassMaterial}>
        {lowPoly ? (
          <icosahedronGeometry args={[radius, detail]} />
        ) : (
          <sphereGeometry args={[radius, 64, 64]} />
        )}
      </mesh>

      {/* Atmosphere rim (FrontSide, AdditiveBlending) */}
      <mesh material={atmosphereMaterial}>
        <sphereGeometry args={[radius * 1.05, 32, 32]} />
      </mesh>

      {/* Accretion disk ring */}
      {hasRings && ringMaterial && (
        <mesh
          material={ringMaterial}
          rotation={[Math.PI * 0.42, 0, 0]}
        >
          <ringGeometry args={[radius * 1.5, radius * 3.5, 128, 1]} />
        </mesh>
      )}

      {/* Ambient sparkles */}
      {sparkleCount > 0 && (
        <Sparkles
          count={sparkleCount}
          scale={radius * 3.5}
          size={3}
          speed={0.4}
          color={sparkleColor}
        />
      )}

      {/* Type-specific extras (moons, shards, gears, etc.) */}
      {children}
    </group>
  );
}
