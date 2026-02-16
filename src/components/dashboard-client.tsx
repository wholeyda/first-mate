/**
 * Dashboard Client Component
 *
 * Minimalist layout with tabs: Chat, Calendar.
 * Goals sidebar on the right with AEIOU completion flow.
 * Sub-goals are treated as first-class items in the sidebar.
 */

"use client";

import { useState, useEffect } from "react";
import { Chat } from "@/components/chat";
import { GoalsSidebar } from "@/components/goals-sidebar";
import { CalendarView } from "@/components/calendar-view";
import { AeiouModal } from "@/components/aeiou-modal";
import { IslandReveal } from "@/components/island-reveal";
import { ParsedGoal } from "@/lib/parse-goal";
import { Goal, Island } from "@/types/database";
import {
  requestNotificationPermission,
  registerServiceWorker,
  scheduleAllNotifications,
} from "@/lib/notifications";

interface DashboardClientProps {
  initialGoals: Goal[];
  initialSubGoals?: Array<Record<string, unknown>>;
}

type Tab = "chat" | "calendar";

export function DashboardClient({ initialGoals, initialSubGoals = [] }: DashboardClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [subGoals, setSubGoals] = useState<Array<Record<string, unknown>>>(initialSubGoals);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [islands, setIslands] = useState<Island[]>([]);
  const [completingGoal, setCompletingGoal] = useState<Goal | null>(null);
  const [revealIsland, setRevealIsland] = useState<{ island: Island; goalTitle: string } | null>(null);

  // Initialize notifications on mount
  useEffect(() => {
    async function initNotifications() {
      const granted = await requestNotificationPermission();
      if (granted) {
        await registerServiceWorker();
        scheduleAllNotifications();
      }
    }
    initNotifications();
  }, []);

  // Fetch islands on mount
  useEffect(() => {
    async function fetchIslands() {
      try {
        const res = await fetch("/api/islands");
        if (res.ok) {
          const data = await res.json();
          setIslands(data.islands || []);
        }
      } catch {
        // Silent fail for islands
      }
    }
    fetchIslands();
  }, []);

  function handleGoalCreated(parsedGoal: ParsedGoal, savedGoal?: Record<string, unknown>) {
    const newGoal: Goal = {
      id: (savedGoal?.id as string) || crypto.randomUUID(),
      user_id: (savedGoal?.user_id as string) || "",
      title: parsedGoal.title,
      description: parsedGoal.description,
      due_date: parsedGoal.due_date,
      estimated_hours: parsedGoal.estimated_hours,
      is_hard_deadline: parsedGoal.is_hard_deadline,
      priority: parsedGoal.priority,
      is_work: parsedGoal.is_work,
      status: "active",
      preferred_time: parsedGoal.preferred_time,
      duration_minutes: parsedGoal.duration_minutes,
      recurring: parsedGoal.recurring,
      created_at: (savedGoal?.created_at as string) || new Date().toISOString(),
    };
    setGoals((prev) => [...prev, newGoal]);
  }

  function handleGoalDeleted(goalId: string) {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    // Also remove sub-goals belonging to deleted goal
    setSubGoals((prev) => prev.filter((sg) => sg.parent_goal_id !== goalId));
  }

  function handleGoalCompleted(goal: Goal) {
    setCompletingGoal(goal);
  }

  async function handleAeiouSuccess(aeiouResponseId: string) {
    if (!completingGoal) return;

    // Create planet via API
    try {
      const res = await fetch("/api/islands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_id: completingGoal.id,
          aeiou_response_id: aeiouResponseId,
          name: completingGoal.title,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const island = data.island as Island;
        setIslands((prev) => [...prev, island]);
        // Move goal to completed
        setGoals((prev) =>
          prev.map((g) =>
            g.id === completingGoal.id ? { ...g, status: "completed" as const } : g
          )
        );
        setCompletingGoal(null);
        setRevealIsland({ island, goalTitle: completingGoal.title });
      }
    } catch {
      // Fall back — just close
      setCompletingGoal(null);
    }
  }

  function handleIslandRemoved(islandId: string) {
    setIslands((prev) => prev.filter((i) => i.id !== islandId));
  }

  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-gray-100 dark:border-gray-800">
          {(["chat", "calendar"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab
                  ? "text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {tab === "chat" && "Chat"}
              {tab === "calendar" && "Calendar"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <Chat onGoalCreated={handleGoalCreated} islands={islands} onIslandRemoved={handleIslandRemoved} />
          )}
          {activeTab === "calendar" && <CalendarView />}
        </div>
      </div>

      {/* Goals sidebar */}
      <GoalsSidebar
        goals={activeGoals}
        subGoals={subGoals}
        onGoalDeleted={handleGoalDeleted}
        onGoalComplete={handleGoalCompleted}
      />

      {/* AEIOU Completion Modal */}
      {completingGoal && (
        <AeiouModal
          goal={completingGoal}
          isOpen={true}
          onClose={() => setCompletingGoal(null)}
          onSuccess={handleAeiouSuccess}
        />
      )}

      {/* Planet Reveal */}
      {revealIsland && (
        <IslandReveal
          island={revealIsland.island}
          goalTitle={revealIsland.goalTitle}
          isOpen={true}
          onClose={() => setRevealIsland(null)}
        />
      )}
    </div>
  );
}
