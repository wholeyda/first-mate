/**
 * Chat API Route
 *
 * Handles conversation with Claude API.
 * Streams responses back to the client for a responsive chat experience.
 * Fetches AEIOU history to inject into the system prompt for career recommendations.
 *
 * POST body: { messages: [{ role: "user" | "assistant", content: string }] }
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getSystemPrompt } from "@/lib/chat-system-prompt";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages } = await request.json();

    // Fetch AEIOU history for career recommendations
    let aeiouHistory: Array<{
      goal_title: string;
      activities: string;
      environments: string;
      interactions: string;
      objects: string;
      users_present: string;
      excitement_level: string;
      peak_moments: string;
      was_successful: boolean;
      ai_assessment: string | null;
      created_at: string;
    }> = [];

    try {
      const { data: aeiouData } = await supabase
        .from("aeiou_responses")
        .select("*, goals(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (aeiouData && aeiouData.length > 0) {
        aeiouHistory = aeiouData.map((entry: Record<string, unknown>) => ({
          goal_title: (entry.goals as Record<string, unknown>)?.title as string || "Unknown goal",
          activities: entry.activities as string,
          environments: entry.environments as string,
          interactions: entry.interactions as string,
          objects: entry.objects as string,
          users_present: entry.users_present as string,
          excitement_level: (entry.excitement_level as string) || "",
          peak_moments: (entry.peak_moments as string) || "",
          was_successful: entry.was_successful as boolean,
          ai_assessment: entry.ai_assessment as string | null,
          created_at: entry.created_at as string,
        }));
      }
    } catch {
      // If AEIOU tables don't exist yet, continue without them
    }

    // Call Claude API with streaming
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: getSystemPrompt(aeiouHistory.length > 0 ? aeiouHistory : undefined),
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              // Send each text chunk as a server-sent event
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          // Signal end of stream
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.error(error);
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
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
