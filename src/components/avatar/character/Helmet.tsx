"use client";

import type { Mood, Category, TierConfig, AvatarCustomization } from "@/lib/avatar-state";
import { CATEGORY_THEMES } from "@/lib/avatar-state";

interface HelmetProps {
  tier: TierConfig;
  mood: Mood;
  category: Category;
  customization: AvatarCustomization;
  isShadow: boolean;
  visorBlink: boolean;
}

/** Helmet with visor, HUD overlay, and tier-specific upgrades */
export function Helmet({ tier, mood, category, customization, isShadow, visorBlink }: HelmetProps) {
  const visorColor = customization.visorColor;
  const theme = CATEGORY_THEMES[category];
  const visorOn = tier.id >= 1;
  const showHUD = tier.id >= 3;
  const visorOpacity = isShadow ? 0.08 : visorBlink ? 0.3 : 1;

  return (
    <g className="helmet">
      {/* Helmet shell — rounded top with depth */}
      <ellipse cx="140" cy="90" rx="52" ry="58" fill="url(#bodyGrad)" stroke="none" />

      {/* Specular highlight on helmet dome */}
      <ellipse cx="130" cy="72" rx="30" ry="25"
        fill="rgba(255,255,255,0.06)"
        style={{ filter: "blur(4px)" }}
      />

      {/* Inner shadow on bottom edge */}
      <path d="M 92 100 Q 140 135, 188 100" fill="none"
        stroke="rgba(0,0,0,0.4)" strokeWidth="4"
        style={{ filter: "blur(3px)" }}
      />

      {/* Helmet rim — subtle raised edge */}
      <ellipse cx="140" cy="90" rx="52" ry="58"
        fill="none" stroke="#2a2a4a" strokeWidth="2"
      />

      {/* VISOR — the soul of the character */}
      <g style={{ opacity: visorOpacity, transition: "opacity 0.15s ease" }}>
        {/* Visor shape — curved rectangle */}
        <rect x="105" y="80" width="70" height="32" rx="8" ry="8"
          fill={visorOn ? visorColor : "#111"}
          opacity={visorOn ? 0.7 : 0.2}
        />

        {/* Visor inner glow */}
        {visorOn && (
          <>
            <rect x="107" y="82" width="66" height="28" rx="7" ry="7"
              fill="none" stroke={visorColor}
              strokeWidth="1" opacity="0.5"
            />
            {/* Neon edge glow layers */}
            <rect x="105" y="80" width="70" height="32" rx="8" ry="8"
              fill="none" stroke={visorColor} strokeWidth="1"
              style={{
                filter: `drop-shadow(0 0 5px ${visorColor}) drop-shadow(0 0 15px ${visorColor}) drop-shadow(0 0 30px ${visorColor}40)`,
              }}
            />
          </>
        )}

        {/* Visor glow pattern animation */}
        {visorOn && customization.visorGlowPattern !== "solid" && (
          <rect x="107" y="82" width="66" height="28" rx="7" ry="7"
            fill={visorColor} opacity="0.15"
          >
            <animate
              attributeName="opacity"
              values={
                customization.visorGlowPattern === "pulse" ? "0.1;0.3;0.1" :
                customization.visorGlowPattern === "breathe" ? "0.05;0.25;0.05" :
                "0.05;0.35;0.05;0.35;0.05"
              }
              dur={
                customization.visorGlowPattern === "pulse" ? "2s" :
                customization.visorGlowPattern === "breathe" ? "4s" : "0.8s"
              }
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* HUD elements inside visor (tier 3+) */}
        {showHUD && !isShadow && (
          <g opacity="0.6">
            {/* Radar sweep */}
            <circle cx="118" cy="96" r="8" fill="none"
              stroke={theme.colors.primary} strokeWidth="0.5" opacity="0.4"
            />
            <line x1="118" y1="96" x2="118" y2="88"
              stroke={theme.colors.primary} strokeWidth="0.7" opacity="0.7"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 118 96" to="360 118 96"
                dur="3s" repeatCount="indefinite"
              />
            </line>

            {/* Blinking dots */}
            {[{ x: 156, y: 90 }, { x: 162, y: 95 }, { x: 150, y: 100 }].map((dot, i) => (
              <circle key={i} cx={dot.x} cy={dot.y} r="1.2"
                fill={theme.colors.primary}
              >
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur={`${1.5 + i * 0.4}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}

            {/* Horizontal scan line */}
            <line x1="130" y1="105" x2="165" y2="105"
              stroke={theme.colors.primary} strokeWidth="0.4" opacity="0.3"
            />
          </g>
        )}

        {/* Category-specific visor effects */}
        {tier.id >= 2 && category === "learning" && !isShadow && (
          /* Matrix rain inside visor */
          <g opacity="0.2">
            {Array.from({ length: 8 }, (_, i) => (
              <text key={i}
                x={110 + i * 8} y={90}
                fontSize="4" fill="#00E5FF"
                fontFamily="monospace"
              >
                <animate attributeName="y" values={`${85 + (i % 3) * 5};108;${85 + (i % 3) * 5}`}
                  dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite"
                />
                {String.fromCharCode(48 + (i * 7) % 42)}
              </text>
            ))}
          </g>
        )}
      </g>

      {/* Helmet accent lines */}
      {tier.id >= 1 && !isShadow && (
        <>
          {/* Center crest line */}
          <line x1="140" y1="40" x2="140" y2="70"
            stroke={customization.accentColor} strokeWidth="1.5" opacity="0.4"
            style={{ filter: `drop-shadow(0 0 4px ${customization.accentColor})` }}
          />
          {/* Side vents */}
          <path d="M 96 88 L 92 95" stroke={customization.accentColor} strokeWidth="1" opacity="0.3" />
          <path d="M 184 88 L 188 95" stroke={customization.accentColor} strokeWidth="1" opacity="0.3" />
        </>
      )}

      {/* Chin guard */}
      <path d="M 110 130 Q 140 145, 170 130"
        fill="url(#bodyGrad)" stroke="#2a2a4a" strokeWidth="1"
      />

      {/* Neck connector */}
      <rect x="125" y="135" width="30" height="15" rx="4"
        fill="#16213e"
      />
    </g>
  );
}
