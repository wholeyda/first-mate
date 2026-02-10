/**
 * Suggestions API
 *
 * GET - Returns curated suggestions based on the user's active goals.
 * Matches goal titles/descriptions to resource categories.
 *
 * Query params:
 *   exclude - comma-separated URLs to exclude from results
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSuggestionsForGoal, Suggestion } from "@/lib/suggestions";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse exclude list from query params
  const { searchParams } = new URL(request.url);
  const excludeParam = searchParams.get("exclude") || "";
  const excludeUrls = excludeParam ? excludeParam.split(",").map((u) => u.trim()) : [];

  // Get active goals
  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (!goals || goals.length === 0) {
    return NextResponse.json({ suggestions: [] });
  }

  // Collect unique suggestions across all goals
  const seen = new Set<string>();
  const allSuggestions: (Suggestion & { goalTitle: string })[] = [];

  for (const goal of goals) {
    const matches = getSuggestionsForGoal(goal.title, goal.description, excludeUrls);
    for (const suggestion of matches) {
      if (!seen.has(suggestion.url)) {
        seen.add(suggestion.url);
        allSuggestions.push({ ...suggestion, goalTitle: goal.title });
      }
    }
  }

  // Return top 4 suggestions
  return NextResponse.json({
    suggestions: allSuggestions.slice(0, 4),
  });
}
