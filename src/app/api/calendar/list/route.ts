/**
 * Calendar List API
 *
 * GET - List all calendars the user has access to.
 * Used during onboarding to let the user pick which
 * calendar is "work" and which is "personal".
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCalendars } from "@/lib/google-calendar";

export async function GET() {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's Google tokens
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
    const calendars = await listCalendars(
      profile.google_access_token,
      profile.google_refresh_token
    );

    // Return simplified calendar list
    return NextResponse.json({
      calendars: calendars.map((cal) => ({
        id: cal.id,
        summary: cal.summary,
        primary: cal.primary,
        accessRole: cal.accessRole,
      })),
    });
  } catch (error) {
    console.error("Calendar list error:", error);
    return NextResponse.json(
      { error: "Failed to list calendars" },
      { status: 500 }
    );
  }
}
