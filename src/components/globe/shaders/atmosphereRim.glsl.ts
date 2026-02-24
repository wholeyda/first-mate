/**
 * Atmosphere Rim Shaders
 *
 * FrontSide fresnel rim lighting with HDR values
 * for bloom pickup. Uses AdditiveBlending.
 *
 * In light mode (uIsDark=0): becomes a dark outline ring
 * instead of a glow — reinforcing the B&W illustration style.
 */

export const ATMOSPHERE_RIM_VERTEX = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const ATMOSPHERE_RIM_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
uniform float uIntensity;
uniform float uIsDark;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - dot(viewDir, vNormal);
  fresnel = pow(fresnel, 3.0);

  // ---- Dark mode: HDR glow rim for bloom ----
  vec3 darkColor = uTint * uIntensity * 2.0;
  float darkAlpha = fresnel * 0.5;

  // ---- Light mode: dark outline at edges ----
  // Invert fresnel → dark at silhouette edges
  vec3 lightColor = vec3(0.0);
  float lightAlpha = fresnel * 0.7;

  // ---- Mix based on theme ----
  vec3 color = mix(lightColor, darkColor, uIsDark);
  float alpha = mix(lightAlpha, darkAlpha, uIsDark);

  gl_FragColor = vec4(color, alpha);
}
`;
