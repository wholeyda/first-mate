/**
 * Accretion Disk Shaders
 *
 * Animated swirling ring with color gradients,
 * spiral noise, and edge fade for a dramatic disk effect.
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
uniform vec3 uRingColor1;
uniform vec3 uRingColor2;
varying vec2 vUv;

void main() {
  // Radial distance from inner edge (0) to outer edge (1)
  float radialT = vUv.x;

  // Angular position
  float angle = vUv.y * 6.28318;

  // Swirling noise — offset angle by radial distance for spiral effect
  float spiralAngle = angle + radialT * 3.0 + uTime * 0.3 * uAnimSpeed;
  vec2 noiseCoord = vec2(
    cos(spiralAngle) * radialT * 4.0,
    sin(spiralAngle) * radialT * 4.0
  );
  float n1 = snoise2D(noiseCoord + uTime * 0.1 * uAnimSpeed);
  float n2 = snoise2D(noiseCoord * 2.0 + uTime * 0.15 * uAnimSpeed + 50.0);

  float turbulence = n1 * 0.6 + n2 * 0.4;

  // Color blend between warm and cool
  float colorT = smoothstep(-0.4, 0.4, turbulence);
  vec3 color = mix(uRingColor1, uRingColor2, colorT);

  // Brightness variation — brighter bands and darker gaps
  float bandBrightness = smoothstep(-0.2, 0.3, turbulence) * 0.6 + 0.4;
  color *= bandBrightness;

  // Fade at inner and outer edges
  float edgeFade = smoothstep(0.0, 0.15, radialT) * smoothstep(1.0, 0.85, radialT);

  // HDR for bloom
  color *= 1.5;

  float alpha = edgeFade * 0.55 * bandBrightness;

  gl_FragColor = vec4(color, alpha);
}
`;
