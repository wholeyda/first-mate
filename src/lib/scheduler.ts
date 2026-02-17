/**
 * Scheduling Algorithm
 *
 * Takes a list of goals and existing calendar events,
 * then generates proposed time blocks that fit into
 * available slots without overlapping.
 *
 * All times are computed in PST (America/Los_Angeles) and output
 * as ISO strings so Google Calendar interprets them correctly.
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

import { Goal } from "@/types/database";

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

// Target timezone for all scheduling
const TZ = "America/Los_Angeles";

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
 * Create a Date object representing a specific wall-clock time in PST/PDT.
 * e.g. setTimeInPST(date, 17, 30) => 5:30 PM Pacific time on that date.
 */
function setTimeInPST(date: Date, hours: number, minutes: number): Date {
  // Format the date portion in PST
  const dateStr = date.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
  // Build an ISO-like string with the desired time in PST
  const pstOffsetStr = getPSTOffsetString(new Date(`${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`));
  const isoStr = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00${pstOffsetStr}`;
  return new Date(isoStr);
}

/**
 * Get the UTC offset string for PST/PDT at a given moment.
 * Returns "-08:00" for PST or "-07:00" for PDT.
 */
function getPSTOffsetString(date: Date): string {
  // Use Intl to get the actual offset at this moment
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  if (tzPart) {
    // Format: "GMT-8" or "GMT-7"
    const match = tzPart.value.match(/GMT([+-]\d+)/);
    if (match) {
      const offset = parseInt(match[1], 10);
      const sign = offset >= 0 ? "+" : "-";
      const absOffset = Math.abs(offset);
      return `${sign}${String(absOffset).padStart(2, "0")}:00`;
    }
  }
  // Default to PST
  return "-08:00";
}

/**
 * Get the day-of-week in PST for a date.
 */
function getDayOfWeekInPST(date: Date): number {
  const pstStr = date.toLocaleDateString("en-US", { timeZone: TZ, weekday: "short" });
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return dayMap[pstStr] ?? date.getDay();
}

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
 * Find the next available time slot for a single goal.
 * Used for auto-scheduling when a goal is created.
 * Searches from today through the goal's due date (or 2 weeks out).
 * All times are interpreted in PST.
 */
export function findNextSlot(
  goal: Goal,
  busySlots: BusySlot[],
  startDate: Date,
  endDate: Date
): ProposedBlock | null {
  const calendarType: "work" | "personal" = goal.is_work ? "work" : "personal";
  const durationMinutes = goal.duration_minutes ?? Math.min(goal.estimated_hours * 60, 120);

  // If preferred time is set, try to find a day at that time (in PST)
  if (goal.preferred_time) {
    const parsedTime = parsePreferredTime(goal.preferred_time);
    if (parsedTime) {
      const [prefHour, prefMinute] = parsedTime;
      const currentDate = new Date(startDate);

      while (currentDate < endDate) {
        // Set the preferred time in PST
        const blockStart = setTimeInPST(currentDate, prefHour, prefMinute);

        // Skip if block start is in the past
        if (blockStart > new Date()) {
          const blockEnd = new Date(blockStart.getTime() + durationMinutes * 60 * 1000);

          if (!hasConflict(blockStart, blockEnd, busySlots)) {
            return {
              goal_id: goal.id,
              goal_title: goal.title,
              calendar_type: calendarType,
              start_time: blockStart.toISOString(),
              end_time: blockEnd.toISOString(),
            };
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  // Default: scan 8AM-9PM PST for first available slot
  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    const dayStart = setTimeInPST(currentDate, 8, 0);
    const dayEnd = setTimeInPST(currentDate, 21, 0);

    // Skip past times for today
    const now = new Date();
    const effectiveStart = dayStart < now ? new Date(Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000)) : dayStart;

    if (effectiveStart < dayEnd) {
      const availableSlots = findAvailableSlots(effectiveStart, dayEnd, busySlots);

      for (const slot of availableSlots) {
        const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60);
        if (slotDuration >= Math.min(durationMinutes, MIN_BLOCK_MINUTES)) {
          const actualMinutes = Math.min(durationMinutes, slotDuration);
          const blockEnd = new Date(slot.start.getTime() + actualMinutes * 60 * 1000);

          return {
            goal_id: goal.id,
            goal_title: goal.title,
            calendar_type: calendarType,
            start_time: slot.start.toISOString(),
            end_time: blockEnd.toISOString(),
          };
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return null;
}

/**
 * Find all recurring time slots for a goal within a date range.
 * Used for recurring goals (daily/weekly on specific days).
 * All times are interpreted in PST.
 */
export function findRecurringSlots(
  goal: Goal,
  busySlots: BusySlot[],
  startDate: Date,
  endDate: Date
): ProposedBlock[] {
  const blocks: ProposedBlock[] = [];
  if (!goal.recurring) return blocks;

  const calendarType: "work" | "personal" = goal.is_work ? "work" : "personal";
  const durationMinutes = goal.duration_minutes ?? Math.min(goal.estimated_hours * 60, 60);
  const parsedTime = parsePreferredTime(goal.preferred_time);
  const [prefHour, prefMinute] = parsedTime || [9, 0]; // Default 9:00 AM PST

  const targetDays = goal.recurring.days.map(
    (d) => DAY_NAME_TO_NUMBER[d.toLowerCase()]
  ).filter((d) => d !== undefined);

  const currentDate = new Date(startDate);
  const now = new Date();

  while (currentDate < endDate) {
    const dayOfWeek = getDayOfWeekInPST(currentDate);

    if (targetDays.includes(dayOfWeek)) {
      // Set the preferred time in PST
      const blockStart = setTimeInPST(currentDate, prefHour, prefMinute);

      // Skip if in the past
      if (blockStart > now) {
        const blockEnd = new Date(blockStart.getTime() + durationMinutes * 60 * 1000);

        // Include already-scheduled recurring blocks as busy
        const allBusy = [
          ...busySlots,
          ...blocks.map((b) => ({
            start: new Date(b.start_time),
            end: new Date(b.end_time),
          })),
        ];

        if (!hasConflict(blockStart, blockEnd, allBusy)) {
          blocks.push({
            goal_id: goal.id,
            goal_title: goal.title,
            calendar_type: calendarType,
            start_time: blockStart.toISOString(),
            end_time: blockEnd.toISOString(),
          });
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return blocks;
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
