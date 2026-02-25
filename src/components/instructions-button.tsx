/**
 * Instructions Button
 *
 * Small client component for the header bar.
 * Dispatches a custom event to open the instructions modal
 * (which lives in DashboardClient).
 */

"use client";

export function InstructionsButton() {
  function handleClick() {
    window.dispatchEvent(new CustomEvent("open-instructions"));
  }

  return (
    <button
      onClick={handleClick}
      className="text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors cursor-pointer"
    >
      Instructions
    </button>
  );
}
