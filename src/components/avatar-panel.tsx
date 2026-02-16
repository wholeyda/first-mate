/**
 * Avatar Panel Component
 *
 * Sidebar panel that wraps the First Mate particle avatar
 * with the user description and removable trait tags.
 *
 * Displayed on the left side of the dashboard. Shows:
 *  - Animated particle avatar (evolves with completed goals)
 *  - Completed goals counter
 *  - Short user personality description
 *  - Trait tags with remove capability
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

export function AvatarPanel({
  completedGoalCount,
  traits,
  userDescription,
  onRemoveTrait,
}: AvatarPanelProps) {
  const [editingTraits, setEditingTraits] = useState(false);

  return (
    <div className="flex flex-col items-center p-4 border-b border-gray-100 dark:border-gray-800">
      {/* Animated particle avatar */}
      <FirstMateAvatar completedGoalCount={completedGoalCount} traits={traits} />

      {/* Completed goals counter */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
        {completedGoalCount === 0
          ? "Complete a goal to evolve!"
          : `${completedGoalCount} goal${completedGoalCount === 1 ? "" : "s"} completed`}
      </p>

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
