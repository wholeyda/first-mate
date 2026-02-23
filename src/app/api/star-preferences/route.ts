/**
 * Star Preferences API Route
 *
 * GET - Fetch star customization preferences for the authenticated user
 * PUT - Update star customization preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: profile } = await supabase
      .from("users")
      .select("star_preferences")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      starPreferences: profile?.star_preferences || null,
    });
  } catch (error) {
    console.error("Star preferences fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch star preferences" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { starPreferences } = body;

    if (
      !starPreferences ||
      !starPreferences.colorTheme ||
      !starPreferences.style
    ) {
      return NextResponse.json(
        { error: "Invalid star preferences structure" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("users")
      .update({ star_preferences: starPreferences })
      .eq("id", user.id);

    if (error) {
      console.error("Star preferences update error:", error);
      return NextResponse.json(
        { error: "Failed to save star preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Star preferences API error:", error);
    return NextResponse.json(
      { error: "Failed to save star preferences" },
      { status: 500 }
    );
  }
}
