/**
 * Planet Seed Utilities
 *
 * Deterministic pseudo-random number generator seeded from a planet's
 * island ID string. Guarantees that the same planet always looks the same
 * across renders / sessions, while each planet in the solar system gets
 * its own unique variation (scale, spin speed, axis tilt, glow, rings, moons).
 *
 * Usage:
 *   const rng = makePlanetRng(island.id);
 *   const scale  = rng.float(0.85, 1.15);   // random in [0.85, 1.15]
 *   const hasMoon = rng.bool(0.35);          // 35% chance
 */

/**
 * Deterministic hash from a string — maps arbitrary ID → stable integer.
 * Uses djb2 algorithm (fast, low collision, widely used in game engines).
 */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; // force unsigned 32-bit
  }
  return h;
}

/**
 * Mulberry32 — simple, fast, high-quality 32-bit PRNG.
 * Returns a function that produces the next float in [0, 1) each call.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/**
 * PlanetRng — wraps the raw PRNG with convenience helpers.
 * Each call to .float() / .int() / .bool() advances the sequence.
 * Call them in the same order every render to keep results stable.
 */
export interface PlanetRng {
  /** Next float in [min, max] */
  float: (min: number, max: number) => number;
  /** Next integer in [min, max] inclusive */
  int: (min: number, max: number) => number;
  /** Returns true with the given probability (0–1) */
  bool: (probability: number) => boolean;
  /** Pick a random element from an array */
  pick: <T>(arr: T[]) => T;
}

export function makePlanetRng(islandId: string): PlanetRng {
  const next = mulberry32(hashString(islandId));
  return {
    float: (min, max) => min + next() * (max - min),
    int:   (min, max) => Math.floor(min + next() * (max - min + 1)),
    bool:  (p)        => next() < p,
    pick:  (arr)      => arr[Math.floor(next() * arr.length)],
  };
}

/**
 * Derive a numeric seed from an island ID (for props that expect a number).
 */
export function islandIdToSeed(islandId: string): number {
  return hashString(islandId);
}
