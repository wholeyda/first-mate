/**
 * HeroPlanet (formerly CentralStar)
 *
 * Large glass sphere planet at the center of the scene with
 * animated internal swirling colors, subsurface scattering,
 * and FrontSide atmosphere rim.
 *
 * Theme-aware via useSceneTheme():
 *   Dark mode  — full color glass with HDR bloom
 *   Light mode — B&W with dark fresnel outline
 *
 * Customizable via StarConfig — maps color theme + style sliders
 * to shader uniforms for real-time preview.
 *
 * Click to open the customization panel.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  HERO_PLANET_RADIUS,
  IDLE_GLOW_INTENSITY,
  ACTIVE_GLOW_MIN,
  ACTIVE_GLOW_MAX,
} from "./constants";
import { StarConfig, DEFAULT_STAR_CONFIG } from "@/types/star-config";
import { useSceneTheme } from "./SceneThemeContext";
import { GLASS_SPHERE_VERTEX, GLASS_SPHERE_FRAGMENT } from "./shaders/glassSphere.glsl";
import { ATMOSPHERE_RIM_VERTEX, ATMOSPHERE_RIM_FRAGMENT } from "./shaders/atmosphereRim.glsl";

interface HeroPlanetProps {
  activeIntensity: number;
  config?: StarConfig;
  onStarClick?: () => void;
  voiceAmplitude?: number;
  voiceMode?: boolean;
}

export function CentralStar({
  activeIntensity,
  config,
  onStarClick,
  voiceAmplitude = 0,
  voiceMode = false,
}: HeroPlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(1.0);
  const isDark = useSceneTheme();

  const cfg = config ?? DEFAULT_STAR_CONFIG;
  const R = HERO_PLANET_RADIUS;

  // ---- Glass sphere material ----
  const glassMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLASS_SPHERE_VERTEX,
        fragmentShader: GLASS_SPHERE_FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uAnimSpeed: { value: cfg.style.animationSpeed },
          uDisplacementStrength: { value: cfg.style.displacementStrength },
          uGlowIntensity: { value: cfg.style.glowIntensity },
          uIsDark: { value: 1.0 },
          uColorPrimary: { value: new THREE.Color(cfg.colorTheme.primary) },
          uColorSecondary: { value: new THREE.Color(cfg.colorTheme.secondary) },
          uColorAccent: { value: new THREE.Color(cfg.colorTheme.tertiary) },
        },
        transparent: true,
        depthWrite: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ---- FrontSide atmosphere rim ----
  const atmosphereMaterial = useMemo(() => {
    const tint = new THREE.Color(cfg.colorTheme.innerGlow);
    return new THREE.ShaderMaterial({
      vertexShader: ATMOSPHERE_RIM_VERTEX,
      fragmentShader: ATMOSPHERE_RIM_FRAGMENT,
      uniforms: {
        uTint: { value: new THREE.Vector3(tint.r, tint.g, tint.b) },
        uIntensity: { value: cfg.style.glowIntensity },
        uIsDark: { value: 1.0 },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const glowMult = cfg.style.glowIntensity;
    const time = glassMaterial.uniforms.uTime.value + dt;
    const darkVal = isDark ? 1.0 : 0.0;

    // ---- Update glass sphere uniforms ----
    glassMaterial.uniforms.uTime.value = time;
    glassMaterial.uniforms.uActiveIntensity &&
      (glassMaterial.uniforms.uActiveIntensity.value = activeIntensity);
    glassMaterial.uniforms.uAnimSpeed.value = cfg.style.animationSpeed;
    glassMaterial.uniforms.uDisplacementStrength.value = cfg.style.displacementStrength;
    glassMaterial.uniforms.uIsDark.value = darkVal;
    glassMaterial.uniforms.uColorPrimary.value.set(cfg.colorTheme.primary);
    glassMaterial.uniforms.uColorSecondary.value.set(cfg.colorTheme.secondary);
    glassMaterial.uniforms.uColorAccent.value.set(cfg.colorTheme.tertiary);

    // Dynamic glow based on active intensity
    const glowTarget =
      activeIntensity > 0.1
        ? ACTIVE_GLOW_MIN +
          (Math.sin(time * 2.0) * 0.5 + 0.5) *
            (ACTIVE_GLOW_MAX - ACTIVE_GLOW_MIN) *
            activeIntensity
        : IDLE_GLOW_INTENSITY;
    glassMaterial.uniforms.uGlowIntensity.value = glowTarget * glowMult;

    // ---- Update atmosphere ----
    const tint = new THREE.Color(cfg.colorTheme.innerGlow);
    atmosphereMaterial.uniforms.uTint.value.set(tint.r, tint.g, tint.b);
    atmosphereMaterial.uniforms.uIntensity.value = glowTarget * glowMult;
    atmosphereMaterial.uniforms.uIsDark.value = darkVal;

    // Switch atmosphere blending
    const atmoBlending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (atmosphereMaterial.blending !== atmoBlending) {
      atmosphereMaterial.blending = atmoBlending;
      atmosphereMaterial.needsUpdate = true;
    }

    // Voice amplitude → scale animation (smooth lerp)
    // In voice mode: base scale is 1.4 (planet is larger) + amplitude drives further growth
    // In normal mode: base 1.0 + small amplitude wiggle
    const baseScale = voiceMode ? 1.4 : 1.0;
    const targetScale = baseScale + voiceAmplitude * 2.0;
    scaleRef.current += (targetScale - scaleRef.current) * 0.10;

    // Slow rotation + scale
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.08;
      const s = scaleRef.current;
      groupRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Core glass sphere — clickable */}
      <mesh
        material={glassMaterial}
        onClick={(e) => {
          e.stopPropagation();
          onStarClick?.();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (onStarClick) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[R, 128, 64]} />
      </mesh>

      {/* Atmosphere rim */}
      <mesh material={atmosphereMaterial}>
        <sphereGeometry args={[R * 1.05, 64, 32]} />
      </mesh>
    </group>
  );
}
