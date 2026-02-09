/**
 * Goals Sidebar
 *
 * Shows a list of active goals on the right side of the dashboard.
 * Each goal displays its title, priority, due date, and type (work/personal).
 */

"use client";

import { Goal } from "@/types/database";
import { SuggestionsPanel } from "@/components/suggestions-panel";

interface GoalsSidebarProps {
  goals: Goal[];
}

// Priority labels and colors
const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "text-[#5a7a9a]" },
  2: { label: "Medium-Low", color: "text-[#5a9a7a]" },
  3: { label: "Medium", color: "text-[#c9a84c]" },
  4: { label: "High", color: "text-[#d4875a]" },
  5: { label: "Critical", color: "text-[#d45a5a]" },
};

export function GoalsSidebar({ goals }: GoalsSidebarProps) {
  return (
    <aside className="w-80 border-l border-[#1e3a5f] bg-[#0d1f3c] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#1e3a5f]">
        <h2 className="text-lg font-semibold text-[#c9a84c]">Active Goals</h2>
        <p className="text-xs text-[#5a7a9a] mt-1">
          {goals.length} {goals.length === 1 ? "goal" : "goals"}
        </p>
      </div>

      {/* Goals list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {goals.length === 0 && (
          <p className="text-[#5a7a9a] text-sm text-center mt-8">
            No goals yet. Tell First Mate what you want to accomplish!
          </p>
        )}

        {goals
          .sort((a, b) => b.priority - a.priority)
          .map((goal) => {
            const priority = PRIORITY_CONFIG[goal.priority] || PRIORITY_CONFIG[3];
            return (
              <div
                key={goal.id}
                className="bg-[#112240] border border-[#1e3a5f] rounded-xl p-3"
              >
                <h3 className="text-[#d4c5a0] text-sm font-medium mb-2">
                  {goal.title}
                </h3>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`${priority.color}`}>
                    {priority.label}
                  </span>
                  <span className="text-[#5a7a9a]">•</span>
                  <span className="text-[#5a7a9a]">
                    {goal.estimated_hours}h
                  </span>
                  <span className="text-[#5a7a9a]">•</span>
                  <span className="text-[#5a7a9a]">
                    {goal.is_work ? "Work" : "Personal"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-[#5a7a9a]">
                  <span>
                    Due: {new Date(goal.due_date).toLocaleDateString()}
                  </span>
                  {goal.is_hard_deadline && (
                    <span className="text-[#d45a5a]">⚠ Hard deadline</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* Suggestions */}
      <div className="border-t border-[#1e3a5f]">
        <SuggestionsPanel />
      </div>
    </aside>
  );
}
