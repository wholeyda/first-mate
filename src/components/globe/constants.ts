/**
 * Globe Scene Constants
 *
 * Shared sizing, speed, and camera configuration for the 3D solar system.
 */

// Scene scale: 1 unit ≈ 100px at default camera distance
export const STAR_RADIUS = 2.5; // Smaller star so planets orbit visibly outside the glow
export const PLANET_ORBIT_DISTANCE = 7.0; // Well outside star glow (glow reaches ~4.5)
export const PLANET_RADIUS = 0.5; // Visible planet size

// Camera
export const CAMERA_FOV = 45;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 100;
export const CAMERA_DISTANCE = 18; // Pulled back to see full orbits
export const ZOOM_MIN_DISTANCE = 8; // Closest zoom
export const ZOOM_MAX_DISTANCE = 32; // Farthest zoom

// Rotation speeds (radians per second)
export const IDLE_SPEED = 0.15;
export const ACTIVE_SPEED = 0.6;
export const SPEED_LERP = 0.04;

// Star glow
export const IDLE_GLOW_INTENSITY = 0.8;
export const ACTIVE_GLOW_MIN = 1.0;
export const ACTIVE_GLOW_MAX = 2.5;

// Scene tilt (radians) — slight tilt for visual depth
export const SCENE_TILT = 0.3;

// Planet orbit speed multiplier (relative to global rotation)
export const ORBIT_SPEED_MULT = 0.4;

// Planet self-spin speed (radians per second)
export const PLANET_SPIN_SPEED = 0.3;
