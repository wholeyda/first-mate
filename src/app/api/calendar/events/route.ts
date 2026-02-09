/**
 * Calendar Events API
 *
 * GET  - Fetch all events from both calendars for a date range
 * POST - Create a new event on the specified calendar
 *
 * Query params (GET):
 *   timeMin - ISO date string (start of range)
 *   timeMax - ISO date string (end of range)
 *
 * Body (POST):
 *   { calendarType, summary, description, startTime, endTime }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchEvents, createEvent } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
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

  // Parse date range from query params
  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin");
  const timeMax = searchParams.get("timeMax");

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: "timeMin and timeMax are required" },
      { status: 400 }
    );
  }

  try {
    // Fetch events from both calendars
    const personalId = profile.personal_calendar_id || profile.email;
    const workId = profile.work_calendar_id || profile.email;

    const [personalEvents, workEvents] = await Promise.all([
      fetchEvents(
        profile.google_access_token,
        profile.google_refresh_token,
        personalId,
        timeMin,
        timeMax
      ),
      fetchEvents(
        profile.google_access_token,
        profile.google_refresh_token,
        workId,
        timeMin,
        timeMax
      ),
    ]);

    return NextResponse.json({
      personal: personalEvents,
      work: workEvents,
    });
  } catch (error) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { calendarType, summary, description, startTime, endTime } = body;

    // Determine which calendar to write to
    const calendarId =
      calendarType === "work"
        ? profile.work_calendar_id || profile.email
        : profile.personal_calendar_id || profile.email;

    const event = await createEvent(
      profile.google_access_token,
      profile.google_refresh_token,
      calendarId,
      summary,
      description || "",
      startTime,
      endTime
    );

    return NextResponse.json({ event });
  } catch (error) {
    console.error("Calendar create error:", error);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
