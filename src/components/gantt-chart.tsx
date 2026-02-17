/**
 * Gantt Chart
 *
 * Interactive SVG-based Gantt chart for visualizing sub-goal timelines.
 * Shows bars per sub-goal, dependency arrows, a today marker.
 * Supports drag-to-resize and drag-to-move bars when editable.
 * Dark mode support via CSS classes.
 */

"use client";

import { useMemo, useState, useRef, useCallback } from "react";

interface SubGoalItem {
  id?: string;
  title: string;
  estimated_hours: number;
  start_date: string | null;
  end_date: string | null;
  status: "pending" | "in_progress" | "completed";
  sort_order: number;
  depends_on_indices: number[];
}

interface GanttChartProps {
  subGoals: SubGoalItem[];
  parentDueDate: string;
  onSubGoalClick?: (index: number) => void;
  selectedIndex?: number;
  onDateChange?: (index: number, newStart: string, newEnd: string) => void;
  editable?: boolean;
}

// Layout constants
const ROW_HEIGHT = 40;
const LABEL_WIDTH = 150;
const TOP_HEADER = 36;
const PADDING_RIGHT = 20;
const BAR_HEIGHT = 24;
const BAR_Y_OFFSET = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const HANDLE_WIDTH = 6;

function parseDate(d: string): Date {
  return new Date(d + "T00:00:00");
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const STATUS_COLORS: Record<string, { fill: string; stroke: string }> = {
  pending: { fill: "#94a3b8", stroke: "#64748b" },
  in_progress: { fill: "#60a5fa", stroke: "#3b82f6" },
  completed: { fill: "#34d399", stroke: "#10b981" },
};

export function GanttChart({
  subGoals,
  parentDueDate,
  onSubGoalClick,
  selectedIndex,
  onDateChange,
  editable = false,
}: GanttChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    idx: number;
    type: "move" | "resize-start" | "resize-end";
    startX: number;
    origStart: Date;
    origEnd: Date;
  } | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { chartWidth, totalDays, startDate, endDate, timeMarkers } =
    useMemo(() => {
      // Find the date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let earliest = today;
      let latest = parseDate(parentDueDate);

      for (const sg of subGoals) {
        if (sg.start_date) {
          const d = parseDate(sg.start_date);
          if (d < earliest) earliest = d;
        }
        if (sg.end_date) {
          const d = parseDate(sg.end_date);
          if (d > latest) latest = d;
        }
      }

      // Add padding
      const startDate = new Date(earliest);
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(latest);
      endDate.setDate(endDate.getDate() + 2);

      const totalDays = Math.max(daysBetween(startDate, endDate), 7);
      const chartWidth = Math.max(totalDays * 30, 400);

      // Generate time markers
      const markerInterval = totalDays <= 14 ? 1 : totalDays <= 60 ? 7 : 14;
      const timeMarkers: { x: number; label: string }[] = [];
      for (let i = 0; i <= totalDays; i += markerInterval) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        timeMarkers.push({
          x: LABEL_WIDTH + (i / totalDays) * chartWidth,
          label: formatDate(d),
        });
      }

      return { chartWidth, totalDays, startDate, endDate, timeMarkers };
    }, [subGoals, parentDueDate]);

  const svgWidth = LABEL_WIDTH + chartWidth + PADDING_RIGHT;
  const svgHeight = TOP_HEADER + subGoals.length * ROW_HEIGHT + 10;

  // Today marker
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDays = daysBetween(startDate, today);
  const todayX = LABEL_WIDTH + (todayDays / totalDays) * chartWidth;

  // Convert pixel X to date
  const xToDate = useCallback(
    (x: number): Date => {
      const dayOffset = ((x - LABEL_WIDTH) / chartWidth) * totalDays;
      const date = new Date(startDate);
      date.setDate(date.getDate() + Math.round(dayOffset));
      return date;
    },
    [chartWidth, totalDays, startDate]
  );

  // Drag handlers
  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent,
      idx: number,
      type: "move" | "resize-start" | "resize-end"
    ) => {
      if (!editable || !onDateChange) return;
      e.stopPropagation();
      e.preventDefault();

      const sg = subGoals[idx];
      const origStart = sg.start_date ? parseDate(sg.start_date) : startDate;
      const origEnd = sg.end_date ? parseDate(sg.end_date) : endDate;

      setDragging({
        idx,
        type,
        startX: e.clientX,
        origStart,
        origEnd,
      });
    },
    [editable, onDateChange, subGoals, startDate, endDate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !onDateChange) return;

      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgScale = svgWidth / rect.width;
      const deltaX = (e.clientX - dragging.startX) * svgScale;
      const deltaDays = Math.round((deltaX / chartWidth) * totalDays);

      if (deltaDays === 0) return;

      const { idx, type, origStart, origEnd } = dragging;

      let newStart = new Date(origStart);
      let newEnd = new Date(origEnd);

      if (type === "move") {
        newStart.setDate(newStart.getDate() + deltaDays);
        newEnd.setDate(newEnd.getDate() + deltaDays);
      } else if (type === "resize-start") {
        newStart.setDate(newStart.getDate() + deltaDays);
        if (newStart >= newEnd) {
          newStart = new Date(newEnd);
          newStart.setDate(newStart.getDate() - 1);
        }
      } else if (type === "resize-end") {
        newEnd.setDate(newEnd.getDate() + deltaDays);
        if (newEnd <= newStart) {
          newEnd = new Date(newStart);
          newEnd.setDate(newEnd.getDate() + 1);
        }
      }

      onDateChange(idx, formatDateISO(newStart), formatDateISO(newEnd));
    },
    [dragging, onDateChange, chartWidth, totalDays, svgWidth]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Determine dark mode from document
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return (
    <div className="w-full overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950">
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="min-w-full select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header background */}
        <rect
          x="0"
          y="0"
          width={svgWidth}
          height={TOP_HEADER}
          className="fill-gray-50 dark:fill-gray-900"
        />

        {/* Time markers */}
        {timeMarkers.map((marker, i) => (
          <g key={i}>
            <line
              x1={marker.x}
              y1={TOP_HEADER}
              x2={marker.x}
              y2={svgHeight}
              className="stroke-gray-100 dark:stroke-gray-800"
              strokeWidth="1"
            />
            <text
              x={marker.x}
              y={24}
              textAnchor="middle"
              className="fill-gray-400 dark:fill-gray-500"
              fontSize="9"
              fontFamily="system-ui, sans-serif"
            >
              {marker.label}
            </text>
          </g>
        ))}

        {/* Today marker */}
        {todayDays >= 0 && todayDays <= totalDays && (
          <g>
            <line
              x1={todayX}
              y1={TOP_HEADER}
              x2={todayX}
              y2={svgHeight}
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text
              x={todayX}
              y={TOP_HEADER - 2}
              textAnchor="middle"
              fill="#ef4444"
              fontSize="8"
              fontFamily="system-ui, sans-serif"
              fontWeight="bold"
            >
              Today
            </text>
          </g>
        )}

        {/* Row backgrounds and bars */}
        {subGoals.map((sg, idx) => {
          const y = TOP_HEADER + idx * ROW_HEIGHT;
          const isSelected = selectedIndex === idx;
          const isHovered = hoverIdx === idx;
          const isDraggingThis = dragging?.idx === idx;

          // Bar position
          const sgStart = sg.start_date
            ? parseDate(sg.start_date)
            : startDate;
          const sgEnd = sg.end_date ? parseDate(sg.end_date) : endDate;
          const barStartDays = daysBetween(startDate, sgStart);
          const barEndDays = daysBetween(startDate, sgEnd);
          const barX =
            LABEL_WIDTH + (barStartDays / totalDays) * chartWidth;
          const barWidth = Math.max(
            ((barEndDays - barStartDays) / totalDays) * chartWidth,
            12
          );

          const colors = STATUS_COLORS[sg.status] || STATUS_COLORS.pending;

          return (
            <g
              key={idx}
              onClick={() => onSubGoalClick?.(idx)}
              onMouseEnter={() => setHoverIdx(idx)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{ cursor: editable ? "pointer" : "default" }}
            >
              {/* Row background */}
              <rect
                x="0"
                y={y}
                width={svgWidth}
                height={ROW_HEIGHT}
                fill={
                  isSelected
                    ? isDark ? "rgba(59,130,246,0.1)" : "#f0f9ff"
                    : isHovered
                    ? isDark ? "rgba(255,255,255,0.02)" : "#fafafa"
                    : isDark ? (idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)") : (idx % 2 === 0 ? "#fff" : "#fafafa")
                }
              />

              {/* Row divider */}
              <line
                x1="0"
                y1={y + ROW_HEIGHT}
                x2={svgWidth}
                y2={y + ROW_HEIGHT}
                className="stroke-gray-50 dark:stroke-gray-800/50"
                strokeWidth="0.5"
              />

              {/* Row label */}
              <text
                x="12"
                y={y + ROW_HEIGHT / 2 + 4}
                className="fill-gray-700 dark:fill-gray-300"
                fontSize="11"
                fontFamily="system-ui, sans-serif"
              >
                {sg.title.length > 18
                  ? sg.title.slice(0, 17) + "\u2026"
                  : sg.title}
              </text>

              {/* Gantt bar */}
              <rect
                x={barX}
                y={y + BAR_Y_OFFSET}
                width={barWidth}
                height={BAR_HEIGHT}
                rx="6"
                fill={colors.fill}
                stroke={isSelected || isDraggingThis ? colors.stroke : "transparent"}
                strokeWidth={isSelected || isDraggingThis ? 2 : 0}
                opacity={isDraggingThis ? 0.7 : 0.9}
                style={{ cursor: editable ? "grab" : "pointer" }}
                onMouseDown={(e) => handleMouseDown(e, idx, "move")}
              />

              {/* Hours label on bar */}
              {barWidth > 40 && (
                <text
                  x={barX + barWidth / 2}
                  y={y + BAR_Y_OFFSET + BAR_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="9"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="600"
                  style={{ pointerEvents: "none" }}
                >
                  {sg.estimated_hours}h
                </text>
              )}

              {/* Date range tooltip on hover */}
              {barWidth <= 40 && isHovered && (
                <text
                  x={barX + barWidth + 4}
                  y={y + BAR_Y_OFFSET + BAR_HEIGHT / 2 + 3}
                  className="fill-gray-400 dark:fill-gray-500"
                  fontSize="8"
                  fontFamily="system-ui, sans-serif"
                >
                  {sg.estimated_hours}h
                </text>
              )}

              {/* Resize handles (editable mode) */}
              {editable && (isHovered || isDraggingThis) && (
                <>
                  {/* Left resize handle */}
                  <rect
                    x={barX - 1}
                    y={y + BAR_Y_OFFSET}
                    width={HANDLE_WIDTH}
                    height={BAR_HEIGHT}
                    rx="2"
                    fill={colors.stroke}
                    opacity={0.7}
                    style={{ cursor: "ew-resize" }}
                    onMouseDown={(e) => handleMouseDown(e, idx, "resize-start")}
                  />
                  {/* Right resize handle */}
                  <rect
                    x={barX + barWidth - HANDLE_WIDTH + 1}
                    y={y + BAR_Y_OFFSET}
                    width={HANDLE_WIDTH}
                    height={BAR_HEIGHT}
                    rx="2"
                    fill={colors.stroke}
                    opacity={0.7}
                    style={{ cursor: "ew-resize" }}
                    onMouseDown={(e) => handleMouseDown(e, idx, "resize-end")}
                  />
                </>
              )}
            </g>
          );
        })}

        {/* Dependency arrows */}
        {subGoals.map((sg, idx) => {
          if (!sg.depends_on_indices || sg.depends_on_indices.length === 0)
            return null;

          return sg.depends_on_indices.map((depIdx) => {
            const dep = subGoals[depIdx];
            if (!dep) return null;

            // Arrow from end of dep bar to start of current bar
            const depEnd = dep.end_date
              ? parseDate(dep.end_date)
              : endDate;
            const sgStart = sg.start_date
              ? parseDate(sg.start_date)
              : startDate;

            const fromDays = daysBetween(startDate, depEnd);
            const toDays = daysBetween(startDate, sgStart);

            const fromX =
              LABEL_WIDTH + (fromDays / totalDays) * chartWidth;
            const fromY =
              TOP_HEADER + depIdx * ROW_HEIGHT + ROW_HEIGHT / 2;
            const toX =
              LABEL_WIDTH + (toDays / totalDays) * chartWidth;
            const toY =
              TOP_HEADER + idx * ROW_HEIGHT + ROW_HEIGHT / 2;

            // Simple curved arrow
            const midX = (fromX + toX) / 2;

            return (
              <g key={`${depIdx}-${idx}`}>
                <path
                  d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                  fill="none"
                  className="stroke-gray-300 dark:stroke-gray-600"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
                {/* Arrowhead */}
                <polygon
                  points={`${toX},${toY} ${toX - 5},${toY - 3} ${toX - 5},${toY + 3}`}
                  className="fill-gray-300 dark:fill-gray-600"
                />
              </g>
            );
          });
        })}

        {/* Separator line between label and chart area */}
        <line
          x1={LABEL_WIDTH}
          y1="0"
          x2={LABEL_WIDTH}
          y2={svgHeight}
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
