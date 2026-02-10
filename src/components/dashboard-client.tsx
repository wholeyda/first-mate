/**
 * Dashboard Client Component
 *
 * Minimalist layout with tabs: Chat, Calendar, Review, Crew.
 * Goals sidebar on the right.
 */

"use client";

import { useState, useEffect } from "react";
import { Chat } from "@/components/chat";
import { GoalsSidebar } from "@/components/goals-sidebar";
import { CalendarView } from "@/components/calendar-view";
import { DancingFigures } from "@/components/dancing-figures";
import { ParsedGoal } from "@/lib/parse-goal";
import { Goal } from "@/types/database";
import {
  requestNotificationPermission,
  registerServiceWorker,
  scheduleAllNotifications,
} from "@/lib/notifications";

interface DashboardClientProps {
  initialGoals: Goal[];
}

type Tab = "chat" | "calendar" | "ship";

export function DashboardClient({ initialGoals }: DashboardClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [activeTab, setActiveTab] = useState<Tab>("chat");

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
  }

  return (
    <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-gray-100">
          {(["chat", "calendar", "ship"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab
                  ? "text-gray-900 border-b-2 border-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {tab === "chat" && "Chat"}
              {tab === "calendar" && "Calendar"}
              {tab === "ship" && "Crew"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <Chat onGoalCreated={handleGoalCreated} />
          )}
          {activeTab === "calendar" && <CalendarView />}
          {activeTab === "ship" && <DancingFigures goals={goals} />}
        </div>
      </div>

      {/* Goals sidebar */}
      <GoalsSidebar goals={goals} onGoalDeleted={handleGoalDeleted} />
    </div>
  );
}
