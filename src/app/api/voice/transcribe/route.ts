/**
 * Deepgram Transcription Proxy
 *
 * Receives a complete audio blob (one full utterance) from the client
 * and forwards it to Deepgram's pre-recorded REST API with server-side
 * Authorization header. Returns the transcript.
 *
 * Why server-side proxy?
 * - Browser WebSocket cannot set Authorization headers
 * - Safari rejects WebSocket subprotocol auth ["token", key]
 * - Deepgram does not support ?token= URL query param
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Increase body size limit beyond Next.js default (1MB) for audio uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

// Vercel body size limit is 4.5MB — we keep utterances well below this
const MAX_AUDIO_BYTES = 4 * 1024 * 1024; // 4MB
const MIN_AUDIO_BYTES = 1000; // ignore tiny noise blobs

export async function POST(req: NextRequest) {
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

  const audioBuffer = await req.arrayBuffer();

  if (!audioBuffer || audioBuffer.byteLength < MIN_AUDIO_BYTES) {
    return NextResponse.json({ transcript: "" });
  }

  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    console.warn("[Deepgram proxy] Audio too large:", audioBuffer.byteLength, "bytes — truncating not supported");
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }

  // Use base content-type only (strip codec params like ;codecs=opus)
  const rawContentType = req.headers.get("content-type") || "audio/webm";
  const contentType = rawContentType.split(";")[0].trim();

  try {
    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          // Deepgram requires exact mime — audio/webm or audio/mp4
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
