/**
 * Deepgram Transcription Proxy
 *
 * Accepts audio blobs from the client and forwards them to Deepgram's
 * pre-recorded REST API using the Authorization header (server-side only).
 *
 * This proxy is the only reliable cross-browser solution:
 * - Browser WebSocket cannot set Authorization headers
 * - Safari rejects subprotocol auth ["token", key]
 * - Deepgram does NOT support ?token= URL query param
 *
 * The client sends short audio chunks (~2s) via POST; we forward to Deepgram
 * and return the transcript. The client detects silence via AudioContext
 * AnalyserNode and triggers auto-send when the user stops speaking.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  // Auth check — only logged-in users can transcribe
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

  // Read the raw audio blob from the request body
  const audioBuffer = await req.arrayBuffer();
  if (!audioBuffer || audioBuffer.byteLength === 0) {
    return NextResponse.json({ transcript: "" });
  }

  // Determine content type from request headers
  const contentType = req.headers.get("content-type") || "audio/webm;codecs=opus";

  try {
    // Forward to Deepgram pre-recorded REST API
    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      }
    );

    if (!dgRes.ok) {
      const errText = await dgRes.text().catch(() => "");
      console.error("[Deepgram proxy] Error:", dgRes.status, errText);
      return NextResponse.json(
        { error: `Deepgram error: ${dgRes.status}`, detail: errText },
        { status: 502 }
      );
    }

    const data = await dgRes.json();
    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[Deepgram proxy] Fetch error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
