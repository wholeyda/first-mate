/**
 * Avatar API Route
 *
 * GET  - Analyzes user's AEIOU data and completed goals to generate
 *        a personality description and trait list for the First Mate avatar.
 *
 * Returns: { description: string, traits: string[] }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch completed goals
    const { data: completedGoals } = await supabase
      .from("goals")
      .select("id, title, description, is_work")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch AEIOU responses for insight into user personality
    const { data: aeiouResponses } = await supabase
      .from("aeiou_responses")
      .select(
        "activities, environments, interactions, objects, users_present, excitement_level, peak_moments"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);

    // Fetch active goals for additional context
    const { data: activeGoals } = await supabase
      .from("goals")
      .select("title, description, is_work")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(10);

    // If no data at all, return defaults
    if (
      (!completedGoals || completedGoals.length === 0) &&
      (!aeiouResponses || aeiouResponses.length === 0) &&
      (!activeGoals || activeGoals.length === 0)
    ) {
      return NextResponse.json({
        description:
          "Just getting started on this journey. Complete some goals to reveal your First Mate's personality!",
        traits: [],
      });
    }

    // Build context for Claude
    const goalSummary = [
      ...(completedGoals || []).map(
        (g) =>
          `[Completed] ${g.title}${g.description ? ` - ${g.description}` : ""} (${g.is_work ? "work" : "personal"})`
      ),
      ...(activeGoals || []).map(
        (g) =>
          `[Active] ${g.title}${g.description ? ` - ${g.description}` : ""} (${g.is_work ? "work" : "personal"})`
      ),
    ].join("\n");

    const aeiouSummary = (aeiouResponses || [])
      .map(
        (r, i) =>
          `Reflection ${i + 1}:
  Activities: ${r.activities || "N/A"}
  Environments: ${r.environments || "N/A"}
  Interactions: ${r.interactions || "N/A"}
  Objects/Tools: ${r.objects || "N/A"}
  People involved: ${r.users_present || "N/A"}
  Excitement: ${r.excitement_level || "N/A"}
  Peak moments: ${r.peak_moments || "N/A"}`
      )
      .join("\n\n");

    const prompt = `You are analyzing a user's goals and AEIOU reflections to create a brief personality profile for their "First Mate" avatar character.

Goals:
${goalSummary || "No goals yet."}

AEIOU Reflections:
${aeiouSummary || "No reflections yet."}

Based on this data, generate:
1. A personality description: 2-3 short sentences that describe what drives this person, what excites them, and their working style. Write it in second person ("You are..."). Keep it warm and encouraging.
2. A list of 3-6 single-word or short-phrase personality traits (e.g., "Creative", "Morning Person", "Team Player", "Detail-Oriented", "Adventurous"). Choose traits that genuinely reflect the data.

Respond ONLY with a JSON object in this format:
{"description": "...", "traits": ["...", "..."]}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    let description =
      "Your First Mate is learning more about you with each goal you complete.";
    let traits: string[] = [];

    try {
      const textContent = response.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.description) description = parsed.description;
          if (Array.isArray(parsed.traits)) traits = parsed.traits.slice(0, 6);
        }
      }
    } catch {
      // Default values if parsing fails
    }

    return NextResponse.json({ description, traits });
  } catch (error) {
    console.error("Avatar API error:", error);
    return NextResponse.json(
      { error: "Failed to generate avatar data" },
      { status: 500 }
    );
  }
}
