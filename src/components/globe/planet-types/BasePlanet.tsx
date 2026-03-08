/**
 * BasePlanet
 *
 * Glass sphere planet with animated internal swirling colors,
 * subsurface scattering, FrontSide atmosphere rim, optional
 * accretion disk ring, and self-spin animation.
 *
 * Theme-aware via useSceneTheme():
 *   Dark mode  — full color glass with HDR bloom
 *   Light mode — B&W with dark fresnel outline
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PLANET_RADIUS, PLANET_SPIN_SPEED } from "../constants";
import { useSceneTheme } from "../SceneThemeContext";
import { GLASS_SPHERE_VERTEX, GLASS_SPHERE_FRAGMENT } from "../shaders/glassSphere.glsl";
import { ATMOSPHERE_RIM_VERTEX, ATMOSPHERE_RIM_FRAGMENT } from "../shaders/atmosphereRim.glsl";
import { CubeRing } from "../CubeRing";

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
  /** Ring tilt as [x, y, z] euler rotation in radians */
  ringTilt?: [number, number, number];
  /** Axial tilt of the entire planet group [x, y, z] in radians */
  axisTilt?: [number, number, number];
  /**
   * Moon config — renders a small orbiting sphere.
   * color: CSS hex (default gray)
   * size: multiplier on PLANET_RADIUS (default 0.18)
   * distance: multiplier on PLANET_RADIUS (default 2.2)
   * orbitSpeed: radians/second (default 0.8)
   * orbitTilt: inclination in radians (default 0)
   */
  moon?: {
    color?: string;
    size?: number;
    distance?: number;
    orbitSpeed?: number;
    orbitTilt?: number;
  };
}

export function BasePlanet({
  primaryColor,
  secondaryColor,
  accentColor,
  atmosphereTint,
  glowIntensity = 1.0,
  lowPoly = false,
  detail = 32,
  scale = 1,
  spinOffset = 0,
  children,
  hasRings = false,
  ringColor,
  ringSecondaryColor,
  animationSpeed = 1.0,
  ringTilt,
  axisTilt,
  moon,
}: BasePlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Group>(null);
  const radius = PLANET_RADIUS * scale;
  const isDark = useSceneTheme();

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
        uIsDark: { value: 1.0 },
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
        uIsDark: { value: 1.0 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ring colors for CubeRing
  const ringC1 = ringColor || primaryColor;
  const ringC2 = ringSecondaryColor || accentColor;

  // ---- Animation loop ----
  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const darkVal = isDark ? 1.0 : 0.0;

    // Self-spin
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * PLANET_SPIN_SPEED + spinOffset * 0.001;
    }

    // Orbiting moon
    if (moonRef.current && moon) {
      const speed = moon.orbitSpeed ?? 0.8;
      const dist = PLANET_RADIUS * (moon.distance ?? 2.2);
      const t = state.clock.elapsedTime * speed;
      const tilt = moon.orbitTilt ?? 0;
      moonRef.current.position.x = Math.cos(t) * dist;
      moonRef.current.position.y = Math.sin(t) * dist * Math.sin(tilt);
      moonRef.current.position.z = Math.sin(t) * dist * Math.cos(tilt);
    }

    // Update glass sphere uniforms
    glassMaterial.uniforms.uTime.value += dt;
    glassMaterial.uniforms.uGlowIntensity.value = glowIntensity;
    glassMaterial.uniforms.uAnimSpeed.value = animationSpeed;
    glassMaterial.uniforms.uIsDark.value = darkVal;
    glassMaterial.uniforms.uColorPrimary.value.set(primaryColor);
    glassMaterial.uniforms.uColorSecondary.value.set(secondaryColor);
    glassMaterial.uniforms.uColorAccent.value.set(accentColor);

    // Update atmosphere
    const tint = new THREE.Color(atmosphereTint);
    atmosphereMaterial.uniforms.uTint.value.set(tint.r, tint.g, tint.b);
    atmosphereMaterial.uniforms.uIntensity.value = glowIntensity;
    atmosphereMaterial.uniforms.uIsDark.value = darkVal;

    // Switch atmosphere blending: additive for dark (glow), normal for light (outline)
    const targetBlending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (atmosphereMaterial.blending !== targetBlending) {
      atmosphereMaterial.blending = targetBlending;
      atmosphereMaterial.needsUpdate = true;
    }

  });

  return (
    <group rotation={axisTilt ? new THREE.Euler(...axisTilt) : undefined}>
      <group ref={groupRef}>
        {/* Glass sphere surface */}
        <mesh material={glassMaterial}>
          {lowPoly ? (
            <icosahedronGeometry args={[radius, detail]} />
          ) : (
            <sphereGeometry args={[radius, 64, 64]} />
          )}
        </mesh>

        {/* Atmosphere rim (FrontSide) */}
        <mesh material={atmosphereMaterial}>
          <sphereGeometry args={[radius * 1.05, 32, 32]} />
        </mesh>

        {/* Cube ring */}
        {hasRings && (
          <CubeRing
            innerRadius={radius * 1.5}
            outerRadius={radius * 3.0}
            count={150}
            cubeSize={0.03}
            color1={ringC1}
            color2={ringC2}
            speed={animationSpeed}
            tilt={ringTilt}
          />
        )}

        {/* Orbiting moon (data-driven, position updated in useFrame) */}
        {moon && (
          <mesh ref={moonRef}>
            <sphereGeometry args={[PLANET_RADIUS * (moon.size ?? 0.18), 12, 12]} />
            <meshStandardMaterial color={moon.color ?? "#888888"} roughness={0.9} />
          </mesh>
        )}

        {/* Type-specific extras (moons, shards, gears, etc.) */}
        {children}
      </group>
    </group>
  );
}
