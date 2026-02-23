/**
 * BasePlanet
 *
 * Shared scaffolding for all planet types:
 *   - Sphere geometry with optional vertex displacement
 *   - Animated fresnel atmosphere with energy tendrils
 *   - Fresnel corona layer (ported from CentralStar)
 *   - Inner + outer glow halos with additive blending
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

// ---- 2D hash noise for energy tendrils ----
const NOISE_2D_GLSL = /* glsl */ `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  vec2 shift = vec2(100.0);
  for (int i = 0; i < 4; i++) {
    v += a * noise2D(p);
    p = p * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
`;

// ---- Animated atmosphere fresnel shader ----
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
${NOISE_2D_GLSL}
uniform vec3 uTint;
uniform float uOpacity;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - dot(viewDir, vNormal);
  fresnel = pow(fresnel, 3.0);

  // Energy tendrils — noise-based modulation on the rim
  vec2 noiseCoord = vec2(
    atan(vNormal.z, vNormal.x) * 1.5,
    vNormal.y * 3.0 + uTime * 0.3
  );
  float tendril = fbm(noiseCoord * 3.0);
  tendril = smoothstep(0.25, 0.75, tendril);

  // Combine: base rim + tendril flicker
  float alpha = fresnel * uOpacity * (0.7 + tendril * 0.6);

  // Brighten the rim edge
  vec3 color = uTint * (1.0 + fresnel * 0.5);

  gl_FragColor = vec4(color, alpha);
}
`;

// ---- Corona fresnel shader (ported from CentralStar) ----
const coronaVertexShader = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const coronaFragmentShader = /* glsl */ `
uniform float uIntensity;
uniform vec3 uCoronaColor;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - dot(viewDir, vNormal);
  fresnel = pow(fresnel, 2.5);

  vec3 color = uCoronaColor;
  float alpha = fresnel * uIntensity;

  gl_FragColor = vec4(color, alpha);
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
  /** Corona color override (defaults to atmosphereTint) */
  coronaColor?: string;
  /** Corona opacity multiplier (default 0.6) */
  coronaOpacity?: number;
  /** Glow halo color override (defaults to atmosphereTint) */
  glowColor?: string;
  /** Glow intensity multiplier (default 1.0) */
  glowIntensity?: number;
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
  coronaColor,
  coronaOpacity = 0.6,
  glowColor,
  glowIntensity = 1.0,
}: BasePlanetProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);
  const radius = PLANET_RADIUS * scale;

  const resolvedCoronaColor = coronaColor || atmosphereTint;
  const resolvedGlowColor = glowColor || atmosphereTint;

  // Animated atmosphere material
  const atmoMaterial = useMemo(() => {
    const color = new THREE.Color(atmosphereTint);
    return new THREE.ShaderMaterial({
      vertexShader: atmoVertexShader,
      fragmentShader: atmoFragmentShader,
      uniforms: {
        uTint: { value: new THREE.Vector3(color.r, color.g, color.b) },
        uOpacity: { value: atmosphereOpacity },
        uTime: { value: 0 },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [atmosphereTint, atmosphereOpacity]);

  // Corona material
  const coronaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      uniforms: {
        uIntensity: { value: coronaOpacity },
        uCoronaColor: { value: new THREE.Color(resolvedCoronaColor) },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inner glow halo
  const innerGlowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(resolvedGlowColor),
      transparent: true,
      opacity: 0.15 * glowIntensity,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outer glow halo
  const outerGlowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(resolvedGlowColor),
      transparent: true,
      opacity: 0.06 * glowIntensity,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Animation loop
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Self-spin
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * PLANET_SPIN_SPEED + spinOffset * 0.001;
    }

    // Animate atmosphere time
    atmoMaterial.uniforms.uTime.value += dt;
    const time = atmoMaterial.uniforms.uTime.value;

    // Live-update corona uniforms
    coronaMaterial.uniforms.uCoronaColor.value.set(resolvedCoronaColor);
    coronaMaterial.uniforms.uIntensity.value = coronaOpacity;

    // Pulse inner glow
    if (innerGlowRef.current) {
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(resolvedGlowColor);
      const pulse = Math.sin(time * 1.5) * 0.04;
      mat.opacity = (0.15 + pulse) * glowIntensity;
    }

    // Pulse outer glow
    if (outerGlowRef.current) {
      const mat = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(resolvedGlowColor);
      const pulse = Math.sin(time * 1.0 + 1.0) * 0.02;
      mat.opacity = (0.06 + pulse) * glowIntensity;
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

      {/* Animated atmosphere with energy tendrils */}
      <mesh material={atmoMaterial}>
        <sphereGeometry args={[radius * 1.18, 32, 32]} />
      </mesh>

      {/* Fresnel corona */}
      <mesh ref={coronaRef} material={coronaMaterial}>
        <sphereGeometry args={[radius * 1.1, 48, 24]} />
      </mesh>

      {/* Inner glow halo */}
      <mesh ref={innerGlowRef} material={innerGlowMaterial}>
        <sphereGeometry args={[radius * 1.5, 24, 24]} />
      </mesh>

      {/* Outer glow halo */}
      <mesh ref={outerGlowRef} material={outerGlowMaterial}>
        <sphereGeometry args={[radius * 2.2, 16, 16]} />
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
