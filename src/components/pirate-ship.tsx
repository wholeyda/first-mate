/**
 * Pirate Ship Component
 *
 * Displays the pirate ship(s) with crew members aboard.
 * Each completed task adds a pirate to the ship.
 * When the ship exceeds capacity (12 pirates), a second ship appears.
 * Pirates reset monthly.
 */

"use client";

import { useState, useEffect } from "react";
import { Pirate } from "@/types/database";

// Ship capacity before overflow
const SHIP_CAPACITY = 12;

// Pirate emoji/visual based on image_key
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
      <div className="flex items-center justify-center h-full text-[#5a7a9a]">
        Loading your fleet...
      </div>
    );
  }

  // Split pirates into ships
  const ship1Pirates = pirates.slice(0, SHIP_CAPACITY);
  const ship2Pirates = pirates.slice(SHIP_CAPACITY);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Score and stats */}
      <div className="text-center mb-8">
        <p className="text-[#5a7a9a] text-sm mb-1">Monthly Score</p>
        <p className="text-4xl font-bold text-[#c9a84c]">{score}</p>
        <p className="text-[#5a7a9a] text-sm mt-2">
          {pirates.length} crew member{pirates.length !== 1 ? "s" : ""} aboard
        </p>
      </div>

      {/* Ship 1 */}
      <div className="bg-[#112240] border border-[#1e3a5f] rounded-2xl p-6 mb-6">
        <div className="text-center mb-4">
          <p className="text-3xl mb-2">🚢</p>
          <p className="text-[#c9a84c] font-semibold">
            {pirates.length === 0 ? "Your Ship Awaits" : "The First Mate"}
          </p>
          <p className="text-[#5a7a9a] text-xs">
            {ship1Pirates.length}/{SHIP_CAPACITY} crew
          </p>
        </div>

        {ship1Pirates.length === 0 ? (
          <p className="text-center text-[#5a7a9a] text-sm py-4">
            Complete tasks to recruit your crew!
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {ship1Pirates.map((pirate) => (
              <div
                key={pirate.id}
                className="flex flex-col items-center gap-1 bg-[#0d1f3c] rounded-xl p-3 border border-[#1e3a5f]"
              >
                <span className="text-2xl">
                  {PIRATE_VISUALS[pirate.image_key] || "⛵"}
                </span>
                <p className="text-[#d4c5a0] text-xs text-center leading-tight">
                  {pirate.trait_description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ship 2 (overflow) */}
      {ship2Pirates.length > 0 && (
        <div className="bg-[#112240] border border-[#1e3a5f] rounded-2xl p-6">
          <div className="text-center mb-4">
            <p className="text-3xl mb-2">⛵</p>
            <p className="text-[#c9a84c] font-semibold">The Second Wind</p>
            <p className="text-[#5a7a9a] text-xs">
              {ship2Pirates.length}/{SHIP_CAPACITY} crew
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {ship2Pirates.map((pirate) => (
              <div
                key={pirate.id}
                className="flex flex-col items-center gap-1 bg-[#0d1f3c] rounded-xl p-3 border border-[#1e3a5f]"
              >
                <span className="text-2xl">
                  {PIRATE_VISUALS[pirate.image_key] || "⛵"}
                </span>
                <p className="text-[#d4c5a0] text-xs text-center leading-tight">
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
