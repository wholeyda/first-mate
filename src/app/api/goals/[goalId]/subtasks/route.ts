/**
 * Subtasks API Route
 *
 * GET /api/goals/:goalId/subtasks — Fetch all subtasks for a goal
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
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

  const { goalId } = await params;

  const { data: subtasks, error } = await supabase
    .from("sub_goals")
    .select("*")
    .eq("parent_goal_id", goalId)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching subtasks:", error);
    return NextResponse.json({ error: "Failed to fetch subtasks" }, { status: 500 });
  }

  return NextResponse.json({ subtasks: subtasks || [] });
}
