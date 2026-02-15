/**
 * Island Reveal
 *
 * Full-screen black background that reveals a new island on the globe
 * after a successful AEIOU completion. The globe spins and a colorful
 * island materializes with a celebratory animation.
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

    // Phase 1: Globe appears (0s)
    setPhase("enter");

    // Phase 2: Island materializes (1.5s)
    const revealTimer = setTimeout(() => setPhase("reveal"), 1500);

    // Phase 3: Celebration text (3s)
    const celebrateTimer = setTimeout(() => setPhase("celebrate"), 3000);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(celebrateTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const colors = island.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];

  return (
    <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center aeiou-fade-in">
      <div className="flex flex-col items-center">
        {/* Globe with spinning */}
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

        {/* Island name reveal */}
        {(phase === "reveal" || phase === "celebrate") && (
          <div className="text-center island-materialize">
            {/* Colorful island icon */}
            <div className="flex justify-center gap-1 mb-4">
              {colors.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: color,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>

            <h2 className="text-xl font-semibold text-white mb-1">
              {island.name}
            </h2>
            <p className="text-white/40 text-sm mb-1">
              {island.island_type} island
            </p>
          </div>
        )}

        {/* Celebration text */}
        {phase === "celebrate" && (
          <div className="text-center mt-4 aeiou-slide-up">
            <p className="text-white/60 text-sm mb-6">
              A new island has appeared on your globe for completing &ldquo;{goalTitle}&rdquo;
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
