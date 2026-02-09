/**
 * Dancing Figures
 *
 * One animated dancing stick figure per active goal.
 * Each figure dances continuously with randomized timing.
 * Black stick figures on white background.
 */

"use client";

import { useState, useEffect } from "react";
import { Goal } from "@/types/database";

interface DancingFiguresProps {
  goals: Goal[];
}

// Generate a stable random delay for each goal based on its ID
function hashToDelay(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 1000) / 1000; // 0 to 1 seconds
}

// Generate a stable random dance variant (0, 1, or 2)
function hashToVariant(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 7) - hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % 3);
}

function StickFigure({ goal }: { goal: Goal }) {
  const delay = hashToDelay(goal.id);
  const variant = hashToVariant(goal.id);

  // Different dance animation names per variant
  const danceNames = [
    "dance-bounce",
    "dance-sway",
    "dance-jump",
  ];

  const armNames = [
    "arms-wave",
    "arms-pump",
    "arms-disco",
  ];

  const legNames = [
    "legs-step",
    "legs-kick",
    "legs-shuffle",
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width="60"
        height="90"
        viewBox="0 0 60 90"
        className="overflow-visible"
        style={{
          animation: `${danceNames[variant]} 0.8s ease-in-out ${delay}s infinite alternate`,
        }}
      >
        {/* Head */}
        <circle
          cx="30"
          cy="14"
          r="10"
          fill="none"
          stroke="black"
          strokeWidth="2"
        />

        {/* Body */}
        <line
          x1="30" y1="24"
          x2="30" y2="55"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Left arm */}
        <line
          x1="30" y1="32"
          x2="12" y2="48"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transformOrigin: "30px 32px",
            animation: `${armNames[variant]} 0.6s ease-in-out ${delay}s infinite alternate`,
          }}
        />

        {/* Right arm */}
        <line
          x1="30" y1="32"
          x2="48" y2="48"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transformOrigin: "30px 32px",
            animation: `${armNames[(variant + 1) % 3]} 0.7s ease-in-out ${delay + 0.1}s infinite alternate-reverse`,
          }}
        />

        {/* Left leg */}
        <line
          x1="30" y1="55"
          x2="16" y2="80"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transformOrigin: "30px 55px",
            animation: `${legNames[variant]} 0.5s ease-in-out ${delay}s infinite alternate`,
          }}
        />

        {/* Right leg */}
        <line
          x1="30" y1="55"
          x2="44" y2="80"
          stroke="black"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transformOrigin: "30px 55px",
            animation: `${legNames[(variant + 1) % 3]} 0.5s ease-in-out ${delay + 0.15}s infinite alternate-reverse`,
          }}
        />
      </svg>

      <p className="text-[10px] text-gray-500 text-center max-w-[80px] truncate leading-tight">
        {goal.title}
      </p>
    </div>
  );
}

export function DancingFigures({ goals }: DancingFiguresProps) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function fetchScore() {
      try {
        const response = await fetch("/api/review");
        if (response.ok) {
          const data = await response.json();
          setScore(data.score || 0);
        }
      } catch {
        // Score fetch failed silently
      }
    }
    fetchScore();
  }, []);

  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto">
      {/* Score */}
      <div className="px-6 pt-6 pb-2">
        <p className="text-4xl font-bold text-gray-900">{score}</p>
        <p className="text-xs text-gray-400 mt-1">points this month</p>
      </div>

      {/* Dance floor */}
      <div className="flex-1 px-6 py-4">
        {activeGoals.length === 0 ? (
          <p className="text-gray-400 text-sm text-center mt-12">
            Add goals to see your crew dance!
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">
              {activeGoals.length} {activeGoals.length === 1 ? "goal" : "goals"} dancing
            </p>
            <div className="grid grid-cols-4 gap-6">
              {activeGoals.map((goal) => (
                <StickFigure key={goal.id} goal={goal} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
