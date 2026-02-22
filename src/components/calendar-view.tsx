/**
 * Calendar View
 *
 * Displays real Google Calendar events (work + personal combined)
 * plus pending blocks awaiting approval, in a weekly grid.
 * Supports week navigation, event deletion, block approve/reject/modify,
 * and scrolls from 6am to midnight.
 *
 * Handles overlapping events by laying them out side by side.
 * Displays times in PST (America/Los_Angeles).
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

// Layout item with column position for overlap handling
interface LayoutItem {
  item: CalendarEvent | PendingBlock;
  type: "event" | "pending";
  startHours: number;
  endHours: number;
  column: number;
  totalColumns: number;
}

const START_HOUR = 6;
const END_HOUR = 24;
const HOUR_HEIGHT = 80;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Force PST display
const PST_TZ = "America/Los_Angeles";

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
      timeZone: PST_TZ,
    })
    .replace(" ", "")
    .toLowerCase();
}

/** Get hours in PST from a date string */
function getHoursInPST(dateStr: string): number {
  const date = new Date(dateStr);
  // Get PST time components
  const pstStr = date.toLocaleString("en-US", { timeZone: PST_TZ, hour12: false });
  const parts = pstStr.split(", ")[1]?.split(":") || pstStr.split(" ")[1]?.split(":") || [];
  const h = parseInt(parts[0] || "0", 10);
  const m = parseInt(parts[1] || "0", 10);
  return h + m / 60;
}

