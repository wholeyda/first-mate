/**
 * News API
 *
 * GET - Returns curated tips and insights relevant to the user's active goals.
 * Uses Claude to generate goal-relevant tips with Google search links
 * so users always land on real pages.
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

  const prompt = `You are a productivity coach. Based on the user's goals, generate 4-5 helpful tips, insights, or resource recommendations they would find useful. Each item should relate to one of their goals.

User's active goals:
${goals.map((g) => `- ${g.title} (${g.is_work ? "Work" : "Personal"})`).join("\n")}

Return a JSON array with this exact structure (no other text, just the JSON array):
[
  {
    "title": "Short, actionable tip headline",
    "summary": "One sentence explaining the tip or insight",
    "searchQuery": "A specific Google search query that would help the user find related resources (e.g., 'best beginner running plans 2025')",
    "source": "Tip",
    "relevantGoal": "The goal title this relates to",
    "publishedAt": "${new Date().toISOString()}"
  }
]

Rules:
- Make tips specific and actionable, not generic
- searchQuery should be a real, useful search term someone would type
- Each tip should clearly relate to one of the user's goals
- Focus on practical advice, not news headlines`;

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

    const rawNews = JSON.parse(jsonMatch[0]);

    // Convert searchQuery to real Google search URLs
    const news = rawNews.map((item: Record<string, string>) => ({
      title: item.title,
      summary: item.summary,
      url: `https://www.google.com/search?q=${encodeURIComponent(item.searchQuery || item.title)}`,
      source: item.source || "Tip",
      relevantGoal: item.relevantGoal,
      publishedAt: item.publishedAt,
    }));

    return NextResponse.json({ news });
  } catch (error) {
    console.error("Failed to generate news:", error);
    return NextResponse.json({ news: [] });
  }
}
