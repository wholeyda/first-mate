/**
 * CubeRing
 *
 * A ring of tiny color-shifting cubes orbiting around a planet.
 * Uses InstancedMesh for performance — each cube gets its own
 * position in a torus ring and animates color over time.
 */

"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneTheme } from "./SceneThemeContext";

interface CubeRingProps {
  /** Inner radius of the ring (distance from planet center) */
  innerRadius: number;
  /** Outer radius of the ring */
  outerRadius: number;
  /** Number of cubes in the ring */
  count?: number;
  /** Size of each cube */
  cubeSize?: number;
  /** Primary ring color */
  color1: string;
  /** Secondary ring color */
  color2: string;
  /** Ring tilt as [x, y, z] euler rotation in radians */
  tilt?: [number, number, number];
  /** Animation speed multiplier */
  speed?: number;
}

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export function CubeRing({
  innerRadius,
  outerRadius,
  count = 200,
  cubeSize = 0.04,
  color1,
  color2,
  tilt = [Math.PI * 0.42, 0, 0],
  speed = 1.0,
}: CubeRingProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const isDark = useSceneTheme();

  // Pre-compute random offsets for each cube
  const particleData = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const radiusOffset = innerRadius + Math.random() * (outerRadius - innerRadius);
      // Slight vertical scatter for thickness
      const yOffset = (Math.random() - 0.5) * (outerRadius - innerRadius) * 0.4;
      // Random phase for color cycling
      const colorPhase = Math.random() * Math.PI * 2;
      // Random orbit speed variation
      const speedVar = 0.7 + Math.random() * 0.6;
      // Random initial rotation
      const rotX = Math.random() * Math.PI;
      const rotY = Math.random() * Math.PI;
      const rotZ = Math.random() * Math.PI;
      // Random size variation
      const sizeVar = 0.6 + Math.random() * 0.8;

      data.push({ angle, radiusOffset, yOffset, colorPhase, speedVar, rotX, rotY, rotZ, sizeVar });
    }
    return data;
  }, [count, innerRadius, outerRadius]);

  const c1 = useMemo(() => new THREE.Color(color1), [color1]);
  const c2 = useMemo(() => new THREE.Color(color2), [color2]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime * speed;
    const darkVal = isDark ? 1.0 : 0.0;

    for (let i = 0; i < count; i++) {
      const p = particleData[i];
      const currentAngle = p.angle + t * 0.3 * p.speedVar;

      const x = Math.cos(currentAngle) * p.radiusOffset;
      const z = Math.sin(currentAngle) * p.radiusOffset;
      const y = p.yOffset;

      _dummy.position.set(x, y, z);

      // Tumbling rotation
      _dummy.rotation.set(
        p.rotX + t * 0.5 * p.speedVar,
        p.rotY + t * 0.3 * p.speedVar,
        p.rotZ + t * 0.2 * p.speedVar
      );

      const s = cubeSize * p.sizeVar;
      _dummy.scale.set(s, s, s);
      _dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, _dummy.matrix);

      // Color cycling — smoothly interpolate between color1 and color2
      const colorT = Math.sin(t * 0.8 + p.colorPhase) * 0.5 + 0.5;

      if (isDark) {
        _color.copy(c1).lerp(c2, colorT);
        // HDR boost for bloom
        _color.multiplyScalar(1.5);
      } else {
        // Light mode: grayscale cubes
        const lum = 0.3 + colorT * 0.3;
        _color.setRGB(lum, lum, lum);
      }

      meshRef.current.setColorAt(i, _color);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group rotation={tilt}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          toneMapped={false}
          transparent
          opacity={0.9}
          roughness={0.3}
          metalness={0.2}
        />
      </instancedMesh>
    </group>
  );
}
