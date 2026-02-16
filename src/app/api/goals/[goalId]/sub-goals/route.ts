/**
 * Sub-Goals API
 *
 * GET: List sub-goals for a parent goal.
 * POST: Create new sub-goals and schedule calendar blocks for those with start dates.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusySlots, TokenRefreshCallback } from "@/lib/google-calendar";
import { findNextSlot } from "@/lib/scheduler";
import { Goal } from "@/types/database";

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify goal ownership
  const { data: goal } = await supabase
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { data: subGoals, error } = await supabase
    .from("sub_goals")
    .select("*")
    .eq("parent_goal_id", goalId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subGoals: subGoals || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const { goalId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify goal ownership and get parent goal data for scheduling context
  const { data: parentGoal } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!parentGoal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const body = await request.json();
  const { subGoals } = body;

  if (!Array.isArray(subGoals) || subGoals.length === 0) {
    return NextResponse.json(
      { error: "subGoals array required" },
      { status: 400 }
    );
  }

  const insertData = subGoals.map(
    (
      sg: {
        title: string;
        description?: string;
        estimated_hours: number;
        start_date?: string;
        end_date?: string;
        sort_order: number;
        depends_on?: string[];
      },
      idx: number
    ) => ({
      user_id: user.id,
      parent_goal_id: goalId,
      title: sg.title,
      description: sg.description || null,
      estimated_hours: sg.estimated_hours || 1,
      start_date: sg.start_date || null,
      end_date: sg.end_date || null,
      status: "pending",
      sort_order: sg.sort_order ?? idx,
      depends_on: sg.depends_on || [],
    })
  );

  const { data: saved, error } = await supabase
    .from("sub_goals")
    .insert(insertData)
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // --- Schedule calendar blocks for sub-goals with start dates ---
  const schedulableSubGoals = (saved || []).filter(
    (sg: Record<string, unknown>) => sg.start_date
  );

  let proposedBlocks: Array<{
    id?: string;
    sub_goal_id: string;
    start_time: string;
    end_time: string;
    calendar_type: string;
  }> = [];
  let schedulingError: string | undefined;

  if (schedulableSubGoals.length > 0) {
    try {
      // Fetch user profile for Google tokens
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!profile?.google_access_token) {
        schedulingError = "Google Calendar not connected";
      } else {
        const personalId = profile.personal_calendar_id || profile.email;
        const workId = profile.work_calendar_id || profile.email;

        // Get busy slots from Google Calendar
        const now = new Date();
        const twoWeeksOut = new Date(now);
        twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
        const dueDate = new Date(parentGoal.due_date);
        const searchEnd = dueDate > twoWeeksOut ? dueDate : twoWeeksOut;

        const onTokenRefresh = makeTokenRefresher(supabase, user.id);
        const busySlots = await getBusySlots(
          profile.google_access_token,
          profile.google_refresh_token,
          personalId,
          workId,
          now.toISOString(),
          searchEnd.toISOString(),
          onTokenRefresh
        );

        // Find time slots for each schedulable sub-goal
        for (const sg of schedulableSubGoals) {
          // Build a temporary Goal-like object for the scheduler
          const tempGoal: Goal = {
            id: sg.id as string,
            user_id: user.id,
            title: sg.title as string,
            description: sg.description as string | null,
            due_date: (sg.end_date as string) || parentGoal.due_date,
            estimated_hours: (sg.estimated_hours as number) || 1,
            is_hard_deadline: false,
            priority: parentGoal.priority,
            is_work: parentGoal.is_work,
            status: "active",
            preferred_time: parentGoal.preferred_time || null,
            duration_minutes: Math.min(((sg.estimated_hours as number) || 1) * 60, 120),
            recurring: null,
            created_at: new Date().toISOString(),
          };

          const startFrom = new Date(sg.start_date as string) > now
            ? new Date(sg.start_date as string)
            : now;

          const slot = findNextSlot(tempGoal, busySlots, startFrom, searchEnd);

          if (slot) {
            try {
              const { data: savedBlock, error: blockError } = await supabase
                .from("scheduled_blocks")
                .insert({
                  user_id: user.id,
                  goal_id: goalId,
                  google_event_id: null,
                  calendar_type: slot.calendar_type,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  is_completed: false,
                  status: "pending",
                })
                .select("id")
                .single();

              if (!blockError && savedBlock) {
                proposedBlocks.push({
                  id: savedBlock.id,
                  sub_goal_id: sg.id as string,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  calendar_type: slot.calendar_type,
                });

                // Also add this block as busy so the next sub-goal doesn't overlap
                busySlots.push({
                  start: new Date(slot.start_time),
                  end: new Date(slot.end_time),
                  calendarType: slot.calendar_type,
                });
              } else if (blockError) {
                console.error("Sub-goal block save error:", blockError);
              }
            } catch (blockErr) {
              console.error("Sub-goal block creation failed:", blockErr);
            }
          }
        }
      }
    } catch (scheduleErr) {
      console.error("Sub-goal scheduling error:", scheduleErr);
      schedulingError = "Scheduling failed -- sub-goals were saved but not calendared";
    }
  }

  return NextResponse.json({
    subGoals: saved,
    proposedBlocks: proposedBlocks.length > 0 ? proposedBlocks : undefined,
    schedulingError,
  });
}
