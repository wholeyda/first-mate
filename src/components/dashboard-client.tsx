/**
 * Dashboard Client Component
 *
 * Wraps the chat interface and goals sidebar.
 * This is a client component because it manages interactive state
 * (chat messages, goal updates, etc.)
 */

"use client";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { GoalsSidebar } from "@/components/goals-sidebar";
import { ParsedGoal } from "@/lib/parse-goal";
import { Goal } from "@/types/database";

interface DashboardClientProps {
  initialGoals: Goal[];
}

export function DashboardClient({ initialGoals }: DashboardClientProps) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);

  function handleGoalCreated(parsedGoal: ParsedGoal) {
    // Add the new goal to the sidebar (optimistic update)
    const newGoal: Goal = {
      id: crypto.randomUUID(), // Temporary ID until page refresh
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

  return (
    <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Chat — takes up most of the space */}
      <div className="flex-1 flex flex-col min-w-0">
        <Chat onGoalCreated={handleGoalCreated} />
      </div>

      {/* Goals sidebar */}
      <GoalsSidebar goals={goals} />
    </div>
  );
}
