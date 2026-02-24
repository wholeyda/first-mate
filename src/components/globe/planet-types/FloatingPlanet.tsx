/**
 * Floating Planet
 *
 * 5-7 fragmented chunks floating in formation with <Float> bobbing.
 * Energy lines connecting chunks (not implemented as mesh — sparkles bridge).
 * Dust debris between chunks. Corona and glow halos for energy effect.
 */

"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_RADIUS } from "../constants";

// ---- Corona fresnel shader ----
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
  fresnel = pow(fresnel, 1.5);

  vec3 color = uCoronaColor * 1.5;
  float alpha = fresnel * uIntensity * 1.5;

  gl_FragColor = vec4(color, alpha);
}
`;

interface Props {
  colors: string[];
}

export function FloatingPlanet({ colors }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const outerGlowRef = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(colors[0] || "#8E44AD").multiplyScalar(0.2),
      roughness: 0.7,
      metalness: 0.1,
      emissive: new THREE.Color(colors[1] || "#B388FF"),
      emissiveIntensity: 0.2,
    });
  }, [colors]);

  const glowColor = colors[2] || "#B388FF";

  // Corona material
  const coronaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: coronaVertexShader,
      fragmentShader: coronaFragmentShader,
      uniforms: {
        uIntensity: { value: 1.0 },
        uCoronaColor: { value: new THREE.Color(glowColor) },
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
      color: new THREE.Color(glowColor),
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Outer glow halo
  const outerGlowMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(glowColor),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Slow group rotation + glow animation
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.2;
    }

    // Track time via corona uniform
    coronaMaterial.uniforms.uCoronaColor.value.set(glowColor);
    const time = performance.now() * 0.001;

    // Pulse inner glow
    if (innerGlowRef.current) {
      const mat = innerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(glowColor);
      const pulse = Math.sin(time * 1.5) * 0.08;
      mat.opacity = 0.35 + pulse;
    }

    // Pulse outer glow
    if (outerGlowRef.current) {
      const mat = outerGlowRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(glowColor);
      const pulse = Math.sin(time * 1.0 + 1.0) * 0.05;
      mat.opacity = 0.15 + pulse;
    }
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
            <mesh position={pos} material={material}>
              <dodecahedronGeometry args={[size, 0]} />
            </mesh>
          </Float>
        );
      })}

      {/* Atmosphere approximation — additive blending */}
      <mesh>
        <sphereGeometry args={[PLANET_RADIUS * 1.5, 24, 24]} />
        <meshBasicMaterial
          color={colors[2] || "#B388FF"}
          transparent
          opacity={0.25}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Fresnel corona */}
      <mesh material={coronaMaterial}>
        <sphereGeometry args={[PLANET_RADIUS * 1.15, 48, 24]} />
      </mesh>

      {/* Inner glow halo */}
      <mesh ref={innerGlowRef} material={innerGlowMaterial}>
        <sphereGeometry args={[PLANET_RADIUS * 2.0, 24, 24]} />
      </mesh>

      {/* Outer glow halo */}
      <mesh ref={outerGlowRef} material={outerGlowMaterial}>
        <sphereGeometry args={[PLANET_RADIUS * 3.0, 16, 16]} />
      </mesh>

      {/* Energy sparkles bridging chunks */}
      <Sparkles
        count={30}
        scale={PLANET_RADIUS * 3}
        size={3}
        speed={0.6}
        color={colors[2] || "#CE93D8"}
      />
    </group>
  );
}
