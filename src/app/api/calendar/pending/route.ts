/**
 * Pending Blocks API
 *
 * GET - Fetch pending scheduled blocks for a date range.
 * Returns blocks with goal title info for display in the calendar.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const { data: blocks } = await supabase
      .from("scheduled_blocks")
      .select("*, goals(title, is_work)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gte("start_time", timeMin)
      .lte("end_time", timeMax)
      .order("start_time");

    return NextResponse.json({
      pendingBlocks: (blocks || []).map((b: Record<string, unknown>) => ({
        id: b.id,
        goal_id: b.goal_id,
        goal_title: (b.goals as Record<string, unknown>)?.title || "Untitled",
        calendar_type: b.calendar_type,
        start_time: b.start_time,
        end_time: b.end_time,
      })),
    });
  } catch (error) {
    console.error("Pending blocks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending blocks" },
      { status: 500 }
    );
  }
}
