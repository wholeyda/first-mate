"use client";

import { useState } from "react";
import { type Category, CATEGORY_THEMES } from "@/lib/avatar-state";

interface GoalInputProps {
  category: Category;
  onCategoryChange: (cat: Category) => void;
  onAddGoal: (title: string) => void;
  disabled?: boolean;
}

const CATEGORIES: Category[] = ["fitness", "learning", "creative", "mindfulness"];

export function GoalInput({ category, onCategoryChange, onAddGoal, disabled }: GoalInputProps) {
  const [title, setTitle] = useState("");
  const theme = CATEGORY_THEMES[category];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || disabled) return;
    onAddGoal(title.trim());
    setTitle("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-md">
      {/* Category selector */}
      <div className="flex gap-1.5">
        {CATEGORIES.map((cat) => {
          const t = CATEGORY_THEMES[cat];
          const active = cat === category;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
              style={{
                background: active ? `${t.colors.primary}20` : "rgba(255,255,255,0.03)",
                border: `1px solid ${active ? t.colors.primary + "60" : "rgba(255,255,255,0.06)"}`,
                color: active ? t.colors.primary : "rgba(255,255,255,0.3)",
                boxShadow: active ? `0 0 12px ${t.colors.glow}20` : "none",
              }}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Goal text input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter your goal..."
          disabled={disabled}
          className="flex-1 bg-white/[0.04] border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none transition-all"
          style={{
            borderColor: title ? `${theme.colors.primary}40` : "rgba(255,255,255,0.06)",
            boxShadow: title ? `0 0 15px ${theme.colors.glow}10` : "none",
          }}
        />
        <button
          type="submit"
          disabled={!title.trim() || disabled}
          className="px-5 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
            color: "white",
            boxShadow: title.trim() ? `0 0 20px ${theme.colors.glow}40` : "none",
          }}
        >
          Add
        </button>
      </div>
    </form>
  );
}
