/**
 * Globe3D — Main Scene Composition
 *
 * R3F Canvas with:
 *   - Perspective camera + OrbitControls (zoom only)
 *   - Background starfield (dark mode only)
 *   - HeroPlanet (glass sphere) at origin
 *   - Orbiting glass planets with smooth animation
 *   - Post-processing bloom for soft glow
 *   - Directional + ambient lighting
 *   - Theme-aware: B&W with outlines in light mode
 */

"use client";

import { useRef, useState, useMemo, Suspense, useCallback, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Line } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Island } from "@/types/database";
import { StarConfig } from "@/types/star-config";
import { useTheme } from "@/components/theme-provider";
import { SceneThemeProvider } from "./SceneThemeContext";
import { CentralStar } from "./CentralStar";
import { RocketFleet } from "./RocketShip";
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
  isDark: boolean;
  voiceAmplitude?: number;
  voiceMode?: boolean;
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
  voiceAmplitude = 0,
  voiceMode = false,
}: {
  activeIntensityRef: React.MutableRefObject<number>;
  starConfig?: StarConfig;
  onStarClick?: () => void;
  voiceAmplitude?: number;
  voiceMode?: boolean;
}) {
  const [intensity, setIntensity] = useState(0);
  const pulseTimeRef = useRef(0);

  useFrame((_, delta) => {
    pulseTimeRef.current += delta;

    // Use voice amplitude if active, otherwise fall back to chat active intensity
    const current = voiceAmplitude > 0.01 ? voiceAmplitude : activeIntensityRef.current;
    if (Math.abs(current - intensity) > 0.02) {
      setIntensity(current);
    }
  });

  // In voice mode, add a sinusoidal pulse on top of the amplitude
  // This keeps the planet alive even during silence/processing
  const voicePulse = voiceMode
    ? voiceAmplitude + Math.sin(pulseTimeRef.current * 2.5) * 0.08 + 0.08
    : voiceAmplitude;

  return (
    <CentralStar
      activeIntensity={intensity}
      config={starConfig}
      onStarClick={onStarClick}
      voiceAmplitude={voicePulse}
      voiceMode={voiceMode}
    />
  );
}

// ---- Camera controller — zooms in when entering voice mode ----
function CameraController({ voiceMode }: { voiceMode: boolean }) {
  const { camera } = useThree();
  const targetZRef = useRef(CAMERA_DISTANCE);
  const targetYRef = useRef(3);

  useEffect(() => {
    // When entering voice mode: zoom in close, center vertically
    // When exiting: zoom back out to default position
    targetZRef.current = voiceMode ? 10 : CAMERA_DISTANCE;
    targetYRef.current = voiceMode ? 0 : 3;
  }, [voiceMode]);

  useFrame(() => {
    camera.position.z += (targetZRef.current - camera.position.z) * 0.06;
    camera.position.y += (targetYRef.current - camera.position.y) * 0.06;
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ---- Main scene (inside Canvas) ----
function Scene({ isActive, islands, onIslandClick, starConfig, onStarClick, isDark, voiceAmplitude = 0, voiceMode = false }: SceneProps) {
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
    <SceneThemeProvider isDark={isDark}>
      {/* Camera zoom controller */}
      <CameraController voiceMode={voiceMode} />

      <group rotation={[SCENE_TILT, 0, 0]}>
        {/* Hero planet (formerly central star) */}
        <CentralStarAnimated
          activeIntensityRef={activeIntensityRef}
          starConfig={starConfig}
          onStarClick={onStarClick}
          voiceAmplitude={voiceAmplitude}
          voiceMode={voiceMode}
        />

        {/* Orbit path lines — hidden in voice mode */}
        {!voiceMode && orbitPaths.map(({ id, points }) => (
          <Line
            key={`orbit-${id}`}
            points={points}
            color={isDark ? "white" : "#333333"}
            lineWidth={0.5}
            opacity={isDark ? 0.08 : 0.15}
            transparent
          />
        ))}

        {/* Orbiting planets — hidden in voice mode */}
        {!voiceMode && islands.map((island) => (
          <OrbitingPlanet
            key={island.id}
            island={island}
            angleRef={angleRef}
            onClick={onIslandClick}
          />
        ))}

        {/* Rocket ships flying between planets — hidden in voice mode */}
        {!voiceMode && islands.length >= 2 && (
          <RocketFleet islands={islands} angleRef={angleRef} />
        )}

        {/* Lighting — brighter in light mode for B&W look */}
        <ambientLight intensity={isDark ? 0.25 : 0.8} />
        <directionalLight
          position={[10, 8, 5]}
          intensity={isDark ? 0.6 : 1.0}
          color="#FFFFFF"
        />
        <pointLight
          position={[15, 8, 10]}
          intensity={isDark ? 0.5 : 0.8}
          color="#FFFFFF"
        />
      </group>
    </SceneThemeProvider>
  );
}

// ---- Exported Canvas wrapper ----
export function Globe3DCanvas({
  isActive,
  islands,
  onIslandClick,
  starConfig,
  onStarClick,
  voiceAmplitude = 0,
  voiceMode = false,
}: Omit<SceneProps, "isDark">) {
  // Read theme from app-level context (outside Canvas)
  const { isDark } = useTheme();

  return (
    <div className="w-full h-full">
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
          {/* Background starfield — only in dark mode, hidden in voice mode */}
          {isDark && !voiceMode && (
            <Stars
              radius={50}
              depth={50}
              count={3000}
              factor={4}
              saturation={0}
              fade
              speed={0.5}
            />
          )}

          {/* Main scene */}
          <Scene
            isActive={isActive}
            islands={islands}
            onIslandClick={onIslandClick}
            starConfig={starConfig}
            onStarClick={onStarClick}
            isDark={isDark}
            voiceAmplitude={voiceAmplitude}
            voiceMode={voiceMode}
          />

          {/* Post-processing — reduced bloom in light mode */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={isDark ? 0.4 : 0.9}
              luminanceSmoothing={0.9}
              intensity={isDark ? 1.2 : 0.2}
              radius={0.8}
              mipmapBlur
            />
          </EffectComposer>

          {/* Camera controls: zoom only (disabled during voice mode so camera can animate freely) */}
          <OrbitControls
            enableRotate={false}
            enablePan={false}
            enableZoom={!voiceMode}
            minDistance={ZOOM_MIN_DISTANCE}
            maxDistance={ZOOM_MAX_DISTANCE}
            zoomSpeed={0.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
