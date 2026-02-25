/**
 * Globe — Thin Wrapper
 *
 * Preserves the same GlobeProps interface used by consumers:
 *   - chat.tsx
 *   - island-reveal.tsx
 *   - dashboard-client.tsx
 *   - planet-remove-modal.tsx
 *
 * Dynamically imports the Three.js Globe3D with SSR disabled
 * and wraps it in a Suspense boundary.
 */

"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Island } from "@/types/database";
import { StarConfig } from "@/types/star-config";

interface GlobeProps {
  isActive: boolean;
  islands?: Island[];
  onIslandClick?: (island: Island) => void;
  starConfig?: StarConfig;
  onStarClick?: () => void;
}

const Globe3DCanvas = dynamic(
  () => import("./globe/Globe3D").then((mod) => mod.Globe3DCanvas),
  { ssr: false }
);

export function Globe({ isActive, islands = [], onIslandClick, starConfig, onStarClick }: GlobeProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
        </div>
      }
    >
      <Globe3DCanvas
        isActive={isActive}
        islands={islands}
        onIslandClick={onIslandClick}
        starConfig={starConfig}
        onStarClick={onStarClick}
      />
    </Suspense>
  );
}
