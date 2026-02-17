"use client";

import type { Mood, Category, TierConfig } from "@/lib/avatar-state";
import { CATEGORY_THEMES } from "@/lib/avatar-state";

interface ArmsProps {
  tier: TierConfig;
  mood: Mood;
  category: Category;
  isShadow: boolean;
}

/** Arms with pauldrons, energy veins, and mood-driven poses */
export function Arms({ tier, mood, category, isShadow }: ArmsProps) {
  const theme = CATEGORY_THEMES[category];
  const showPauldrons = tier.id >= 3;
  const showEnergyVeins = tier.id >= 2;

  // Mood-based arm positions
  const leftArmRotation = mood === "happy" ? -30 :
    mood === "celebrating" ? -60 :
    mood === "bored" ? 5 :
    mood === "waiting" ? -15 : 0;

  const rightArmRotation = mood === "happy" ? 30 :
    mood === "celebrating" ? 60 :
    mood === "bored" ? -5 :
    mood === "waiting" ? 10 : 0;

  return (
    <g className="arms">
      {/* ═══ LEFT ARM ═══ */}
      <g style={{
        transform: `rotate(${leftArmRotation}deg)`,
        transformOrigin: "105px 170px",
        transition: "transform 0.5s cubic-bezier(0.36, 0, 0.66, -0.56)",
      }}>
        {/* Upper arm */}
        <path d="M 105 160 Q 85 180, 80 210 Q 78 225, 85 230"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1.2"
        />

        {/* Specular on upper arm */}
        <path d="M 100 170 Q 88 185, 84 205"
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"
          style={{ filter: "blur(3px)" }}
        />

        {/* Forearm */}
        <path d="M 85 230 Q 80 260, 78 290 L 90 290 Q 90 260, 88 235"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1"
        />

        {/* Glove / hand */}
        <ellipse cx="82" cy="295" rx="10" ry="8" fill="#1a1a35" />

        {/* Energy veins on arm (tier 2+) */}
        {showEnergyVeins && !isShadow && (
          <path d="M 98 170 Q 86 195, 83 235 Q 81 260, 82 285"
            fill="none" stroke={theme.colors.primary} strokeWidth="0.8"
            opacity="0.3"
            style={{ filter: `drop-shadow(0 0 3px ${theme.colors.glow})` }}
          >
            <animate attributeName="opacity" values="0.15;0.45;0.15" dur="2.8s" repeatCount="indefinite" />
          </path>
        )}

        {/* Left pauldron (tier 3+) */}
        {showPauldrons && !isShadow && (
          <g>
            <ellipse cx="97" cy="162" rx="18" ry="12"
              fill="#1a1a35" stroke={theme.colors.primary} strokeWidth="1"
              opacity="0.9"
              style={{ filter: `drop-shadow(0 0 5px ${theme.colors.glow}40)` }}
            >
              {/* Slow counter-rotation */}
              <animateTransform attributeName="transform" type="rotate"
                values="0 97 162;-5 97 162;0 97 162;5 97 162;0 97 162"
                dur="8s" repeatCount="indefinite"
              />
            </ellipse>
            {/* Pauldron highlight */}
            <ellipse cx="94" cy="158" rx="10" ry="5"
              fill="rgba(255,255,255,0.06)"
              style={{ filter: "blur(2px)" }}
            />
            {/* Accent dot */}
            <circle cx="97" cy="162" r="2" fill={theme.colors.primary} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </g>

      {/* ═══ RIGHT ARM ═══ */}
      <g style={{
        transform: `rotate(${rightArmRotation}deg)`,
        transformOrigin: "175px 170px",
        transition: "transform 0.5s cubic-bezier(0.36, 0, 0.66, -0.56)",
      }}>
        {/* Upper arm */}
        <path d="M 175 160 Q 195 180, 200 210 Q 202 225, 195 230"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1.2"
        />

        {/* Specular */}
        <path d="M 180 170 Q 192 185, 196 205"
          fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4"
          style={{ filter: "blur(3px)" }}
        />

        {/* Forearm */}
        <path d="M 195 230 Q 200 260, 202 290 L 190 290 Q 192 260, 192 235"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1"
        />

        {/* Glove */}
        <ellipse cx="198" cy="295" rx="10" ry="8" fill="#1a1a35" />

        {/* Energy veins (tier 2+) */}
        {showEnergyVeins && !isShadow && (
          <path d="M 182 170 Q 194 195, 197 235 Q 199 260, 198 285"
            fill="none" stroke={theme.colors.primary} strokeWidth="0.8"
            opacity="0.3"
            style={{ filter: `drop-shadow(0 0 3px ${theme.colors.glow})` }}
          >
            <animate attributeName="opacity" values="0.15;0.45;0.15" dur="3.1s" repeatCount="indefinite" />
          </path>
        )}

        {/* Right pauldron (tier 3+) */}
        {showPauldrons && !isShadow && (
          <g>
            <ellipse cx="183" cy="162" rx="18" ry="12"
              fill="#1a1a35" stroke={theme.colors.primary} strokeWidth="1"
              opacity="0.9"
              style={{ filter: `drop-shadow(0 0 5px ${theme.colors.glow}40)` }}
            >
              <animateTransform attributeName="transform" type="rotate"
                values="0 183 162;5 183 162;0 183 162;-5 183 162;0 183 162"
                dur="8s" repeatCount="indefinite"
              />
            </ellipse>
            <ellipse cx="186" cy="158" rx="10" ry="5"
              fill="rgba(255,255,255,0.06)"
              style={{ filter: "blur(2px)" }}
            />
            <circle cx="183" cy="162" r="2" fill={theme.colors.primary} opacity="0.5">
              <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* Watching wrist pose (waiting mood) */}
        {mood === "waiting" && !isShadow && (
          <rect x="192" y="278" width="8" height="5" rx="1"
            fill="none" stroke={theme.colors.primary} strokeWidth="0.5" opacity="0.4"
          />
        )}
      </g>
    </g>
  );
}