/** Get the day of week (0=Mon, 6=Sun) in PST */
function getDayIndexPST(dateStr: string, weekStart: Date): number {
  const date = new Date(dateStr);
  // Get the date in PST
  const pstDate = new Date(date.toLocaleString("en-US", { timeZone: PST_TZ }));
  const weekStartPST = new Date(weekStart.toLocaleString("en-US", { timeZone: PST_TZ }));
  weekStartPST.setHours(0, 0, 0, 0);
  pstDate.setHours(0, 0, 0, 0);
  const diff = Math.floor((pstDate.getTime() - weekStartPST.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** Deduplicate events that appear in both work and personal calendars */
function deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Map<string, CalendarEvent>();
  for (const event of events) {
    const key = `${event.summary || ""}|${event.start?.dateTime || event.start?.date || ""}`;
    if (!seen.has(key)) {
      seen.set(key, event);
    }
  }
  return Array.from(seen.values());
}

/** Calculate layout columns for overlapping items */
function layoutOverlapping(items: Array<{ startHours: number; endHours: number; item: CalendarEvent | PendingBlock; type: "event" | "pending" }>): LayoutItem[] {
  if (items.length === 0) return [];

  // Sort by start time
  const sorted = [...items].sort((a, b) => a.startHours - b.startHours);

  // Assign columns using greedy algorithm
  const columns: Array<{ endHours: number }[]> = [];

  return sorted.map((item) => {
    // Find the first column where this item fits (no overlap)
    let col = -1;
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1];
      if (lastInCol.endHours <= item.startHours) {
        col = c;
        break;
      }
    }

    if (col === -1) {
      col = columns.length;
      columns.push([]);
    }

    columns[col].push({ endHours: item.endHours });

    return {
      ...item,
      column: col,
      totalColumns: columns.length, // Will be updated in post-pass
    };
  }).map((item) => ({
    ...item,
    totalColumns: columns.length,
  }));
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
      const [eventsRes, pendingRes] = await Promise.allSettled([
        fetch(`/api/calendar/events?timeMin=${weekStartISO}&timeMax=${weekEndISO}`),
        fetch(`/api/calendar/pending?timeMin=${weekStartISO}&timeMax=${weekEndISO}`),
      ]);

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
      const currentHour = getHoursInPST(now.toISOString());
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
    setEditStart(block.start_time.slice(0, 16));
    setEditEnd(block.end_time.slice(0, 16));
  }

  const today = new Date();
  const isCurrentWeek = today >= weekStart && today < weekEnd;
  const pendingCount = pendingBlocks.length;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateWeek(-1)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer text-sm px-2 py-1"
          >
            &larr;
          </button>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[160px] text-center">
            {formatDate(weekStart)} &mdash;{" "}
            {formatDate(new Date(weekEnd.getTime() - 1))}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer text-sm px-2 py-1"
          >
            &rarr;
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">PST</span>
          {pendingCount > 0 && (
            <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full font-medium">
              {pendingCount} pending
            </span>
          )}
          {!isCurrentWeek && (
            <button
              onClick={goToToday}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
          <button
            onClick={fetchAll}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && !error && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-none">
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
            className="mt-2 text-sm text-gray-900 dark:text-gray-100 hover:underline cursor-pointer"
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

      {/* Calendar grid */}
      {!isLoading && !error && (
        <>
          {/* Sticky day headers */}
          <div className="flex min-w-[900px] border-b border-gray-100 dark:border-gray-800 flex-none">
            <div className="w-16 flex-none" />
            {DAYS.map((day, dayIndex) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + dayIndex);
              const isToday = dayDate.toDateString() === today.toDateString();
              return (
                <div
                  key={day}
                  className={`flex-1 min-w-[120px] h-11 flex items-center justify-center border-l border-gray-50 dark:border-gray-800/50 text-xs ${
                    isToday
                      ? "text-gray-900 dark:text-gray-100 font-semibold bg-blue-50/50 dark:bg-blue-900/10"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {day} {dayDate.getDate()}
                </div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div className="flex-1 overflow-auto" ref={scrollRef}>
            <div className="flex min-w-[900px]">
              {/* Time labels column */}
              <div className="w-16 flex-none">
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => {
                  const hour = START_HOUR + i;
                  return (
                    <div key={i} className="relative" style={{ height: HOUR_HEIGHT }}>
                      <span className="absolute top-[-7px] right-2 text-[11px] text-gray-400 dark:text-gray-500">
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

                // Filter events for this day (using PST timezone)
                const dayEvents = events.filter((event) => {
                  if (!event.start?.dateTime) return false;
                  return getDayIndexPST(event.start.dateTime, weekStart) === dayIndex;
                });

                // Filter pending blocks for this day
                const dayPending = pendingBlocks.filter((block) => {
                  return getDayIndexPST(block.start_time, weekStart) === dayIndex;
                });

                // Combine all items for overlap calculation
                const allItems: Array<{ startHours: number; endHours: number; item: CalendarEvent | PendingBlock; type: "event" | "pending" }> = [];

                for (const event of dayEvents) {
                  const startHours = getHoursInPST(event.start.dateTime!);
                  const endHours = getHoursInPST(event.end!.dateTime!);
                  const effectiveEnd = endHours === 0 ? 24 : endHours;
                  allItems.push({
                    startHours: Math.max(startHours, START_HOUR),
                    endHours: Math.min(effectiveEnd, END_HOUR),
                    item: event,
                    type: "event",
                  });
                }

                for (const block of dayPending) {
                  const startHours = getHoursInPST(block.start_time);
                  const endHours = getHoursInPST(block.end_time);
                  const effectiveEnd = endHours === 0 ? 24 : endHours;
                  allItems.push({
                    startHours: Math.max(startHours, START_HOUR),
                    endHours: Math.min(effectiveEnd, END_HOUR),
                    item: block,
                    type: "pending",
                  });
                }

                // Layout overlapping items
                const layoutItems = layoutOverlapping(allItems);

                return (
                  <div
                    key={day}
                    className={`flex-1 min-w-[120px] border-l border-gray-50 dark:border-gray-800/50 ${
                      isToday ? "bg-blue-50/20 dark:bg-blue-900/5" : ""
                    }`}
                  >
                    <div className="relative">
                      {/* Hour lines */}
                      {Array.from(
                        { length: END_HOUR - START_HOUR },
                        (_, i) => (
                          <div
                            key={i}
                            className="border-b border-gray-50 dark:border-gray-800/50"
                            style={{ height: HOUR_HEIGHT }}
                          />
                        )
                      )}

                      {/* Current time indicator */}
                      {isToday && (() => {
                        const nowHour = getHoursInPST(new Date().toISOString());
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

                      {/* Laid-out items */}
                      {layoutItems.map((layoutItem) => {
                        const { startHours, endHours, column, totalColumns, type, item } = layoutItem;

                        if (endHours <= startHours) return null;

                        const top = (startHours - START_HOUR) * HOUR_HEIGHT;
                        const height = (endHours - startHours) * HOUR_HEIGHT;

                        // Calculate width and left based on columns
                        const colWidth = 100 / totalColumns;
                        const left = `${column * colWidth}%`;
                        const width = `${colWidth - 1}%`;

                        if (type === "event") {
                          const event = item as CalendarEvent;
                          const isAppEvent =
                            event.extendedProperties?.private
                              ?.firstMateManaged === "true";

                          return (
                            <div
                              key={event.id}
                              className={`absolute rounded-md px-2 py-1 overflow-hidden group/event z-10 ${
                                event.calendarType === "work"
                                  ? "bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900"
                                  : "bg-blue-500 dark:bg-blue-600 text-white"
                              }`}
                              style={{
                                top,
                                height: Math.max(height, 24),
                                left,
                                width,
                              }}
                            >
                              <div className="flex items-start gap-1">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate leading-snug">
                                    {event.summary || "(No title)"}
                                  </p>
                                  {height > 32 && (
                                    <p className="text-[11px] leading-snug opacity-75 mt-0.5">
                                      {formatTime(new Date(event.start.dateTime!))}&ndash;{formatTime(new Date(event.end!.dateTime!))}
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
                                    className="opacity-0 group-hover/event:opacity-100 transition-opacity cursor-pointer flex-none text-[10px] leading-none mt-0.5 text-white/50 hover:text-white"
                                    title="Delete event"
                                  >
                                    x
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        } else {
                          // Pending block
                          const block = item as PendingBlock;
                          const isEditing = editingBlock === block.id;

                          return (
                            <div
                              key={`pending-${block.id}`}
                              className="absolute rounded-md px-2 py-1 overflow-visible border-2 border-dashed border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20 z-10"
                              style={{
                                top,
                                height: Math.max(height, isEditing ? 90 : 36),
                                left,
                                width,
                              }}
                            >
                              <div className="flex flex-col h-full">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate leading-snug">
                                    {block.goal_title}
                                  </p>
                                  <p className="text-[11px] text-gray-400 leading-snug mt-0.5">
                                    {formatTime(new Date(block.start_time))}&ndash;{formatTime(new Date(block.end_time))} &middot; Pending
                                  </p>
                                </div>

                                {/* Edit form */}
                                {isEditing && (
                                  <div className="mt-1 space-y-1 bg-white dark:bg-gray-800 rounded p-1 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <input
                                      type="datetime-local"
                                      value={editStart}
                                      onChange={(e) => setEditStart(e.target.value)}
                                      className="w-full text-[10px] border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded px-1 py-0.5"
                                    />
                                    <input
                                      type="datetime-local"
                                      value={editEnd}
                                      onChange={(e) => setEditEnd(e.target.value)}
                                      className="w-full text-[10px] border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 rounded px-1 py-0.5"
                                    />
                                  </div>
                                )}

                                {/* Approve / Edit / Reject buttons */}
                                <div className="flex gap-1 mt-0.5">
                                  <button
                                    onClick={() => handleApproveBlock(block.id)}
                                    className="text-[10px] text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 px-1.5 py-0.5 rounded cursor-pointer font-medium"
                                    title={isEditing ? "Approve with changes" : "Approve"}
                                  >
                                    &#10003;
                                  </button>
                                  {!isEditing ? (
                                    <button
                                      onClick={() => startEditingBlock(block)}
                                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 px-1.5 py-0.5 rounded cursor-pointer"
                                      title="Edit time"
                                    >
                                      &#9998;
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingBlock(null);
                                        setEditStart("");
                                        setEditEnd("");
                                      }}
                                      className="text-[10px] text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 px-1.5 py-0.5 rounded cursor-pointer"
                                      title="Cancel edit"
                                    >
                                      &#8617;
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleRejectBlock(block.id)}
                                    className="text-[10px] text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 px-1.5 py-0.5 rounded cursor-pointer"
                                    title="Reject"
                                  >
                                    x
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }
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
            <p className="text-gray-400 dark:text-gray-500 text-sm">No events this week</p>
          </div>
        )}
    </div>
  );
}
