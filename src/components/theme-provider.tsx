/**
 * Theme Provider
 *
 * Provides dark mode toggle across the app.
 * Persists preference in localStorage.
 * Adds/removes 'dark' class on <html> element.
 */

"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface ThemeContextType {
  isDark: boolean;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleDark: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true); // Default to dark

  useEffect(() => {
    // Read from localStorage on mount
    const stored = localStorage.getItem("first-mate-theme");
    if (stored === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  function toggleDark() {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("first-mate-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("first-mate-theme", "light");
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}
