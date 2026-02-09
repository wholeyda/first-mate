/**
 * Daily Review API
 *
 * GET  - Fetch today's scheduled blocks for review
 * POST - Mark blocks as completed, calculate points, spawn pirates
 *
 * POST body: { completedBlockIds: string[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Pirate traits mapped to common goal keywords
const PIRATE_TRAITS: Record<string, { trait: string; image_key: string }> = {
  learn: { trait: "Scholar with ancient scrolls", image_key: "scholar" },
  study: { trait: "Scholar with ancient scrolls", image_key: "scholar" },
  read: { trait: "Librarian with a spyglass", image_key: "librarian" },
  code: { trait: "Engineer with brass tools", image_key: "engineer" },
  build: { trait: "Carpenter with a hammer", image_key: "carpenter" },
  write: { trait: "Cartographer with maps", image_key: "cartographer" },
  exercise: { trait: "Strongman with an anchor", image_key: "strongman" },
  workout: { trait: "Strongman with an anchor", image_key: "strongman" },
  gym: { trait: "Strongman with an anchor", image_key: "strongman" },
  run: { trait: "Swift lookout in the crow's nest", image_key: "lookout" },
  meeting: { trait: "Diplomat with a telescope", image_key: "diplomat" },
  plan: { trait: "Navigator with a compass", image_key: "navigator" },
  design: { trait: "Artist with a paintbrush", image_key: "artist" },
  cook: { trait: "Ship's cook with a ladle", image_key: "cook" },
  clean: { trait: "Deckhand with a mop", image_key: "deckhand" },
  email: { trait: "Messenger with a parrot", image_key: "messenger" },
  call: { trait: "Signalman with flags", image_key: "signalman" },
  review: { trait: "Quartermaster with a ledger", image_key: "quartermaster" },
  research: { trait: "Explorer with a sextant", image_key: "explorer" },
  present: { trait: "Captain addressing the crew", image_key: "captain" },
};

const DEFAULT_TRAIT = { trait: "Able seaman ready for duty", image_key: "seaman" };

/**
 * Match a goal title to a pirate trait based on keywords.
 */
function getPirateTraitForGoal(title: string): { trait: string; image_key: string } {
  const lower = title.toLowerCase();
  for (const [keyword, trait] of Object.entries(PIRATE_TRAITS)) {
    if (lower.includes(keyword)) return trait;
  }
  return DEFAULT_TRAIT;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Fetch today's blocks with goal info
  const { data: blocks } = await supabase
    .from("scheduled_blocks")
    .select("*, goals(*)")
    .eq("user_id", user.id)
    .gte("start_time", today.toISOString())
    .lt("start_time", tomorrow.toISOString())
    .order("start_time");

  // Get current month's score
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const { data: score } = await supabase
    .from("productivity_score")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .single();

  // Get current month's pirates
  const { data: pirates } = await supabase
    .from("pirates")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year);

  return NextResponse.json({
    blocks: blocks || [],
    score: score?.total_points || 0,
    pirates: pirates || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { completedBlockIds } = await request.json();

    if (!completedBlockIds || !Array.isArray(completedBlockIds)) {
      return NextResponse.json(
        { error: "completedBlockIds required" },
        { status: 400 }
      );
    }

    let totalNewPoints = 0;
    const newPirates: { trait: string; image_key: string; goal_title: string }[] = [];

    for (const blockId of completedBlockIds) {
      // Get the block details
      const { data: block } = await supabase
        .from("scheduled_blocks")
        .select("*, goals(*)")
        .eq("id", blockId)
        .eq("user_id", user.id)
        .single();

      if (!block || block.is_completed) continue;

      // Mark as completed
      await supabase
        .from("scheduled_blocks")
        .update({ is_completed: true })
        .eq("id", blockId);

      // Calculate points: 1 point per 10 minutes
      const start = new Date(block.start_time);
      const end = new Date(block.end_time);
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      const points = Math.floor(durationMinutes / 10);
      totalNewPoints += points;

      // Spawn a pirate for this completed task
      const goalTitle = block.goals?.title || "Task";
      const pirateInfo = getPirateTraitForGoal(goalTitle);

      await supabase.from("pirates").insert({
        user_id: user.id,
        goal_id: block.goal_id,
        trait_description: pirateInfo.trait,
        image_key: pirateInfo.image_key,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      });

      newPirates.push({ ...pirateInfo, goal_title: goalTitle });
    }

    // Update monthly productivity score
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const { data: existingScore } = await supabase
      .from("productivity_score")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (existingScore) {
      await supabase
        .from("productivity_score")
        .update({ total_points: existingScore.total_points + totalNewPoints })
        .eq("id", existingScore.id);
    } else {
      await supabase.from("productivity_score").insert({
        user_id: user.id,
        month,
        year,
        total_points: totalNewPoints,
      });
    }

    return NextResponse.json({
      pointsEarned: totalNewPoints,
      piratesSpawned: newPirates,
    });
  } catch (error) {
    console.error("Review API error:", error);
    return NextResponse.json(
      { error: "Failed to process review" },
      { status: 500 }
    );
  }
}
