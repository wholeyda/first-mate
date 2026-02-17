"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_THEMES, type Category, type TierConfig, type AvatarCustomization, type ParticleStyle, type EmoteStyle, type AuraShape } from "@/lib/avatar-state";

interface CustomPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tier: TierConfig;
  category: Category;
  customization: AvatarCustomization;
  onCustomize: (updates: Partial<AvatarCustomization>) => void;
}

const VISOR_COLORS = [
  { hex: "#00E5FF", label: "Cyan" },
  { hex: "#FF4500", label: "Ember" },
  { hex: "#DA70D6", label: "Orchid" },
  { hex: "#22C55E", label: "Jade" },
  { hex: "#FFD700", label: "Gold" },
  { hex: "#FF2D55", label: "Neon Pink" },
  { hex: "#7B61FF", label: "Violet" },
  { hex: "#FFFFFF", label: "Pure White" },
];

const ACCENT_COLORS = [
  { hex: "#00E5FF", label: "Cyan" },
  { hex: "#FF4500", label: "Ember" },
  { hex: "#DA70D6", label: "Prismatic" },
  { hex: "#2DD4BF", label: "Teal" },
  { hex: "#FFD700", label: "Gold" },
  { hex: "#FF2D55", label: "Hot Pink" },
];

const GLOW_PATTERNS: { id: AvatarCustomization["visorGlowPattern"]; label: string }[] = [
  { id: "solid", label: "Solid" },
  { id: "pulse", label: "Pulse" },
  { id: "breathe", label: "Breathe" },
  { id: "flicker", label: "Flicker" },
];

const PARTICLE_STYLES: { id: ParticleStyle; label: string; icon: string }[] = [
  { id: "sparks", label: "Sparks", icon: "✦" },
  { id: "bubbles", label: "Bubbles", icon: "○" },
  { id: "leaves", label: "Leaves", icon: "🍃" },
  { id: "code", label: "Code", icon: "<>" },
];

const EMOTES: { id: EmoteStyle; label: string }[] = [
  { id: "idle-dance", label: "Idle Dance" },
  { id: "victory-spin", label: "Victory Spin" },
  { id: "robot-wave", label: "Robot Wave" },
];

const AURA_SHAPES: { id: AuraShape; label: string }[] = [
  { id: "sphere", label: "Sphere" },
  { id: "wings", label: "Wings" },
  { id: "orbital-ring", label: "Orbital Ring" },
  { id: "explosion", label: "Explosion" },
];

/** Slide-out customization panel with progressive unlocks */
export function CustomPanel({ isOpen, onClose, tier, category, customization, onCustomize }: CustomPanelProps) {
  const theme = CATEGORY_THEMES[category];

  const sections: {
    title: string;
    tierRequired: number;
    content: React.ReactNode;
  }[] = [
    {
      title: "Visor Color & Pattern",
      tierRequired: 1,
      content: (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {VISOR_COLORS.map((c) => (
              <ColorSwatch
                key={c.hex} hex={c.hex} label={c.label}
                active={customization.visorColor === c.hex}
                onClick={() => onCustomize({ visorColor: c.hex })}
                theme={theme}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            {GLOW_PATTERNS.map((p) => (
              <OptionPill
                key={p.id} label={p.label}
                active={customization.visorGlowPattern === p.id}
                onClick={() => onCustomize({ visorGlowPattern: p.id })}
                theme={theme}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Armor Accent",
      tierRequired: 2,
      content: (
        <div className="flex flex-wrap gap-2">
          {ACCENT_COLORS.map((c) => (
            <ColorSwatch
              key={c.hex} hex={c.hex} label={c.label}
              active={customization.accentColor === c.hex}
              onClick={() => onCustomize({ accentColor: c.hex })}
              theme={theme}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Particle Trail",
      tierRequired: 3,
      content: (
        <div className="flex gap-1.5 flex-wrap">
          {PARTICLE_STYLES.map((p) => (
            <OptionPill
              key={p.id} label={`${p.icon} ${p.label}`}
              active={customization.particleStyle === p.id}
              onClick={() => onCustomize({ particleStyle: p.id })}
              theme={theme}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Emote / Dance",
      tierRequired: 4,
      content: (
        <div className="flex gap-1.5 flex-wrap">
          {EMOTES.map((e) => (
            <OptionPill
              key={e.id} label={e.label}
              active={customization.emoteStyle === e.id}
              onClick={() => onCustomize({ emoteStyle: e.id })}
              theme={theme}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Aura Shape",
      tierRequired: 5,
      content: (
        <div className="flex gap-1.5 flex-wrap">
          {AURA_SHAPES.map((a) => (
            <OptionPill
              key={a.id} label={a.label}
              active={customization.auraShape === a.id}
              onClick={() => onCustomize({ auraShape: a.id })}
              theme={theme}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-80 overflow-y-auto"
            style={{
              background: "linear-gradient(180deg, #0a0a1f 0%, #080818 100%)",
              borderLeft: `1px solid rgba(255,255,255,0.06)`,
            }}
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-sm font-bold text-white tracking-wider">CUSTOMIZE</h2>
              <button
                onClick={onClose}
                className="text-white/30 hover:text-white/60 text-lg cursor-pointer transition-colors"
              >
                &times;
              </button>
            </div>

            {/* Sections */}
            <div className="p-5 space-y-6">
              {sections.map((section, i) => {
                const unlocked = tier.id >= section.tierRequired;
                return (
                  <motion.div
                    key={section.title}
                    initial={unlocked ? { opacity: 0, x: 20 } : {}}
                    animate={unlocked ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xs font-bold tracking-wider uppercase"
                        style={{ color: unlocked ? theme.colors.primary : "rgba(255,255,255,0.15)" }}
                      >
                        {section.title}
                      </h3>
                      {!unlocked && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/20">
                          TIER {section.tierRequired}
                        </span>
                      )}
                    </div>

                    {unlocked ? (
                      section.content
                    ) : (
                      <div className="py-3 text-center text-[10px] text-white/10 border border-dashed border-white/5 rounded-lg">
                        Unlocks at Tier {section.tierRequired}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ColorSwatch({ hex, label, active, onClick, theme }: {
  hex: string; label: string; active: boolean;
  onClick: () => void; theme: { colors: { primary: string } };
}) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-full cursor-pointer transition-all"
      style={{
        background: hex,
        boxShadow: active ? `0 0 0 2px #080818, 0 0 0 3.5px ${theme.colors.primary}` : "none",
        filter: active ? `drop-shadow(0 0 6px ${hex}80)` : "none",
      }}
      title={label}
    />
  );
}

function OptionPill({ label, active, onClick, theme }: {
  label: string; active: boolean;
  onClick: () => void; theme: { colors: { primary: string; glow: string } };
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-[11px] font-medium cursor-pointer transition-all"
      style={{
        background: active ? `${theme.colors.primary}20` : "rgba(255,255,255,0.03)",
        border: `1px solid ${active ? theme.colors.primary + "50" : "rgba(255,255,255,0.06)"}`,
        color: active ? theme.colors.primary : "rgba(255,255,255,0.3)",
        boxShadow: active ? `0 0 10px ${theme.colors.glow}15` : "none",
      }}
    >
      {label}
    </button>
  );
}
