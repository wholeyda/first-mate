/**
 * Week View Component
 *
 * Displays a weekly calendar with proposed time blocks.
 * Supports:
 * - Visual display of blocks colored by goal
 * - Drag-and-drop to move blocks
 * - Approve button to write blocks to Google Calendar
 * - Redo button to regenerate the schedule
 */

"use client";

import { useState, useRef, useCallback } from "react";
import { ProposedBlock } from "@/lib/scheduler";

interface WeekViewProps {
  blocks: ProposedBlock[];
  weekStart: string;
  onApprove: () => void;
  onRedo: () => void;
  onBlocksChange: (blocks: ProposedBlock[]) => void;
  isApproving: boolean;
}

// Hours displayed on the calendar (8am - 9pm)
const START_HOUR = 8;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 60; // pixels per hour

// Day labels
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Color palette for different goals
const BLOCK_COLORS = [
  { bg: "bg-[#1e4a5f]", border: "border-[#2d6a8a]", text: "text-[#8ec8e8]" },
  { bg: "bg-[#4a3a1e]", border: "border-[#6a5a2d]", text: "text-[#e8d08e]" },
  { bg: "bg-[#1e4a3a]", border: "border-[#2d6a5a]", text: "text-[#8ee8c8]" },
  { bg: "bg-[#4a1e3a]", border: "border-[#6a2d5a]", text: "text-[#e88ec8]" },
  { bg: "bg-[#3a1e4a]", border: "border-[#5a2d6a]", text: "text-[#c88ee8]" },
  { bg: "bg-[#4a3a2e]", border: "border-[#6a5a3d]", text: "text-[#e8c89e]" },
];

export function WeekView({
  blocks,
  weekStart,
  onApprove,
  onRedo,
  onBlocksChange,
  isApproving,
}: WeekViewProps) {
  const [dragState, setDragState] = useState<{
    blockIndex: number;
    startY: number;
    originalStart: string;
    originalEnd: string;
  } | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // Build a color map: goal_id -> color index
  const goalColorMap = new Map<string, number>();
  let colorIndex = 0;
  blocks.forEach((block) => {
    if (!goalColorMap.has(block.goal_id)) {
      goalColorMap.set(block.goal_id, colorIndex % BLOCK_COLORS.length);
      colorIndex++;
    }
  });

  // Parse week start date
  const weekStartDate = new Date(weekStart);

  // Get day index (0 = Monday) from a date
  function getDayIndex(dateStr: string): number {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to index 6
  }

  // Get vertical position for a time
  function getTopPosition(dateStr: string): number {
    const date = new Date(dateStr);
    const hours = date.getHours() + date.getMinutes() / 60;
    return (hours - START_HOUR) * HOUR_HEIGHT;
  }

  // Get block height from duration
  function getBlockHeight(startStr: string, endStr: string): number {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const durationHours =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return durationHours * HOUR_HEIGHT;
  }

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent, blockIndex: number) => {
      e.preventDefault();
      const block = blocks[blockIndex];
      setDragState({
        blockIndex,
        startY: e.clientY,
        originalStart: block.start_time,
        originalEnd: block.end_time,
      });
    },
    [blocks]
  );

  // Handle drag move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;

      const deltaY = e.clientY - dragState.startY;
      // Snap to 15-minute increments
      const deltaMinutes = Math.round(deltaY / (HOUR_HEIGHT / 4)) * 15;
      const deltaMs = deltaMinutes * 60 * 1000;

      const newStart = new Date(
        new Date(dragState.originalStart).getTime() + deltaMs
      );
      const newEnd = new Date(
        new Date(dragState.originalEnd).getTime() + deltaMs
      );

      // Don't allow dragging outside calendar bounds
      if (newStart.getHours() < START_HOUR || newEnd.getHours() > END_HOUR) {
        return;
      }

      const updated = [...blocks];
      updated[dragState.blockIndex] = {
        ...updated[dragState.blockIndex],
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      };
      onBlocksChange(updated);
    },
    [dragState, blocks, onBlocksChange]
  );

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  if (blocks.length === 0) {
    return (
      <div className="text-center text-[#5a7a9a] py-12">
        <p className="text-lg mb-2">No schedule generated yet.</p>
        <p className="text-sm">
          Add some goals in the chat, then generate your schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Action buttons */}
      <div className="flex gap-3 p-4 border-b border-[#1e3a5f]">
        <button
          onClick={onApprove}
          disabled={isApproving}
          className="bg-[#c9a84c] hover:bg-[#b8973d] disabled:bg-[#5a7a9a] text-[#0a1628] font-semibold px-6 py-2 rounded-xl transition-colors text-sm cursor-pointer"
        >
          {isApproving ? "Approving..." : "✓ Approve & Sync to Calendar"}
        </button>
        <button
          onClick={onRedo}
          disabled={isApproving}
          className="bg-[#1e3a5f] hover:bg-[#2d4a6f] text-[#d4c5a0] font-medium px-6 py-2 rounded-xl transition-colors text-sm cursor-pointer"
        >
          ↻ Redo Schedule
        </button>
      </div>

      {/* Calendar grid */}
      <div
        ref={calendarRef}
        className="flex-1 overflow-auto"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex min-w-[700px]">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r border-[#1e3a5f]">
            <div className="h-8" /> {/* Header spacer */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-[#5a7a9a] text-xs text-right pr-2"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour > 12 ? `${hour - 12}pm` : hour === 12 ? "12pm" : `${hour}am`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day, dayIndex) => (
            <div
              key={day}
              className="flex-1 border-r border-[#1e3a5f] last:border-r-0 relative"
            >
              {/* Day header */}
              <div className="h-8 text-center text-[#d4c5a0] text-sm font-medium border-b border-[#1e3a5f] flex items-center justify-center">
                {day}{" "}
                <span className="text-[#5a7a9a] ml-1 text-xs">
                  {new Date(
                    weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000
                  ).getDate()}
                </span>
              </div>

              {/* Hour grid lines */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-[#1e3a5f]/30"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}

              {/* Blocks for this day */}
              {blocks
                .map((block, index) => ({ block, index }))
                .filter(({ block }) => getDayIndex(block.start_time) === dayIndex)
                .map(({ block, index }) => {
                  const color =
                    BLOCK_COLORS[goalColorMap.get(block.goal_id) || 0];
                  const top = getTopPosition(block.start_time);
                  const height = getBlockHeight(
                    block.start_time,
                    block.end_time
                  );

                  return (
                    <div
                      key={index}
                      className={`absolute left-1 right-1 rounded-lg ${color.bg} ${color.border} border px-2 py-1 cursor-grab active:cursor-grabbing overflow-hidden`}
                      style={{
                        top: top + 32, // +32 for header
                        height: Math.max(height, 20),
                      }}
                      onMouseDown={(e) => handleDragStart(e, index)}
                    >
                      <p
                        className={`${color.text} text-xs font-medium truncate`}
                      >
                        {block.goal_title}
                      </p>
                      {height > 30 && (
                        <p className="text-[#5a7a9a] text-xs">
                          {new Date(block.start_time).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {" - "}
                          {new Date(block.end_time).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
