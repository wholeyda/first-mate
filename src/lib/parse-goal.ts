/**
 * Goal Parser
 *
 * Extracts structured goal JSON from Claude's chat responses.
 * Claude outputs goals in a ```goal_json code block.
 * This parser finds and validates that data.
 */

import { Goal } from "@/types/database";

// Partial goal from Claude's response (before we add user_id, etc.)
export interface ParsedGoal {
  title: string;
  description: string | null;
  due_date: string;
  estimated_hours: number;
  is_hard_deadline: boolean;
  priority: 1 | 2 | 3 | 4 | 5;
  is_work: boolean;
  hours_per_day: number | null;
}

/**
 * Extract goal JSON blocks from a Claude response.
 * Returns an array because a single message might contain multiple goals.
 */
export function parseGoalsFromResponse(text: string): ParsedGoal[] {
  const goals: ParsedGoal[] = [];

  // Match ```goal_json ... ``` blocks
  const pattern = /```goal_json\s*([\s\S]*?)```/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());

      // Validate required fields exist
      if (
        parsed.title &&
        parsed.due_date &&
        typeof parsed.estimated_hours === "number" &&
        typeof parsed.priority === "number"
      ) {
        goals.push({
          title: parsed.title,
          description: parsed.description || null,
          due_date: parsed.due_date,
          estimated_hours: parsed.estimated_hours,
          is_hard_deadline: Boolean(parsed.is_hard_deadline),
          priority: Math.min(5, Math.max(1, parsed.priority)) as Goal["priority"],
          is_work: Boolean(parsed.is_work),
          hours_per_day: parsed.hours_per_day || null,
        });
      }
    } catch {
      // Skip malformed JSON — don't crash the app
      continue;
    }
  }

  return goals;
}

/**
 * Strip the goal_json code blocks from the message text.
 * Returns the clean human-readable part of Claude's response.
 */
export function stripGoalJson(text: string): string {
  return text.replace(/```goal_json\s*[\s\S]*?```/g, "").trim();
}
