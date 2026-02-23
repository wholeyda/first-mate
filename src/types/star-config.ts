/**
 * Star Customization Configuration
 *
 * Defines the shape of user star preferences, stored as JSONB
 * in the users table. All fields optional — missing fields
 * fall back to DEFAULT_STAR_CONFIG.
 */

export interface StarColorTheme {
  /** Primary surface color (teal equivalent). CSS hex. */
  primary: string;
  /** Secondary surface color (cyan equivalent). CSS hex. */
  secondary: string;
  /** Tertiary surface color (lavender equivalent). CSS hex. */
  tertiary: string;
  /** Corona inner color. CSS hex. */
  coronaInner: string;
  /** Corona outer color. CSS hex. */
  coronaOuter: string;
  /** Inner glow halo color. CSS hex. */
  innerGlow: string;
  /** Outer glow halo color. CSS hex. */
  outerGlow: string;
}

export interface StarStyleConfig {
  /** Glow intensity multiplier (0.5 to 2.0, default 1.0) */
  glowIntensity: number;
  /** Animation speed multiplier (0.3 to 2.0, default 1.0) */
  animationSpeed: number;
  /** Surface displacement strength (0.0 to 0.08, default 0.03) */
  displacementStrength: number;
  /** Hotspot intensity (0.0 to 1.0, default 0.35) */
  hotspotIntensity: number;
}

export interface StarConfig {
  colorTheme: StarColorTheme;
  style: StarStyleConfig;
}

export type StarThemeName =
  | "default"
  | "solar"
  | "nebula"
  | "arctic"
  | "emerald"
  | "crimson";

export const STAR_THEME_PRESETS: Record<StarThemeName, StarColorTheme> = {
  default: {
    primary: "#0DBFC7",
    secondary: "#26D9F2",
    tertiary: "#8C73D9",
    coronaInner: "#1ACCE6",
    coronaOuter: "#664DB3",
    innerGlow: "#0E8CB3",
    outerGlow: "#265999",
  },
  solar: {
    primary: "#FF8C00",
    secondary: "#FFD700",
    tertiary: "#FF4500",
    coronaInner: "#FFAA00",
    coronaOuter: "#FF6600",
    innerGlow: "#CC7000",
    outerGlow: "#994400",
  },
  nebula: {
    primary: "#9B59B6",
    secondary: "#E84393",
    tertiary: "#6C5CE7",
    coronaInner: "#D63AEE",
    coronaOuter: "#8E44AD",
    innerGlow: "#7D3C98",
    outerGlow: "#5B2C6F",
  },
  arctic: {
    primary: "#A0D4FF",
    secondary: "#E0F0FF",
    tertiary: "#C0C8E0",
    coronaInner: "#B0E0FF",
    coronaOuter: "#7090C0",
    innerGlow: "#8AB8E0",
    outerGlow: "#5080B0",
  },
  emerald: {
    primary: "#00B894",
    secondary: "#55EFC4",
    tertiary: "#00CEC9",
    coronaInner: "#00D9A0",
    coronaOuter: "#009B7D",
    innerGlow: "#008060",
    outerGlow: "#006050",
  },
  crimson: {
    primary: "#E74C3C",
    secondary: "#FF6B6B",
    tertiary: "#C0392B",
    coronaInner: "#FF5555",
    coronaOuter: "#CC3333",
    innerGlow: "#B03030",
    outerGlow: "#802020",
  },
};

export const DEFAULT_STAR_STYLE: StarStyleConfig = {
  glowIntensity: 1.0,
  animationSpeed: 1.0,
  displacementStrength: 0.03,
  hotspotIntensity: 0.35,
};

export const DEFAULT_STAR_CONFIG: StarConfig = {
  colorTheme: STAR_THEME_PRESETS.default,
  style: DEFAULT_STAR_STYLE,
};
