/**
 * Goal Decomposition API
 *
 * POST: Uses Claude to decompose a goal into sub-goals with
 * estimated hours, suggested dates, and dependency relationships.
 * Returns structured JSON — does NOT auto-save to database.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

  // Fetch the goal
  const { data: goal } = await supabase
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (!goal) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  // Get optional context from the request body
  const body = await request.json().catch(() => ({}));
  const userContext = body.context || "";

  const today = new Date().toISOString().split("T")[0];

  const decompositionPrompt = `You are a project planning assistant. Break down this goal into sub-goals (3-8 sub-tasks).

Today's date: ${today}

Goal: "${goal.title}"
Description: ${goal.description || "No description provided"}
Due date: ${goal.due_date}
Total estimated hours: ${goal.estimated_hours}
Priority: ${goal.priority}/5
Type: ${goal.is_work ? "Work" : "Personal"}

${userContext ? `Additional context from user: ${userContext}` : ""}

Return ONLY a JSON array of sub-goals. Each sub-goal should have:
- "title": short descriptive name
- "description": what this involves (1 sentence)
- "estimated_hours": realistic hour estimate
- "start_date": suggested start date (YYYY-MM-DD, must be today or later)
- "end_date": suggested end date (YYYY-MM-DD, must be before or on the parent due date)
- "sort_order": integer starting from 0
- "depends_on_indices": array of sort_order values this depends on (empty if none)

Rules:
- Sub-goals should be actionable, specific steps
- Hours should sum to roughly the parent goal's estimated hours
- Dates should be realistic and not overlap too much
- Dependencies should form a logical sequence
- All dates must be between ${today} and ${goal.due_date}

Respond with ONLY the JSON array, no other text.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: decompositionPrompt }],
    });

    // Extract text from response
    const textBlock = response.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse JSON from the response (strip any code fences)
    let jsonText = textBlock.text.trim();
    jsonText = jsonText
      .replace(/^```[\w]*\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const subGoals = JSON.parse(jsonText);

    if (!Array.isArray(subGoals)) {
      return NextResponse.json(
        { error: "Invalid AI response format" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      subGoals: subGoals.map(
        (
          sg: {
            title: string;
            description?: string;
            estimated_hours: number;
            start_date?: string;
            end_date?: string;
            sort_order: number;
            depends_on_indices?: number[];
          },
          idx: number
        ) => ({
          title: sg.title,
          description: sg.description || null,
          estimated_hours: sg.estimated_hours || 1,
          start_date: sg.start_date || null,
          end_date: sg.end_date || null,
          sort_order: sg.sort_order ?? idx,
          depends_on_indices: sg.depends_on_indices || [],
        })
      ),
    });
  } catch (err) {
    console.error("Decomposition error:", err);
    return NextResponse.json(
      { error: "Failed to decompose goal" },
      { status: 500 }
    );
  }
}
