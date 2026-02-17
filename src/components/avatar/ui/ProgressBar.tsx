"use client";

import { CATEGORY_THEMES, TIERS, getTier, getNextTier, type Category } from "@/lib/avatar-state";

interface ProgressBarProps {
  goalCount: number;
  category: Category;
}

/** Progress bar to next tier with tier names */
export function ProgressBar({ goalCount, category }: ProgressBarProps) {
  const theme = CATEGORY_THEMES[category];
  const currentTier = getTier(goalCount);
  const nextTier = getNextTier(goalCount);

  const prevThreshold = currentTier.threshold;
  const nextThreshold = nextTier ? nextTier.threshold : prevThreshold + 10;
  const range = nextThreshold - prevThreshold;
  const progress = range > 0 ? Math.min(((goalCount - prevThreshold) / range) * 100, 100) : 100;
  const isMaxed = !nextTier;

  return (
    <div className="w-full max-w-md">
      {/* Tier labels */}
      <div className="flex justify-between mb-1.5 text-[10px] font-bold tracking-widest uppercase">
        <span style={{ color: theme.colors.primary }}>
          {currentTier.name}
        </span>
        <span style={{ color: "rgba(255,255,255,0.25)" }}>
          {isMaxed ? "MAX TIER" : `${nextTier.name} — ${nextTier.threshold - goalCount} to go`}
        </span>
      </div>

      {/* Bar */}
      <div
        className="relative h-2.5 rounded-full overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: `1px solid rgba(255,255,255,0.04)`,
        }}
      >
        {/* Fill */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(to right, ${theme.colors.primary}, ${theme.colors.secondary})`,
            boxShadow: `0 0 8px ${theme.colors.glow}60`,
          }}
        />

        {/* Tier markers */}
        {TIERS.filter(t => t.threshold > prevThreshold && t.threshold <= nextThreshold).map((t) => {
          const markerPos = range > 0 ? ((t.threshold - prevThreshold) / range) * 100 : 0;
          return (
            <div
              key={t.id}
              className="absolute top-0 bottom-0 w-px"
              style={{
                left: `${markerPos}%`,
                background: "rgba(255,255,255,0.15)",
              }}
            />
          );
        })}
      </div>

      {/* Goal count */}
      <div className="text-center mt-2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
        {goalCount} goal{goalCount !== 1 ? "s" : ""} completed
      </div>
    </div>
  );
}
