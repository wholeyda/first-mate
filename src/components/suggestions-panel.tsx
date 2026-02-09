/**
 * Suggestions Panel
 *
 * Displays curated resources matched to the user's active goals.
 * Shown in the goals sidebar.
 */

"use client";

import { useState, useEffect } from "react";

interface Suggestion {
  title: string;
  description: string;
  url: string;
  type: "video" | "article" | "tool" | "course";
  timeEstimate: string;
  goalTitle: string;
}

const TYPE_ICONS: Record<string, string> = {
  video: "▶",
  article: "◻",
  tool: "⚙",
  course: "○",
};

export function SuggestionsPanel() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch("/api/suggestions");
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSuggestions();
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Recommendations
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-xl p-3 animate-pulse"
            >
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-gray-100 rounded" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-1.5" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="px-4 pb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">
        Recommendations
      </h3>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <a
            key={index}
            href={suggestion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block border border-gray-100 rounded-xl p-3 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-sm text-gray-400">
                {TYPE_ICONS[suggestion.type] || "·"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-xs font-medium truncate">
                  {suggestion.title}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {suggestion.timeEstimate} ·{" "}
                  For: {suggestion.goalTitle}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
