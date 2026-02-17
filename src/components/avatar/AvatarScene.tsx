"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { StarField } from "./StarField";
import { SpaceExplorer } from "./character/SpaceExplorer";
import { GoalInput } from "./ui/GoalInput";
import { CompleteButton } from "./ui/CompleteButton";
import { ProgressBar } from "./ui/ProgressBar";
import { GoalHistory } from "./ui/GoalHistory";
import { CustomPanel } from "./ui/CustomPanel";
import { GoalCelebration } from "./effects/GoalCelebration";
import { TierCinematic } from "./effects/TierCinematic";
import { playClick } from "./sounds";
import {
  type AvatarState,
  type Mood,
  type Category,
  type AvatarCustomization,
  loadAvatarState,
  saveAvatarState,
  getTier,
  computeMood,
  DEFAULT_STATE,
} from "@/lib/avatar-state";

interface AvatarSceneProps {
  /** External completed goal count from Supabase — syncs on mount */
  externalGoalCount?: number;
}

/**
 * Full-screen avatar experience — the premium AAA companion
 *
 * Manages: state machine, tier progression, celebrations, customization
 * Background: living star-field
 * Center: animated SVG space explorer
 * Bottom: goal input, complete button, progress bar, history
 * Right: slide-out customization panel
 */
