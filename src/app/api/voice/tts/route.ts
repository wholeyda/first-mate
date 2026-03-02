/**
 * TTS API Route
 *
 * Takes text + voice preference, returns audio/mpeg stream via OpenAI TTS.
 * Voice mapping: "female" → "nova", "male" → "onyx"
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { openai } from "@/lib/openai";

const VOICE_MAP: Record<string, "nova" | "onyx"> = {
  female: "nova",
  male: "onyx",
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { text, voice } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'text' field" },
        { status: 400 }
      );
    }

    const voiceId = VOICE_MAP[voice] || VOICE_MAP.female;

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: voiceId,
      input: text,
    });

    // Stream the audio response back
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
