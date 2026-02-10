/**
 * Calendar View
 *
 * Displays real Google Calendar events (work + personal combined)
 * plus pending blocks awaiting approval, in a weekly grid.
 * Supports week navigation, event deletion, block approve/reject/modify,
 * and scrolls from 6am to midnight.
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

const START_HOUR = 6;
const END_HOUR = 24;
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

function formatTimeFromHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const period = h >= 12 ? "pm" : "am";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")}${period}`;
}

function getDayIndex(dateStr: string, weekStart: Date): number {
  const date = new Date(dateStr);
  const diff = Math.floor(
    (date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

/** Deduplicate events that appear in both work and personal calendars */
function deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Map<string, CalendarEvent>();
  for (const event of events) {
    // Use a composite key: summary + start time
    const key = `${event.summary || ""}|${event.start?.dateTime || event.start?.date || ""}`;
    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }
  return Array.from(seen.values());
}

export function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pendingBlocks, setPendingBlocks] = useState<PendingBlock[]>([]);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Stable string keys for useCallback deps
  const weekStartISO = weekStart.toISOString();
  const weekEndISO = weekEnd.toISOString();

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setWarnings([]);
    try {
      // Fetch calendar events and pending blocks in parallel
      const [eventsRes, pendingRes] = await Promise.allSettled([
        fetch(`/api/calendar/events?timeMin=${weekStartISO}&timeMax=${weekEndISO}`),
        fetch(`/api/calendar/pending?timeMin=${weekStartISO}&timeMax=${weekEndISO}`),
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
        const timed = combined.filter((e) => e.start?.dateTime && e.end?.dateTime);
        setEvents(deduplicateEvents(timed));
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
  }, [weekStartISO, weekEndISO]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-scroll to current time on first load
  useEffect(() => {
    if (!isLoading && scrollRef.current && !hasScrolled.current) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      // Scroll so current time is about 1/3 from the top
      const scrollTarget = Math.max(0, (currentHour - START_HOUR - 2) * HOUR_HEIGHT);
      scrollRef.current.scrollTop = scrollTarget;
      hasScrolled.current = true;
    }
  }, [isLoading]);

  function navigateWeek(direction: -1 | 1) {
    hasScrolled.current = false;
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + direction * 7);
      return next;
    });
  }

  function goToToday() {
    hasScrolled.current = false;
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
      // If editing this block, include modifications
      const modifications =
        editingBlock === blockId && editStart && editEnd
          ? [{ blockId, newStart: editStart, newEnd: editEnd }]
          : undefined;

      const response = await fetch("/api/calendar/events/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockIds: [blockId], modifications }),
      });
      if (response.ok) {
        setPendingBlocks((prev) => prev.filter((b) => b.id !== blockId));
        setEditingBlock(null);
        setEditStart("");
        setEditEnd("");
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
        setEditingBlock(null);
      }
    } catch {
      // Reject failed silently
    }
  }

  function startEditingBlock(block: PendingBlock) {
    setEditingBlock(block.id);
    // Pre-fill with current times in datetime-local format
    setEditStart(block.start_time.slice(0, 16));
    setEditEnd(block.end_time.slice(0, 16));
  }

  const today = new Date();
  const isCurrentWeek = today >= weekStart && today < weekEnd;
  const pendingCount = pendingBlocks.length;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-none">
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
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex-none">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-gray-500">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="px-4 py-8 text-center flex-none">
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
        <div className="px-4 py-12 text-center flex-none">
          <p className="text-gray-400 text-sm">Loading calendar...</p>
        </div>
      )}

      {/* Calendar grid — scrollable */}
      {!isLoading && !error && (
        <>
          {/* Sticky day headers */}
          <div className="flex min-w-[700px] border-b border-gray-100 flex-none">
            <div className="w-14 flex-none" />
            {DAYS.map((day, dayIndex) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + dayIndex);
              const isToday = dayDate.toDateString() === today.toDateString();
              return (
                <div
                  key={day}
                  className={`flex-1 min-w-[90px] h-10 flex items-center justify-center border-l border-gray-50 text-xs ${
                    isToday
                      ? "text-gray-900 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  {day} {dayDate.getDate()}
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div className="flex min-w-[700px]">
              {/* Time labels column */}
              <div className="w-14 flex-none">
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
                  const hour = START_HOUR + i;
                  return (
                    <div key={i} className="relative" style={{ height: HOUR_HEIGHT }}>
                      <span className="absolute top-[-7px] right-2 text-[10px] text-gray-300">
                        {hour === 0 ? "12a" : hour === 12 ? "12p" : hour > 12 ? `${hour - 12}p` : `${hour}a`}
                      </span>
                    </div>
                  );
                })}
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

                      {/* Current time indicator */}
                      {isToday && (() => {
                        const nowHour = today.getHours() + today.getMinutes() / 60;
                        if (nowHour >= START_HOUR && nowHour <= END_HOUR) {
                          const top = (nowHour - START_HOUR) * HOUR_HEIGHT;
                          return (
                            <div
                              className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none"
                              style={{ top }}
                            >
                              <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-400" />
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Real Google Calendar events */}
                      {dayEvents.map((event) => {
                        const start = new Date(event.start.dateTime!);
                        const end = new Date(event.end.dateTime!);
                        const startHours =
                          start.getHours() + start.getMinutes() / 60;
                        const endHours =
                          end.getHours() + end.getMinutes() / 60;

                        // Handle midnight-crossing events
                        const effectiveEnd = endHours === 0 ? 24 : endHours;
                        const clampedStart = Math.max(startHours, START_HOUR);
                        const clampedEnd = Math.min(effectiveEnd, END_HOUR);
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
                            className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-hidden group/event z-10 ${
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

                        const effectiveEnd = endHours === 0 ? 24 : endHours;
                        const clampedStart = Math.max(startHours, START_HOUR);
                        const clampedEnd = Math.min(effectiveEnd, END_HOUR);
                        if (clampedEnd <= clampedStart) return null;

                        const top =
                          (clampedStart - START_HOUR) * HOUR_HEIGHT;
                        const height =
                          (clampedEnd - clampedStart) * HOUR_HEIGHT;
                        const isEditing = editingBlock === block.id;

                        return (
                          <div
                            key={`pending-${block.id}`}
                            className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 overflow-visible border-2 border-dashed border-amber-400 bg-amber-50 z-10"
                            style={{ top, height: Math.max(height, isEditing ? 80 : 32) }}
                          >
                            <div className="flex flex-col h-full">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-medium text-gray-700 truncate leading-tight">
                                  {block.goal_title}
                                </p>
                                <p className="text-[9px] text-gray-400 leading-tight">
                                  {formatTime(start)}–{formatTime(end)} · Pending
                                </p>
                              </div>

                              {/* Edit form */}
                              {isEditing && (
                                <div className="mt-1 space-y-1 bg-white rounded p-1 border border-gray-200 shadow-sm">
                                  <input
                                    type="datetime-local"
                                    value={editStart}
                                    onChange={(e) => setEditStart(e.target.value)}
                                    className="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5"
                                  />
                                  <input
                                    type="datetime-local"
                                    value={editEnd}
                                    onChange={(e) => setEditEnd(e.target.value)}
                                    className="w-full text-[10px] border border-gray-200 rounded px-1 py-0.5"
                                  />
                                </div>
                              )}

                              {/* Approve / Edit / Reject buttons */}
                              <div className="flex gap-1 mt-0.5">
                                <button
                                  onClick={() => handleApproveBlock(block.id)}
                                  className="text-[10px] text-green-700 hover:bg-green-100 px-1.5 py-0.5 rounded cursor-pointer font-medium"
                                  title={isEditing ? "Approve with changes" : "Approve"}
                                >
                                  ✓
                                </button>
                                {!isEditing ? (
                                  <button
                                    onClick={() => startEditingBlock(block)}
                                    className="text-[10px] text-blue-600 hover:bg-blue-100 px-1.5 py-0.5 rounded cursor-pointer"
                                    title="Edit time"
                                  >
                                    ✎
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingBlock(null);
                                      setEditStart("");
                                      setEditEnd("");
                                    }}
                                    className="text-[10px] text-gray-400 hover:bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer"
                                    title="Cancel edit"
                                  >
                                    ↩
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRejectBlock(block.id)}
                                  className="text-[10px] text-red-400 hover:text-red-700 hover:bg-red-100 px-1.5 py-0.5 rounded cursor-pointer"
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
        </>
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
