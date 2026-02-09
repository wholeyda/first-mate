/**
 * Schedule Generate API
 *
 * POST - Generates a proposed weekly schedule from active goals.
 * Fetches busy slots from Google Calendar, runs the scheduling algorithm,
 * and returns proposed time blocks (without writing to calendar yet).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusySlots } from "@/lib/google-calendar";
import { generateSchedule, getCurrentWeekRange } from "@/lib/scheduler";

export async function POST() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile with Google tokens
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile?.google_access_token) {
    return NextResponse.json(
      { error: "Google Calendar not connected" },
      { status: 400 }
    );
  }

  // Get active goals
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!goals || goals.length === 0) {
    return NextResponse.json(
      { error: "No active goals to schedule" },
      { status: 400 }
    );
  }

  // Get existing scheduled blocks
  const { data: existingBlocks } = await supabase
    .from("scheduled_blocks")
    .select("*")
    .eq("user_id", user.id);

  try {
    // Get the week range
    const { weekStart, weekEnd } = getCurrentWeekRange();

    // Fetch busy slots from both calendars
    const personalId = profile.personal_calendar_id || profile.email;
    const workId = profile.work_calendar_id || profile.email;

    const busySlots = await getBusySlots(
      profile.google_access_token,
      profile.google_refresh_token,
      personalId,
      workId,
      weekStart.toISOString(),
      weekEnd.toISOString()
    );

    // Run the scheduling algorithm
    const proposedBlocks = generateSchedule(
      goals,
      busySlots,
      existingBlocks || [],
      weekStart,
      weekEnd
    );

    return NextResponse.json({
      blocks: proposedBlocks,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });
  } catch (error) {
    console.error("Schedule generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate schedule" },
      { status: 500 }
    );
  }
}
