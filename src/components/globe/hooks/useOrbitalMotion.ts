/**
 * useOrbitalMotion
 *
 * Computes a planet's 3D position from its spherical coordinates
 * (theta, phi) and the current global rotation angle.
 * Replicates the orbital math from the original Canvas 2D globe.
 */

import { PLANET_ORBIT_DISTANCE, ORBIT_SPEED_MULT } from "../constants";

export function computeOrbitPosition(
  theta: number,
  phi: number,
  globalAngle: number,
  orbitDistance: number = PLANET_ORBIT_DISTANCE,
): [number, number, number] {
  const orbitTheta = theta + globalAngle * ORBIT_SPEED_MULT;

  const x = Math.sin(phi) * Math.cos(orbitTheta) * orbitDistance;
  const y = Math.cos(phi) * orbitDistance;
  const z = Math.sin(phi) * Math.sin(orbitTheta) * orbitDistance;

  return [x, y, z];
}

/**
 * Generate orbit path points for a <Line> visualization.
 * Returns an array of [x,y,z] for a full circle at the given phi.
 */
export function getOrbitPathPoints(
  phi: number,
  segments: number = 64,
  orbitDistance: number = PLANET_ORBIT_DISTANCE,
): [number, number, number][] {
  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.sin(phi) * Math.cos(theta) * orbitDistance;
    const y = Math.cos(phi) * orbitDistance;
    const z = Math.sin(phi) * Math.sin(theta) * orbitDistance;
    points.push([x, y, z]);
  }
  return points;
}
