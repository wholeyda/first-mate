/**
 * Debris Ring Shaders
 *
 * Dense cloud of debris particles with turbulent noise,
 * discrete rock-like clumps, and varying density gaps.
 * Replaces the smooth-banded accretion disk.
 *
 * In light mode (uIsDark=0): grayscale debris with dark edges.
 */

import { SIMPLEX_2D_NOISE } from "./noise.glsl";

export const ACCRETION_DISK_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ACCRETION_DISK_FRAGMENT = /* glsl */ `
${SIMPLEX_2D_NOISE}
uniform float uTime;
uniform float uAnimSpeed;
uniform float uIsDark;
uniform vec3 uRingColor1;
uniform vec3 uRingColor2;
varying vec2 vUv;

void main() {
  float radialT = vUv.x;
  float angle = vUv.y * 6.28318;

  // ---- Multi-octave turbulent noise for debris cloud ----
  float spiralAngle = angle + radialT * 4.0 + uTime * 0.2 * uAnimSpeed;
  vec2 nc = vec2(
    cos(spiralAngle) * radialT * 5.0,
    sin(spiralAngle) * radialT * 5.0
  );

  // Low-frequency: large-scale density variation
  float n1 = snoise2D(nc * 1.0 + uTime * 0.08 * uAnimSpeed);
  // Mid-frequency: clump shapes
  float n2 = snoise2D(nc * 3.0 + uTime * 0.12 * uAnimSpeed + 30.0);
  // High-frequency: fine debris grains
  float n3 = snoise2D(nc * 8.0 + uTime * 0.05 * uAnimSpeed + 80.0);
  // Very high-frequency: individual rock highlights
  float n4 = snoise2D(nc * 16.0 - uTime * 0.03 * uAnimSpeed + 150.0);

  float turbulence = n1 * 0.35 + n2 * 0.30 + n3 * 0.20 + n4 * 0.15;

  // ---- Discrete particle clumps via step thresholding ----
  // Creates gaps and dense patches instead of smooth bands
  float particleDensity = smoothstep(-0.15, 0.1, turbulence);
  // Hard-edged rocks within the clouds
  float rocks = smoothstep(0.25, 0.35, turbulence) * 0.5;
  // Bright individual rock highlights (sparse)
  float highlights = smoothstep(0.45, 0.55, turbulence) * 0.8;

  float density = particleDensity + rocks;

  // ---- Color blend ----
  float colorT = smoothstep(-0.3, 0.4, n1 + n2 * 0.5);
  vec3 darkColor = mix(uRingColor1, uRingColor2, colorT);

  // Add brightness variation for depth
  darkColor *= (0.5 + density * 0.5);
  // Bright rock highlights
  darkColor += highlights * mix(uRingColor2, vec3(1.0), 0.3);

  // HDR boost for bloom (dark mode)
  darkColor *= 1.3;

  // ---- Radial density profile — denser in middle, sparse at edges ----
  float radialDensity = smoothstep(0.0, 0.2, radialT) * smoothstep(1.0, 0.75, radialT);
  // Extra concentration in inner-mid band
  float innerConcentration = exp(-pow((radialT - 0.35) * 3.0, 2.0)) * 0.4;
  radialDensity += innerConcentration;

  // ---- Alpha: gaps in debris cloud ----
  float darkAlpha = radialDensity * density * 0.6;
  // Cut holes for gaps between debris clusters
  float gapNoise = snoise2D(nc * 2.5 + 200.0);
  darkAlpha *= smoothstep(-0.3, 0.1, gapNoise);

  // ---- Light mode: grayscale debris ----
  float lum = dot(darkColor, vec3(0.299, 0.587, 0.114));
  vec3 lightColor = vec3(0.3 + lum * 0.3);
  // Darken edges of debris clumps for outline effect
  float clumpEdge = smoothstep(0.05, 0.15, turbulence) - smoothstep(0.15, 0.25, turbulence);
  lightColor -= clumpEdge * 0.2;
  float lightAlpha = radialDensity * density * 0.7;
  lightAlpha *= smoothstep(-0.3, 0.1, gapNoise);

  // ---- Mix based on theme ----
  vec3 color = mix(lightColor, darkColor, uIsDark);
  float alpha = mix(lightAlpha, darkAlpha, uIsDark);

  gl_FragColor = vec4(color, alpha);
}
`;
