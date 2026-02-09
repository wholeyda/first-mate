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
 * - Respects preferred_time when specified
 * - Handles recurring tasks (daily/weekly on specific days)
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

// Day name to JS day number mapping (0 = Sunday)
const DAY_NAME_TO_NUMBER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/**
 * Check if a proposed block overlaps with any busy slot.
 */
function hasConflict(start: Date, end: Date, busySlots: BusySlot[]): boolean {
  return busySlots.some(
    (busy) => start < busy.end && end > busy.start
  );
}

/**
 * Validate preferred_time format (HH:MM, 00-23:00-59).
 * Returns [hours, minutes] if valid, null otherwise.
 */
function parsePreferredTime(time: string | null | undefined): [number, number] | null {
  if (!time) return null;
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return [hours, minutes];
}

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
    if (a.is_hard_deadline && !b.is_hard_deadline) return -1;
    if (!a.is_hard_deadline && b.is_hard_deadline) return 1;
    return b.priority - a.priority;
  });

  for (const goal of sortedGoals) {
    const calendarType: "work" | "personal" = goal.is_work ? "work" : "personal";
    const durationMinutes = goal.duration_minutes ?? goal.estimated_hours * 60;

    // --- RECURRING TASKS with preferred time ---
    if (goal.recurring && goal.preferred_time) {
      const parsedTime = parsePreferredTime(goal.preferred_time);
      if (!parsedTime) continue; // Skip if invalid time format
      const [prefHour, prefMinute] = parsedTime;
      const targetDays = goal.recurring.days.map(
        (d) => DAY_NAME_TO_NUMBER[d.toLowerCase()]
      );

      // Walk through each day of the week
      const currentDate = new Date(weekStart);
      while (currentDate < weekEnd) {
        const dayOfWeek = currentDate.getDay();

        if (targetDays.includes(dayOfWeek)) {
          const blockStart = new Date(currentDate);
          blockStart.setHours(prefHour, prefMinute, 0, 0);

          const blockEnd = new Date(
            blockStart.getTime() + durationMinutes * 60 * 1000
          );

          // Check for conflicts with all busy slots + already proposed blocks
          const allConflicts = [
            ...allBusy,
            ...proposedBlocks.map((b) => ({
              start: new Date(b.start_time),
              end: new Date(b.end_time),
            })),
          ];

          if (!hasConflict(blockStart, blockEnd, allConflicts)) {
            proposedBlocks.push({
              goal_id: goal.id,
              goal_title: goal.title,
              calendar_type: calendarType,
              start_time: blockStart.toISOString(),
              end_time: blockEnd.toISOString(),
            });
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      continue; // Skip the default scheduling logic for this goal
    }

    // --- PREFERRED TIME (non-recurring) ---
    if (goal.preferred_time) {
      const parsedTime = parsePreferredTime(goal.preferred_time);
      if (!parsedTime) continue; // Skip if invalid time format
      const [prefHour, prefMinute] = parsedTime;

      // Find the first available day at the preferred time
      const currentDate = new Date(weekStart);
      let scheduled = false;

      while (currentDate < weekEnd && !scheduled) {
        const blockStart = new Date(currentDate);
        blockStart.setHours(prefHour, prefMinute, 0, 0);

        const blockEnd = new Date(
          blockStart.getTime() + durationMinutes * 60 * 1000
        );

        const allConflicts = [
          ...allBusy,
          ...proposedBlocks.map((b) => ({
            start: new Date(b.start_time),
            end: new Date(b.end_time),
          })),
        ];

        if (!hasConflict(blockStart, blockEnd, allConflicts)) {
          proposedBlocks.push({
            goal_id: goal.id,
            goal_title: goal.title,
            calendar_type: calendarType,
            start_time: blockStart.toISOString(),
            end_time: blockEnd.toISOString(),
          });
          scheduled = true;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      continue;
    }

    // --- DEFAULT: auto-find slots ---
    let remainingMinutes = goal.estimated_hours * 60;
    const currentDate = new Date(weekStart);

    while (currentDate < weekEnd && remainingMinutes > 0) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(8, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(21, 0, 0, 0);

      const availableSlots = findAvailableSlots(dayStart, dayEnd, [
        ...allBusy,
        ...proposedBlocks.map((b) => ({
          start: new Date(b.start_time),
          end: new Date(b.end_time),
        })),
      ]);

      for (const slot of availableSlots) {
        if (remainingMinutes <= 0) break;

        const slotDuration =
          (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);

        if (slotDuration < MIN_BLOCK_MINUTES) continue;

        const blockMinutes = Math.min(remainingMinutes, slotDuration);
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
    if (cursor < busy.start) {
      const gapMinutes =
        (busy.start.getTime() - cursor.getTime()) / (1000 * 60);
      if (gapMinutes >= MIN_BLOCK_MINUTES) {
        available.push({ start: new Date(cursor), end: new Date(busy.start) });
      }
    }
    if (busy.end > cursor) {
      cursor = new Date(busy.end);
    }
  }

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
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  weekEnd.setHours(0, 0, 0, 0);

  return { weekStart, weekEnd };
}
