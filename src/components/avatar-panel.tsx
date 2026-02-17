/**
 * Avatar Panel Component
 *
 * Sidebar panel with Dark Voyager-style avatar.
 * Shows avatar, goal count, personality description, trait tags.
 * Gender toggle and accent color picker for customization.
 */

"use client";

import { useState } from "react";
import { FirstMateAvatar } from "./first-mate-avatar";

interface AvatarPanelProps {
  completedGoalCount: number;
  traits: string[];
  userDescription: string;
  onRemoveTrait?: (trait: string) => void;
}

const ACCENT_COLORS = [
  { hex: "#FF9500", label: "Amber" },
  { hex: "#FF6B00", label: "Orange" },
  { hex: "#FF2D55", label: "Pink" },
  { hex: "#7B61FF", label: "Purple" },
  { hex: "#00E5FF", label: "Cyan" },
  { hex: "#00FF94", label: "Green" },
  { hex: "#FFD700", label: "Gold" },
  { hex: "#FF4444", label: "Red" },
];

export function AvatarPanel({
  completedGoalCount,
  traits,
  userDescription,
  onRemoveTrait,
}: AvatarPanelProps) {
  const [editingTraits, setEditingTraits] = useState(false);
  const [gender, setGender] = useState<"male" | "female" | "neutral">("neutral");
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined);
  const [showCustomize, setShowCustomize] = useState(false);

  return (
    <div className="flex flex-col items-center p-4 border-b border-gray-100 dark:border-gray-800">
      {/* Animated avatar */}
      <FirstMateAvatar
        completedGoalCount={completedGoalCount}
        traits={traits}
        gender={gender}
        accentColor={accentColor}
      />

      {/* Completed goals counter */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
        {completedGoalCount === 0
          ? "Complete a goal to evolve!"
          : `${completedGoalCount} goal${completedGoalCount === 1 ? "" : "s"} completed`}
      </p>

      {/* Customize toggle */}
      <button
        onClick={() => setShowCustomize(!showCustomize)}
        className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer mt-2 transition-colors"
      >
        {showCustomize ? "Hide" : "Customize"}
      </button>

      {/* Customization panel */}
      {showCustomize && (
        <div className="w-full mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
          {/* Gender toggle */}
          <div className="mb-2">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Body Type
            </span>
            <div className="flex gap-1">
              {(["neutral", "male", "female"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGender(g)}
                  className={`flex-1 text-[10px] px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    gender === g
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color picker */}
          <div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Accent Color
            </span>
            <div className="flex flex-wrap gap-1.5">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setAccentColor(c.hex)}
                  className={`w-5 h-5 rounded-full cursor-pointer transition-all ${
                    accentColor === c.hex
                      ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-900 scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
              <button
                onClick={() => setAccentColor(undefined)}
                className={`w-5 h-5 rounded-full cursor-pointer border border-gray-200 dark:border-gray-700 text-[8px] text-gray-400 flex items-center justify-center transition-all ${
                  accentColor === undefined
                    ? "ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500 dark:ring-offset-gray-900"
                    : ""
                }`}
                title="Auto (trait-based)"
              >
                A
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User description */}
      {userDescription && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3 px-2 leading-relaxed">
          {userDescription}
        </p>
      )}

      {/* Trait tags */}
      {traits.length > 0 && (
        <div className="w-full mt-3 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Traits
            </span>
            {onRemoveTrait && (
              <button
                onClick={() => setEditingTraits(!editingTraits)}
                className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors"
              >
                {editingTraits ? "Done" : "Edit"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            {traits.map((trait) => (
              <span
                key={trait}
                className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800"
              >
                {trait}
                {editingTraits && onRemoveTrait && (
                  <button
                    onClick={() => onRemoveTrait(trait)}
                    className="text-cyan-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer ml-0.5 text-xs leading-none"
                    title={`Remove "${trait}"`}
                  >
                    &times;
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
