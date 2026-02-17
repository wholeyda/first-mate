/**
 * Goal Detail Client Component
 *
 * Two-column layout:
 * - Left: goal info + AI decomposition chat (globe removed to save space)
 * - Right: interactive Gantt chart + draggable sub-goal list
 *
 * User can decompose goals with AI, drag-and-drop to reorder/reschedule
 * sub-goals, edit inline, and view the Gantt chart.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Goal, SubGoal } from "@/types/database";
import { GanttChart } from "@/components/gantt-chart";
import Link from "next/link";

interface GoalDetailClientProps {
  goal: Goal;
}

interface SubGoalItem {
  id?: string;
  title: string;
  description: string | null;
  estimated_hours: number;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "in_progress" | "completed";
  sort_order: number;
  depends_on_indices: number[];
}

export function GoalDetailClient({ goal }: GoalDetailClientProps) {
  const [subGoals, setSubGoals] = useState<SubGoalItem[]>([]);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [context, setContext] = useState("");
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubGoalItem>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSubGoalForm, setNewSubGoalForm] = useState<Partial<SubGoalItem>>({
    title: "",
    description: "",
    estimated_hours: 1,
    start_date: null,
    end_date: null,
    status: "pending",
  });

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Fetch existing sub-goals
  const fetchSubGoals = useCallback(async () => {
    try {
      const response = await fetch(`/api/goals/${goal.id}/sub-goals`);
      if (response.ok) {
        const data = await response.json();
        if (data.subGoals && data.subGoals.length > 0) {
          setSubGoals(
            data.subGoals.map((sg: SubGoal) => ({
              id: sg.id,
              title: sg.title,
              description: sg.description,
              estimated_hours: sg.estimated_hours,
              start_date: sg.start_date,
              end_date: sg.end_date,
              status: sg.status,
              sort_order: sg.sort_order,
              depends_on_indices: sg.depends_on || [],
            }))
          );
        }
      }
    } catch {
      // Silent fail
    }
  }, [goal.id]);

  useEffect(() => {
    fetchSubGoals();
  }, [fetchSubGoals]);

  // AI decomposition
  async function handleDecompose() {
    setIsDecomposing(true);
    setError(null);
    try {
      const response = await fetch(`/api/goals/${goal.id}/decompose`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Decomposition failed");
      }

      const data = await response.json();
      if (data.subGoals) {
        setSubGoals(
          data.subGoals.map(
            (
              sg: {
                title: string;
                description?: string;
                estimated_hours: number;
                start_date?: string;
                end_date?: string;
                sort_order: number;
                depends_on_indices?: number[];
              },
              idx: number
            ) => ({
              title: sg.title,
              description: sg.description || null,
              estimated_hours: sg.estimated_hours,
              start_date: sg.start_date || null,
              end_date: sg.end_date || null,
              status: "pending" as const,
              sort_order: sg.sort_order ?? idx,
              depends_on_indices: sg.depends_on_indices || [],
            })
          )
        );
        setHasUnsavedChanges(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decompose goal. Please try again.");
    } finally {
      setIsDecomposing(false);
    }
  }

  // Save sub-goals to database
  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      // If existing sub-goals, delete them first
      const existingIds = subGoals.filter((sg) => sg.id).map((sg) => sg.id);
      for (const sgId of existingIds) {
        await fetch(`/api/goals/${goal.id}/sub-goals/${sgId}`, {
          method: "DELETE",
        });
      }

      // Save new sub-goals
      const response = await fetch(`/api/goals/${goal.id}/sub-goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subGoals: subGoals.map((sg) => ({
            title: sg.title,
            description: sg.description,
            estimated_hours: sg.estimated_hours,
            start_date: sg.start_date,
            end_date: sg.end_date,
            sort_order: sg.sort_order,
            depends_on: sg.depends_on_indices,
          })),
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      const data = await response.json();
      if (data.subGoals) {
        setSubGoals(
          data.subGoals.map((sg: SubGoal) => ({
            id: sg.id,
            title: sg.title,
            description: sg.description,
            estimated_hours: sg.estimated_hours,
            start_date: sg.start_date,
            end_date: sg.end_date,
            status: sg.status,
            sort_order: sg.sort_order,
            depends_on_indices: sg.depends_on || [],
          }))
        );
      }

      setHasUnsavedChanges(false);
    } catch {
      setError("Failed to save sub-goals.");
    } finally {
      setIsSaving(false);
    }
  }

  // Update sub-goal status
  function handleStatusToggle(idx: number) {
    setSubGoals((prev) => {
      const updated = [...prev];
      const current = updated[idx].status;
      updated[idx] = {
        ...updated[idx],
        status:
          current === "pending"
            ? "in_progress"
            : current === "in_progress"
            ? "completed"
            : "pending",
      };
      return updated;
    });
    setHasUnsavedChanges(true);
  }

  // Drag and drop handlers
  function handleDragStart(idx: number) {
    setDragIndex(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDragOverIndex(idx);
  }

  function handleDrop(idx: number) {
    if (dragIndex === null || dragIndex === idx) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setSubGoals((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(idx, 0, moved);
      // Update sort orders
      return updated.map((sg, i) => ({ ...sg, sort_order: i }));
    });
    setHasUnsavedChanges(true);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  // Inline edit: open form for a sub-goal
  function startEditing(idx: number) {
    const sg = subGoals[idx];
    setEditingIndex(idx);
    setEditForm({
      title: sg.title,
      description: sg.description || "",
      estimated_hours: sg.estimated_hours,
      start_date: sg.start_date,
      end_date: sg.end_date,
      status: sg.status,
    });
  }

  function cancelEditing() {
    setEditingIndex(null);
    setEditForm({});
  }

  // PATCH individual sub-goal
  async function handleSubGoalUpdate(idx: number) {
    const sg = subGoals[idx];
    if (!sg.id) {
      // Not saved yet - just update locally
      setSubGoals((prev) => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          title: editForm.title ?? updated[idx].title,
          description: editForm.description ?? updated[idx].description,
          estimated_hours: editForm.estimated_hours ?? updated[idx].estimated_hours,
          start_date: editForm.start_date ?? updated[idx].start_date,
          end_date: editForm.end_date ?? updated[idx].end_date,
          status: editForm.status ?? updated[idx].status,
        };
        return updated;
      });
      setEditingIndex(null);
      setEditForm({});
      setHasUnsavedChanges(true);
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/goals/${goal.id}/sub-goals/${sg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description || null,
          estimated_hours: editForm.estimated_hours,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          status: editForm.status,
        }),
      });
      if (!response.ok) throw new Error("Update failed");
      const data = await response.json();
      setSubGoals((prev) => {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          title: data.subGoal?.title ?? editForm.title ?? updated[idx].title,
          description: data.subGoal?.description ?? editForm.description ?? updated[idx].description,
          estimated_hours: data.subGoal?.estimated_hours ?? editForm.estimated_hours ?? updated[idx].estimated_hours,
          start_date: data.subGoal?.start_date ?? editForm.start_date ?? updated[idx].start_date,
          end_date: data.subGoal?.end_date ?? editForm.end_date ?? updated[idx].end_date,
          status: data.subGoal?.status ?? editForm.status ?? updated[idx].status,
        };
        return updated;
      });
      setEditingIndex(null);
      setEditForm({});
    } catch {
      setError("Failed to update sub-goal.");
    }
  }

  // DELETE individual sub-goal
  async function handleSubGoalDelete(idx: number) {
    const sg = subGoals[idx];
    if (!sg.id) {
      // Unsaved sub-goal, just remove from local state
      setSubGoals((prev) => prev.filter((_, i) => i !== idx));
      if (selectedIndex === idx) setSelectedIndex(undefined);
      if (editingIndex === idx) cancelEditing();
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/goals/${goal.id}/sub-goals/${sg.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");
      setSubGoals((prev) => prev.filter((_, i) => i !== idx));
      if (selectedIndex === idx) setSelectedIndex(undefined);
      if (editingIndex === idx) cancelEditing();
    } catch {
      setError("Failed to delete sub-goal.");
    }
  }

  // POST a single new sub-goal
  async function handleAddSubGoal() {
    if (!newSubGoalForm.title?.trim()) {
      setError("Sub-goal title is required.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/goals/${goal.id}/sub-goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subGoals: [
            {
              title: newSubGoalForm.title,
              description: newSubGoalForm.description || null,
              estimated_hours: newSubGoalForm.estimated_hours || 1,
              start_date: newSubGoalForm.start_date || null,
              end_date: newSubGoalForm.end_date || null,
              sort_order: subGoals.length,
              depends_on: [],
            },
          ],
        }),
      });
      if (!response.ok) throw new Error("Add failed");
      const data = await response.json();
      if (data.subGoals && data.subGoals.length > 0) {
        const newSg = data.subGoals[data.subGoals.length - 1];
        setSubGoals((prev) => [
          ...prev,
          {
            id: newSg.id,
            title: newSg.title,
            description: newSg.description,
            estimated_hours: newSg.estimated_hours,
            start_date: newSg.start_date,
            end_date: newSg.end_date,
            status: newSg.status || "pending",
            sort_order: newSg.sort_order,
            depends_on_indices: newSg.depends_on || [],
          },
        ]);
      }
      setIsAddingNew(false);
      setNewSubGoalForm({
        title: "",
        description: "",
        estimated_hours: 1,
        start_date: null,
        end_date: null,
        status: "pending",
      });
    } catch {
      setError("Failed to add sub-goal.");
    }
  }

  // Handle Gantt bar date changes from drag
  function handleGanttDateChange(idx: number, newStart: string, newEnd: string) {
    setSubGoals((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], start_date: newStart, end_date: newEnd };
      return updated;
    });
    setHasUnsavedChanges(true);
  }

  const totalHours = subGoals.reduce((sum, sg) => sum + sg.estimated_hours, 0);
  const completedCount = subGoals.filter(
    (sg) => sg.status === "completed"
  ).length;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel: Goal info + AI decomposition */}
      <div className="w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-950">
        {/* Back link */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-none">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {/* Goal info */}
          <div className="px-4 py-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{goal.title}</h2>
            {goal.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{goal.description}</p>
            )}
            <div className="flex gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>Due: {new Date(goal.due_date).toLocaleDateString()}</span>
              <span>{goal.estimated_hours}h total</span>
              <span>{goal.is_work ? "Work" : "Personal"}</span>
            </div>
          </div>

          {/* Decomposition input - prominently displayed */}
          <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              AI Decomposition
            </h3>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
              Add context for AI to break down this goal into sub-tasks
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="e.g., I want to focus on the backend first, then UI..."
              className="w-full min-h-[100px] text-sm text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 dark:focus:ring-cyan-400/50"
            />
            <button
              onClick={handleDecompose}
              disabled={isDecomposing}
              className="mt-3 w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              {isDecomposing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Decomposing...
                </span>
              ) : (
                "Decompose with AI"
              )}
            </button>

            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </div>

          {/* Sub-goals summary */}
          {subGoals.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Sub-Goals ({subGoals.length})
                </h3>
                {hasUnsavedChanges && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isSaving ? "Saving..." : "Save All"}
                  </button>
                )}
              </div>
              <div className="flex gap-3 text-xs text-gray-400 dark:text-gray-500">
                <span>{completedCount}/{subGoals.length} done</span>
                <span>{totalHours}h estimated</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-400 rounded-full transition-all duration-300"
                  style={{ width: `${subGoals.length > 0 ? (completedCount / subGoals.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Gantt + Sub-goals */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-950">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-none">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Sub-Goals & Timeline
            </h3>
            {subGoals.length > 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {completedCount}/{subGoals.length} completed &middot;{" "}
                {totalHours}h estimated &middot; Drag to reorder or reschedule
              </p>
            )}
          </div>
          {hasUnsavedChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          )}
        </div>

        {/* Gantt Chart + Sub-goals list */}
        {subGoals.length > 0 ? (
          <div className="flex-1 overflow-auto p-6 space-y-6">
            <GanttChart
              subGoals={subGoals}
              parentDueDate={goal.due_date}
              onSubGoalClick={setSelectedIndex}
              selectedIndex={selectedIndex}
              onDateChange={handleGanttDateChange}
              editable={true}
            />

            {/* Sub-goals list with drag-and-drop */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Sub-Goals (drag to reorder)
              </h4>
              {subGoals.map((sg, idx) => (
                <div key={sg.id || idx}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                      dragOverIndex === idx
                        ? "border-cyan-400 dark:border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 scale-[1.01]"
                        : selectedIndex === idx
                        ? "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20"
                        : dragIndex === idx
                        ? "opacity-40 border-gray-200 dark:border-gray-700"
                        : "border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
                    }`}
                    onClick={() => {
                      if (selectedIndex === idx) {
                        if (editingIndex === idx) {
                          cancelEditing();
                        } else {
                          startEditing(idx);
                        }
                      } else {
                        setSelectedIndex(idx);
                        startEditing(idx);
                      }
                    }}
                  >
                    {/* Drag handle */}
                    <div className="text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-grab select-none">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <circle cx="4" cy="2" r="1" />
                        <circle cx="8" cy="2" r="1" />
                        <circle cx="4" cy="6" r="1" />
                        <circle cx="8" cy="6" r="1" />
                        <circle cx="4" cy="10" r="1" />
                        <circle cx="8" cy="10" r="1" />
                      </svg>
                    </div>

                    {/* Status toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusToggle(idx);
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                        sg.status === "completed"
                          ? "bg-green-400 border-green-400"
                          : sg.status === "in_progress"
                          ? "bg-blue-400 border-blue-400"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      {sg.status === "completed" && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          fill="white"
                        >
                          <path d="M2 5 L4 7 L8 3" stroke="white" strokeWidth="1.5" fill="none" />
                        </svg>
                      )}
                      {sg.status === "in_progress" && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          sg.status === "completed"
                            ? "text-gray-400 dark:text-gray-500 line-through"
                            : "text-gray-900 dark:text-gray-100"
                        }`}
                      >
                        {sg.title}
                      </p>
                      {sg.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                          {sg.description}
                        </p>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="text-xs text-gray-400 dark:text-gray-500 flex gap-2 flex-shrink-0">
                      <span>{sg.estimated_hours}h</span>
                      {sg.start_date && (
                        <span>
                          {new Date(sg.start_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubGoalDelete(idx);
                      }}
                      className="w-5 h-5 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 cursor-pointer"
                      title="Delete sub-goal"
                    >
                      <span className="text-sm leading-none">&times;</span>
                    </button>
                  </div>

                  {/* Inline edit form */}
                  {editingIndex === idx && (
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title || ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                            className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Estimated hours</label>
                          <input
                            type="number"
                            min={0.5}
                            step={0.5}
                            value={editForm.estimated_hours ?? 1}
                            onChange={(e) => setEditForm((f) => ({ ...f, estimated_hours: parseFloat(e.target.value) || 0.5 }))}
                            className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Status</label>
                          <select
                            value={editForm.status || "pending"}
                            onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as SubGoalItem["status"] }))}
                            className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Start date</label>
                          <input
                            type="date"
                            value={editForm.start_date || ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, start_date: e.target.value || null }))}
                            className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">End date</label>
                          <input
                            type="date"
                            value={editForm.end_date || ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value || null }))}
                            className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Description</label>
                          <textarea
                            value={editForm.description || ""}
                            onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                            rows={2}
                            className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleSubGoalUpdate(idx)}
                          className="px-3 py-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new sub-goal */}
              {!isAddingNew ? (
                <button
                  onClick={() => setIsAddingNew(true)}
                  className="w-full py-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                >
                  + Add sub-goal
                </button>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Title</label>
                      <input
                        type="text"
                        value={newSubGoalForm.title || ""}
                        onChange={(e) => setNewSubGoalForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Sub-goal title"
                        className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Estimated hours</label>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        value={newSubGoalForm.estimated_hours ?? 1}
                        onChange={(e) => setNewSubGoalForm((f) => ({ ...f, estimated_hours: parseFloat(e.target.value) || 0.5 }))}
                        className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Status</label>
                      <select
                        value={newSubGoalForm.status || "pending"}
                        onChange={(e) => setNewSubGoalForm((f) => ({ ...f, status: e.target.value as SubGoalItem["status"] }))}
                        className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Start date</label>
                      <input
                        type="date"
                        value={newSubGoalForm.start_date || ""}
                        onChange={(e) => setNewSubGoalForm((f) => ({ ...f, start_date: e.target.value || null }))}
                        className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">End date</label>
                      <input
                        type="date"
                        value={newSubGoalForm.end_date || ""}
                        onChange={(e) => setNewSubGoalForm((f) => ({ ...f, end_date: e.target.value || null }))}
                        className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-gray-500 dark:text-gray-400 text-xs block mb-1">Description</label>
                      <textarea
                        value={newSubGoalForm.description || ""}
                        onChange={(e) => setNewSubGoalForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                        placeholder="Optional description"
                        className="w-full text-sm px-2 py-1.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-600"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleAddSubGoal}
                      className="px-3 py-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 text-xs font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewSubGoalForm({
                          title: "",
                          description: "",
                          estimated_hours: 1,
                          start_date: null,
                          end_date: null,
                          status: "pending",
                        });
                      }}
                      className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400 dark:text-gray-500">
                  <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  <path d="M9 14l2 2 4-4" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                No sub-goals yet
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 max-w-[240px]">
                Use the AI Decomposition panel on the left to break this goal into actionable sub-tasks
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
