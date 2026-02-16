/**
 * Resume Generate API Route
 *
 * Generates a formatted professional resume using Claude based on user-provided
 * bullet points and optional context (e.g., an uploaded resume filename).
 *
 * POST body: { bullets: string[], context?: string }
 * Returns: { resume: string }
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bullets, context } = await request.json();

    if (!bullets || !Array.isArray(bullets) || bullets.length === 0) {
      return NextResponse.json(
        { error: "At least one bullet point is required" },
        { status: 400 }
      );
    }

    const bulletsText = bullets
      .map((b: string, i: number) => `${i + 1}. ${b}`)
      .join("\n");

    const contextNote = context
      ? `\n\nAdditional context: ${context}`
      : "";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are a professional resume writer. Generate a clean, well-formatted professional resume in plain text. Use clear section headers, consistent formatting, and professional language. The resume should be ATS-friendly and ready to be copied into a document editor.`,
      messages: [
        {
          role: "user",
          content: `Generate a professional resume using the following accomplishment bullet points. Organize them into appropriate sections (e.g., Professional Experience, Key Achievements, Skills). Include placeholder sections for Contact Information and Education that the user can fill in.

BULLET POINTS:
${bulletsText}${contextNote}

Format the resume in clean plain text with clear section headers using ALL CAPS and divider lines. Make it ready to copy-paste into a document.`,
        },
      ],
    });

    const resumeText =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ resume: resumeText });
  } catch (error) {
    console.error("Resume generate API error:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500 }
    );
  }
}
