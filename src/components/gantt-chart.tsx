/**
 * Gantt Chart
 *
 * SVG-based Gantt chart for visualizing sub-goal timelines.
 * Shows bars per sub-goal, dependency arrows, and a today marker.
 */

"use client";

import { useMemo } from "react";

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
}

// Layout constants
const ROW_HEIGHT = 36;
const LABEL_WIDTH = 140;
const TOP_HEADER = 32;
const PADDING_RIGHT = 20;
const BAR_HEIGHT = 20;
const BAR_Y_OFFSET = (ROW_HEIGHT - BAR_HEIGHT) / 2;

function parseDate(d: string): Date {
  return new Date(d + "T00:00:00");
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#d1d5db",
  in_progress: "#60a5fa",
  completed: "#34d399",
};

export function GanttChart({
  subGoals,
  parentDueDate,
  onSubGoalClick,
  selectedIndex,
}: GanttChartProps) {
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

      // Generate time markers (every ~7 days or based on total)
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

  return (
    <div className="w-full overflow-x-auto border border-gray-100 rounded-xl bg-white">
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="min-w-full"
      >
        {/* Header background */}
        <rect
          x="0"
          y="0"
          width={svgWidth}
          height={TOP_HEADER}
          fill="#f9fafb"
        />

        {/* Time markers */}
        {timeMarkers.map((marker, i) => (
          <g key={i}>
            <line
              x1={marker.x}
              y1={TOP_HEADER}
              x2={marker.x}
              y2={svgHeight}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
            <text
              x={marker.x}
              y={22}
              textAnchor="middle"
              fill="#9ca3af"
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
            8
          );

          return (
            <g
              key={idx}
              onClick={() => onSubGoalClick?.(idx)}
              style={{ cursor: onSubGoalClick ? "pointer" : "default" }}
            >
              {/* Row background */}
              <rect
                x="0"
                y={y}
                width={svgWidth}
                height={ROW_HEIGHT}
                fill={isSelected ? "#f0f9ff" : idx % 2 === 0 ? "#fff" : "#fafafa"}
              />

              {/* Row label */}
              <text
                x="8"
                y={y + ROW_HEIGHT / 2 + 4}
                fill="#374151"
                fontSize="10"
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
                rx="4"
                fill={STATUS_COLORS[sg.status] || STATUS_COLORS.pending}
                opacity={0.85}
              />

              {/* Hours label on bar */}
              {barWidth > 30 && (
                <text
                  x={barX + barWidth / 2}
                  y={y + BAR_Y_OFFSET + BAR_HEIGHT / 2 + 3}
                  textAnchor="middle"
                  fill="white"
                  fontSize="8"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="600"
                >
                  {sg.estimated_hours}h
                </text>
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
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
                {/* Arrowhead */}
                <polygon
                  points={`${toX},${toY} ${toX - 5},${toY - 3} ${toX - 5},${toY + 3}`}
                  fill="#9ca3af"
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
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
