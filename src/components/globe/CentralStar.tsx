/**
 * HeroPlanet (formerly CentralStar)
 *
 * Large glass sphere planet at the center of the scene with
 * animated internal swirling colors, subsurface scattering,
 * wide accretion disk, and FrontSide atmosphere rim.
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
  HERO_RING_INNER,
  HERO_RING_OUTER,
  IDLE_GLOW_INTENSITY,
  ACTIVE_GLOW_MIN,
  ACTIVE_GLOW_MAX,
} from "./constants";
import { StarConfig, DEFAULT_STAR_CONFIG } from "@/types/star-config";
import { useSceneTheme } from "./SceneThemeContext";
import { GLASS_SPHERE_VERTEX, GLASS_SPHERE_FRAGMENT } from "./shaders/glassSphere.glsl";
import { ATMOSPHERE_RIM_VERTEX, ATMOSPHERE_RIM_FRAGMENT } from "./shaders/atmosphereRim.glsl";
import { ACCRETION_DISK_VERTEX, ACCRETION_DISK_FRAGMENT } from "./shaders/accretionDisk.glsl";

interface HeroPlanetProps {
  activeIntensity: number;
  config?: StarConfig;
  onStarClick?: () => void;
}

export function CentralStar({
  activeIntensity,
  config,
  onStarClick,
}: HeroPlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
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

  // ---- Accretion disk material ----
  const ringMaterial = useMemo(() => {
    const c1 = new THREE.Color(cfg.colorTheme.coronaInner);
    const c2 = new THREE.Color(cfg.colorTheme.coronaOuter);
    return new THREE.ShaderMaterial({
      vertexShader: ACCRETION_DISK_VERTEX,
      fragmentShader: ACCRETION_DISK_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAnimSpeed: { value: cfg.style.animationSpeed },
        uIsDark: { value: 1.0 },
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

  // ---- Second offset ring for depth illusion ----
  const ring2Material = useMemo(() => {
    const c1 = new THREE.Color(cfg.colorTheme.coronaOuter);
    const c2 = new THREE.Color(cfg.colorTheme.coronaInner);
    return new THREE.ShaderMaterial({
      vertexShader: ACCRETION_DISK_VERTEX,
      fragmentShader: ACCRETION_DISK_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uAnimSpeed: { value: cfg.style.animationSpeed * 0.7 },
        uIsDark: { value: 1.0 },
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

    // ---- Update rings ----
    const rc1 = new THREE.Color(cfg.colorTheme.coronaInner);
    const rc2 = new THREE.Color(cfg.colorTheme.coronaOuter);
    ringMaterial.uniforms.uTime.value = time;
    ringMaterial.uniforms.uAnimSpeed.value = cfg.style.animationSpeed;
    ringMaterial.uniforms.uIsDark.value = darkVal;
    ringMaterial.uniforms.uRingColor1.value.set(rc1.r, rc1.g, rc1.b);
    ringMaterial.uniforms.uRingColor2.value.set(rc2.r, rc2.g, rc2.b);

    ring2Material.uniforms.uTime.value = time;
    ring2Material.uniforms.uAnimSpeed.value = cfg.style.animationSpeed * 0.7;
    ring2Material.uniforms.uIsDark.value = darkVal;
    ring2Material.uniforms.uRingColor1.value.set(rc2.r, rc2.g, rc2.b);
    ring2Material.uniforms.uRingColor2.value.set(rc1.r, rc1.g, rc1.b);

    // Switch ring blending
    const ringBlending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    if (ringMaterial.blending !== ringBlending) {
      ringMaterial.blending = ringBlending;
      ringMaterial.needsUpdate = true;
    }
    if (ring2Material.blending !== ringBlending) {
      ring2Material.blending = ringBlending;
      ring2Material.needsUpdate = true;
    }

    // Slow rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.08;
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

      {/* Primary accretion disk */}
      <mesh material={ringMaterial} rotation={[Math.PI * 0.42, 0, 0]}>
        <ringGeometry args={[HERO_RING_INNER, HERO_RING_OUTER, 128, 1]} />
      </mesh>

      {/* Secondary offset ring for depth */}
      <mesh material={ring2Material} rotation={[Math.PI * 0.48, 0.15, 0]}>
        <ringGeometry args={[HERO_RING_INNER * 0.9, HERO_RING_OUTER * 0.85, 128, 1]} />
      </mesh>

    </group>
  );
}
