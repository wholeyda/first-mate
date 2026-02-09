/**
 * Pirate Ship Component
 *
 * Minimalist crew display. Each completed task adds a crew member.
 * When the ship exceeds capacity (12), a second group appears.
 * Crew resets monthly.
 */

"use client";

import { useState, useEffect } from "react";
import { Pirate } from "@/types/database";

const SHIP_CAPACITY = 12;

const PIRATE_VISUALS: Record<string, string> = {
  scholar: "📚",
  librarian: "🔭",
  engineer: "⚙️",
  carpenter: "🔨",
  cartographer: "🗺️",
  strongman: "⚓",
  lookout: "👀",
  diplomat: "🤝",
  navigator: "🧭",
  artist: "🎨",
  cook: "🍳",
  deckhand: "🧹",
  messenger: "🦜",
  signalman: "🚩",
  quartermaster: "📋",
  explorer: "🔍",
  captain: "👑",
  seaman: "⛵",
};

export function PirateShip() {
  const [pirates, setPirates] = useState<Pirate[]>([]);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/review");
        if (response.ok) {
          const data = await response.json();
          setPirates(data.pirates);
          setScore(data.score);
        }
      } catch (error) {
        console.error("Failed to fetch pirate data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Loading...
      </div>
    );
  }

  const ship1Pirates = pirates.slice(0, SHIP_CAPACITY);
  const ship2Pirates = pirates.slice(SHIP_CAPACITY);

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white">
      {/* Score */}
      <div className="text-center mb-8">
        <p className="text-gray-400 text-sm mb-1">Monthly Score</p>
        <p className="text-4xl font-bold text-gray-900">{score}</p>
        <p className="text-gray-400 text-sm mt-2">
          {pirates.length} crew member{pirates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Ship 1 */}
      <div className="border border-gray-100 rounded-xl p-6 mb-6">
        <div className="text-center mb-4">
          <p className="text-gray-900 font-medium">
            {pirates.length === 0 ? "Your crew awaits" : "The First Mate"}
          </p>
          <p className="text-gray-400 text-xs">
            {ship1Pirates.length}/{SHIP_CAPACITY} crew
          </p>
        </div>

        {ship1Pirates.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-4">
            Complete tasks to recruit your crew.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {ship1Pirates.map((pirate) => (
              <div
                key={pirate.id}
                className="flex flex-col items-center gap-1 border border-gray-50 rounded-lg p-3"
              >
                <span className="text-2xl">
                  {PIRATE_VISUALS[pirate.image_key] || "⛵"}
                </span>
                <p className="text-gray-600 text-xs text-center leading-tight">
                  {pirate.trait_description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ship 2 (overflow) */}
      {ship2Pirates.length > 0 && (
        <div className="border border-gray-100 rounded-xl p-6">
          <div className="text-center mb-4">
            <p className="text-gray-900 font-medium">The Second Wind</p>
            <p className="text-gray-400 text-xs">
              {ship2Pirates.length}/{SHIP_CAPACITY} crew
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {ship2Pirates.map((pirate) => (
              <div
                key={pirate.id}
                className="flex flex-col items-center gap-1 border border-gray-50 rounded-lg p-3"
              >
                <span className="text-2xl">
                  {PIRATE_VISUALS[pirate.image_key] || "⛵"}
                </span>
                <p className="text-gray-600 text-xs text-center leading-tight">
                  {pirate.trait_description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
