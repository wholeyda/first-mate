/**
 * Voice Preference API Route
 *
 * GET - Returns the authenticated user's TTS voice preference (male/female)
 * PUT - Updates the voice preference
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
      .select("voice_preference")
      .eq("id", user.id)
      .single();

    return NextResponse.json({
      voicePreference: profile?.voice_preference ?? "female",
    });
  } catch (error) {
    console.error("Voice preference fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice preference" },
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
    const { voicePreference } = await request.json();
    if (voicePreference !== "male" && voicePreference !== "female") {
      return NextResponse.json(
        { error: "Invalid voice preference. Must be 'male' or 'female'." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("users")
      .update({ voice_preference: voicePreference })
      .eq("id", user.id);

    if (error) {
      console.error("Voice preference update error:", error);
      return NextResponse.json(
        { error: "Failed to update voice preference" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Voice preference API error:", error);
    return NextResponse.json(
      { error: "Failed to update voice preference" },
      { status: 500 }
    );
  }
}
