"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CATEGORY_THEMES, type CompletedGoal } from "@/lib/avatar-state";

interface GoalHistoryProps {
  goals: CompletedGoal[];
}

/** Last 5 completed goals with category icons */
export function GoalHistory({ goals }: GoalHistoryProps) {
  if (goals.length === 0) return null;

  const recent = goals.slice(-5).reverse();

  return (
    <div className="w-full max-w-md">
      <h3 className="text-[10px] font-bold tracking-widest uppercase mb-2"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        Recent Goals
      </h3>
      <div className="space-y-1">
        <AnimatePresence>
          {recent.map((goal, i) => {
            const theme = CATEGORY_THEMES[goal.category];
            return (
              <motion.div
                key={goal.completedAt + goal.title}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg"
                style={{ background: "rgba(255,255,255,0.02)" }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1 - i * 0.15, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="text-sm" style={{ filter: `drop-shadow(0 0 4px ${theme.colors.glow})` }}>
                  {theme.icon}
                </span>
                <span className="text-xs text-white/50 truncate flex-1">
                  {goal.title}
                </span>
                <span className="text-[10px]" style={{ color: theme.colors.primary + "80" }}>
                  {new Date(goal.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
