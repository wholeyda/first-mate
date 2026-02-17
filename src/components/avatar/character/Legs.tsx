"use client";

import type { Mood, Category, TierConfig } from "@/lib/avatar-state";
import { CATEGORY_THEMES } from "@/lib/avatar-state";

interface LegsProps {
  tier: TierConfig;
  mood: Mood;
  category: Category;
  isShadow: boolean;
}

/** Legs with glowing boot trim and tier-specific effects */
export function Legs({ tier, mood, category, isShadow }: LegsProps) {
  const theme = CATEGORY_THEMES[category];
  const showBootGlow = tier.id >= 1;
  const isHovering = tier.id >= 4;

  return (
    <g className="legs">
      {/* ═══ LEFT LEG ═══ */}
      <g>
        {/* Thigh */}
        <path d="M 118 268 L 115 320 Q 115 335, 118 340 L 138 340 Q 138 335, 136 320 L 135 268"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1"
        />

        {/* Knee joint */}
        <ellipse cx="126" cy="335" rx="13" ry="8" fill="#1a1a35" />

        {/* Shin */}
        <path d="M 116 340 L 114 380 L 140 380 L 138 340"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1"
        />

        {/* Boot */}
        <path d="M 112 378 L 108 400 Q 108 410, 118 412 L 142 412 Q 148 410, 146 400 L 142 378"
          fill="#12122a" stroke="#2a2a4a" strokeWidth="1.2"
        />

        {/* Boot specular */}
        <path d="M 116 385 L 114 400" stroke="rgba(255,255,255,0.06)" strokeWidth="3"
          style={{ filter: "blur(2px)" }}
        />

        {/* Boot sole */}
        <rect x="108" y="408" width="40" height="6" rx="3"
          fill="#0a0a1a"
        />

        {/* Glowing boot trim (tier 1+) */}
        {showBootGlow && !isShadow && (
          <>
            {/* Top trim */}
            <path d="M 112 380 L 142 380"
              stroke={theme.colors.primary} strokeWidth="1.5" opacity="0.6"
              style={{ filter: `drop-shadow(0 0 5px ${theme.colors.glow}) drop-shadow(0 0 15px ${theme.colors.glow}40)` }}
            />
            {/* Toe light */}
            <ellipse cx="128" cy="410" rx="8" ry="3"
              fill={theme.colors.primary} opacity="0.3"
              style={{ filter: `drop-shadow(0 0 8px ${theme.colors.glow})` }}
            >
              <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
            </ellipse>
            {/* Heel spark */}
            <circle cx="114" cy="406" r="2" fill={theme.colors.primary} opacity="0.4">
              <animate attributeName="opacity" values="0.1;0.6;0.1" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="r" values="1;3;1" dur="1.5s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Knee accent */}
        {tier.id >= 2 && !isShadow && (
          <ellipse cx="126" cy="335" rx="4" ry="3"
            fill={theme.colors.primary} opacity="0.3"
            style={{ filter: `drop-shadow(0 0 4px ${theme.colors.glow})` }}
          />
        )}
      </g>

      {/* ═══ RIGHT LEG ═══ */}
      <g>
        {/* Thigh */}
        <path d="M 145 268 L 142 320 Q 142 335, 145 340 L 165 340 Q 165 335, 163 320 L 162 268"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1"
        />

        {/* Knee */}
        <ellipse cx="153" cy="335" rx="13" ry="8" fill="#1a1a35" />

        {/* Shin */}
        <path d="M 143 340 L 141 380 L 167 380 L 165 340"
          fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1"
        />

        {/* Boot */}
        <path d="M 139 378 L 135 400 Q 135 410, 145 412 L 169 412 Q 175 410, 173 400 L 169 378"
          fill="#12122a" stroke="#2a2a4a" strokeWidth="1.2"
        />

        {/* Boot specular */}
        <path d="M 143 385 L 141 400" stroke="rgba(255,255,255,0.06)" strokeWidth="3"
          style={{ filter: "blur(2px)" }}
        />

        {/* Boot sole */}
        <rect x="135" y="408" width="40" height="6" rx="3"
          fill="#0a0a1a"
        />

        {/* Boot glow (tier 1+) */}
        {showBootGlow && !isShadow && (
          <>
            <path d="M 139 380 L 169 380"
              stroke={theme.colors.primary} strokeWidth="1.5" opacity="0.6"
              style={{ filter: `drop-shadow(0 0 5px ${theme.colors.glow}) drop-shadow(0 0 15px ${theme.colors.glow}40)` }}
            />
            <ellipse cx="155" cy="410" rx="8" ry="3"
              fill={theme.colors.primary} opacity="0.3"
              style={{ filter: `drop-shadow(0 0 8px ${theme.colors.glow})` }}
            >
              <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2.3s" repeatCount="indefinite" />
            </ellipse>
            <circle cx="141" cy="406" r="2" fill={theme.colors.primary} opacity="0.4">
              <animate attributeName="opacity" values="0.1;0.6;0.1" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="r" values="1;3;1" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}

        {/* Foot tap animation (waiting mood) */}
        {mood === "waiting" && !isShadow && (
          <g>
            <animateTransform attributeName="transform" type="rotate"
              values="0 155 380;-8 155 380;0 155 380"
              dur="1.2s" repeatCount="indefinite"
            />
          </g>
        )}

        {/* Knee accent */}
        {tier.id >= 2 && !isShadow && (
          <ellipse cx="153" cy="335" rx="4" ry="3"
            fill={theme.colors.primary} opacity="0.3"
            style={{ filter: `drop-shadow(0 0 4px ${theme.colors.glow})` }}
          />
        )}
      </g>

      {/* Glowing footprints (tier 4+) — below the boots */}
      {isHovering && !isShadow && (
        <g opacity="0.2">
          <ellipse cx="128" cy="418" rx="14" ry="4"
            fill={theme.colors.primary}
            style={{ filter: `blur(6px) drop-shadow(0 0 10px ${theme.colors.glow})` }}
          >
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="155" cy="418" rx="14" ry="4"
            fill={theme.colors.primary}
            style={{ filter: `blur(6px) drop-shadow(0 0 10px ${theme.colors.glow})` }}
          >
            <animate attributeName="opacity" values="0.15;0.35;0.15" dur="3.3s" repeatCount="indefinite" />
          </ellipse>
        </g>
      )}
    </g>
  );
}
