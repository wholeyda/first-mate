/**
 * Suggestions Panel
 *
 * Displays curated resources matched to the user's active goals.
 * Supports dismiss (×) per suggestion and refresh (↻) to load new ones.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

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
  const [dismissedUrls, setDismissedUrls] = useState<string[]>([]);

  const fetchSuggestions = useCallback(async (exclude: string[] = []) => {
    setIsLoading(true);
    try {
      const excludeParam = exclude.length > 0 ? `?exclude=${exclude.join(",")}` : "";
      const response = await fetch(`/api/suggestions${excludeParam}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  function handleDismiss(url: string) {
    const newDismissed = [...dismissedUrls, url];
    setDismissedUrls(newDismissed);
    // Remove from current list immediately
    setSuggestions((prev) => prev.filter((s) => s.url !== url));
    // Fetch replacement
    fetchSuggestions(newDismissed);
  }

  function handleRefresh() {
    // Exclude everything currently shown + previously dismissed
    const currentUrls = suggestions.map((s) => s.url);
    const allExcluded = [...new Set([...dismissedUrls, ...currentUrls])];
    setDismissedUrls(allExcluded);
    fetchSuggestions(allExcluded);
  }

  if (isLoading && suggestions.length === 0) {
    return (
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Recommendations
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 animate-pulse"
            >
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4 mb-1.5" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Recommendations
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer text-xs"
          title="Refresh recommendations"
        >
          ↻
        </button>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors relative group"
          >
            {/* Dismiss button */}
            <button
              onClick={() => handleDismiss(suggestion.url)}
              className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
              title="Dismiss"
            >
              ×
            </button>

            <a
              href={suggestion.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-start gap-2">
                <span className="text-sm text-gray-400">
                  {TYPE_ICONS[suggestion.type] || "·"}
                </span>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-gray-900 dark:text-gray-100 text-xs font-medium truncate">
                    {suggestion.title}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {suggestion.timeEstimate} ·{" "}
                    For: {suggestion.goalTitle}
                  </p>
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
