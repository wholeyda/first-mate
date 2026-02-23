/**
 * Globe Type Definitions
 *
 * Visual configuration for each of the 12 planet types.
 */

export type IslandTypeName =
  | "tropical" | "volcanic" | "crystalline" | "floating"
  | "bioluminescent" | "coral" | "arctic" | "desert"
  | "forest" | "steampunk" | "nebula" | "garden";

export const WORK_TYPES: IslandTypeName[] = [
  "steampunk", "crystalline", "nebula", "desert", "volcanic", "arctic",
];

export const PERSONAL_TYPES: IslandTypeName[] = [
  "tropical", "forest", "garden", "coral", "bioluminescent", "floating",
];

export interface PlanetVisualConfig {
  /** Whether this type has Saturn-like rings */
  hasRings: boolean;
  /** Base roughness for the material */
  roughness: number;
  /** Base metalness for the material */
  metalness: number;
  /** Whether the surface has vertex displacement */
  displaced: boolean;
  /** Atmosphere color tint (CSS hex) */
  atmosphereTint: string;
  /** Atmosphere opacity (0-1) */
  atmosphereOpacity: number;
  /** Sparkle/particle count for ambient effects */
  sparkleCount: number;
  /** Sparkle color */
  sparkleColor: string;
}

/** Default visual config per type */
export const PLANET_CONFIGS: Record<IslandTypeName, PlanetVisualConfig> = {
  volcanic: {
    hasRings: false, roughness: 0.9, metalness: 0.1, displaced: true,
    atmosphereTint: "#FF4500", atmosphereOpacity: 0.35,
    sparkleCount: 40, sparkleColor: "#FF6B00",
  },
  crystalline: {
    hasRings: false, roughness: 0.05, metalness: 0.95, displaced: false,
    atmosphereTint: "#E0E0FF", atmosphereOpacity: 0.2,
    sparkleCount: 30, sparkleColor: "#FFFFFF",
  },
  nebula: {
    hasRings: true, roughness: 0.6, metalness: 0.0, displaced: false,
    atmosphereTint: "#9B59B6", atmosphereOpacity: 0.5,
    sparkleCount: 20, sparkleColor: "#D4A5FF",
  },
  desert: {
    hasRings: true, roughness: 0.95, metalness: 0.0, displaced: true,
    atmosphereTint: "#D4A574", atmosphereOpacity: 0.4,
    sparkleCount: 25, sparkleColor: "#E8C89E",
  },
  steampunk: {
    hasRings: true, roughness: 0.3, metalness: 0.85, displaced: false,
    atmosphereTint: "#C8A882", atmosphereOpacity: 0.25,
    sparkleCount: 15, sparkleColor: "#FFD700",
  },
  arctic: {
    hasRings: true, roughness: 0.8, metalness: 0.0, displaced: false,
    atmosphereTint: "#A0D4FF", atmosphereOpacity: 0.3,
    sparkleCount: 35, sparkleColor: "#FFFFFF",
  },
  tropical: {
    hasRings: false, roughness: 0.7, metalness: 0.0, displaced: false,
    atmosphereTint: "#87CEEB", atmosphereOpacity: 0.25,
    sparkleCount: 10, sparkleColor: "#FFFFFF",
  },
  forest: {
    hasRings: false, roughness: 0.85, metalness: 0.0, displaced: true,
    atmosphereTint: "#90EE90", atmosphereOpacity: 0.3,
    sparkleCount: 20, sparkleColor: "#BFFF00",
  },
  garden: {
    hasRings: false, roughness: 0.7, metalness: 0.0, displaced: false,
    atmosphereTint: "#FFD700", atmosphereOpacity: 0.2,
    sparkleCount: 25, sparkleColor: "#FFB6C1",
  },
  coral: {
    hasRings: false, roughness: 0.75, metalness: 0.0, displaced: true,
    atmosphereTint: "#FF7F7F", atmosphereOpacity: 0.3,
    sparkleCount: 20, sparkleColor: "#FFB6C1",
  },
  bioluminescent: {
    hasRings: false, roughness: 0.6, metalness: 0.1, displaced: false,
    atmosphereTint: "#00FFFF", atmosphereOpacity: 0.4,
    sparkleCount: 30, sparkleColor: "#00FF88",
  },
  floating: {
    hasRings: false, roughness: 0.7, metalness: 0.1, displaced: false,
    atmosphereTint: "#B388FF", atmosphereOpacity: 0.3,
    sparkleCount: 30, sparkleColor: "#CE93D8",
  },
};
