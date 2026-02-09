/**
 * Dashboard Client Component
 *
 * Minimalist layout with tabs: Chat, Schedule, Review, Crew.
 * Goals sidebar on the right.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Chat } from "@/components/chat";
import { GoalsSidebar } from "@/components/goals-sidebar";
import { WeekView } from "@/components/week-view";
import { DailyReview } from "@/components/daily-review";
import { PirateShip } from "@/components/pirate-ship";
import { ParsedGoal } from "@/lib/parse-goal";
import { ProposedBlock } from "@/lib/scheduler";
import { Goal } from "@/types/database";
import {
  requestNotificationPermission,
  registerServiceWorker,
  scheduleAllNotifications,
} from "@/lib/notifications";

interface DashboardClientProps {
  initialGoals: Goal[];
}

type Tab = "chat" | "schedule" | "review" | "ship";

export function DashboardClient({ initialGoals }: DashboardClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [proposedBlocks, setProposedBlocks] = useState<ProposedBlock[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

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

  async function handleGenerateSchedule() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/schedule/generate", {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setProposedBlocks(data.blocks);
        setWeekStart(data.weekStart);
        setActiveTab("schedule");
      }
    } catch (error) {
      console.error("Failed to generate schedule:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleApprove() {
    setIsApproving(true);
    try {
      const response = await fetch("/api/schedule/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: proposedBlocks }),
      });
      if (response.ok) {
        setProposedBlocks([]);
        setActiveTab("chat");
      }
    } catch (error) {
      console.error("Failed to approve schedule:", error);
    } finally {
      setIsApproving(false);
    }
  }

  const handleBlocksChange = useCallback((updated: ProposedBlock[]) => {
    setProposedBlocks(updated);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-gray-100">
          {(["chat", "schedule", "review", "ship"] as Tab[]).map((tab) => (
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
              {tab === "schedule" && (
                <>
                  Schedule
                  {proposedBlocks.length > 0 && (
                    <span className="ml-2 bg-gray-900 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {proposedBlocks.length}
                    </span>
                  )}
                </>
              )}
              {tab === "review" && "Review"}
              {tab === "ship" && "Crew"}
            </button>
          ))}

          {/* Generate schedule button */}
          {goals.length > 0 && (
            <button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="ml-auto mb-1 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white text-sm px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {isGenerating ? "Generating..." : "Generate Schedule"}
            </button>
          )}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" && (
            <Chat onGoalCreated={handleGoalCreated} />
          )}
          {activeTab === "schedule" && (
            <WeekView
              blocks={proposedBlocks}
              weekStart={weekStart}
              onApprove={handleApprove}
              onRedo={handleGenerateSchedule}
              onBlocksChange={handleBlocksChange}
              isApproving={isApproving}
            />
          )}
          {activeTab === "review" && <DailyReview />}
          {activeTab === "ship" && <PirateShip />}
        </div>
      </div>

      {/* Goals sidebar */}
      <GoalsSidebar goals={goals} />
    </div>
  );
}
