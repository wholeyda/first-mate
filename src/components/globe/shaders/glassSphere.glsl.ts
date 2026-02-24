/**
 * Glass Sphere Shaders
 *
 * Creates a translucent glass-like sphere with animated internal
 * swirling colors and subsurface scattering approximation.
 */

import { SIMPLEX_3D_NOISE } from "./noise.glsl";

export const GLASS_SPHERE_VERTEX = /* glsl */ `
${SIMPLEX_3D_NOISE}
uniform float uTime;
uniform float uAnimSpeed;
uniform float uDisplacementStrength;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocalPos = position;

  float speed = 0.15 * uAnimSpeed;
  float displacement = snoise(position * 0.8 + uTime * speed * 0.5) * uDisplacementStrength;
  vec3 displaced = position + normal * displacement;

  vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

export const GLASS_SPHERE_FRAGMENT = /* glsl */ `
${SIMPLEX_3D_NOISE}
uniform float uTime;
uniform float uAnimSpeed;
uniform float uGlowIntensity;
uniform vec3 uColorPrimary;
uniform vec3 uColorSecondary;
uniform vec3 uColorAccent;
varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float NdotV = max(dot(vNormal, viewDir), 0.0);

  // ---- Fresnel for glass transparency ----
  float fresnel = pow(1.0 - NdotV, 3.0);

  // ---- Internal swirl color ----
  float speed = 0.12 * uAnimSpeed;
  float n1 = snoise(vLocalPos * 2.0 + uTime * speed);
  float n2 = snoise(vLocalPos * 3.5 + uTime * speed * 0.7 + 50.0);
  float n3 = snoise(vLocalPos * 5.0 - uTime * speed * 0.3 + 100.0);

  float blend = smoothstep(-0.3, 0.6, n1 * 0.5 + n2 * 0.3 + n3 * 0.2);

  vec3 swirlColor;
  if (blend < 0.45) {
    swirlColor = mix(uColorPrimary, uColorSecondary, blend / 0.45);
  } else {
    swirlColor = mix(uColorSecondary, uColorAccent, (blend - 0.45) / 0.55);
  }

  // ---- Subsurface scattering approximation ----
  float normalizedY = vLocalPos.y / length(vLocalPos);
  float subsurface = smoothstep(0.3, -0.6, normalizedY);
  vec3 sssColor = uColorAccent * subsurface * 1.5;

  // ---- Compose ----
  vec3 interiorColor = swirlColor + sssColor;
  vec3 rimColor = uColorAccent * 0.8;

  vec3 finalColor = mix(interiorColor, rimColor, fresnel * 0.4);

  // HDR emissive boost for bloom pickup
  finalColor *= (1.0 + uGlowIntensity * 0.5);

  // Alpha: mostly opaque in center, slightly transparent at edges for glass feel
  float alpha = mix(0.92, 0.55, fresnel);

  gl_FragColor = vec4(finalColor, alpha);
}
`;
