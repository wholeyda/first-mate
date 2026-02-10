/**
 * Individual Sub-Goal API
 *
 * PATCH: Update a sub-goal (title, status, dates, etc.)
 * DELETE: Remove a sub-goal.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string; subGoalId: string }> }
) {
  const { goalId, subGoalId } = await params;
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

  const body = await request.json();
  const allowedFields = [
    "title",
    "description",
    "estimated_hours",
    "start_date",
    "end_date",
    "status",
    "sort_order",
    "depends_on",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  const { data: updated, error } = await supabase
    .from("sub_goals")
    .update(updates)
    .eq("id", subGoalId)
    .eq("parent_goal_id", goalId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subGoal: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ goalId: string; subGoalId: string }> }
) {
  const { goalId, subGoalId } = await params;
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

  const { error } = await supabase
    .from("sub_goals")
    .delete()
    .eq("id", subGoalId)
    .eq("parent_goal_id", goalId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
