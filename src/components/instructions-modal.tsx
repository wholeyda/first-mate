/**
 * Instructions Modal
 *
 * Paginated onboarding carousel that introduces users to First Mate.
 * Features:
 *   - Data-driven slide config (easy to add/remove slides)
 *   - Dot indicators (clickable) at bottom
 *   - Left/right arrow navigation
 *   - "Get Started" button on the final slide
 *   - Skip button (top-right)
 *   - Dark mode support
 *   - CSS slide transitions
 *
 * Opens automatically on first login, and manually via "Instructions" button.
 */

"use client";

import { useState, useCallback } from "react";

// ---- Slide configuration ----

interface Slide {
  icon: string;
  title: string;
  body: string;
  highlights?: string[];
}

const SLIDES: Slide[] = [
  {
    icon: "\u2693", // anchor
    title: "Welcome to First Mate",
    body: "First Mate is your AI-powered productivity companion. It helps you set meaningful goals, break them into actionable steps, and schedule dedicated time on your calendar \u2014 so you actually follow through.",
    highlights: [
      "Tell the AI what you want to accomplish",
      "It creates structured goals with smart scheduling",
      "Complete goals to unlock planets in your solar system",
    ],
  },
  {
    icon: "\uD83D\uDCAC", // speech bubble
    title: "Chat with Your AI",
    body: "The chat is your primary interface. Describe any goal \u2014 personal or professional \u2014 and First Mate will help you define it, estimate the time commitment, and find space on your calendar.",
    highlights: [
      "Natural conversation to define goals",
      "Automatic scheduling to your Google Calendar",
      "Quick reply suggestions for faster input",
    ],
  },
  {
    icon: "\uD83C\uDFAF", // target
    title: "Goals & Subtasks",
    body: "Your active goals appear in the sidebar on the right. Each goal tracks priority, estimated hours, and deadlines. Click any goal to decompose it into smaller subtasks for step-by-step progress.",
    highlights: [
      "Priority-ranked goal cards",
      "Expandable subtask breakdowns",
      "Click to view full goal details",
    ],
  },
  {
    icon: "\uD83D\uDCC5", // calendar
    title: "Calendar Integration",
    body: "Switch to the Calendar tab to see your scheduled work blocks. First Mate automatically proposes time slots based on your availability and syncs with Google Calendar.",
    highlights: [
      "Auto-scheduled focus blocks",
      "Google Calendar sync (work & personal)",
      "Approve or adjust proposed times",
    ],
  },
  {
    icon: "\uD83C\uDF0D", // globe
    title: "Your Solar System",
    body: "Every completed goal becomes a unique planet orbiting your central star. Each planet type and color reflects the goal you accomplished. Build your solar system as you achieve more.",
    highlights: [
      "Complete a goal \u2192 answer a reflection \u2192 earn a planet",
      "12 unique planet types with custom colors",
      "Click the center star to customize its appearance",
    ],
  },
  {
    icon: "\uD83D\uDCA1", // lightbulb
    title: "Tips & Recommendations",
    body: "The sidebar also surfaces curated tips, resources, and articles relevant to your active goals. These refresh automatically and can be dismissed or refreshed manually.",
    highlights: [
      "AI-curated resources matched to your goals",
      "Dismiss or refresh for new suggestions",
      "Actionable advice to help you succeed",
    ],
  },
];

// ---- Component ----

interface InstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InstructionsModal({ isOpen, onClose }: InstructionsModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const totalSlides = SLIDES.length;
  const isFirst = currentSlide === 0;
  const isLast = currentSlide === totalSlides - 1;

  const goNext = useCallback(() => {
    if (!isLast) setCurrentSlide((prev) => prev + 1);
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (!isFirst) setCurrentSlide((prev) => prev - 1);
  }, [isFirst]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const handleClose = useCallback(() => {
    setCurrentSlide(0);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const slide = SLIDES[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg mx-4 overflow-hidden">
        {/* Skip / Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer text-sm"
        >
          {isLast ? "Close" : "Skip"}
        </button>

        {/* Slide content */}
        <div className="px-10 pt-10 pb-6">
          {/* Icon */}
          <div className="text-4xl mb-4">{slide.icon}</div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            {slide.title}
          </h2>

          {/* Body text */}
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-5">
            {slide.body}
          </p>

          {/* Highlight bullets */}
          {slide.highlights && (
            <ul className="space-y-2 mb-2">
              {slide.highlights.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="text-gray-400 dark:text-gray-500 mt-0.5 text-xs">\u2022</span>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Bottom navigation bar */}
        <div className="flex items-center justify-between px-10 pb-8 pt-2">
          {/* Left arrow */}
          <button
            onClick={goPrev}
            disabled={isFirst}
            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-colors cursor-pointer text-sm ${
              isFirst
                ? "border-transparent text-transparent cursor-default"
                : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
            aria-label="Previous slide"
          >
            \u2190
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`rounded-full transition-all cursor-pointer ${
                  index === currentSlide
                    ? "w-2.5 h-2.5 bg-gray-900 dark:bg-gray-100"
                    : "w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Right arrow or Get Started button */}
          {isLast ? (
            <button
              onClick={handleClose}
              className="px-5 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors cursor-pointer"
            >
              Get Started
            </button>
          ) : (
            <button
              onClick={goNext}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-sm"
              aria-label="Next slide"
            >
              \u2192
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
