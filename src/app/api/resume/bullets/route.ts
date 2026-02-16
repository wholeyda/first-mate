/**
 * Resume Bullets API Route
 *
 * Generates professional resume bullet points using Claude based on the user's
 * completed goals and AEIOU reflection data. Uses the STAR format
 * (Situation, Task, Action, Result) for impactful resume content.
 *
 * GET: Returns { bullets: string[] } with 5-8 generated bullet points.
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

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
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch AEIOU responses with associated goal titles
    const { data: aeiouData } = await supabase
      .from("aeiou_responses")
      .select("*, goals(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Build context for Claude
    const goalsContext =
      completedGoals && completedGoals.length > 0
        ? completedGoals
            .map(
              (g: Record<string, unknown>) =>
                `- ${g.title}${g.description ? `: ${g.description}` : ""} (Priority: ${g.priority}, Estimated hours: ${g.estimated_hours})`
            )
            .join("\n")
        : "No completed goals yet.";

    const aeiouContext =
      aeiouData && aeiouData.length > 0
        ? aeiouData
            .map((entry: Record<string, unknown>) => {
              const goalTitle =
                (entry.goals as Record<string, unknown>)?.title || "Unknown";
              return `Goal: ${goalTitle}
  Activities: ${entry.activities}
  Environments: ${entry.environments}
  Interactions: ${entry.interactions}
  Objects/Tools: ${entry.objects}
  People: ${entry.users_present}
  Excitement: ${entry.excitement_level || "N/A"}
  Peak moments: ${entry.peak_moments || "N/A"}
  Successful: ${entry.was_successful ? "Yes" : "No"}
  AI Assessment: ${entry.ai_assessment || "N/A"}`;
            })
            .join("\n\n")
        : "No AEIOU reflections yet.";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a professional resume writer. Generate resume bullet points using the STAR format (Situation, Task, Action, Result). Each bullet should be concise (1-2 sentences), start with a strong action verb, include quantifiable results where possible, and be written in past tense. Return ONLY a JSON array of strings, no other text.`,
      messages: [
        {
          role: "user",
          content: `Based on the following completed goals and AEIOU reflections, generate 5-8 professional resume bullet points.

COMPLETED GOALS:
${goalsContext}

AEIOU REFLECTIONS:
${aeiouContext}

Return ONLY a JSON array of strings like: ["bullet 1", "bullet 2", ...]`,
        },
      ],
    });

    // Parse the response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let bullets: string[] = [];
    try {
      // Try to parse the JSON array from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        bullets = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // If parsing fails, split by newlines and clean up
      bullets = responseText
        .split("\n")
        .map((line: string) => line.replace(/^[-*\d.)\s]+/, "").trim())
        .filter((line: string) => line.length > 10);
    }

    return NextResponse.json({ bullets });
  } catch (error) {
    console.error("Resume bullets API error:", error);
    return NextResponse.json(
      { error: "Failed to generate resume bullets" },
      { status: 500 }
    );
  }
}
