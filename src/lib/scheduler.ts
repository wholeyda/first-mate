/**
 * Scheduling Algorithm
 *
 * Takes a list of goals and existing calendar events,
 * then generates proposed time blocks that fit into
 * available slots without overlapping.
 *
 * Rules:
 * - Minimum block size: 15 minutes
 * - Hard deadlines are scheduled first
 * - Higher priority goals are scheduled before lower priority
 * - Never overlaps with existing calendar events
 * - Multi-day tasks are split across days based on hours_per_day
 */

import { Goal, ScheduledBlock } from "@/types/database";

// A time slot with start and end
interface TimeSlot {
  start: Date;
  end: Date;
}

// A busy period from the calendar
interface BusySlot {
  start: Date;
  end: Date;
}

// A proposed block before it's saved to the database
export interface ProposedBlock {
  goal_id: string;
  goal_title: string;
  calendar_type: "work" | "personal";
  start_time: string; // ISO string
  end_time: string; // ISO string
}

// Minimum block size in minutes
const MIN_BLOCK_MINUTES = 15;

/**
 * Main scheduling function.
 * Takes goals and busy slots, returns proposed time blocks for the week.
 */
export function generateSchedule(
  goals: Goal[],
  busySlots: BusySlot[],
  existingBlocks: ScheduledBlock[],
  weekStart: Date,
  weekEnd: Date
): ProposedBlock[] {
  const proposedBlocks: ProposedBlock[] = [];

  // Combine busy slots with existing app blocks to get all unavailable times
  const allBusy: BusySlot[] = [
    ...busySlots,
    ...existingBlocks.map((block) => ({
      start: new Date(block.start_time),
      end: new Date(block.end_time),
    })),
  ];

  // Sort goals: hard deadlines first, then by priority (high to low)
  const sortedGoals = [...goals].sort((a, b) => {
    // Hard deadlines always come first
    if (a.is_hard_deadline && !b.is_hard_deadline) return -1;
    if (!a.is_hard_deadline && b.is_hard_deadline) return 1;
    // Then sort by priority (5 = critical, 1 = low)
    return b.priority - a.priority;
  });

  // Schedule each goal
  for (const goal of sortedGoals) {
    const totalMinutes = goal.estimated_hours * 60;
    let remainingMinutes = totalMinutes;

    // Determine the calendar type for this goal
    const calendarType: "work" | "personal" = goal.is_work
      ? "work"
      : "personal";

    // Get available slots for each day of the week
    const currentDate = new Date(weekStart);
    while (currentDate < weekEnd && remainingMinutes > 0) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(8, 0, 0, 0); // Default: start scheduling at 8am

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(21, 0, 0, 0); // Default: stop scheduling at 9pm

      // Find available slots for this day
      const availableSlots = findAvailableSlots(
        dayStart,
        dayEnd,
        [...allBusy, ...proposedBlocks.map((b) => ({
          start: new Date(b.start_time),
          end: new Date(b.end_time),
        }))],
      );

      // Fill available slots with this goal's time
      for (const slot of availableSlots) {
        if (remainingMinutes <= 0) break;

        const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);

        // Skip slots shorter than minimum
        if (slotDuration < MIN_BLOCK_MINUTES) continue;

        // Use this slot (or part of it)
        const blockMinutes = Math.min(remainingMinutes, slotDuration);

        // Round to nearest 15 minutes
        const roundedMinutes =
          Math.ceil(blockMinutes / MIN_BLOCK_MINUTES) * MIN_BLOCK_MINUTES;
        const actualMinutes = Math.min(roundedMinutes, slotDuration);

        if (actualMinutes < MIN_BLOCK_MINUTES) continue;

        const blockEnd = new Date(
          slot.start.getTime() + actualMinutes * 60 * 1000
        );

        proposedBlocks.push({
          goal_id: goal.id,
          goal_title: goal.title,
          calendar_type: calendarType,
          start_time: slot.start.toISOString(),
          end_time: blockEnd.toISOString(),
        });

        remainingMinutes -= actualMinutes;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return proposedBlocks;
}

/**
 * Find available time slots in a day, given busy periods.
 * Returns gaps between busy periods that are at least MIN_BLOCK_MINUTES long.
 */
function findAvailableSlots(
  dayStart: Date,
  dayEnd: Date,
  busySlots: BusySlot[]
): TimeSlot[] {
  // Filter busy slots to only those that overlap with this day
  const dayBusy = busySlots
    .filter((slot) => slot.start < dayEnd && slot.end > dayStart)
    .map((slot) => ({
      start: new Date(Math.max(slot.start.getTime(), dayStart.getTime())),
      end: new Date(Math.min(slot.end.getTime(), dayEnd.getTime())),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const available: TimeSlot[] = [];
  let cursor = new Date(dayStart);

  for (const busy of dayBusy) {
    // If there's a gap before this busy period, it's available
    if (cursor < busy.start) {
      const gapMinutes =
        (busy.start.getTime() - cursor.getTime()) / (1000 * 60);
      if (gapMinutes >= MIN_BLOCK_MINUTES) {
        available.push({ start: new Date(cursor), end: new Date(busy.start) });
      }
    }
    // Move cursor past this busy period
    if (busy.end > cursor) {
      cursor = new Date(busy.end);
    }
  }

  // Check for available time after the last busy period
  if (cursor < dayEnd) {
    const gapMinutes = (dayEnd.getTime() - cursor.getTime()) / (1000 * 60);
    if (gapMinutes >= MIN_BLOCK_MINUTES) {
      available.push({ start: new Date(cursor), end: new Date(dayEnd) });
    }
  }

  return available;
}

/**
 * Get the start and end of the current week (Monday to Sunday).
 */
export function getCurrentWeekRange(): { weekStart: Date; weekEnd: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Adjust so Monday = 0
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(0, 0, 0, 0);

  return { weekStart, weekEnd };
}
