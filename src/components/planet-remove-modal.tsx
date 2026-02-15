/**
 * Planet Remove Modal
 *
 * A branded, on-theme confirmation dialog for removing a planet
 * from the user's solar system. Replaces the browser confirm() dialog.
 */

"use client";

import { Island } from "@/types/database";

interface PlanetRemoveModalProps {
  planet: Island;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlanetRemoveModal({ planet, isOpen, onConfirm, onCancel }: PlanetRemoveModalProps) {
  if (!isOpen) return null;

  const colors = planet.color_palette || ["#4ECDC4", "#45B7D1", "#96CEB4"];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center aeiou-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-gray-950 border border-white/10 rounded-2xl px-8 py-8 max-w-sm w-full mx-4 aeiou-slide-up">
        {/* Planet colors */}
        <div className="flex justify-center gap-2 mb-5">
          {colors.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 10px ${color}`,
              }}
            />
          ))}
        </div>

        <h3 className="text-white text-lg font-semibold text-center mb-2">
          Remove {planet.name}?
        </h3>
        <p className="text-white/40 text-sm text-center mb-8">
          This planet will leave your solar system. Your AEIOU reflection data will be preserved.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80 transition-colors cursor-pointer"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
