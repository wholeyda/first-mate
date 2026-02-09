/**
 * Suggestions Panel
 *
 * Displays "Captain's Recommendations" — curated resources
 * matched to the user's active goals. Shown in the goals sidebar.
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
  video: "🎬",
  article: "📄",
  tool: "🔧",
  course: "🎓",
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
        <h3 className="text-sm font-semibold text-[#c9a84c] mb-3">
          Captain&apos;s Recommendations
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#112240] border border-[#1e3a5f] rounded-xl p-3 animate-pulse"
            >
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-[#1e3a5f] rounded" />
                <div className="flex-1">
                  <div className="h-3 bg-[#1e3a5f] rounded w-3/4 mb-1.5" />
                  <div className="h-2.5 bg-[#1e3a5f] rounded w-1/2" />
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
      <h3 className="text-sm font-semibold text-[#c9a84c] mb-3">
        Captain&apos;s Recommendations
      </h3>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <a
            key={index}
            href={suggestion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-[#112240] border border-[#1e3a5f] rounded-xl p-3 hover:border-[#c9a84c]/50 transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-sm">
                {TYPE_ICONS[suggestion.type] || "📌"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[#d4c5a0] text-xs font-medium truncate">
                  {suggestion.title}
                </p>
                <p className="text-[#5a7a9a] text-xs mt-0.5">
                  {suggestion.timeEstimate} •{" "}
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
