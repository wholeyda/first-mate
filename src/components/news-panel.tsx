/**
 * News Panel
 *
 * Displays curated news items relevant to the user's active goals.
 * Fetches from /api/news which uses Claude to generate goal-relevant news.
 * Supports dismiss (x) per item and refresh (↻) to load new ones.
 */

"use client";

import { useState, useEffect, useCallback } from "react";

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  relevantGoal: string;
  publishedAt: string;
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/news");
      if (response.ok) {
        const data = await response.json();
        setNews(data.news || []);
      }
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  function handleDismiss(url: string) {
    setNews((prev) => prev.filter((item) => item.url !== url));
  }

  function handleRefresh() {
    fetchNews();
  }

  if (isLoading && news.length === 0) {
    return (
      <div className="px-4 pb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          News
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 animate-pulse"
            >
              <div className="flex-1">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4 mb-1.5" />
                <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-full mb-1.5" />
                <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (news.length === 0 && !isLoading) return null;

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          News
        </h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer text-xs"
          title="Refresh news"
        >
          ↻
        </button>
      </div>
      <div className="space-y-2">
        {news.map((item, index) => (
          <div
            key={index}
            className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors relative group"
          >
            {/* Dismiss button */}
            <button
              onClick={() => handleDismiss(item.url)}
              className="absolute top-2 right-2 w-4 h-4 flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-gray-900 dark:hover:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px]"
              title="Dismiss"
            >
              ×
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
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5 line-clamp-1">
                  {item.summary}
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
                  {item.source} · {timeAgo(item.publishedAt)} · {item.relevantGoal}
                </p>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
