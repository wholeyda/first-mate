/**
 * Calendar Event Delete API
 *
 * DELETE - Remove an app-created event from Google Calendar
 *
 * Params:
 *   eventId - Google Calendar event ID
 *
 * Query params:
 *   calendarType - "work" or "personal"
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's Google tokens and calendar IDs
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
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const calendarType = searchParams.get("calendarType") || "personal";

    // Determine which calendar the event is on
    const calendarId =
      calendarType === "work"
        ? profile.work_calendar_id || profile.email
        : profile.personal_calendar_id || profile.email;

    const onTokenRefresh = makeTokenRefresher(supabase, user.id);
    await deleteEvent(
      profile.google_access_token,
      profile.google_refresh_token,
      calendarId,
      eventId,
      onTokenRefresh
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Calendar delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar event" },
      { status: 500 }
    );
  }
}
