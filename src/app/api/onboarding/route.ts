/**
 * Onboarding Status API Route
 *
 * GET - Check if the authenticated user has seen the onboarding instructions
 * PUT - Mark onboarding as seen (called when the user closes the instructions modal)
 */

import { NextResponse } from "next/server";
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
      .select("has_seen_onboarding")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      hasSeenOnboarding: profile?.has_seen_onboarding ?? false,
    });
  } catch (error) {
    console.error("Onboarding status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}

export async function PUT() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({ has_seen_onboarding: true })
      .eq("id", user.id);

    if (error) {
      console.error("Onboarding update error:", error);
      return NextResponse.json(
        { error: "Failed to update onboarding status" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding API error:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding status" },
      { status: 500 }
    );
  }
}
