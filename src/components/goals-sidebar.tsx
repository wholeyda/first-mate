/**
 * Goals Sidebar
 *
 * Shows a list of active goals on the right side of the dashboard.
 * Each goal displays its title, priority, due date, and type (work/personal).
 * Goals can be deleted (archived) with the × button.
 * Goals can be completed via AEIOU flow with the ✓ button.
 * Subtasks are pre-loaded from the dashboard and shown as expandable dropdowns.
 * They are treated as first-class items — visible and trackable.
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Goal, SubGoal } from "@/types/database";
import { SuggestionsPanel } from "@/components/suggestions-panel";

interface GoalsSidebarProps {
  goals: Goal[];
  subGoals?: Array<Record<string, unknown>>;
  onGoalDeleted?: (goalId: string) => void;
  onGoalComplete?: (goal: Goal) => void;
}

const PRIORITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Low", color: "text-gray-400" },
  2: { label: "Medium-Low", color: "text-gray-500" },
  3: { label: "Medium", color: "text-gray-600" },
  4: { label: "High", color: "text-gray-800" },
  5: { label: "Critical", color: "text-gray-900 font-semibold" },
};

export function GoalsSidebar({ goals, subGoals = [], onGoalDeleted, onGoalComplete }: GoalsSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [fetchedSubtasks, setFetchedSubtasks] = useState<Record<string, SubGoal[]>>({});
  const [loadingSubtasks, setLoadingSubtasks] = useState<Set<string>>(new Set());

  // Group initial subgoals by parent_goal_id
  const subGoalsByParent: Record<string, Array<Record<string, unknown>>> = {};
  for (const sg of subGoals) {
    const parentId = sg.parent_goal_id as string;
    if (!subGoalsByParent[parentId]) subGoalsByParent[parentId] = [];
    subGoalsByParent[parentId].push(sg);
  }

  const fetchSubtasksForGoal = useCallback(async (goalId: string) => {
    // Don't refetch if we already have data from props or previous fetch
    if (subGoalsByParent[goalId] || fetchedSubtasks[goalId]) return;
    setLoadingSubtasks((prev) => new Set(prev).add(goalId));
    try {
      const res = await fetch(`/api/goals/${goalId}/subtasks`);
      if (res.ok) {
        const data = await res.json();
        setFetchedSubtasks((prev) => ({ ...prev, [goalId]: data.subtasks || [] }));
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingSubtasks((prev) => {
        const next = new Set(prev);
        next.delete(goalId);
        return next;
      });
    }
  }, [fetchedSubtasks, subGoalsByParent]);

  function toggleExpanded(goalId: string) {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
        if (!subGoalsByParent[goalId]) {
          fetchSubtasksForGoal(goalId);
        }
      }
      return next;
    });
  }

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

  function getSubtasksForGoal(goalId: string): Array<{ id: string; title: string; status: string; estimated_hours?: number }> {
    // Prefer pre-loaded from props, fall back to client-fetched
    const fromProps = subGoalsByParent[goalId];
    if (fromProps) {
      return fromProps.map((sg) => ({
        id: sg.id as string,
        title: sg.title as string,
        status: sg.status as string,
        estimated_hours: sg.estimated_hours as number | undefined,
      }));
    }
    const fromFetch = fetchedSubtasks[goalId];
    if (fromFetch) {
      return fromFetch.map((sg) => ({
        id: sg.id,
        title: sg.title,
        status: sg.status,
        estimated_hours: sg.estimated_hours,
      }));
    }
    return [];
  }

  // Count total subtasks
  const totalSubtasks = Object.values(subGoalsByParent).reduce((sum, sgs) => sum + sgs.length, 0);

  return (
    <aside className="w-80 border-l border-gray-100 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Active Goals</h2>
        <p className="text-xs text-gray-400 mt-1">
          {goals.length} {goals.length === 1 ? "goal" : "goals"}
          {totalSubtasks > 0 && ` \u00B7 ${totalSubtasks} subtasks`}
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
            const isExpanded = expandedGoals.has(goal.id);
            const subtasks = getSubtasksForGoal(goal.id);
            const isLoadingSubs = loadingSubtasks.has(goal.id);
            const hasSubtasks = subtasks.length > 0;

            return (
              <div
                key={goal.id}
                className={`border border-gray-100 rounded-xl p-3 relative group ${
                  isDeleting ? "opacity-50" : ""
                }`}
              >
                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onGoalComplete && (
                    <button
                      onClick={() => onGoalComplete(goal)}
                      className="w-5 h-5 flex items-center justify-center text-green-400 hover:text-green-600 cursor-pointer text-xs"
                      title="Mark as complete"
                    >
                      &#10003;
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(goal.id)}
                    disabled={isDeleting}
                    className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-900 cursor-pointer text-xs"
                    title="Delete goal"
                  >
                    ×
                  </button>
                </div>

                <Link
                  href={`/dashboard/goals/${goal.id}`}
                  className="text-gray-900 text-sm font-medium mb-2 pr-12 block hover:text-gray-600 transition-colors"
                >
                  {goal.title}
                </Link>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={priority.color}>
                    {priority.label}
                  </span>
                  <span className="text-gray-300">&middot;</span>
                  <span className="text-gray-400">
                    {goal.estimated_hours}h
                  </span>
                  <span className="text-gray-300">&middot;</span>
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

                {/* Subtasks dropdown toggle */}
                <button
                  onClick={() => toggleExpanded(goal.id)}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer flex items-center gap-1 transition-colors"
                >
                  <span className="inline-block transition-transform" style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                    &#9654;
                  </span>
                  Subtasks
                  {hasSubtasks && (
                    <span className="text-gray-300">({subtasks.length})</span>
                  )}
                </button>

                {/* Subtasks list */}
                {isExpanded && (
                  <div className="mt-2 pl-3 border-l-2 border-gray-100 space-y-1.5">
                    {isLoadingSubs && (
                      <p className="text-xs text-gray-300">Loading...</p>
                    )}
                    {!isLoadingSubs && subtasks.length === 0 && (
                      <p className="text-xs text-gray-300">
                        No subtasks yet — <Link href={`/dashboard/goals/${goal.id}`} className="text-gray-500 hover:text-gray-700 underline">decompose</Link>
                      </p>
                    )}
                    {subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-start gap-2 text-xs py-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${
                          sub.status === "completed" ? "bg-green-400" :
                          sub.status === "in_progress" ? "bg-blue-400" :
                          "bg-gray-300"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <span className={sub.status === "completed" ? "text-gray-400 line-through" : "text-gray-600"}>
                            {sub.title}
                          </span>
                          {sub.estimated_hours && (
                            <span className="text-gray-300 ml-1">({sub.estimated_hours}h)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
