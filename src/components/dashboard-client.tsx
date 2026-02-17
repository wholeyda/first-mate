/**
 * Dashboard Client Component
 *
 * Minimalist layout with tabs: Chat, Calendar, Resume.
 * Goals sidebar on the right with AEIOU completion flow.
 * Sub-goals are treated as first-class items in the sidebar.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { Chat } from "@/components/chat";
import { GoalsSidebar } from "@/components/goals-sidebar";
import { CalendarView } from "@/components/calendar-view";
import { ResumePanel } from "@/components/resume-panel";
import { AeiouModal } from "@/components/aeiou-modal";
import { IslandReveal } from "@/components/island-reveal";
import { AvatarPanel } from "@/components/avatar-panel";
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
  completedGoalCount?: number;
}

type Tab = "chat" | "calendar" | "resume";

export function DashboardClient({ initialGoals, initialSubGoals = [], completedGoalCount = 0 }: DashboardClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [subGoals, setSubGoals] = useState<Array<Record<string, unknown>>>(initialSubGoals);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [islands, setIslands] = useState<Island[]>([]);
  const [completingGoal, setCompletingGoal] = useState<Goal | null>(null);
  const [revealIsland, setRevealIsland] = useState<{ island: Island; goalTitle: string } | null>(null);
  const [avatarExpanded, setAvatarExpanded] = useState(false);

  // Avatar state
  const [avatarData, setAvatarData] = useState<{ description: string; traits: string[] }>({
    description: "",
    traits: [],
  });
  const [localCompletedCount, setLocalCompletedCount] = useState(completedGoalCount);

  // Fetch avatar personality data on mount
  useEffect(() => {
    async function fetchAvatarData() {
      try {
        const res = await fetch("/api/avatar");
        if (res.ok) {
          const data = await res.json();
          setAvatarData({
            description: data.description || "",
            traits: data.traits || [],
          });
        }
      } catch {
        // Silent fail for avatar data
      }
    }
    fetchAvatarData();
  }, []);

  // Handle removing a trait
  const handleRemoveTrait = useCallback((trait: string) => {
    setAvatarData((prev) => ({
      ...prev,
      traits: prev.traits.filter((t) => t !== trait),
    }));
  }, []);

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

  function handleSubGoalStatusChange(parentGoalId: string, subGoalId: string, newStatus: string) {
    setSubGoals((prev) =>
      prev.map((sg) =>
        sg.id === subGoalId && sg.parent_goal_id === parentGoalId
          ? { ...sg, status: newStatus }
          : sg
      )
    );
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
        setLocalCompletedCount((c) => c + 1);
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

  function handleHistoryCleared() {
    setGoals([]);
    setSubGoals([]);
    setIslands([]);
    setLocalCompletedCount(0);
    setAvatarData({ description: "Just getting started! Complete some goals to reveal your character.", traits: [] });
  }

  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Avatar panel - left side */}
      <div className={`${avatarExpanded ? 'w-80' : 'w-48'} border-r border-gray-100 dark:border-gray-800 overflow-y-auto bg-white dark:bg-gray-950 hidden lg:block transition-all duration-300 relative`}>
        <button onClick={() => setAvatarExpanded(!avatarExpanded)} className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xs cursor-pointer z-10 bg-gray-100 dark:bg-gray-800 rounded-full">
          {avatarExpanded ? '\u00AB' : '\u00BB'}
        </button>
        <AvatarPanel
          completedGoalCount={localCompletedCount}
          traits={avatarData.traits}
          userDescription={avatarData.description}
          onRemoveTrait={handleRemoveTrait}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-gray-100 dark:border-gray-800">
          {(["chat", "calendar", "resume"] as Tab[]).map((tab) => (
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
              {tab === "resume" && "Resume"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <Chat onGoalCreated={handleGoalCreated} islands={islands} onIslandRemoved={handleIslandRemoved} onHistoryCleared={handleHistoryCleared} />
          )}
          {activeTab === "calendar" && <CalendarView />}
          {activeTab === "resume" && <ResumePanel />}
        </div>
      </div>

      {/* Goals sidebar */}
      <GoalsSidebar
        goals={activeGoals}
        subGoals={subGoals}
        onGoalDeleted={handleGoalDeleted}
        onGoalComplete={handleGoalCompleted}
        onSubGoalStatusChange={handleSubGoalStatusChange}
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
