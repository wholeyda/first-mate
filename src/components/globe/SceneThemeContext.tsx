/**
 * SceneThemeContext
 *
 * Lightweight context that lives INSIDE the R3F Canvas tree.
 * Provides isDark boolean to all scene children (BasePlanet,
 * FloatingPlanet, RocketShip, CentralStar, etc.) without
 * prop-drilling through every planet type component.
 *
 * The Globe3DCanvas reads isDark from the app-level useTheme()
 * OUTSIDE the Canvas, then passes it into Scene, which wraps
 * children with this provider.
 */

"use client";

import { createContext, useContext } from "react";

const SceneThemeContext = createContext<boolean>(true); // default dark

export function SceneThemeProvider({
  isDark,
  children,
}: {
  isDark: boolean;
  children: React.ReactNode;
}) {
  return (
    <SceneThemeContext.Provider value={isDark}>
      {children}
    </SceneThemeContext.Provider>
  );
}

/** Returns true if dark mode, false if light mode */
export function useSceneTheme(): boolean {
  return useContext(SceneThemeContext);
}
