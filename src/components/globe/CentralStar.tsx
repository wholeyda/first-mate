/**
 * CentralStar
 *
 * A beautiful glowing central star with:
 *   - Smooth animated surface color (cyan/teal → purple gradient via noise)
 *   - Very subtle vertex displacement (organic, not lumpy)
 *   - Soft multi-layer glow (fresnel rim + additive outer halos)
 *   - Active state: colors shift faster, glow intensifies
 *
 * Designed to feel like a living, breathing star — not a rocky moon.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  STAR_RADIUS,
  IDLE_GLOW_INTENSITY,
  ACTIVE_GLOW_MIN,
  ACTIVE_GLOW_MAX,
} from "./constants";

// ---- Simplex 3D noise for smooth animated surface ----
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

// ---- Star surface shader ----
// Smooth sphere with animated color swirls, minimal displacement
const starVertexShader = /* glsl */ `
${NOISE_GLSL}
uniform float uTime;
uniform float uActiveIntensity;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Very subtle organic displacement — gentle breathing, not lumpy
  float speed = 0.15 + uActiveIntensity * 0.3;
  float n = snoise(position * 0.8 + uTime * speed);
  vNoise = n;

  // Tiny displacement so it stays round but feels alive
  float strength = 0.03 + uActiveIntensity * 0.02;
  vec3 displaced = position + normal * n * strength;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const starFragmentShader = /* glsl */ `
${NOISE_GLSL}
uniform float uTime;
uniform float uActiveIntensity;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vNoise;

void main() {
  // Animated noise for color variation
  float speed = 0.12 + uActiveIntensity * 0.25;
  float n1 = snoise(vPosition * 1.2 + uTime * speed);
  float n2 = snoise(vPosition * 2.5 + uTime * speed * 0.7 + 100.0);

  // Combine noise layers for rich variation
  float t = smoothstep(-0.3, 0.5, n1 * 0.7 + n2 * 0.3);

  // Beautiful color palette: teal → cyan → soft purple
  vec3 teal    = vec3(0.05, 0.75, 0.78);
  vec3 cyan    = vec3(0.15, 0.85, 0.95);
  vec3 lavender = vec3(0.55, 0.45, 0.85);
  vec3 white   = vec3(1.0, 1.0, 1.0);

  // Two-stage color ramp for richness
  vec3 color;
  if (t < 0.5) {
    color = mix(teal, cyan, t * 2.0);
  } else {
    color = mix(cyan, lavender, (t - 0.5) * 2.0);
  }

  // Bright hot spots at noise peaks — gives it that stellar energy look
  float hotspot = smoothstep(0.4, 0.75, n1);
  color = mix(color, white, hotspot * 0.35);

  // Overall brightness: always emissive, brighter when active
  float brightness = 0.75 + uActiveIntensity * 0.25;
  color *= brightness;

  // Slight darkening toward edges for depth (pseudo-limb-darkening)
  vec3 viewDir = normalize(cameraPosition - vPosition);
  float rim = dot(normalize(vNormal), viewDir);
  rim = smoothstep(0.0, 0.5, rim);
  color *= 0.7 + rim * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
`;

// ---- Fresnel corona shader ----
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
uniform float uTime;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - dot(viewDir, vNormal);
  fresnel = pow(fresnel, 2.0);

  // Soft teal-cyan corona color
  vec3 innerColor = vec3(0.1, 0.8, 0.9);
  vec3 outerColor = vec3(0.4, 0.3, 0.8);
  vec3 color = mix(innerColor, outerColor, fresnel);

  float alpha = fresnel * uIntensity * 0.6;

  gl_FragColor = vec4(color, alpha);
}
`;

interface CentralStarProps {
  activeIntensity: number;
}

export function CentralStar({ activeIntensity }: CentralStarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const glow1Ref = useRef<THREE.Mesh>(null);
  const glow2Ref = useRef<THREE.Mesh>(null);

  // Star surface shader
  const starMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: starVertexShader,
        fragmentShader: starFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uActiveIntensity: { value: 0 },
        },
      }),
    []
  );

  // Fresnel corona shader
  const coronaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        uniforms: {
          uIntensity: { value: IDLE_GLOW_INTENSITY },
          uTime: { value: 0 },
        },
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Inner glow halo (close, bright)
  const innerGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.05, 0.55, 0.7),
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Outer glow halo (far, subtle)
  const outerGlowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.15, 0.35, 0.6),
        transparent: true,
        opacity: 0.06,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Advance time
    starMaterial.uniforms.uTime.value += dt;
    starMaterial.uniforms.uActiveIntensity.value = activeIntensity;
    coronaMaterial.uniforms.uTime.value = starMaterial.uniforms.uTime.value;

    // Corona intensity
    const time = starMaterial.uniforms.uTime.value;
    const glowTarget =
      activeIntensity > 0.1
        ? ACTIVE_GLOW_MIN +
          (Math.sin(time * 2.0) * 0.5 + 0.5) *
            (ACTIVE_GLOW_MAX - ACTIVE_GLOW_MIN) *
            activeIntensity
        : IDLE_GLOW_INTENSITY;
    coronaMaterial.uniforms.uIntensity.value = glowTarget;

    // Pulse glow halos
    if (glow1Ref.current) {
      const mat = glow1Ref.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(time * 1.5) * 0.03;
      mat.opacity = 0.12 + activeIntensity * 0.08 + pulse;
    }
    if (glow2Ref.current) {
      const mat = glow2Ref.current.material as THREE.MeshBasicMaterial;
      const pulse = Math.sin(time * 1.0 + 1.0) * 0.015;
      mat.opacity = 0.06 + activeIntensity * 0.04 + pulse;
    }

    // Slow rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * 0.08;
    }
  });

  return (
    <group>
      {/* Core star surface — high-poly sphere for smoothness */}
      <mesh ref={meshRef} material={starMaterial}>
        <sphereGeometry args={[STAR_RADIUS, 128, 64]} />
      </mesh>

      {/* Fresnel corona — just outside the surface */}
      <mesh ref={coronaRef} material={coronaMaterial}>
        <sphereGeometry args={[STAR_RADIUS * 1.08, 64, 32]} />
      </mesh>

      {/* Inner glow halo */}
      <mesh ref={glow1Ref} material={innerGlowMaterial}>
        <sphereGeometry args={[STAR_RADIUS * 1.3, 32, 32]} />
      </mesh>

      {/* Outer glow halo */}
      <mesh ref={glow2Ref} material={outerGlowMaterial}>
        <sphereGeometry args={[STAR_RADIUS * 1.8, 24, 24]} />
      </mesh>
    </group>
  );
}
