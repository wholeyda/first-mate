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
    // Fetch events from both calendars — use allSettled so one failure doesn't break both
    const personalId = profile.personal_calendar_id || profile.email;
    const workId = profile.work_calendar_id || profile.email;

    const warnings: string[] = [];

    const [personalResult, workResult] = await Promise.allSettled([
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

    let personalEvents: Awaited<ReturnType<typeof fetchEvents>> = [];
    let workEvents: Awaited<ReturnType<typeof fetchEvents>> = [];

    if (personalResult.status === "fulfilled") {
      personalEvents = personalResult.value;
    } else {
      console.error("Personal calendar fetch error:", personalResult.reason);
      warnings.push("Could not load personal calendar events");
    }

    if (workResult.status === "fulfilled") {
      workEvents = workResult.value;
    } else {
      console.error("Work calendar fetch error:", workResult.reason);
      warnings.push("Could not load work calendar events");
    }

    return NextResponse.json({
      personal: personalEvents,
      work: workEvents,
      ...(warnings.length > 0 ? { warnings } : {}),
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

    // Validate required fields
    if (!summary || typeof summary !== "string" || summary.trim().length === 0) {
      return NextResponse.json(
        { error: "summary is required and must be a non-empty string" },
        { status: 400 }
      );
    }
    if (!startTime || typeof startTime !== "string") {
      return NextResponse.json(
        { error: "startTime is required as an ISO date string" },
        { status: 400 }
      );
    }
    if (!endTime || typeof endTime !== "string") {
      return NextResponse.json(
        { error: "endTime is required as an ISO date string" },
        { status: 400 }
      );
    }
    // Validate dates are parseable and end > start
    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);
    if (isNaN(parsedStart.getTime()) || isNaN(parsedEnd.getTime())) {
      return NextResponse.json(
        { error: "startTime and endTime must be valid ISO date strings" },
        { status: 400 }
      );
    }
    if (parsedEnd <= parsedStart) {
      return NextResponse.json(
        { error: "endTime must be after startTime" },
        { status: 400 }
      );
    }
    if (calendarType && !["work", "personal"].includes(calendarType)) {
      return NextResponse.json(
        { error: "calendarType must be 'work' or 'personal'" },
        { status: 400 }
      );
    }

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
