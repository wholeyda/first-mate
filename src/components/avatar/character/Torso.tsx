"use client";

import type { Mood, Category, TierConfig, AvatarCustomization } from "@/lib/avatar-state";
import { CATEGORY_THEMES } from "@/lib/avatar-state";

interface TorsoProps {
  tier: TierConfig;
  mood: Mood;
  category: Category;
  customization: AvatarCustomization;
  isShadow: boolean;
}

/** Torso with chest plate, energy veins, and category icon */
export function Torso({ tier, category, customization, isShadow }: TorsoProps) {
  const theme = CATEGORY_THEMES[category];
  const showChestPlate = tier.id >= 2;
  const showEnergyVeins = tier.id >= 2;

  return (
    <g className="torso">
      {/* Main torso body */}
      <path
        d="M 105 148 L 100 200 Q 100 240, 110 270 L 170 270 Q 180 240, 180 200 L 175 148 Q 140 138, 105 148"
        fill="url(#bodyGrad)" stroke="none"
      />

      {/* Specular highlight on upper chest */}
      <ellipse cx="135" cy="175" rx="25" ry="20"
        fill="rgba(255,255,255,0.05)"
        style={{ filter: "blur(6px)" }}
      />

      {/* Inner shadow on sides */}
      <path d="M 105 160 L 100 210" stroke="rgba(0,0,0,0.3)" strokeWidth="6" style={{ filter: "blur(4px)" }} />
      <path d="M 175 160 L 180 210" stroke="rgba(0,0,0,0.3)" strokeWidth="6" style={{ filter: "blur(4px)" }} />

      {/* Torso armor plate edges */}
      <path
        d="M 105 148 L 100 200 Q 100 240, 110 270 L 170 270 Q 180 240, 180 200 L 175 148"
        fill="none" stroke="#2a2a4a" strokeWidth="1.5"
      />

      {/* Belt / waist line */}
      <rect x="108" y="255" width="64" height="8" rx="3"
        fill="#1a1a35"
      />
      {!isShadow && tier.id >= 1 && (
        <rect x="108" y="255" width="64" height="8" rx="3"
          fill="none" stroke={customization.accentColor} strokeWidth="0.8" opacity="0.4"
          style={{ filter: `drop-shadow(0 0 4px ${customization.accentColor})` }}
        />
      )}

      {/* Belt buckle center */}
      <rect x="133" y="254" width="14" height="10" rx="2"
        fill={isShadow ? "#111" : customization.accentColor}
        opacity={isShadow ? 0.1 : 0.6}
        style={!isShadow ? { filter: `drop-shadow(0 0 6px ${customization.accentColor})` } : undefined}
      />

      {/* ═══ CHEST PLATE (Tier 2+) ═══ */}
      {showChestPlate && !isShadow && (
        <g className="chest-plate">
          {/* Plate shape */}
          <path
            d="M 115 160 L 112 210 Q 140 225, 168 210 L 165 160 Q 140 150, 115 160"
            fill="#1a1a35" stroke={theme.colors.primary} strokeWidth="1"
            opacity="0.9"
            style={{ filter: `drop-shadow(0 0 5px ${theme.colors.glow}40)` }}
          />

          {/* Plate inner bevel */}
          <path
            d="M 118 165 L 116 205 Q 140 218, 164 205 L 162 165 Q 140 155, 118 165"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"
          />

          {/* Category icon etched in center */}
          <text
            x="140" y="195"
            textAnchor="middle" fontSize="24"
            fill={theme.colors.primary}
            opacity="0.7"
            style={{ filter: `drop-shadow(0 0 8px ${theme.colors.glow})` }}
          >
            {theme.icon}
          </text>

          {/* Laser etch lines radiating from icon */}
          {[30, 60, 120, 150, 210, 240, 300, 330].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 140 + Math.cos(rad) * 15;
            const y1 = 190 + Math.sin(rad) * 12;
            const x2 = 140 + Math.cos(rad) * 28;
            const y2 = 190 + Math.sin(rad) * 22;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={theme.colors.primary} strokeWidth="0.5"
                opacity="0.25"
              />
            );
          })}
        </g>
      )}

      {/* ═══ ENERGY VEINS (Tier 2+) ═══ */}
      {showEnergyVeins && !isShadow && (
        <g className="energy-veins" opacity="0.4">
          {/* Left side veins */}
          <path d="M 112 180 Q 108 200, 110 230"
            fill="none" stroke={theme.colors.primary} strokeWidth="1"
            style={{ filter: `drop-shadow(0 0 4px ${theme.colors.glow})` }}
          >
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M 115 175 Q 110 195, 112 225"
            fill="none" stroke={theme.colors.primary} strokeWidth="0.6"
          >
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2.5s" repeatCount="indefinite" />
          </path>

          {/* Right side veins */}
          <path d="M 168 180 Q 172 200, 170 230"
            fill="none" stroke={theme.colors.primary} strokeWidth="1"
            style={{ filter: `drop-shadow(0 0 4px ${theme.colors.glow})` }}
          >
            <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3.2s" repeatCount="indefinite" />
          </path>
          <path d="M 165 175 Q 170 195, 168 225"
            fill="none" stroke={theme.colors.primary} strokeWidth="0.6"
          >
            <animate attributeName="opacity" values="0.3;0.5;0.3" dur="2.8s" repeatCount="indefinite" />
          </path>

          {/* V-stripe accent lines */}
          <path d="M 140 155 L 120 220" stroke={theme.colors.primary} strokeWidth="0.5" opacity="0.2" />
          <path d="M 140 155 L 160 220" stroke={theme.colors.primary} strokeWidth="0.5" opacity="0.2" />
        </g>
      )}

      {/* ═══ CATEGORY-SPECIFIC TEXTURES ═══ */}
      {tier.id >= 2 && !isShadow && category === "fitness" && (
        /* Lava crack lines */
        <g opacity="0.25">
          <path d="M 120 170 L 125 185 L 118 200" fill="none" stroke="#FF4500" strokeWidth="1.5"
            style={{ filter: "drop-shadow(0 0 3px #FF6347)" }}
          >
            <animate attributeName="opacity" values="0.15;0.4;0.15" dur="4s" repeatCount="indefinite" />
          </path>
          <path d="M 158 172 L 155 190 L 162 205" fill="none" stroke="#FF4500" strokeWidth="1"
            style={{ filter: "drop-shadow(0 0 3px #FF6347)" }}
          >
            <animate attributeName="opacity" values="0.2;0.35;0.2" dur="3.5s" repeatCount="indefinite" />
          </path>
        </g>
      )}

      {tier.id >= 2 && !isShadow && category === "learning" && (
        /* Circuit board trace lines */
        <g opacity="0.2">
          <path d="M 120 170 L 120 185 L 130 185 L 130 200" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
          <path d="M 160 170 L 160 190 L 150 190 L 150 205" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
          <circle cx="130" cy="200" r="1.5" fill="#00E5FF" />
          <circle cx="150" cy="205" r="1.5" fill="#00E5FF" />
          <circle cx="120" cy="185" r="1" fill="#00E5FF" />
        </g>
      )}

      {tier.id >= 2 && !isShadow && category === "creative" && (
        /* Watercolor wash / brushstroke edges */
        <g opacity="0.15">
          <ellipse cx="130" cy="190" rx="15" ry="20" fill="#DA70D6"
            style={{ filter: "blur(8px)" }}
          />
          <ellipse cx="155" cy="200" rx="12" ry="15" fill="#FFD700"
            style={{ filter: "blur(6px)" }}
          />
        </g>
      )}

      {tier.id >= 2 && !isShadow && category === "mindfulness" && (
        /* Smooth stone with moss edges */
        <g opacity="0.15">
          <path d="M 108 200 Q 105 230, 112 260"
            fill="none" stroke="#22C55E" strokeWidth="3"
            style={{ filter: "blur(3px)" }}
          />
          <path d="M 172 200 Q 175 230, 168 260"
            fill="none" stroke="#22C55E" strokeWidth="3"
            style={{ filter: "blur(3px)" }}
          />
        </g>
      )}
    </g>
  );
}
