/**
 * Star Customization Panel
 *
 * Slide-in panel triggered by clicking the central star.
 * Offers 6 theme presets as color swatches and 4 style sliders
 * for real-time preview. Changes are applied live via onConfigChange
 * and persisted to Supabase on Save.
 */

"use client";

import { useState, useCallback } from "react";
import {
  StarConfig,
  StarThemeName,
  STAR_THEME_PRESETS,
  DEFAULT_STAR_STYLE,
} from "@/types/star-config";

interface StarCustomizationPanelProps {
  isOpen: boolean;
  currentConfig: StarConfig;
  onConfigChange: (config: StarConfig) => void;
  onSave: () => void;
  onCancel: () => void;
}

const THEME_LABELS: Record<StarThemeName, string> = {
  default: "Cyan",
  solar: "Solar",
  nebula: "Nebula",
  arctic: "Arctic",
  emerald: "Emerald",
  crimson: "Crimson",
};

const THEME_ORDER: StarThemeName[] = [
  "default",
  "solar",
  "nebula",
  "arctic",
  "emerald",
  "crimson",
];

export function StarCustomizationPanel({
  isOpen,
  currentConfig,
  onConfigChange,
  onSave,
  onCancel,
}: StarCustomizationPanelProps) {
  const [activeTheme, setActiveTheme] = useState<StarThemeName | null>(null);

  const handleThemeSelect = useCallback(
    (themeName: StarThemeName) => {
      setActiveTheme(themeName);
      onConfigChange({
        ...currentConfig,
        colorTheme: STAR_THEME_PRESETS[themeName],
      });
    },
    [currentConfig, onConfigChange]
  );

  const handleStyleChange = useCallback(
    (key: keyof typeof DEFAULT_STAR_STYLE, value: number) => {
      onConfigChange({
        ...currentConfig,
        style: {
          ...currentConfig.style,
          [key]: value,
        },
      });
    },
    [currentConfig, onConfigChange]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-80 max-w-[90vw] h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Customize Star
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer text-lg"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {/* Theme Presets */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Color Theme
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {THEME_ORDER.map((themeName) => {
                const theme = STAR_THEME_PRESETS[themeName];
                const isSelected = activeTheme === themeName;
                return (
                  <button
                    key={themeName}
                    onClick={() => handleThemeSelect(themeName)}
                    className={`
                      group relative flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all cursor-pointer
                      ${
                        isSelected
                          ? "border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
                      }
                    `}
                  >
                    {/* Color swatch — three dots */}
                    <div className="flex gap-1">
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                        style={{ backgroundColor: theme.primary }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                        style={{ backgroundColor: theme.secondary }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600"
                        style={{ backgroundColor: theme.tertiary }}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                      {THEME_LABELS[themeName]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Style Sliders */}
          <section>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Visual Style
            </h3>
            <div className="space-y-4">
              {/* Glow Intensity */}
              <SliderControl
                label="Glow Intensity"
                value={currentConfig.style.glowIntensity}
                min={0.3}
                max={2.0}
                step={0.05}
                onChange={(v) => handleStyleChange("glowIntensity", v)}
              />

              {/* Animation Speed */}
              <SliderControl
                label="Animation Speed"
                value={currentConfig.style.animationSpeed}
                min={0.2}
                max={2.5}
                step={0.05}
                onChange={(v) => handleStyleChange("animationSpeed", v)}
              />

              {/* Surface Smoothness (inverse displacement) */}
              <SliderControl
                label="Surface Detail"
                value={currentConfig.style.displacementStrength}
                min={0.0}
                max={0.08}
                step={0.002}
                onChange={(v) => handleStyleChange("displacementStrength", v)}
              />

              {/* Hotspot Intensity */}
              <SliderControl
                label="Hotspot Brightness"
                value={currentConfig.style.hotspotIntensity}
                min={0.0}
                max={1.0}
                step={0.05}
                onChange={(v) => handleStyleChange("hotspotIntensity", v)}
              />
            </div>
          </section>

          {/* Reset to defaults */}
          <button
            onClick={() => {
              setActiveTheme("default");
              onConfigChange({
                colorTheme: STAR_THEME_PRESETS.default,
                style: { ...DEFAULT_STAR_STYLE },
              });
            }}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-5 py-4 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>

      {/* Slide-in animation */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

// ---- Slider sub-component ----

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function SliderControl({ label, value, min, max, step, onChange }: SliderControlProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
          {value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100"
      />
    </div>
  );
}
