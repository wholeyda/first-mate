/**
 * Avatar State Machine & Persistence
 *
 * Manages: tier, mood, category theme, customization, goal history.
 * All state persisted to localStorage with hydration on mount.
 */

// ═══════════════════════════════════
// TYPES
// ═══════════════════════════════════

export type Mood = "idle" | "waiting" | "bored" | "happy" | "excited" | "celebrating" | "cinematic";
export type Category = "fitness" | "learning" | "creative" | "mindfulness";
export type ParticleStyle = "sparks" | "bubbles" | "leaves" | "code";
export type EmoteStyle = "idle-dance" | "victory-spin" | "robot-wave";
export type AuraShape = "sphere" | "wings" | "orbital-ring" | "explosion";

export interface CompletedGoal {
  title: string;
  category: Category;
  completedAt: string;
}

export interface AvatarCustomization {
  visorColor: string;
  visorGlowPattern: "solid" | "pulse" | "breathe" | "flicker";
  accentColor: string;
  particleStyle: ParticleStyle;
  emoteStyle: EmoteStyle;
  auraShape: AuraShape;
}

export interface AvatarState {
  completedGoalCount: number;
  currentMood: Mood;
  currentCategory: Category;
  customization: AvatarCustomization;
  goalHistory: CompletedGoal[];
  lastGoalCompletedAt: string | null;
  lastInteractionAt: string;
  pendingTierUnlock: number | null;
}

// ═══════════════════════════════════
// TIER CONFIGURATION
// ═══════════════════════════════════

export interface TierConfig {
  id: number;
  name: string;
  subtitle: string;
  threshold: number;
  hoverHeight: number;
  scale: number;
  starDensity: number;
  starBrightness: number;
}

export const TIERS: TierConfig[] = [
  { id: 0, name: "UNKNOWN",   subtitle: "Dormant potential",   threshold: 0,  hoverHeight: 0,  scale: 1.0,  starDensity: 0.3, starBrightness: 0.3 },
  { id: 1, name: "SPARK",     subtitle: "First light",        threshold: 1,  hoverHeight: 8,  scale: 1.0,  starDensity: 0.5, starBrightness: 0.5 },
  { id: 2, name: "IGNITION",  subtitle: "Burning bright",     threshold: 3,  hoverHeight: 8,  scale: 1.0,  starDensity: 0.65, starBrightness: 0.65 },
  { id: 3, name: "ASCENT",    subtitle: "Rising above",       threshold: 7,  hoverHeight: 10, scale: 1.1,  starDensity: 0.8, starBrightness: 0.8 },
  { id: 4, name: "OVERDRIVE", subtitle: "Beyond limits",      threshold: 15, hoverHeight: 20, scale: 1.1,  starDensity: 1.0, starBrightness: 1.0 },
  { id: 5, name: "LEGEND",    subtitle: "Cosmic transcendence", threshold: 30, hoverHeight: 40, scale: 1.15, starDensity: 1.0, starBrightness: 1.0 },
];

export function getTier(goalCount: number): TierConfig {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (goalCount >= TIERS[i].threshold) return TIERS[i];
  }
  return TIERS[0];
}

export function getNextTier(goalCount: number): TierConfig | null {
  const current = getTier(goalCount);
  const nextIdx = TIERS.findIndex(t => t.id === current.id) + 1;
  return nextIdx < TIERS.length ? TIERS[nextIdx] : null;
}

export function goalsToNextTier(goalCount: number): number {
  const next = getNextTier(goalCount);
  return next ? next.threshold - goalCount : 0;
}

// ═══════════════════════════════════
// CATEGORY THEMES
// ═══════════════════════════════════

export interface CategoryTheme {
  id: Category;
  label: string;
  subtitle: string;
  icon: string;
  colors: { primary: string; secondary: string; glow: string; bg: string };
  particleType: string;
}

export const CATEGORY_THEMES: Record<Category, CategoryTheme> = {
  fitness: {
    id: "fitness", label: "Fitness", subtitle: "VOLCANIC",
    icon: "🔥",
    colors: { primary: "#FF4500", secondary: "#FF8C00", glow: "#FF6347", bg: "rgba(255,69,0,0.08)" },
    particleType: "embers",
  },
  learning: {
    id: "learning", label: "Learning", subtitle: "HOLOGRAPHIC",
    icon: "⚡",
    colors: { primary: "#00E5FF", secondary: "#0080FF", glow: "#00BFFF", bg: "rgba(0,229,255,0.08)" },
    particleType: "code",
  },
  creative: {
    id: "creative", label: "Creative", subtitle: "PRISMATIC",
    icon: "✦",
    colors: { primary: "#DA70D6", secondary: "#FFD700", glow: "#FF69B4", bg: "rgba(218,112,214,0.08)" },
    particleType: "paint",
  },
  mindfulness: {
    id: "mindfulness", label: "Mindfulness", subtitle: "AURORA",
    icon: "🌿",
    colors: { primary: "#2DD4BF", secondary: "#22C55E", glow: "#5EEAD4", bg: "rgba(45,212,191,0.08)" },
    particleType: "petals",
  },
};

// ═══════════════════════════════════
// DEFAULTS & PERSISTENCE
// ═══════════════════════════════════

const STORAGE_KEY = "first-mate-avatar";

const DEFAULT_CUSTOMIZATION: AvatarCustomization = {
  visorColor: "#00E5FF",
  visorGlowPattern: "pulse",
  accentColor: "#00E5FF",
  particleStyle: "sparks",
  emoteStyle: "idle-dance",
  auraShape: "sphere",
};

export const DEFAULT_STATE: AvatarState = {
  completedGoalCount: 0,
  currentMood: "idle",
  currentCategory: "learning",
  customization: DEFAULT_CUSTOMIZATION,
  goalHistory: [],
  lastGoalCompletedAt: null,
  lastInteractionAt: new Date().toISOString(),
  pendingTierUnlock: null,
};

export function loadAvatarState(): AvatarState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_STATE, ...parsed, customization: { ...DEFAULT_CUSTOMIZATION, ...parsed.customization } };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveAvatarState(state: AvatarState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable
  }
}

// ═══════════════════════════════════
// MOOD LOGIC
// ═══════════════════════════════════

export function computeMood(state: AvatarState): Mood {
  if (state.pendingTierUnlock !== null) return "cinematic";
  if (state.currentMood === "celebrating") return "celebrating";
  if (state.currentMood === "happy") return "happy";

  const now = Date.now();
  const lastInteraction = new Date(state.lastInteractionAt).getTime();
  const lastGoal = state.lastGoalCompletedAt ? new Date(state.lastGoalCompletedAt).getTime() : 0;
  const secsSinceInteraction = (now - lastInteraction) / 1000;
  const hoursSinceGoal = lastGoal ? (now - lastGoal) / (1000 * 60 * 60) : Infinity;

  // Within 1 goal of next tier
  const remaining = goalsToNextTier(state.completedGoalCount);
  if (remaining === 1 && state.completedGoalCount > 0) return "excited";

  // No goals in 24hrs
  if (hoursSinceGoal > 24) return "bored";

  // No interaction for 15s
  if (secsSinceInteraction > 15) return "waiting";

  return "idle";
}
