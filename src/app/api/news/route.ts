/**
 * News API
 *
 * GET - Returns curated news items relevant to the user's active goals.
 * Uses Claude to generate realistic, goal-relevant news summaries.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active goals
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!goals || goals.length === 0) {
    return NextResponse.json({ news: [] });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a news curator. Based on the user's goals, generate 4-5 realistic and helpful news items they would want to know about. Each item should relate to one of their goals.

User's active goals:
${goals.map((g) => `- ${g.title} (${g.is_work ? "Work" : "Personal"})`).join("\n")}

Return a JSON array of news items with this exact structure (no other text, just the JSON array):
[
  {
    "title": "Short headline",
    "summary": "One sentence summary of the article",
    "url": "https://... (a realistic, search-friendly URL from a real publication)",
    "source": "Publication Name",
    "relevantGoal": "The goal title this relates to",
    "publishedAt": "ISO 8601 date string within the last 48 hours from now (${new Date().toISOString()})"
  }
]

Make the news items realistic, timely, and actionable. Use real publication names (e.g., TechCrunch, Harvard Business Review, The Verge, Wired, etc.) and craft URLs that look like they could be real articles on those sites.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ news: [] });
    }

    // Parse JSON from Claude's response
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ news: [] });
    }

    const news = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ news });
  } catch (error) {
    console.error("Failed to generate news:", error);
    return NextResponse.json({ news: [] });
  }
}
