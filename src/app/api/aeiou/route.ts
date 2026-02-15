/**
 * AEIOU API Route
 *
 * POST - Save AEIOU reflection and have AI assess goal completion
 * GET  - Fetch user's AEIOU history (for career recommendations)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { goal_id, activities, environments, interactions, objects, users_present } = body;

    if (!goal_id) {
      return NextResponse.json({ error: "goal_id is required" }, { status: 400 });
    }

    // Verify goal belongs to user
    const { data: goal } = await supabase
      .from("goals")
      .select("id, title, description")
      .eq("id", goal_id)
      .eq("user_id", user.id)
      .single();

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Ask Claude to assess whether the goal was genuinely accomplished
    const assessmentPrompt = `You are evaluating whether a user successfully completed a goal based on their AEIOU reflection.

Goal: "${goal.title}"
${goal.description ? `Description: ${goal.description}` : ""}

Their AEIOU reflection:
- Activities: ${activities || "Not provided"}
- Environments: ${environments || "Not provided"}
- Interactions: ${interactions || "Not provided"}
- Objects: ${objects || "Not provided"}
- Other people involved: ${users_present || "Not provided"}

Based on these reflections, does it seem like the user genuinely completed or made meaningful progress on this goal? Be generous — if they describe relevant activities, give them credit. Only flag as unsuccessful if their answers are clearly unrelated to the goal or indicate they didn't actually work on it.

Respond with a JSON object:
{"was_successful": true/false, "message": "A brief encouraging or supportive message (1-2 sentences)"}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: assessmentPrompt }],
    });

    let wasSuccessful = true;
    let aiMessage = "Great work completing this goal!";

    try {
      const textContent = response.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          wasSuccessful = parsed.was_successful !== false;
          aiMessage = parsed.message || aiMessage;
        }
      }
    } catch {
      // Default to successful if parsing fails
    }

    // Save AEIOU response
    const { data: aeiouResponse, error: insertError } = await supabase
      .from("aeiou_responses")
      .insert({
        user_id: user.id,
        goal_id,
        activities: activities || "",
        environments: environments || "",
        interactions: interactions || "",
        objects: objects || "",
        users_present: users_present || "",
        ai_assessment: aiMessage,
        was_successful: wasSuccessful,
      })
      .select()
      .single();

    if (insertError) {
      console.error("AEIOU insert error:", insertError);
      return NextResponse.json({ error: "Failed to save reflection" }, { status: 500 });
    }

    // If successful, mark goal as completed
    if (wasSuccessful) {
      await supabase
        .from("goals")
        .update({ status: "completed" })
        .eq("id", goal_id);
    }

    return NextResponse.json({
      aeiouResponse,
      wasSuccessful,
      aiMessage,
    });
  } catch (error) {
    console.error("AEIOU API error:", error);
    return NextResponse.json({ error: "Failed to process reflection" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: responses } = await supabase
      .from("aeiou_responses")
      .select("*, goals(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ responses: responses || [] });
  } catch (error) {
    console.error("AEIOU fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch reflections" }, { status: 500 });
  }
}
