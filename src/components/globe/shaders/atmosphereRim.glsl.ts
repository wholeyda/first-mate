/**
 * Atmosphere Rim Shaders
 *
 * FrontSide fresnel rim lighting with HDR values
 * for bloom pickup. Uses AdditiveBlending.
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
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec3 viewDir = normalize(cameraPosition - vWorldPos);
  float fresnel = 1.0 - dot(viewDir, vNormal);
  fresnel = pow(fresnel, 3.0);

  // HDR values so bloom catches the rim
  vec3 color = uTint * uIntensity * 2.0;
  float alpha = fresnel * 0.5;

  gl_FragColor = vec4(color, alpha);
}
`;
