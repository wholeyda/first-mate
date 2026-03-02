/**
 * Recommendations Panel
 *
 * Unified panel that merges Tips & Resources (from /api/news) and
 * Suggestions (from /api/suggestions) into a single interleaved feed.
 * One header, one refresh button, dismiss per item.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

// ---- Unified item type ----

interface RecommendationItem {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  url: string;
  source: "tip" | "suggestion";
}

// ---- Raw API types ----

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  relevantGoal: string;
  publishedAt: string;
}

interface Suggestion {
  title: string;
  description: string;
  url: string;
  type: "video" | "article" | "tool" | "course";
  timeEstimate: string;
  goalTitle: string;
}

const TYPE_ICONS: Record<string, string> = {
  video: "\u25B6",
  article: "\u25FB",
  tool: "\u2699",
  course: "\u25CB",
};

// ---- Component ----

export function RecommendationsPanel({ maxItems = 4 }: { maxItems?: number }) {
  const [items, setItems] = useState<RecommendationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedUrls, setDismissedUrls] = useState<string[]>([]);

  const fetchAll = useCallback(async (exclude: string[] = []) => {
    setIsLoading(true);
    try {
      // Fetch both sources in parallel
      const excludeParam = exclude.length > 0 ? `?exclude=${exclude.join(",")}` : "";
      const [newsRes, suggestionsRes] = await Promise.all([
        fetch("/api/news"),
        fetch(`/api/suggestions${excludeParam}`),
      ]);

      const merged: RecommendationItem[] = [];

      // Parse tips
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        const newsItems: NewsItem[] = newsData.news || [];
        for (const item of newsItems) {
          merged.push({
            id: `tip-${item.url}`,
            title: item.title,
            subtitle: item.summary,
            detail: item.relevantGoal,
            url: item.url,
            source: "tip",
          });
        }
      }

      // Parse suggestions
      if (suggestionsRes.ok) {
        const sugData = await suggestionsRes.json();
        const suggestions: Suggestion[] = sugData.suggestions || [];
        for (const s of suggestions) {
          const icon = TYPE_ICONS[s.type] || "";
          merged.push({
            id: `sug-${s.url}`,
            title: `${icon} ${s.title}`.trim(),
            subtitle: `${s.timeEstimate} \u00B7 For: ${s.goalTitle}`,
            detail: "",
            url: s.url,
            source: "suggestion",
          });
        }
      }

      // Interleave: alternate tip, suggestion, tip, suggestion...
      const tips = merged.filter((i) => i.source === "tip");
      const suggestions = merged.filter((i) => i.source === "suggestion");
      const interleaved: RecommendationItem[] = [];
      const maxLen = Math.max(tips.length, suggestions.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < tips.length) interleaved.push(tips[i]);
        if (i < suggestions.length) interleaved.push(suggestions[i]);
      }

      setItems(interleaved);
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function handleDismiss(url: string) {
    const newDismissed = [...dismissedUrls, url];
    setDismissedUrls(newDismissed);
    setItems((prev) => prev.filter((i) => i.url !== url));
  }

  function handleRefresh() {
    const currentUrls = items.map((i) => i.url);
    const allExcluded = [...new Set([...dismissedUrls, ...currentUrls])];
    setDismissedUrls(allExcluded);
    fetchAll(allExcluded);
  }

  // Loading skeleton
  if (isLoading && items.length === 0) {
    return (
      <div className="px-6 pb-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recommendations
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 animate-pulse"
            >
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4 mb-1.5" />
              <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-full mb-1.5" />
              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && !isLoading) {
    return (
      <div className="px-6 py-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Recommendations
        </h3>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No recommendations yet.
        </p>
      </div>
    );
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <div className="px-6 pb-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Recommendations
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
          title="Refresh recommendations"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115.4-4.6L20 5M20 15a9 9 0 01-15.4 4.6L4 19" />
          </svg>
        </button>
      </div>
      <div className="space-y-3">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors relative group"
          >
            {/* Dismiss button */}
            <button
              onClick={() => handleDismiss(item.url)}
              className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
              title="Dismiss"
            >
              &times;
            </button>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-gray-900 dark:text-gray-100 text-xs font-medium">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-1">
                    {item.subtitle}
                  </p>
                )}
                {item.detail && (
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                    {item.detail}
                  </p>
                )}
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
