/**
 * Dashboard Client Component
 *
 * Main layout with two tabs: Chat and Schedule.
 * - Chat tab: talk to First Mate, create goals
 * - Schedule tab: view/approve the weekly calendar
 * Goals sidebar is always visible.
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

  function handleGoalCreated(parsedGoal: ParsedGoal) {
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      user_id: "",
      title: parsedGoal.title,
      description: parsedGoal.description,
      due_date: parsedGoal.due_date,
      estimated_hours: parsedGoal.estimated_hours,
      is_hard_deadline: parsedGoal.is_hard_deadline,
      priority: parsedGoal.priority,
      is_work: parsedGoal.is_work,
      status: "active",
      created_at: new Date().toISOString(),
    };
    setGoals((prev) => [...prev, newGoal]);
  }

  // Generate the weekly schedule
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

  // Approve the schedule and write to Google Calendar
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

  // Handle block changes from drag-and-drop
  const handleBlocksChange = useCallback((updated: ProposedBlock[]) => {
    setProposedBlocks(updated);
  }, []);

  return (
    <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#1e3a5f]">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
              activeTab === "chat"
                ? "bg-[#112240] text-[#c9a84c] border border-[#1e3a5f] border-b-0"
                : "text-[#5a7a9a] hover:text-[#d4c5a0]"
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
              activeTab === "schedule"
                ? "bg-[#112240] text-[#c9a84c] border border-[#1e3a5f] border-b-0"
                : "text-[#5a7a9a] hover:text-[#d4c5a0]"
            }`}
          >
            📅 Schedule
            {proposedBlocks.length > 0 && (
              <span className="ml-2 bg-[#c9a84c] text-[#0a1628] text-xs px-2 py-0.5 rounded-full">
                {proposedBlocks.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
              activeTab === "review"
                ? "bg-[#112240] text-[#c9a84c] border border-[#1e3a5f] border-b-0"
                : "text-[#5a7a9a] hover:text-[#d4c5a0]"
            }`}
          >
            ✅ Review
          </button>
          <button
            onClick={() => setActiveTab("ship")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer ${
              activeTab === "ship"
                ? "bg-[#112240] text-[#c9a84c] border border-[#1e3a5f] border-b-0"
                : "text-[#5a7a9a] hover:text-[#d4c5a0]"
            }`}
          >
            🏴‍☠️ Crew
          </button>

          {/* Generate schedule button */}
          {goals.length > 0 && (
            <button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="ml-auto mb-1 bg-[#1e3a5f] hover:bg-[#2d4a6f] disabled:bg-[#5a7a9a] text-[#d4c5a0] text-sm px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {isGenerating ? "Generating..." : "⚡ Generate Schedule"}
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
