/**
 * Calendar View
 *
 * Displays real Google Calendar events (work + personal combined)
 * plus pending blocks awaiting approval, in a weekly grid.
 * Supports week navigation, event deletion, and block approve/reject.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
  calendarType: "work" | "personal";
}

interface PendingBlock {
  id: string;
  goal_id: string;
  goal_title: string;
  calendar_type: "work" | "personal";
  start_time: string;
  end_time: string;
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
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" ", "")
    .toLowerCase();
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
  const [pendingBlocks, setPendingBlocks] = useState<PendingBlock[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);
    try {
      const timeMin = weekStart.toISOString();
      const timeMax = weekEnd.toISOString();

      // Fetch calendar events and pending blocks in parallel
      const [eventsRes, pendingRes] = await Promise.allSettled([
        fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`),
        fetch(`/api/calendar/pending?timeMin=${timeMin}&timeMax=${timeMax}`),
      ]);

      // Handle calendar events
      if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
        const data = await eventsRes.value.json();
        if (data.warnings?.length > 0) {
          setWarnings(data.warnings);
        }
        const combined: CalendarEvent[] = [
          ...(data.personal || []).map((e: CalendarEvent) => ({
            ...e,
            calendarType: "personal" as const,
          })),
          ...(data.work || []).map((e: CalendarEvent) => ({
            ...e,
            calendarType: "work" as const,
          })),
        ];
        setEvents(combined.filter((e) => e.start?.dateTime && e.end?.dateTime));
      } else if (eventsRes.status === "fulfilled") {
        const data = await eventsRes.value.json();
        setError(data.error || "Failed to load calendar");
      } else {
        setError("Failed to load calendar events");
      }

      // Handle pending blocks
      if (pendingRes.status === "fulfilled" && pendingRes.value.ok) {
        const data = await pendingRes.value.json();
        setPendingBlocks(data.pendingBlocks || []);
      } else {
        setPendingBlocks([]);
      }
    } catch {
      setError("Failed to load calendar events");
    } finally {
      setIsLoading(false);
    }
  }, [weekStart.toISOString(), weekEnd.toISOString()]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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

  async function handleDeleteEvent(eventId: string, calendarType: string) {
    try {
      const response = await fetch(
        `/api/calendar/events/${eventId}?calendarType=${calendarType}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== eventId));
      }
    } catch {
      // Delete failed silently
    }
  }

  async function handleApproveBlock(blockId: string) {
    try {
      const response = await fetch("/api/calendar/events/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockIds: [blockId] }),
      });
      if (response.ok) {
        setPendingBlocks((prev) => prev.filter((b) => b.id !== blockId));
        // Re-fetch to show the new event
        fetchAll();
      }
    } catch {
      // Approve failed silently
    }
  }

  async function handleRejectBlock(blockId: string) {
    try {
      const response = await fetch("/api/calendar/events/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockIds: [blockId] }),
      });
      if (response.ok) {
        setPendingBlocks((prev) => prev.filter((b) => b.id !== blockId));
      }
    } catch {
      // Reject failed silently
    }
  }

  const today = new Date();
  const isCurrentWeek = today >= weekStart && today < weekEnd;
  const pendingCount = pendingBlocks.length;

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
            {formatDate(weekStart)} —{" "}
            {formatDate(new Date(weekEnd.getTime() - 1))}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer text-sm px-2 py-1"
          >
            &rarr;
          </button>
        </div>

        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="text-xs text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
          <button
            onClick={fetchAll}
            className="text-xs text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && !error && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-gray-500">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="px-4 py-8 text-center">
          <p className="text-gray-400 text-sm">{error}</p>
          <button
            onClick={fetchAll}
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
              <div className="h-10 border-b border-gray-100" />
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div key={i} className="relative" style={{ height: HOUR_HEIGHT }}>
                  <span className="absolute -top-2.5 right-2 text-xs text-gray-300">
                    {((START_HOUR + i - 1) % 12) + 1}
                    {START_HOUR + i < 12 ? "a" : "p"}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DAYS.map((day, dayIndex) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + dayIndex);
              const isToday = dayDate.toDateString() === today.toDateString();

              // Filter events for this day
              const dayEvents = events.filter((event) => {
                if (!event.start?.dateTime) return false;
                return getDayIndex(event.start.dateTime, weekStart) === dayIndex;
              });

              // Filter pending blocks for this day
              const dayPending = pendingBlocks.filter((block) => {
                return getDayIndex(block.start_time, weekStart) === dayIndex;
              });

              return (
                <div
                  key={day}
                  className="flex-1 min-w-[90px] border-l border-gray-50"
                >
                  {/* Day header */}
                  <div
                    className={`h-10 flex items-center justify-center border-b border-gray-100 text-xs ${
                      isToday
                        ? "text-gray-900 font-semibold"
                        : "text-gray-400"
                    }`}
                  >
                    {day} {dayDate.getDate()}
                  </div>

                  {/* Hour grid + events + pending blocks */}
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

                    {/* Real Google Calendar events */}
                    {dayEvents.map((event) => {
                      const start = new Date(event.start.dateTime!);
                      const end = new Date(event.end.dateTime!);
                      const startHours =
                        start.getHours() + start.getMinutes() / 60;
                      const endHours =
                        end.getHours() + end.getMinutes() / 60;

                      const clampedStart = Math.max(startHours, START_HOUR);
                      const clampedEnd = Math.min(endHours, END_HOUR);
                      if (clampedEnd <= clampedStart) return null;

                      const top =
                        (clampedStart - START_HOUR) * HOUR_HEIGHT;
                      const height =
                        (clampedEnd - clampedStart) * HOUR_HEIGHT;

                      const isAppEvent =
                        event.extendedProperties?.private
                          ?.firstMateManaged === "true";

                      return (
                        <div
                          key={event.id}
                          className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden group/event ${
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
                            {isAppEvent && (
                              <button
                                onClick={() =>
                                  handleDeleteEvent(
                                    event.id,
                                    event.calendarType
                                  )
                                }
                                className={`opacity-0 group-hover/event:opacity-100 transition-opacity cursor-pointer flex-none text-[10px] leading-none mt-0.5 ${
                                  event.calendarType === "work"
                                    ? "text-white/50 hover:text-white"
                                    : "text-gray-400 hover:text-gray-900"
                                }`}
                                title="Delete event"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Pending blocks (awaiting approval) */}
                    {dayPending.map((block) => {
                      const start = new Date(block.start_time);
                      const end = new Date(block.end_time);
                      const startHours =
                        start.getHours() + start.getMinutes() / 60;
                      const endHours =
                        end.getHours() + end.getMinutes() / 60;

                      const clampedStart = Math.max(startHours, START_HOUR);
                      const clampedEnd = Math.min(endHours, END_HOUR);
                      if (clampedEnd <= clampedStart) return null;

                      const top =
                        (clampedStart - START_HOUR) * HOUR_HEIGHT;
                      const height =
                        (clampedEnd - clampedStart) * HOUR_HEIGHT;

                      return (
                        <div
                          key={`pending-${block.id}`}
                          className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden border-2 border-dashed border-gray-400 bg-gray-50"
                          style={{ top, height: Math.max(height, 32) }}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-medium text-gray-700 truncate leading-tight">
                                {block.goal_title}
                              </p>
                              <p className="text-[9px] text-gray-400 leading-tight">
                                {formatTime(start)}–{formatTime(end)} ·
                                Pending
                              </p>
                            </div>
                            {/* Approve / Reject buttons */}
                            <div className="flex gap-1 mt-0.5">
                              <button
                                onClick={() => handleApproveBlock(block.id)}
                                className="text-[10px] text-gray-900 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer font-medium"
                                title="Approve"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => handleRejectBlock(block.id)}
                                className="text-[10px] text-gray-400 hover:text-gray-900 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer"
                                title="Reject"
                              >
                                ×
                              </button>
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
      {!isLoading &&
        !error &&
        events.length === 0 &&
        pendingBlocks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400 text-sm">No events this week</p>
          </div>
        )}
    </div>
  );
}
