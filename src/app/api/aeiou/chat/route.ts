/**
 * AEIOU Conversational Interview API
 *
 * Streams Claude responses for the voice-driven AEIOU reflection.
 * Claude acts as a thoughtful interviewer — asks follow-ups, drills
 * into what the user enjoyed, and signals when it has enough to submit.
 *
 * When Claude has collected all required AEIOU fields it appends a
 * JSON extraction block so the client knows to call /api/aeiou to save.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are conducting a warm, curious post-completion reflection interview using the AEIOU framework for First Mate, a productivity app.

The user just completed a goal. Your job is to have a natural, flowing conversation that captures:
- Activities: What specific actions/tasks did they do?
- Environments: Where did they work? What was the setting?
- Interactions: Who or what did they interact with? Energizing or draining?
- Objects: What tools, software, or resources did they use?
- Users present: Who else was involved or influential?
- Excitement level: How engaged/flow-state were they? What drove that?
- Peak moments: The single most energizing moment, and the biggest drain.

Rules:
- Be genuinely curious and conversational — not robotic or form-like
- Ask ONE focused question at a time. Never list multiple questions.
- If they mention something interesting (a tool, a person, a moment of flow), drill into it: "Tell me more about that" or "What specifically made that feel good?"
- Don't re-ask for info already covered. If they said "I worked alone at home", skip asking where they were.
- After 4-6 exchanges, you should have enough. Don't over-interview.
- Keep your responses SHORT — 1-3 sentences max. This is voice conversation.
- Be warm but efficient. The user wants to finish and get their planet reward.

When you have collected enough information across all AEIOU dimensions (even if some answers overlap — e.g. activities answer also covers objects), end with EXACTLY this signal on its own line:
[AEIOU_COMPLETE]

Then on the next line output ONLY a raw JSON object (no markdown, no code fences) with these fields:
{"activities":"...","environments":"...","interactions":"...","objects":"...","users_present":"...","excitement_level":"...","peak_moments":"..."}

Extract and synthesize from the full conversation. Be thorough but concise in each field.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, goalTitle } = await req.json();
  if (!messages || !goalTitle) {
    return NextResponse.json({ error: "messages and goalTitle required" }, { status: 400 });
  }

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: SYSTEM_PROMPT + `\n\nGoal being reflected on: "${goalTitle}"`,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
