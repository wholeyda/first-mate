/**
 * Daily Review Component
 *
 * Minimalist end-of-day review. Mark tasks complete,
 * earn points, spawn crew members.
 */

"use client";

import { useState, useEffect } from "react";

interface ReviewBlock {
  id: string;
  start_time: string;
  end_time: string;
  is_completed: boolean;
  goals: {
    title: string;
    is_work: boolean;
  } | null;
}

interface SpawnedPirate {
  trait: string;
  image_key: string;
  goal_title: string;
}

export function DailyReview() {
  const [blocks, setBlocks] = useState<ReviewBlock[]>([]);
  const [score, setScore] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    pointsEarned: number;
    piratesSpawned: SpawnedPirate[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReview() {
      try {
        const response = await fetch("/api/review");
        if (response.ok) {
          const data = await response.json();
          setBlocks(data.blocks);
          setScore(data.score);
        }
      } catch (error) {
        console.error("Failed to fetch review:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchReview();
  }, []);

  function toggleBlock(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedBlockIds: Array.from(selectedIds),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        setScore((prev) => prev + data.pointsEarned);
        setBlocks((prev) =>
          prev.map((b) =>
            selectedIds.has(b.id) ? { ...b, is_completed: true } : b
          )
        );
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading...
      </div>
    );
  }

  const incompleteBlocks = blocks.filter((b) => !b.is_completed);
  const completedBlocks = blocks.filter((b) => b.is_completed);

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white">
      {/* Score */}
      <div className="text-center mb-8">
        <p className="text-gray-400 text-sm mb-1">Monthly Score</p>
        <p className="text-4xl font-bold text-gray-900">{score}</p>
      </div>

      {/* New crew celebration */}
      {result && result.piratesSpawned.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-6 mb-6 text-center animate-fadeIn">
          <p className="text-gray-900 text-lg font-semibold mb-2">
            New crew members!
          </p>
          <p className="text-gray-900 text-2xl font-bold mb-3">
            +{result.pointsEarned} points
          </p>
          {result.piratesSpawned.map((pirate, i) => (
            <p key={i} className="text-gray-600 text-sm">
              <span className="font-medium text-gray-900">{pirate.trait}</span>{" "}
              joined for &quot;{pirate.goal_title}&quot;
            </p>
          ))}
        </div>
      )}

      {/* Incomplete blocks */}
      {incompleteBlocks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-gray-900 font-medium mb-3 text-sm">
            Today&apos;s Tasks
          </h3>
          <div className="space-y-2">
            {incompleteBlocks.map((block) => (
              <label
                key={block.id}
                className="flex items-center gap-3 border border-gray-100 rounded-lg p-4 cursor-pointer hover:border-gray-300 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(block.id)}
                  onChange={() => toggleBlock(block.id)}
                  className="w-4 h-4 rounded accent-gray-900"
                />
                <div className="flex-1">
                  <p className="text-gray-900 text-sm font-medium">
                    {block.goals?.title || "Task"}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {new Date(block.start_time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {new Date(block.end_time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {block.goals?.is_work ? " · Work" : " · Personal"}
                  </p>
                </div>
                <span className="text-gray-400 text-xs">
                  +
                  {Math.floor(
                    (new Date(block.end_time).getTime() -
                      new Date(block.start_time).getTime()) /
                      (1000 * 60 * 10)
                  )}{" "}
                  pts
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || isSubmitting}
            className="w-full mt-4 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors cursor-pointer text-sm"
          >
            {isSubmitting
              ? "Completing..."
              : `Complete ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {/* Completed blocks */}
      {completedBlocks.length > 0 && (
        <div>
          <h3 className="text-gray-400 font-medium mb-3 text-sm">Completed</h3>
          <div className="space-y-2">
            {completedBlocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center gap-3 border border-gray-50 rounded-lg p-4 opacity-50"
              >
                <span className="text-gray-400">✓</span>
                <p className="text-gray-500 text-sm line-through">
                  {block.goals?.title || "Task"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          <p>No tasks scheduled for today.</p>
          <p className="text-sm mt-1">Use the chat to add some goals.</p>
        </div>
      )}
    </div>
  );
}
