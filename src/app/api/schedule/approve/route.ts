/**
 * Schedule Approve API
 *
 * POST - Takes proposed blocks and writes them to Google Calendar.
 * Also saves them to the scheduled_blocks table in Supabase.
 *
 * Body: { blocks: ProposedBlock[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEvent } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
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

  try {
    const { blocks } = await request.json();

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      return NextResponse.json(
        { error: "No blocks to approve" },
        { status: 400 }
      );
    }

    const personalId = profile.personal_calendar_id || profile.email;
    const workId = profile.work_calendar_id || profile.email;
    const createdBlocks = [];

    for (const block of blocks) {
      // Determine which calendar to write to
      const calendarId =
        block.calendar_type === "work" ? workId : personalId;

      // Create the event on Google Calendar
      const event = await createEvent(
        profile.google_access_token,
        profile.google_refresh_token,
        calendarId,
        block.goal_title,
        `Scheduled by First Mate`,
        block.start_time,
        block.end_time
      );

      // Save to our database
      const { data: savedBlock, error } = await supabase
        .from("scheduled_blocks")
        .insert({
          user_id: user.id,
          goal_id: block.goal_id,
          google_event_id: event.id,
          calendar_type: block.calendar_type,
          start_time: block.start_time,
          end_time: block.end_time,
          is_completed: false,
        })
        .select()
        .single();

      if (!error && savedBlock) {
        createdBlocks.push(savedBlock);
      }
    }

    return NextResponse.json({
      success: true,
      blocksCreated: createdBlocks.length,
    });
  } catch (error) {
    console.error("Schedule approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve schedule" },
      { status: 500 }
    );
  }
}
