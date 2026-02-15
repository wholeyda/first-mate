/**
 * Approve Pending Events API
 *
 * POST - Approve pending blocks by creating Google Calendar events.
 * Supports optional time modifications.
 *
 * Body: {
 *   blockIds: string[],
 *   modifications?: { blockId: string, newStart: string, newEnd: string }[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createEvent, TokenRefreshCallback } from "@/lib/google-calendar";

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { blockIds, modifications } = await request.json();

    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
      return NextResponse.json(
        { error: "blockIds array is required" },
        { status: 400 }
      );
    }

    // Get user profile for Google tokens
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

    // Build modification lookup
    const modMap = new Map<string, { newStart: string; newEnd: string }>();
    if (modifications) {
      for (const mod of modifications) {
        modMap.set(mod.blockId, { newStart: mod.newStart, newEnd: mod.newEnd });
      }
    }

    const onTokenRefresh = makeTokenRefresher(supabase, user.id);
    let approved = 0;
    const errors: string[] = [];

    for (const blockId of blockIds) {
      // Fetch the pending block with goal info
      const { data: block } = await supabase
        .from("scheduled_blocks")
        .select("*, goals(title, is_work)")
        .eq("id", blockId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();

      if (!block) {
        errors.push(`Block ${blockId} not found or already approved`);
        continue;
      }

      // Apply modifications if any
      const mod = modMap.get(blockId);
      const startTime = mod?.newStart || block.start_time;
      const endTime = mod?.newEnd || block.end_time;

      const goal = block.goals as Record<string, unknown>;
      const calendarId =
        block.calendar_type === "work"
          ? profile.work_calendar_id || profile.email
          : profile.personal_calendar_id || profile.email;

      try {
        // Create the Google Calendar event
        const event = await createEvent(
          profile.google_access_token,
          profile.google_refresh_token,
          calendarId,
          (goal?.title as string) || "First Mate Task",
          "Scheduled by First Mate",
          startTime,
          endTime,
          onTokenRefresh
        );

        // Update the block: set event ID, status, and potentially new times
        await supabase
          .from("scheduled_blocks")
          .update({
            google_event_id: event.id,
            status: "approved",
            start_time: startTime,
            end_time: endTime,
          })
          .eq("id", blockId);

        approved++;
      } catch (err) {
        console.error(`Failed to approve block ${blockId}:`, err);
        errors.push(`Failed to create event for block ${blockId}`);
      }
    }

    return NextResponse.json({
      approved,
      ...(errors.length > 0 ? { errors } : {}),
    });
  } catch (error) {
    console.error("Approve error:", error);
    return NextResponse.json(
      { error: "Failed to approve events" },
      { status: 500 }
    );
  }
}
