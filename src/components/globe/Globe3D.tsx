/**
 * Globe3D — Main Scene Composition
 *
 * R3F Canvas with:
 *   - Perspective camera + OrbitControls (zoom only)
 *   - Background starfield
 *   - CentralStar at origin
 *   - PlanetMesh for each island with orbit path lines
 *   - Global rotation + active/idle lerp via useFrame
 *   - Ambient + point light setup
 */

"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Line } from "@react-three/drei";
import * as THREE from "three";
import { Island } from "@/types/database";
import { CentralStar } from "./CentralStar";
import { PlanetMesh } from "./PlanetMesh";
import { getOrbitPathPoints } from "./hooks/useOrbitalMotion";
import {
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_FAR,
  CAMERA_DISTANCE,
  ZOOM_MIN_DISTANCE,
  ZOOM_MAX_DISTANCE,
  IDLE_SPEED,
  ACTIVE_SPEED,
  SPEED_LERP,
  SCENE_TILT,
} from "./constants";

interface SceneProps {
  isActive: boolean;
  islands: Island[];
  onIslandClick?: (island: Island) => void;
}

/**
 * Inner scene component — must live inside <Canvas>
 */
function Scene({ isActive, islands, onIslandClick }: SceneProps) {
  const sceneGroupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(IDLE_SPEED);
  const activeIntensityRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Lerp rotation speed
    const targetSpeed = isActive ? ACTIVE_SPEED : IDLE_SPEED;
    speedRef.current += (targetSpeed - speedRef.current) * SPEED_LERP;
    angleRef.current += speedRef.current * dt;

    // Lerp active intensity (0 = idle, 1 = fully active)
    const targetIntensity = isActive ? 1.0 : 0.0;
    activeIntensityRef.current +=
      (targetIntensity - activeIntensityRef.current) * SPEED_LERP;
  });

  // Read current angle/intensity from refs in render (not in useFrame callback)
  // We pass the ref values through a wrapper that reads them every frame
  return (
    <group ref={sceneGroupRef} rotation={[SCENE_TILT, 0, 0]}>
      {/* Central star */}
      <AnimatedCentralStar activeIntensityRef={activeIntensityRef} />

      {/* Orbit paths */}
      {islands.map((island) => {
        const points = getOrbitPathPoints(island.position_phi);
        return (
          <Line
            key={`orbit-${island.id}`}
            points={points}
            color="white"
            lineWidth={0.5}
            opacity={0.08}
            transparent
          />
        );
      })}

      {/* Planets */}
      {islands.map((island) => (
        <AnimatedPlanet
          key={island.id}
          island={island}
          angleRef={angleRef}
          onClick={onIslandClick}
        />
      ))}

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#66CCFF" distance={30} />
      <pointLight position={[10, 5, 10]} intensity={0.5} color="#FFFFFF" />
    </group>
  );
}

/**
 * Wrapper that reads angleRef every frame to pass current value to PlanetMesh
 */
function AnimatedPlanet({
  island,
  angleRef,
  onClick,
}: {
  island: Island;
  angleRef: React.MutableRefObject<number>;
  onClick?: (island: Island) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    // Force re-render by updating position directly
    if (groupRef.current) {
      // Trigger React reconciliation by using key — but for performance,
      // we update the child group's position directly
    }
  });

  // We use a component that reads the ref in useFrame for smooth animation
  return <PlanetMeshAnimated island={island} angleRef={angleRef} onClick={onClick} />;
}

/**
 * Reads angleRef in useFrame and updates group position directly
 */
function PlanetMeshAnimated({
  island,
  angleRef,
  onClick,
}: {
  island: Island;
  angleRef: React.MutableRefObject<number>;
  onClick?: (island: Island) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    const [x, y, z] = computeOrbitPositionDirect(
      island.position_theta,
      island.position_phi,
      angleRef.current
    );
    groupRef.current.position.set(x, y, z);
  });

  const colors = island.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];

  return (
    <group ref={groupRef}>
      <PlanetMesh island={island} globalAngle={0} onClick={onClick} />
    </group>
  );
}

// Direct computation (avoiding hook overhead in useFrame)
import { PLANET_ORBIT_DISTANCE, ORBIT_SPEED_MULT } from "./constants";

function computeOrbitPositionDirect(
  theta: number,
  phi: number,
  globalAngle: number
): [number, number, number] {
  const orbitTheta = theta + globalAngle * ORBIT_SPEED_MULT;
  const x = Math.sin(phi) * Math.cos(orbitTheta) * PLANET_ORBIT_DISTANCE;
  const y = Math.cos(phi) * PLANET_ORBIT_DISTANCE;
  const z = Math.sin(phi) * Math.sin(orbitTheta) * PLANET_ORBIT_DISTANCE;
  return [x, y, z];
}

/**
 * Reads activeIntensityRef in useFrame for smooth animation
 */
function AnimatedCentralStar({
  activeIntensityRef,
}: {
  activeIntensityRef: React.MutableRefObject<number>;
}) {
  // We need to pass a value to CentralStar that updates every frame.
  // Since CentralStar uses its own useFrame, we can pass the ref directly
  // and have CentralStar read it. But CentralStar takes a number prop.
  // Solution: thin wrapper that reads ref and forces re-render via useFrame.
  const intensityRef = useRef(0);

  useFrame(() => {
    intensityRef.current = activeIntensityRef.current;
  });

  // CentralStar uses its own useFrame to read uniforms, so passing ref value
  // at the last render is fine — it won't be perfectly frame-synced but close enough.
  // The CentralStar's own useFrame reads activeIntensity from its prop.
  return <CentralStarBridge activeIntensityRef={activeIntensityRef} />;
}

/**
 * Bridge component that passes ref value to CentralStar
 * using a state update throttled to avoid excessive re-renders.
 */
import { useState, useEffect } from "react";

function CentralStarBridge({
  activeIntensityRef,
}: {
  activeIntensityRef: React.MutableRefObject<number>;
}) {
  // Read ref value and pass to CentralStar
  // CentralStar's shaders do the heavy lifting via uniforms,
  // so we just need a rough activeIntensity value (not frame-perfect)
  const [intensity, setIntensity] = useState(0);

  useFrame(() => {
    // Only update React state every ~100ms to avoid perf hit
    const current = activeIntensityRef.current;
    if (Math.abs(current - intensity) > 0.05) {
      setIntensity(current);
    }
  });

  return <CentralStar activeIntensity={intensity} />;
}

/**
 * Globe3DCanvas — the exported component
 *
 * Wraps everything in a Canvas with camera config and controls.
 */
export function Globe3DCanvas({ isActive, islands, onIslandClick }: SceneProps) {
  return (
    <div className="w-[900px] h-[900px]">
      <Canvas
        camera={{
          fov: CAMERA_FOV,
          near: CAMERA_NEAR,
          far: CAMERA_FAR,
          position: [0, 2, CAMERA_DISTANCE],
        }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          {/* Background starfield */}
          <Stars
            radius={50}
            depth={50}
            count={3000}
            factor={4}
            saturation={0}
            fade
            speed={0.5}
          />

          {/* Main scene */}
          <Scene
            isActive={isActive}
            islands={islands}
            onIslandClick={onIslandClick}
          />

          {/* Camera controls: zoom only */}
          <OrbitControls
            enableRotate={false}
            enablePan={false}
            enableZoom
            minDistance={ZOOM_MIN_DISTANCE}
            maxDistance={ZOOM_MAX_DISTANCE}
            zoomSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
