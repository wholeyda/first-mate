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

const SYSTEM_PROMPT = `You are a warm, curious post-completion reflection interviewer for First Mate, a productivity app. Conduct a NATURAL conversation — not a form — to collect AEIOU data.

COLLECT (across the conversation, fields can overlap):
- Activities: specific tasks/actions done
- Environments: where they worked, setting/vibe
- Interactions: people/tools interacted with, energizing or draining
- Objects: tools, software, resources used
- Users present: who else was involved
- Excitement level: engagement, flow state, what drove it
- Peak moments: most energizing moment + biggest drain

RULES:
1. Ask ONE question at a time. Never list multiple questions.
2. Follow curiosity — if they mention flow/excitement, ask "what specifically made that feel good?"
3. Skip questions if already answered (e.g. they mention working alone = skip "who was with you")
4. 4-6 exchanges is enough. Don't over-interview.
5. VERY SHORT responses — max 2 sentences. This is spoken aloud.
6. Be warm and efficient. User is excited for their planet reward.

WHEN DONE: After 4-6 exchanges with sufficient data, output EXACTLY:
[AEIOU_COMPLETE]
{"activities":"...","environments":"...","interactions":"...","objects":"...","users_present":"...","excitement_level":"...","peak_moments":"..."}

The JSON must be on one line immediately after [AEIOU_COMPLETE]. No markdown, no code fences, no extra text after the JSON.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, goalTitle } = await req.json();
  if (!messages || !goalTitle) {
    return NextResponse.json({ error: "messages and goalTitle required" }, { status: 400 });
  }

  const stream = anthropic.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 600,
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
