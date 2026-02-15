/**
 * Islands API Route
 *
 * GET    - Fetch all islands for the authenticated user
 * POST   - Create a new island (after successful AEIOU)
 * DELETE - Remove an island by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Island type presets — each has a distinct visual identity
const ISLAND_TYPES = [
  "tropical", "volcanic", "crystalline", "floating",
  "bioluminescent", "coral", "arctic", "desert",
  "forest", "steampunk", "nebula", "garden",
];

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

    // Generate random island properties
    const island_type = ISLAND_TYPES[Math.floor(Math.random() * ISLAND_TYPES.length)];
    const color_palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
    // Random position on the sphere surface
    const position_theta = Math.random() * Math.PI * 2; // 0 to 2pi
    const position_phi = Math.acos(2 * Math.random() - 1); // 0 to pi (uniform sphere distribution)

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
