/**
 * Goals API
 *
 * POST - Create a new goal from chat-parsed data.
 * After saving the goal, automatically finds an available time slot
 * and creates a Google Calendar event.
 *
 * Body: { goal: ParsedGoal }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusySlots, createEvent, deleteEvent } from "@/lib/google-calendar";
import { findNextSlot, findRecurringSlots } from "@/lib/scheduler";
import { Goal } from "@/types/database";

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
  // Validate due_date is a parseable date
  if (isNaN(new Date(goal.due_date).getTime())) {
    return "due_date must be a valid date (YYYY-MM-DD)";
  }
  if (typeof goal.estimated_hours !== "number" || !isFinite(goal.estimated_hours) || goal.estimated_hours <= 0) {
    return "estimated_hours must be a finite positive number";
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
  // Validate description type if provided
  if (goal.description !== null && goal.description !== undefined && typeof goal.description !== "string") {
    return "description must be a string or null";
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
    if (typeof goal.duration_minutes !== "number" || !isFinite(goal.duration_minutes) || goal.duration_minutes < 15) {
      return "duration_minutes must be a finite number of at least 15";
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

    // Check for duplicate goal (case-insensitive title match)
    const { data: existingGoal } = await supabase
      .from("goals")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("status", "active")
      .ilike("title", goal.title.trim())
      .maybeSingle();

    if (existingGoal) {
      return NextResponse.json(
        {
          error: "duplicate",
          existingGoal,
          message: `A goal titled "${existingGoal.title}" already exists`,
        },
        { status: 409 }
      );
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

    // --- Auto-schedule on Google Calendar ---
    const savedGoal = data as Goal;
    let scheduledBlocks: Array<{
      start_time: string;
      end_time: string;
      calendar_type: string;
      google_event_id: string;
    }> = [];
    let schedulingError: string | undefined;

    try {
      // Fetch user profile for Google tokens
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile?.google_access_token) {
        schedulingError = "Google Calendar not connected";
      } else {
        const personalId = profile.personal_calendar_id || profile.email;
        const workId = profile.work_calendar_id || profile.email;

        // Get busy slots from Google Calendar
        const now = new Date();
        const twoWeeksOut = new Date(now);
        twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
        const dueDate = new Date(savedGoal.due_date);
        const searchEnd = dueDate > twoWeeksOut ? dueDate : twoWeeksOut;

        const busySlots = await getBusySlots(
          profile.google_access_token,
          profile.google_refresh_token,
          personalId,
          workId,
          now.toISOString(),
          searchEnd.toISOString()
        );

        // Find time slot(s)
        let proposedBlocks;
        if (savedGoal.recurring) {
          proposedBlocks = findRecurringSlots(savedGoal, busySlots, now, searchEnd);
        } else {
          const singleSlot = findNextSlot(savedGoal, busySlots, now, searchEnd);
          proposedBlocks = singleSlot ? [singleSlot] : [];
        }

        if (proposedBlocks.length === 0) {
          schedulingError = "No available time slot found — the goal was saved but not scheduled on your calendar";
        } else {
          // Create Google Calendar events and save scheduled blocks
          const calendarId = savedGoal.is_work
            ? (profile.work_calendar_id || profile.email)
            : (profile.personal_calendar_id || profile.email);

          for (const block of proposedBlocks) {
            try {
              // Create Google Calendar event
              const event = await createEvent(
                profile.google_access_token,
                profile.google_refresh_token,
                calendarId,
                block.goal_title,
                "Scheduled by First Mate",
                block.start_time,
                block.end_time
              );

              // Save to scheduled_blocks table
              const { error: blockError } = await supabase
                .from("scheduled_blocks")
                .insert({
                  user_id: user.id,
                  goal_id: savedGoal.id,
                  google_event_id: event.id,
                  calendar_type: block.calendar_type,
                  start_time: block.start_time,
                  end_time: block.end_time,
                  is_completed: false,
                });

              if (blockError) {
                // Rollback: delete the Google Calendar event
                try {
                  await deleteEvent(
                    profile.google_access_token,
                    profile.google_refresh_token,
                    calendarId,
                    event.id!
                  );
                } catch (rollbackErr) {
                  console.error("Rollback delete failed:", rollbackErr);
                }
                console.error("Block save error:", blockError);
              } else {
                scheduledBlocks.push({
                  start_time: block.start_time,
                  end_time: block.end_time,
                  calendar_type: block.calendar_type,
                  google_event_id: event.id!,
                });
              }
            } catch (eventErr) {
              console.error("Calendar event creation failed:", eventErr);
            }
          }

          if (scheduledBlocks.length === 0 && proposedBlocks.length > 0) {
            schedulingError = "Found time slots but failed to create calendar events";
          }
        }
      }
    } catch (scheduleErr) {
      console.error("Auto-scheduling error:", scheduleErr);
      schedulingError = "Scheduling failed — the goal was saved but not calendared";
    }

    return NextResponse.json({
      goal: savedGoal,
      scheduledBlocks: scheduledBlocks.length > 0 ? scheduledBlocks : undefined,
      schedulingError,
    });
  } catch (error) {
    console.error("Goals API error:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}
