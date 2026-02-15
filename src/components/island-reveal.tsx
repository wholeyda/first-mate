/**
 * Planet Reveal
 *
 * Full-screen black background that reveals a new planet in the solar system
 * after a successful AEIOU completion. The main globe spins and a colorful
 * mini planet materializes and orbits around it.
 */

"use client";

import { useState, useEffect } from "react";
import { Globe } from "@/components/globe";
import { Island } from "@/types/database";

interface IslandRevealProps {
  island: Island;
  goalTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function IslandReveal({ island, goalTitle, isOpen, onClose }: IslandRevealProps) {
  const [phase, setPhase] = useState<"enter" | "reveal" | "celebrate">("enter");

  useEffect(() => {
    if (!isOpen) return;

    setPhase("enter");
    const revealTimer = setTimeout(() => setPhase("reveal"), 1500);
    const celebrateTimer = setTimeout(() => setPhase("celebrate"), 3000);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(celebrateTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const colors = island.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];
  const ringedTypes = ["volcanic", "crystalline", "nebula", "steampunk", "arctic", "desert"];
  const hasRings = ringedTypes.includes(island.island_type);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center aeiou-fade-in">
      <div className="flex flex-col items-center">
        {/* Globe with the new planet orbiting */}
        <div
          className="transition-all duration-1000"
          style={{
            transform: "scale(0.45)",
            transformOrigin: "center center",
            marginBottom: "-100px",
            marginTop: "-100px",
          }}
        >
          <Globe isActive={phase === "enter"} islands={[island]} />
        </div>

        {/* Planet name reveal */}
        {(phase === "reveal" || phase === "celebrate") && (
          <div className="text-center island-materialize">
            {/* Color orbs representing the planet */}
            <div className="flex justify-center gap-2 mb-4">
              {colors.map((color, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
              ))}
            </div>

            <h2 className="text-xl font-semibold text-white mb-1">
              {island.name}
            </h2>
            <p className="text-white/40 text-sm mb-1">
              {island.island_type} planet{hasRings ? " — ringed" : ""}
            </p>
          </div>
        )}

        {/* Celebration text */}
        {phase === "celebrate" && (
          <div className="text-center mt-4 aeiou-slide-up">
            <p className="text-white/60 text-sm mb-6">
              A new planet has joined your solar system for completing &ldquo;{goalTitle}&rdquo;
            </p>
            <button
              onClick={onClose}
              className="bg-white text-gray-900 px-8 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
