/**
 * Dark Mode Toggle
 *
 * Simple sun/moon icon toggle for switching between dark and light mode.
 */

"use client";

import { useTheme } from "@/components/theme-provider";

export function DarkModeToggle() {
  const { isDark, toggleDark } = useTheme();

  return (
    <button
      onClick={toggleDark}
      className="text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer text-sm"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? "☀" : "☾"}
    </button>
  );
}
