/**
 * Synthesized Sound Effects — Web Audio API
 *
 * All sounds are generated programmatically. No audio files.
 * Uses oscillators, gain envelopes, and filters for:
 * - Goal completion chime
 * - XP chunk fill
 * - Tier unlock rising tone
 * - UI click
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Soft chime — goal completion */
export function playChime() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Two harmonized oscillators
  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + i * 0.1);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + 1);
  });
}

/** Chunky fill sound — XP bar stepping */
export function playChunk() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.linearRampToValueAtTime(330, now + 0.04);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

/** Rising tone — tier unlock */
export function playTierUnlock() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Sweeping sine
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(1200, now + 1.2);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
  gain.gain.setValueAtTime(0.2, now + 0.8);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 2.2);

  // Shimmer overtone
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(400, now + 0.3);
  osc2.frequency.exponentialRampToValueAtTime(2400, now + 1.5);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.08, now + 0.4);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 2);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(now + 0.3);
  osc2.stop(now + 2.2);
}

/** Click sound — UI interaction */
export function playClick() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

/** Impact sound — shockwave/slam */
export function playImpact() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(120, now);
  osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.exponentialRampToValueAtTime(60, now + 0.3);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.5);
}
