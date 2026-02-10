/**
 * Goal Detail API
 *
 * DELETE - Archive a goal and clean up its calendar events
 *
 * Params:
 *   goalId - UUID of the goal to delete
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent } from "@/lib/google-calendar";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { goalId } = await params;

    // Verify goal belongs to user
    const { data: goal } = await supabase
      .from("goals")
      .select("id, user_id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single();

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Get user profile for Google tokens
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fetch all scheduled blocks for this goal
    const { data: blocks } = await supabase
      .from("scheduled_blocks")
      .select("*")
      .eq("goal_id", goalId);

    // Delete Google Calendar events for each block
    if (blocks && profile?.google_access_token) {
      for (const block of blocks) {
        if (block.google_event_id) {
          try {
            const calendarId =
              block.calendar_type === "work"
                ? profile.work_calendar_id || profile.email
                : profile.personal_calendar_id || profile.email;

            await deleteEvent(
              profile.google_access_token,
              profile.google_refresh_token,
              calendarId,
              block.google_event_id
            );
          } catch (err) {
            // Event may already be deleted — continue
            console.error("Failed to delete calendar event:", err);
          }
        }
      }
    }

    // Delete scheduled blocks from DB
    await supabase
      .from("scheduled_blocks")
      .delete()
      .eq("goal_id", goalId);

    // Archive the goal (soft delete)
    const { error } = await supabase
      .from("goals")
      .update({ status: "archived" })
      .eq("id", goalId);

    if (error) {
      console.error("Goal archive error:", error);
      return NextResponse.json(
        { error: "Failed to delete goal" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Goal delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
