/**
 * Goals Sidebar
 *
 * Shows a list of active goals on the right side of the dashboard.
 * Each goal displays its title, priority, due date, and type (work/personal).
 * Goals can be deleted (archived) with the × button.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Goal } from "@/types/database";
import { SuggestionsPanel } from "@/components/suggestions-panel";

interface GoalsSidebarProps {
  goals: Goal[];
  onGoalDeleted?: (goalId: string) => void;
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "text-gray-400" },
  2: { label: "Medium-Low", color: "text-gray-500" },
  3: { label: "Medium", color: "text-gray-600" },
  4: { label: "High", color: "text-gray-800" },
  5: { label: "Critical", color: "text-gray-900 font-semibold" },
};

export function GoalsSidebar({ goals, onGoalDeleted }: GoalsSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(goalId: string) {
    setDeletingId(goalId);
    try {
      const response = await fetch(`/api/goals/${goalId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        onGoalDeleted?.(goalId);
      }
    } catch {
      // Delete failed silently
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <aside className="w-80 border-l border-gray-100 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Active Goals</h2>
        <p className="text-xs text-gray-400 mt-1">
          {goals.length} {goals.length === 1 ? "goal" : "goals"}
        </p>
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {goals.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-8">
            No goals yet. Tell First Mate what you want to accomplish!
          </p>
        )}

        {goals
          .sort((a, b) => b.priority - a.priority)
          .map((goal) => {
            const priority = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG[3];
            const isDeleting = deletingId === goal.id;
            return (
              <div
                key={goal.id}
                className={`border border-gray-100 rounded-xl p-3 relative group ${
                  isDeleting ? "opacity-50" : ""
                }`}
              >
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(goal.id)}
                  disabled={isDeleting}
                  className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                  title="Delete goal"
                >
                  ×
                </button>

                <Link
                  href={`/dashboard/goals/${goal.id}`}
                  className="text-gray-900 text-sm font-medium mb-2 pr-5 block hover:text-gray-600 transition-colors"
                >
                  {goal.title}
                </Link>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={priority.color}>
                    {priority.label}
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-400">
                    {goal.estimated_hours}h
                  </span>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-400">
                    {goal.is_work ? "Work" : "Personal"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <span>
                    Due: {new Date(goal.due_date).toLocaleDateString()}
                  </span>
                  {goal.is_hard_deadline && (
                    <span className="text-gray-900 font-medium">Hard deadline</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Suggestions */}
      <div className="border-t border-gray-100">
        <SuggestionsPanel />
      </div>
    </aside>
  );
}
