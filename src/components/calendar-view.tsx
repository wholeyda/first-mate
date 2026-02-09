/**
 * Calendar View
 *
 * Displays real Google Calendar events (work + personal combined)
 * in a weekly grid. Read-only view — the calendar is the source of truth.
 * Supports week navigation (previous / next week).
 */

"use client";

import { useState, useEffect, useCallback } from "react";

// Simplified event type from Google Calendar API
interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
  calendarType: "work" | "personal";
}

const START_HOUR = 8;
const END_HOUR = 21;
const HOUR_HEIGHT = 60;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).replace(" ", "").toLowerCase();
}

function getDayIndex(dateStr: string, weekStart: Date): number {
  const date = new Date(dateStr);
  const diff = Math.floor(
    (date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/calendar/events?timeMin=${weekStart.toISOString()}&timeMax=${weekEnd.toISOString()}`
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to load calendar");
        return;
      }

      const data = await response.json();

      // Combine personal and work events with type tags
      const combined: CalendarEvent[] = [
        ...(data.personal || []).map((e: CalendarEvent) => ({ ...e, calendarType: "personal" as const })),
        ...(data.work || []).map((e: CalendarEvent) => ({ ...e, calendarType: "work" as const })),
      ];

      // Filter to only timed events (not all-day)
      const timedEvents = combined.filter((e) => e.start?.dateTime && e.end?.dateTime);
      setEvents(timedEvents);
    } catch {
      setError("Failed to load calendar events");
    } finally {
      setIsLoading(false);
    }
  }, [weekStart.toISOString(), weekEnd.toISOString()]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  function navigateWeek(direction: -1 | 1) {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  }

  function goToToday() {
    setWeekStart(getMonday(new Date()));
  }

  // Check if current week includes today
  const today = new Date();
  const isCurrentWeek =
    today >= weekStart && today < weekEnd;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateWeek(-1)}
            className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer text-sm px-2 py-1"
          >
            &larr;
          </button>
          <span className="text-sm font-medium text-gray-900 min-w-[160px] text-center">
            {formatDate(weekStart)} — {formatDate(new Date(weekEnd.getTime() - 1))}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer text-sm px-2 py-1"
          >
            &rarr;
          </button>
        </div>

        <div className="flex items-center gap-3">
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
          <button
            onClick={fetchEvents}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-4 py-8 text-center">
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={fetchEvents}
            className="mt-2 text-sm text-gray-900 hover:underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !error && (
        <div className="px-4 py-12 text-center">
          <p className="text-gray-400 text-sm">Loading calendar...</p>
        </div>
      )}

      {/* Calendar grid */}
      {!isLoading && !error && (
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-[700px]">
            {/* Time labels column */}
            <div className="w-14 flex-none">
              {/* Day header spacer */}
              <div className="h-10 border-b border-gray-100" />
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div
                  key={i}
                  className="relative"
                  style={{ height: HOUR_HEIGHT }}
                >
                  <span className="absolute -top-2.5 right-2 text-xs text-gray-300">
                    {((START_HOUR + i - 1) % 12 + 1)}{(START_HOUR + i) < 12 ? "a" : "p"}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS.map((day, dayIndex) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + dayIndex);
              const isToday =
                dayDate.toDateString() === today.toDateString();

              // Filter events for this day
              const dayEvents = events.filter((event) => {
                if (!event.start?.dateTime) return false;
                const idx = getDayIndex(event.start.dateTime, weekStart);
                return idx === dayIndex;
              });

              return (
                <div
                  key={day}
                  className="flex-1 min-w-[90px] border-l border-gray-50"
                >
                  {/* Day header */}
                  <div
                    className={`h-10 flex items-center justify-center border-b border-gray-100 text-xs ${
                      isToday ? "text-gray-900 font-semibold" : "text-gray-400"
                    }`}
                  >
                    {day} {dayDate.getDate()}
                  </div>

                  {/* Hour grid + events */}
                  <div className="relative">
                    {/* Hour lines */}
                    {Array.from(
                      { length: END_HOUR - START_HOUR },
                      (_, i) => (
                        <div
                          key={i}
                          className="border-b border-gray-50"
                          style={{ height: HOUR_HEIGHT }}
                        />
                      )
                    )}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const start = new Date(event.start.dateTime!);
                      const end = new Date(event.end.dateTime!);
                      const startHours =
                        start.getHours() + start.getMinutes() / 60;
                      const endHours = end.getHours() + end.getMinutes() / 60;

                      const clampedStart = Math.max(startHours, START_HOUR);
                      const clampedEnd = Math.min(endHours, END_HOUR);

                      if (clampedEnd <= clampedStart) return null;

                      const top = (clampedStart - START_HOUR) * HOUR_HEIGHT;
                      const height = (clampedEnd - clampedStart) * HOUR_HEIGHT;

                      const isAppEvent =
                        event.extendedProperties?.private?.firstMateManaged === "true";

                      return (
                        <div
                          key={event.id}
                          className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden ${
                            event.calendarType === "work"
                              ? "bg-gray-900 text-white"
                              : "bg-gray-200 text-gray-900"
                          }`}
                          style={{ top, height: Math.max(height, 18) }}
                        >
                          <div className="flex items-start gap-1">
                            {isAppEvent && (
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full mt-1 flex-none ${
                                  event.calendarType === "work"
                                    ? "bg-white/60"
                                    : "bg-gray-500"
                                }`}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-medium truncate leading-tight">
                                {event.summary || "(No title)"}
                              </p>
                              {height > 28 && (
                                <p
                                  className={`text-[9px] leading-tight ${
                                    event.calendarType === "work"
                                      ? "text-white/60"
                                      : "text-gray-500"
                                  }`}
                                >
                                  {formatTime(start)}–{formatTime(end)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && events.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-sm">No events this week</p>
        </div>
      )}
    </div>
  );
}
