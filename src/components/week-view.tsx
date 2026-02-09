/**
 * Week View Component
 *
 * Minimalist weekly calendar with proposed time blocks.
 * Supports drag-and-drop, approve, and redo.
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

const START_HOUR = 8;
const END_HOUR = 21;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const HOUR_HEIGHT = 60;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Monochrome block colors with subtle differentiation
const BLOCK_COLORS = [
  { bg: "bg-gray-900", text: "text-white" },
  { bg: "bg-gray-700", text: "text-white" },
  { bg: "bg-gray-500", text: "text-white" },
  { bg: "bg-gray-800", text: "text-gray-100" },
  { bg: "bg-gray-600", text: "text-white" },
  { bg: "bg-gray-400", text: "text-gray-900" },
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

  const weekStartDate = new Date(weekStart);

  function getDayIndex(dateStr: string): number {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  }

  function getTopPosition(dateStr: string): number {
    const date = new Date(dateStr);
    const hours = date.getHours() + date.getMinutes() / 60;
    return (hours - START_HOUR) * HOUR_HEIGHT;
  }

  function getBlockHeight(startStr: string, endStr: string): number {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return durationHours * HOUR_HEIGHT;
  }

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

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState) return;

      const deltaY = e.clientY - dragState.startY;
      const deltaMinutes = Math.round(deltaY / (HOUR_HEIGHT / 4)) * 15;
      const deltaMs = deltaMinutes * 60 * 1000;

      const newStart = new Date(new Date(dragState.originalStart).getTime() + deltaMs);
      const newEnd = new Date(new Date(dragState.originalEnd).getTime() + deltaMs);

      if (newStart.getHours() < START_HOUR || newEnd.getHours() > END_HOUR) return;

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

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  if (blocks.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12">
        <p className="text-lg mb-2">No schedule generated yet.</p>
        <p className="text-sm">Add some goals in the chat, then generate your schedule.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Action buttons */}
      <div className="flex gap-3 p-4 border-b border-gray-100">
        <button
          onClick={onApprove}
          disabled={isApproving}
          className="bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 text-white font-medium px-6 py-2 rounded-lg transition-colors text-sm cursor-pointer"
        >
          {isApproving ? "Approving..." : "Approve & Sync"}
        </button>
        <button
          onClick={onRedo}
          disabled={isApproving}
          className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-6 py-2 rounded-lg transition-colors text-sm cursor-pointer"
        >
          Redo
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
          <div className="w-14 flex-shrink-0 border-r border-gray-100">
            <div className="h-8" />
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-gray-400 text-xs text-right pr-2"
                style={{ height: HOUR_HEIGHT }}
              >
                {hour > 12 ? `${hour - 12}p` : hour === 12 ? "12p" : `${hour}a`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day, dayIndex) => (
            <div
              key={day}
              className="flex-1 border-r border-gray-50 last:border-r-0 relative"
            >
              <div className="h-8 text-center text-gray-500 text-sm font-medium border-b border-gray-100 flex items-center justify-center">
                {day}{" "}
                <span className="text-gray-300 ml-1 text-xs">
                  {new Date(weekStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000).getDate()}
                </span>
              </div>

              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-gray-50"
                  style={{ height: HOUR_HEIGHT }}
                />
              ))}

              {blocks
                .map((block, index) => ({ block, index }))
                .filter(({ block }) => getDayIndex(block.start_time) === dayIndex)
                .map(({ block, index }) => {
                  const color = BLOCK_COLORS[goalColorMap.get(block.goal_id) || 0];
                  const top = getTopPosition(block.start_time);
                  const height = getBlockHeight(block.start_time, block.end_time);

                  return (
                    <div
                      key={index}
                      className={`absolute left-1 right-1 rounded-md ${color.bg} px-2 py-1 cursor-grab active:cursor-grabbing overflow-hidden`}
                      style={{
                        top: top + 32,
                        height: Math.max(height, 20),
                      }}
                      onMouseDown={(e) => handleDragStart(e, index)}
                    >
                      <p className={`${color.text} text-xs font-medium truncate`}>
                        {block.goal_title}
                      </p>
                      {height > 30 && (
                        <p className="text-gray-300 text-xs">
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
