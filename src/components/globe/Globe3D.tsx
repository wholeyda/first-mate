/**
 * Globe3D — Main Scene Composition
 *
 * R3F Canvas with:
 *   - Perspective camera + OrbitControls (zoom only)
 *   - Background starfield
 *   - HeroPlanet (glass sphere) at origin
 *   - Orbiting glass planets with smooth animation
 *   - Post-processing bloom for soft glow
 *   - Directional + ambient lighting
 */

"use client";

import { useRef, useState, useMemo, Suspense, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, Line } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Island } from "@/types/database";
import { StarConfig } from "@/types/star-config";
import { CentralStar } from "./CentralStar";
import { getOrbitPathPoints } from "./hooks/useOrbitalMotion";
import { IslandTypeName } from "./types";
import {
  VolcanicPlanet,
  CrystallinePlanet,
  NebulaPlanet,
  DesertPlanet,
  SteampunkPlanet,
  ArcticPlanet,
  TropicalPlanet,
  ForestPlanet,
  GardenPlanet,
  CoralPlanet,
  BioluminescentPlanet,
  FloatingPlanet,
} from "./planet-types";
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
  PLANET_ORBIT_DISTANCE,
  ORBIT_SPEED_MULT,
} from "./constants";

interface SceneProps {
  isActive: boolean;
  islands: Island[];
  onIslandClick?: (island: Island) => void;
  starConfig?: StarConfig;
  onStarClick?: () => void;
}

// ---- Planet type renderer (inline to avoid import cycle) ----
function PlanetTypeRenderer({ type, colors }: { type: string; colors: string[] }) {
  switch (type as IslandTypeName) {
    case "volcanic": return <VolcanicPlanet colors={colors} />;
    case "crystalline": return <CrystallinePlanet colors={colors} />;
    case "nebula": return <NebulaPlanet colors={colors} />;
    case "desert": return <DesertPlanet colors={colors} />;
    case "steampunk": return <SteampunkPlanet colors={colors} />;
    case "arctic": return <ArcticPlanet colors={colors} />;
    case "tropical": return <TropicalPlanet colors={colors} />;
    case "forest": return <ForestPlanet colors={colors} />;
    case "garden": return <GardenPlanet colors={colors} />;
    case "coral": return <CoralPlanet colors={colors} />;
    case "bioluminescent": return <BioluminescentPlanet colors={colors} />;
    case "floating": return <FloatingPlanet colors={colors} />;
    default: return <TropicalPlanet colors={colors} />;
  }
}

// ---- Orbiting planet — position updated every frame via useFrame ----
function OrbitingPlanet({
  island,
  angleRef,
  onClick,
}: {
  island: Island;
  angleRef: React.MutableRefObject<number>;
  onClick?: (island: Island) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const colors = island.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];
  const typeName = island.island_type || "tropical";

  // Update orbital position every frame
  useFrame(() => {
    if (!groupRef.current) return;
    const orbitTheta = island.position_theta + angleRef.current * ORBIT_SPEED_MULT;
    const phi = island.position_phi;
    const x = Math.sin(phi) * Math.cos(orbitTheta) * PLANET_ORBIT_DISTANCE;
    const y = Math.cos(phi) * PLANET_ORBIT_DISTANCE;
    const z = Math.sin(phi) * Math.sin(orbitTheta) * PLANET_ORBIT_DISTANCE;
    groupRef.current.position.set(x, y, z);
  });

  const handleClick = useCallback(
    (e: THREE.Event) => {
      (e as any).stopPropagation?.();
      onClick?.(island);
    },
    [island, onClick]
  );

  return (
    <group
      ref={groupRef}
      onClick={handleClick as any}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      scale={hovered ? 1.15 : 1.0}
    >
      <PlanetTypeRenderer type={typeName} colors={colors} />
    </group>
  );
}

// ---- Central star bridge — passes ref intensity + config to CentralStar ----
function CentralStarAnimated({
  activeIntensityRef,
  starConfig,
  onStarClick,
}: {
  activeIntensityRef: React.MutableRefObject<number>;
  starConfig?: StarConfig;
  onStarClick?: () => void;
}) {
  const [intensity, setIntensity] = useState(0);

  useFrame(() => {
    const current = activeIntensityRef.current;
    if (Math.abs(current - intensity) > 0.02) {
      setIntensity(current);
    }
  });

  return (
    <CentralStar
      activeIntensity={intensity}
      config={starConfig}
      onStarClick={onStarClick}
    />
  );
}

// ---- Main scene (inside Canvas) ----
function Scene({ isActive, islands, onIslandClick, starConfig, onStarClick }: SceneProps) {
  const angleRef = useRef(0);
  const speedRef = useRef(IDLE_SPEED);
  const activeIntensityRef = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Lerp rotation speed
    const targetSpeed = isActive ? ACTIVE_SPEED : IDLE_SPEED;
    speedRef.current += (targetSpeed - speedRef.current) * SPEED_LERP;
    angleRef.current += speedRef.current * dt;

    // Lerp active intensity
    const targetIntensity = isActive ? 1.0 : 0.0;
    activeIntensityRef.current +=
      (targetIntensity - activeIntensityRef.current) * SPEED_LERP;
  });

  // Pre-compute orbit path points (static, don't change per frame)
  const orbitPaths = useMemo(() => {
    return islands.map((island) => ({
      id: island.id,
      points: getOrbitPathPoints(island.position_phi),
    }));
  }, [islands]);

  return (
    <group rotation={[SCENE_TILT, 0, 0]}>
      {/* Hero planet (formerly central star) */}
      <CentralStarAnimated
        activeIntensityRef={activeIntensityRef}
        starConfig={starConfig}
        onStarClick={onStarClick}
      />

      {/* Orbit path lines */}
      {orbitPaths.map(({ id, points }) => (
        <Line
          key={`orbit-${id}`}
          points={points}
          color="white"
          lineWidth={0.5}
          opacity={0.08}
          transparent
        />
      ))}

      {/* Orbiting planets */}
      {islands.map((island) => (
        <OrbitingPlanet
          key={island.id}
          island={island}
          angleRef={angleRef}
          onClick={onIslandClick}
        />
      ))}

      {/* Lighting — directional + ambient (no point light at origin, hero self-illuminates) */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[10, 8, 5]} intensity={0.6} color="#FFFFFF" />
      <pointLight position={[15, 8, 10]} intensity={0.5} color="#FFFFFF" />
    </group>
  );
}

// ---- Exported Canvas wrapper ----
export function Globe3DCanvas({ isActive, islands, onIslandClick, starConfig, onStarClick }: SceneProps) {
  return (
    <div className="w-[900px] h-[900px]">
      <Canvas
        camera={{
          fov: CAMERA_FOV,
          near: CAMERA_NEAR,
          far: CAMERA_FAR,
          position: [0, 3, CAMERA_DISTANCE],
        }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
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
            starConfig={starConfig}
            onStarClick={onStarClick}
          />

          {/* Post-processing — soft bloom for emissive glow */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.4}
              luminanceSmoothing={0.9}
              intensity={1.2}
              radius={0.8}
              mipmapBlur
            />
          </EffectComposer>

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
