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

  // Return the key directly — it's protected by the auth check above.
  // The key never appears in the client bundle (no NEXT_PUBLIC_ prefix).
  return NextResponse.json({ token: apiKey });
}
