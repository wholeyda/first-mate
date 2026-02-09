/**
 * Daily Review Component
 *
 * End-of-day review screen where users mark tasks as complete.
 * Shows today's blocks with checkboxes, calculates points earned,
 * and displays new pirates spawned.
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

  // Fetch today's blocks on mount
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
        // Mark blocks as completed in UI
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
      <div className="flex items-center justify-center h-full text-[#5a7a9a]">
        Loading today&apos;s schedule...
      </div>
    );
  }

  const incompleteBlocks = blocks.filter((b) => !b.is_completed);
  const completedBlocks = blocks.filter((b) => b.is_completed);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Score display */}
      <div className="text-center mb-8">
        <p className="text-[#5a7a9a] text-sm mb-1">Monthly Score</p>
        <p className="text-4xl font-bold text-[#c9a84c]">{score}</p>
        <p className="text-[#5a7a9a] text-xs">points</p>
      </div>

      {/* New pirate celebration */}
      {result && result.piratesSpawned.length > 0 && (
        <div className="bg-[#1e3a5f]/50 border border-[#c9a84c] rounded-2xl p-6 mb-6 text-center animate-fadeIn">
          <p className="text-[#c9a84c] text-lg font-semibold mb-2">
            🏴‍☠️ New crew members aboard!
          </p>
          <p className="text-[#d4c5a0] text-2xl font-bold mb-3">
            +{result.pointsEarned} points
          </p>
          {result.piratesSpawned.map((pirate, i) => (
            <p key={i} className="text-[#d4c5a0] text-sm">
              A <span className="text-[#c9a84c] font-medium">{pirate.trait}</span>{" "}
              joins for completing &quot;{pirate.goal_title}&quot;
            </p>
          ))}
        </div>
      )}

      {/* Incomplete blocks */}
      {incompleteBlocks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[#d4c5a0] font-semibold mb-3">
            Today&apos;s Tasks
          </h3>
          <div className="space-y-2">
            {incompleteBlocks.map((block) => (
              <label
                key={block.id}
                className="flex items-center gap-3 bg-[#112240] border border-[#1e3a5f] rounded-xl p-4 cursor-pointer hover:border-[#c9a84c]/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(block.id)}
                  onChange={() => toggleBlock(block.id)}
                  className="w-5 h-5 rounded accent-[#c9a84c]"
                />
                <div className="flex-1">
                  <p className="text-[#d4c5a0] text-sm font-medium">
                    {block.goals?.title || "Task"}
                  </p>
                  <p className="text-[#5a7a9a] text-xs">
                    {new Date(block.start_time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {new Date(block.end_time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {block.goals?.is_work ? " • Work" : " • Personal"}
                  </p>
                </div>
                <span className="text-[#5a7a9a] text-xs">
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
            className="w-full mt-4 bg-[#c9a84c] hover:bg-[#b8973d] disabled:bg-[#5a7a9a] disabled:cursor-not-allowed text-[#0a1628] font-semibold py-3 rounded-xl transition-colors cursor-pointer"
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
          <h3 className="text-[#5a7a9a] font-semibold mb-3">Completed</h3>
          <div className="space-y-2">
            {completedBlocks.map((block) => (
              <div
                key={block.id}
                className="flex items-center gap-3 bg-[#0d1f3c] border border-[#1e3a5f]/50 rounded-xl p-4 opacity-60"
              >
                <span className="text-[#c9a84c]">✓</span>
                <p className="text-[#d4c5a0] text-sm line-through">
                  {block.goals?.title || "Task"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="text-center text-[#5a7a9a] py-8">
          <p>No tasks scheduled for today.</p>
          <p className="text-sm mt-1">Use the chat to add some goals!</p>
        </div>
      )}
    </div>
  );
}
