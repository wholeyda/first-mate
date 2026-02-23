/**
 * useGlobeInteraction
 *
 * Manages the active/idle animation state with smooth lerp transitions.
 * Used by Globe3D to control rotation speed and star intensity.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { IDLE_SPEED, ACTIVE_SPEED, SPEED_LERP } from "../constants";
import * as THREE from "three";

interface GlobeInteraction {
  sceneRef: React.RefObject<THREE.Group | null>;
  angleRef: React.MutableRefObject<number>;
  speedRef: React.MutableRefObject<number>;
  activeIntensityRef: React.MutableRefObject<number>;
}

export function useGlobeInteraction(isActive: boolean): GlobeInteraction {
  const sceneRef = useRef<THREE.Group>(null);
  const angleRef = useRef(0);
  const speedRef = useRef(IDLE_SPEED);
  const activeIntensityRef = useRef(0);

  useFrame((_, delta) => {
    // Clamp delta to avoid jumps on tab switch
    const dt = Math.min(delta, 0.1);

    // Lerp rotation speed
    const targetSpeed = isActive ? ACTIVE_SPEED : IDLE_SPEED;
    speedRef.current += (targetSpeed - speedRef.current) * SPEED_LERP;
    angleRef.current += speedRef.current * dt;

    // Lerp active intensity (0 = idle, 1 = fully active)
    const targetIntensity = isActive ? 1.0 : 0.0;
    activeIntensityRef.current += (targetIntensity - activeIntensityRef.current) * SPEED_LERP;

    // Apply rotation to scene group
    if (sceneRef.current) {
      sceneRef.current.rotation.y = angleRef.current;
    }
  });

  return { sceneRef, angleRef, speedRef, activeIntensityRef };
}
