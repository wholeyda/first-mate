/**
 * CentralStar
 *
 * Shader-driven glowing star at the center of the solar system.
 * Replaces the 2500-particle Canvas 2D sphere with a smooth,
 * animated Three.js mesh featuring:
 *   - Vertex displacement via 3D simplex noise
 *   - FBM surface color (cyan → purple gradient)
 *   - Fresnel corona glow
 *   - Outer additive bloom sphere
 *   - Active state: faster noise, more displacement
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

// ---- Shared GLSL noise (simplex 3D) ----
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

float fbm(vec3 p){
  float f = 0.0;
  f += 0.5000 * snoise(p); p *= 2.01;
  f += 0.2500 * snoise(p); p *= 2.02;
  f += 0.1250 * snoise(p); p *= 2.03;
  f += 0.0625 * snoise(p);
  return f;
}
`;

// ---- Star surface shader ----
const starVertexShader = /* glsl */ `
${NOISE_GLSL}
uniform float uTime;
uniform float uActiveIntensity;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
  vNormal = normal;
  vPosition = position;

  float speed = 0.3 + uActiveIntensity * 1.2;
  float strength = 0.15 + uActiveIntensity * 0.1;

  float n = fbm(position * 1.5 + uTime * speed);
  vDisplacement = n;

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
varying float vDisplacement;

void main() {
  float speed = 0.3 + uActiveIntensity * 1.2;
  float n = fbm(vPosition * 2.0 + uTime * speed * 0.5);
  float t = smoothstep(-0.4, 0.6, n);

  // Cyan to purple color ramp
  vec3 cyan = vec3(0.0, 0.9, 1.0);
  vec3 purple = vec3(0.7, 0.4, 1.0);
  vec3 white = vec3(1.0, 1.0, 1.0);

  vec3 color = mix(cyan, purple, t);

  // Hot spots: mix toward white at noise peaks
  float hotspot = smoothstep(0.35, 0.65, n);
  color = mix(color, white, hotspot * 0.4);

  // Emissive boost when active
  float emissive = 0.6 + uActiveIntensity * 0.4;
  color *= emissive;

  gl_FragColor = vec4(color, 1.0);
}
`;

// ---- Corona (Fresnel glow) shader ----
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
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - dot(viewDir, vNormal);
  fresnel = pow(fresnel, 3.0);

  vec3 color = mix(vec3(0.0, 0.85, 1.0), vec3(0.6, 0.3, 1.0), fresnel);
  float alpha = fresnel * uIntensity * 0.7;

  gl_FragColor = vec4(color, alpha);
}
`;

interface CentralStarProps {
  activeIntensity: number;
}

export function CentralStar({ activeIntensity }: CentralStarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Create shader materials
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

  const coronaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        uniforms: {
          uIntensity: { value: IDLE_GLOW_INTENSITY },
        },
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // Outer glow material (simple additive sphere)
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.1, 0.5, 0.8),
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Update time uniform
    starMaterial.uniforms.uTime.value += dt;
    starMaterial.uniforms.uActiveIntensity.value = activeIntensity;

    // Corona intensity: pulse when active
    const glowTarget =
      activeIntensity > 0.1
        ? ACTIVE_GLOW_MIN +
          Math.sin(starMaterial.uniforms.uTime.value * 3.0) *
            0.5 *
            (ACTIVE_GLOW_MAX - ACTIVE_GLOW_MIN) *
            activeIntensity
        : IDLE_GLOW_INTENSITY;
    coronaMaterial.uniforms.uIntensity.value = glowTarget;

    // Outer glow opacity pulse
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.1 + activeIntensity * 0.15;
      const colorBoost = 0.1 + activeIntensity * 0.2;
      mat.color.setRGB(colorBoost, 0.4 + colorBoost, 0.7 + colorBoost);
    }

    // Slow self-rotation
    if (meshRef.current) {
      meshRef.current.rotation.y += dt * 0.1;
    }
  });

  return (
    <group>
      {/* Core star surface */}
      <mesh ref={meshRef} material={starMaterial}>
        <icosahedronGeometry args={[STAR_RADIUS, 64]} />
      </mesh>

      {/* Fresnel corona */}
      <mesh ref={coronaRef} material={coronaMaterial}>
        <icosahedronGeometry args={[STAR_RADIUS * 1.15, 32]} />
      </mesh>

      {/* Outer glow */}
      <mesh ref={glowRef} material={glowMaterial}>
        <icosahedronGeometry args={[STAR_RADIUS * 1.6, 16]} />
      </mesh>
    </group>
  );
}
