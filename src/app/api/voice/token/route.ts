/**
 * Deepgram Token API Route
 *
 * Issues a short-lived Deepgram API token for client-side WebSocket use.
 * This keeps the master API key server-side only (not in NEXT_PUBLIC_).
 * Token expires in 10 seconds — enough to open a WebSocket connection.
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

  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Deepgram API key not configured" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ time_to_live_in_seconds: 30 }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Deepgram token error:", response.status, err);
      return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json({ token: data.key });
  } catch (error) {
    console.error("Deepgram token fetch error:", error);
    return NextResponse.json({ error: "Failed to get token" }, { status: 500 });
  }
}
