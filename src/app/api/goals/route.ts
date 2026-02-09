/**
 * Goals API
 *
 * POST - Create a new goal from chat-parsed data.
 * Moves the database write from the client component to the server
 * for proper security (server-side auth + validation).
 *
 * Body: { goal: ParsedGoal }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface GoalBody {
  title: string;
  description: string | null;
  due_date: string;
  estimated_hours: number;
  is_hard_deadline: boolean;
  priority: number;
  is_work: boolean;
  preferred_time: string | null;
  duration_minutes: number | null;
  recurring: { type: string; days: string[] } | null;
}

/**
 * Validate goal fields before inserting into the database.
 */
function validateGoal(goal: GoalBody): string | null {
  if (!goal.title || typeof goal.title !== "string" || goal.title.trim().length === 0) {
    return "title is required";
  }
  if (!goal.due_date || typeof goal.due_date !== "string") {
    return "due_date is required";
  }
  if (typeof goal.estimated_hours !== "number" || goal.estimated_hours <= 0) {
    return "estimated_hours must be a positive number";
  }
  if (typeof goal.is_hard_deadline !== "boolean") {
    return "is_hard_deadline must be a boolean";
  }
  if (typeof goal.priority !== "number" || goal.priority < 1 || goal.priority > 5) {
    return "priority must be between 1 and 5";
  }
  if (typeof goal.is_work !== "boolean") {
    return "is_work must be a boolean";
  }
  // Validate preferred_time format if provided
  if (goal.preferred_time !== null && goal.preferred_time !== undefined) {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(goal.preferred_time)) {
      return "preferred_time must be in HH:MM format";
    }
    const [hours, minutes] = goal.preferred_time.split(":").map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return "preferred_time has invalid hours or minutes";
    }
  }
  // Validate duration_minutes if provided
  if (goal.duration_minutes !== null && goal.duration_minutes !== undefined) {
    if (typeof goal.duration_minutes !== "number" || goal.duration_minutes < 15) {
      return "duration_minutes must be at least 15";
    }
  }
  // Validate recurring if provided
  if (goal.recurring !== null && goal.recurring !== undefined) {
    if (!goal.recurring.type || !Array.isArray(goal.recurring.days) || goal.recurring.days.length === 0) {
      return "recurring must have type and non-empty days array";
    }
    const validDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (const day of goal.recurring.days) {
      if (!validDays.includes(day.toLowerCase())) {
        return `invalid recurring day: ${day}`;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated (server-side)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { goal } = await request.json();

    if (!goal) {
      return NextResponse.json({ error: "goal is required" }, { status: 400 });
    }

    // Validate all fields
    const validationError = validateGoal(goal);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Insert into database
    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        title: goal.title.trim(),
        description: goal.description,
        due_date: goal.due_date,
        estimated_hours: goal.estimated_hours,
        is_hard_deadline: goal.is_hard_deadline,
        priority: goal.priority,
        is_work: goal.is_work,
        status: "active",
        preferred_time: goal.preferred_time,
        duration_minutes: goal.duration_minutes,
        recurring: goal.recurring,
      })
      .select()
      .single();

    if (error) {
      console.error("Goal insert error:", error);
      return NextResponse.json(
        { error: "Failed to save goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ goal: data });
  } catch (error) {
    console.error("Goals API error:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
