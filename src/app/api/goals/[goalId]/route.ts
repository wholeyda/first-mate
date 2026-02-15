/**
 * Goal Detail API
 *
 * PATCH  - Update goal status (e.g., mark as completed)
 * DELETE - Archive a goal and clean up its calendar events
 *
 * Params:
 *   goalId - UUID of the goal to update/delete
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteEvent, TokenRefreshCallback } from "@/lib/google-calendar";

function makeTokenRefresher(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): TokenRefreshCallback {
  return async (newAccessToken: string, newRefreshToken?: string) => {
    const update: Record<string, string> = { google_access_token: newAccessToken };
    if (newRefreshToken) update.google_refresh_token = newRefreshToken;
    await supabase.from("users").update(update).eq("id", userId);
  };
}

export async function PATCH(
  request: NextRequest,
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
    const body = await request.json();
    const { status } = body;

    if (!status || !["active", "completed", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'active', 'completed', or 'archived'" },
        { status: 400 }
      );
    }

    const { data: goal, error } = await supabase
      .from("goals")
      .update({ status })
      .eq("id", goalId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    console.error("Goal update error:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

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
      const onTokenRefresh = makeTokenRefresher(supabase, user.id);
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
              block.google_event_id,
              onTokenRefresh
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
