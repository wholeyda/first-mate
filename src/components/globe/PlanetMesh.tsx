/**
 * PlanetMesh
 *
 * Dispatcher component — reads island.island_type and renders
 * the matching planet type component at the correct orbital position.
 * Handles click detection via R3F pointer events (replaces manual 2D hit-testing).
 */

"use client";

import { useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { Island } from "@/types/database";
import { computeOrbitPosition } from "./hooks/useOrbitalMotion";
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

interface PlanetMeshProps {
  island: Island;
  globalAngle: number;
  onClick?: (island: Island) => void;
}

function PlanetTypeRenderer({ type, colors }: { type: IslandTypeName; colors: string[] }) {
  switch (type) {
    case "volcanic":
      return <VolcanicPlanet colors={colors} />;
    case "crystalline":
      return <CrystallinePlanet colors={colors} />;
    case "nebula":
      return <NebulaPlanet colors={colors} />;
    case "desert":
      return <DesertPlanet colors={colors} />;
    case "steampunk":
      return <SteampunkPlanet colors={colors} />;
    case "arctic":
      return <ArcticPlanet colors={colors} />;
    case "tropical":
      return <TropicalPlanet colors={colors} />;
    case "forest":
      return <ForestPlanet colors={colors} />;
    case "garden":
      return <GardenPlanet colors={colors} />;
    case "coral":
      return <CoralPlanet colors={colors} />;
    case "bioluminescent":
      return <BioluminescentPlanet colors={colors} />;
    case "floating":
      return <FloatingPlanet colors={colors} />;
    default:
      // Fallback: tropical
      return <TropicalPlanet colors={colors} />;
  }
}

export function PlanetMesh({ island, globalAngle, onClick }: PlanetMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const position = computeOrbitPosition(
    island.position_theta,
    island.position_phi,
    globalAngle
  );

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onClick?.(island);
    },
    [island, onClick]
  );

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const colors = island.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];
  const typeName = (island.island_type || "tropical") as IslandTypeName;

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      scale={hovered ? 1.1 : 1.0}
    >
      <PlanetTypeRenderer type={typeName} colors={colors} />
    </group>
  );
}