export function AvatarScene({ externalGoalCount }: AvatarSceneProps) {
  const [state, setState] = useState<AvatarState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [cinematicTier, setCinematicTier] = useState<number | null>(null);
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const interactionTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const loaded = loadAvatarState();
    // Sync with external count if provided
    if (externalGoalCount !== undefined && externalGoalCount > loaded.completedGoalCount) {
      loaded.completedGoalCount = externalGoalCount;
    }
    setState(loaded);
    setIsHydrated(true);
  }, [externalGoalCount]);

  // Persist state changes
  useEffect(() => {
    if (isHydrated) saveAvatarState(state);
  }, [state, isHydrated]);

  // Mood computation timer — re-evaluate every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const newMood = computeMood(prev);
        if (newMood !== prev.currentMood && !celebrating && cinematicTier === null) {
          return { ...prev, currentMood: newMood };
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [celebrating, cinematicTier]);

  // Track interaction
  const recordInteraction = useCallback(() => {
    setState((prev) => ({ ...prev, lastInteractionAt: new Date().toISOString() }));
  }, []);

  // Listen for any click/keypress as interaction
  useEffect(() => {
    const handler = () => recordInteraction();
    window.addEventListener("click", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [recordInteraction]);

  // ═══ GOAL ACTIONS ═══

  const handleAddGoal = useCallback((title: string) => {
    playClick();
    setState((prev) => ({
      ...prev,
      goalHistory: [...prev.goalHistory, {
        title,
        category: prev.currentCategory,
        completedAt: new Date().toISOString(),
      }],
      lastInteractionAt: new Date().toISOString(),
    }));
  }, []);

  const handleCompleteGoal = useCallback(() => {
    playClick();
    const newCount = state.completedGoalCount + 1;
    setState((prev) => ({
      ...prev,
      completedGoalCount: newCount,
      currentMood: "happy" as Mood,
      lastGoalCompletedAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString(),
    }));
    setCelebrating(true);
  }, [state.completedGoalCount]);

  const handleCelebrationComplete = useCallback(() => {
    setCelebrating(false);
    setState((prev) => ({ ...prev, currentMood: "happy" }));
  }, []);

  const handleTierUnlock = useCallback((tierId: number) => {
    setCelebrating(false);
    setCinematicTier(tierId);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setCinematicTier(null);
    setState((prev) => ({ ...prev, currentMood: "celebrating", pendingTierUnlock: null }));
    // Return to idle after celebrating
    setTimeout(() => {
      setState((prev) => ({ ...prev, currentMood: "idle" }));
    }, 3000);
  }, []);

  const handleMoodSettled = useCallback(() => {
    setState((prev) => ({ ...prev, currentMood: "idle" }));
  }, []);

  const handleCategoryChange = useCallback((cat: Category) => {
    playClick();
    setState((prev) => ({ ...prev, currentCategory: cat }));
  }, []);

  const handleCustomize = useCallback((updates: Partial<AvatarCustomization>) => {
    playClick();
    setState((prev) => ({
      ...prev,
      customization: { ...prev.customization, ...updates },
    }));
  }, []);

  // ═══ DERIVED STATE ═══

  const tier = getTier(state.completedGoalCount);
  const isNebula = tier.id >= 5;
  const activeMood = state.currentMood;

  if (!isHydrated) {
    return <div className="w-full h-full" style={{ background: "#080818" }} />;
  }

  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col items-center"
      style={{ background: "#080818" }}
      onClick={recordInteraction}
    >
      {/* ═══ STARFIELD ═══ */}
      <StarField tier={tier} category={state.currentCategory} isNebula={isNebula} />

      {/* ═══ LEGEND BACKGROUND SILHOUETTES ═══ */}
      {tier.id >= 5 && (
        <div className="absolute bottom-[8%] w-full flex justify-around px-[15%] pointer-events-none opacity-10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="relative" style={{ width: 30, height: 50 }}>
              <svg viewBox="0 0 30 50" className="w-full h-full">
                <ellipse cx="15" cy="10" rx="6" ry="7" fill="white" />
                <rect x="10" y="17" width="10" height="20" rx="3" fill="white" />
                <rect x="8" y="37" width="6" height="12" rx="2" fill="white" />
                <rect x="16" y="37" width="6" height="12" rx="2" fill="white" />
              </svg>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CHARACTER (center stage, slightly above center) ═══ */}
      <div className="relative z-10 flex-1 flex items-center justify-center" style={{ paddingBottom: "5%" }}>
        <SpaceExplorer
          tier={tier}
          mood={activeMood}
          category={state.currentCategory}
          customization={state.customization}
          onMoodSettled={handleMoodSettled}
        />
      </div>

      {/* ═══ UI LAYER (bottom) ═══ */}
      <div className="relative z-10 w-full flex flex-col items-center gap-4 pb-6 px-6">
        {/* Progress bar */}
        <ProgressBar goalCount={state.completedGoalCount} category={state.currentCategory} />

        {/* Complete button */}
        <CompleteButton
          category={state.currentCategory}
          onClick={handleCompleteGoal}
          disabled={celebrating || cinematicTier !== null}
          goalCount={state.completedGoalCount}
        />

        {/* Goal input */}
        <GoalInput
          category={state.currentCategory}
          onCategoryChange={handleCategoryChange}
          onAddGoal={handleAddGoal}
          disabled={celebrating || cinematicTier !== null}
        />

        {/* Goal history */}
        <GoalHistory goals={state.goalHistory} />
      </div>

      {/* ═══ CUSTOMIZE BUTTON ═══ */}
      {tier.id >= 1 && (
        <button
          onClick={() => { playClick(); setCustomPanelOpen(true); }}
          className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase cursor-pointer transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          ⚙ Customize
        </button>
      )}

      {/* ═══ CUSTOMIZATION PANEL ═══ */}
      <CustomPanel
        isOpen={customPanelOpen}
        onClose={() => setCustomPanelOpen(false)}
        tier={tier}
        category={state.currentCategory}
        customization={state.customization}
        onCustomize={handleCustomize}
      />

      {/* ═══ GOAL CELEBRATION OVERLAY ═══ */}
      <AnimatePresence>
        {celebrating && (
          <GoalCelebration
            category={state.currentCategory}
            tier={tier}
            goalCount={state.completedGoalCount}
            onComplete={handleCelebrationComplete}
            onTierUnlock={handleTierUnlock}
          />
        )}
      </AnimatePresence>

      {/* ═══ TIER CINEMATIC ═══ */}
      <AnimatePresence>
        {cinematicTier !== null && (
          <TierCinematic
            tierId={cinematicTier}
            category={state.currentCategory}
            onComplete={handleCinematicComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
