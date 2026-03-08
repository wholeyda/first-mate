/**
 * Islands API Route
 *
 * GET    - Fetch all islands for the authenticated user
 * POST   - Create a new island (after successful AEIOU)
 * DELETE - Remove an island by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Work-oriented planet types (techy/industrial feel)
const WORK_TYPES = [
  "steampunk", "crystalline", "nebula", "desert", "volcanic", "arctic",
];

// Personal-oriented planet types (organic/natural feel)
const PERSONAL_TYPES = [
  "tropical", "forest", "garden", "coral", "bioluminescent", "floating",
];

// Combined for fallback
const ALL_TYPES = [...WORK_TYPES, ...PERSONAL_TYPES];

// Color palette presets — vivid and on-brand
const COLOR_PALETTES = [
  ["#FF6B6B", "#4ECDC4", "#45B7D1"],
  ["#A8E6CF", "#DCEDC1", "#FFD3B6"],
  ["#96CEB4", "#FFEAA7", "#DDA0DD"],
  ["#6C5CE7", "#A29BFE", "#FD79A8"],
  ["#00CEC9", "#81ECEC", "#55EFC4"],
  ["#FDCB6E", "#E17055", "#D63031"],
  ["#0984E3", "#74B9FF", "#A29BFE"],
  ["#00B894", "#55EFC4", "#FFEAA7"],
  ["#E84393", "#FD79A8", "#FDCB6E"],
  ["#636E72", "#B2BEC3", "#DFE6E9"],
  ["#FAB1A0", "#FFEAA7", "#81ECEC"],
  ["#FF7675", "#FD79A8", "#A29BFE"],
];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: islands } = await supabase
      .from("islands")
      .select("*, goals(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({ islands: islands || [] });
  } catch (error) {
    console.error("Islands fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch islands" }, { status: 500 });
  }
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
    const body = await request.json();
    const { goal_id, aeiou_response_id, name } = body;

    if (!goal_id || !name) {
      return NextResponse.json(
        { error: "goal_id and name are required" },
        { status: 400 }
      );
    }

    // Look up the goal to determine work vs personal type pool
    let typePool = ALL_TYPES;
    const { data: goal } = await supabase
      .from("goals")
      .select("is_work")
      .eq("id", goal_id)
      .single();

    if (goal) {
      typePool = goal.is_work ? WORK_TYPES : PERSONAL_TYPES;
    }

    // Generate random island properties from the appropriate pool
    const island_type = typePool[Math.floor(Math.random() * typePool.length)];
    const color_palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];

    // Count existing islands to assign a golden-angle theta so planets never overlap.
    // Golden angle (≈137.5°) gives the best possible angular spread for any number of points.
    const { count: islandCount } = await supabase
      .from("islands")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    const GOLDEN_ANGLE = 2.399963; // radians
    const idx = islandCount ?? 0;
    const position_theta = (idx * GOLDEN_ANGLE) % (Math.PI * 2);
    // Alternate phi in equatorial bands so planets stay in a disc, not at poles
    const PHI_BANDS = [
      Math.PI * 0.38, Math.PI * 0.44, Math.PI * 0.50, Math.PI * 0.56, Math.PI * 0.62,
    ];
    const position_phi = PHI_BANDS[idx % PHI_BANDS.length];

    const { data: island, error } = await supabase
      .from("islands")
      .insert({
        user_id: user.id,
        goal_id,
        aeiou_response_id: aeiou_response_id || null,
        island_type,
        color_palette,
        name,
        position_theta,
        position_phi,
      })
      .select()
      .single();

    if (error) {
      console.error("Island insert error:", error);
      return NextResponse.json({ error: "Failed to create island" }, { status: 500 });
    }

    return NextResponse.json({ island });
  } catch (error) {
    console.error("Islands API error:", error);
    return NextResponse.json({ error: "Failed to create island" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const islandId = searchParams.get("id");

    if (!islandId) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("islands")
      .delete()
      .eq("id", islandId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Island delete error:", error);
      return NextResponse.json({ error: "Failed to delete island" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Islands delete error:", error);
    return NextResponse.json({ error: "Failed to delete island" }, { status: 500 });
  }
}
