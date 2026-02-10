/**
 * Sub-Goals API
 *
 * GET: List sub-goals for a parent goal.
 * POST: Create a new sub-goal.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ subGoals: saved });
}
