/**
 * AEIOU Modal
 *
 * Full-screen overlay that guides the user through the AEIOU reflection:
 * Activities, Environments, Interactions, Objects, Users.
 *
 * Plus engagement/excitement questions to understand what drives flow state.
 * Urges the user to be as specific as possible for better career insights.
 *
 * After collecting all answers, sends to AI for assessment.
 * On success → triggers planet creation. On failure → red globe flash.
 */

"use client";

import { useState } from "react";
import { Globe } from "@/components/globe";
import { Goal } from "@/types/database";

interface AeiouModalProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (aeiouResponseId: string) => void;
}

type Step = "greeting" | "A" | "E" | "I" | "O" | "U" | "excitement" | "peak_moments" | "evaluating" | "success" | "failure";

const STEPS: { key: Step; letter: string; question: string; hint?: string }[] = [
  {
    key: "A",
    letter: "A",
    question: "What were you actually doing? Describe the specific activities you engaged in.",
    hint: "Be as specific as possible — what tasks, actions, or behaviors were you performing?",
  },
  {
    key: "E",
    letter: "E",
    question: "Where were you during this activity? What kind of place was it and how did it make you feel?",
    hint: "Think about the physical space, atmosphere, noise level, lighting...",
  },
  {
    key: "I",
    letter: "I",
    question: "What were you interacting with \u2014 people or machines? New interaction or a familiar one? Formal or informal?",
  },
  {
    key: "O",
    letter: "O",
    question: "Were there any specific objects, tools, or devices you interacted with?",
  },
  {
    key: "U",
    letter: "U",
    question: "Who else was there? What role did they play in making it a positive or negative experience?",
  },
  {
    key: "excitement",
    letter: "!",
    question: "Did you feel excited and engaged while working on this? Rate your energy and focus — were you in flow, or was it a grind?",
    hint: "Be honest. There's no wrong answer. Understanding your energy patterns helps us find the best work for you.",
  },
  {
    key: "peak_moments",
    letter: "\u2605",
    question: "What specific actions or situations made you feel most alive, curious, or engaged? And which moments drained you?",
    hint: "The more specific you are, the better First Mate can guide your career. \"Debugging the API\" is better than \"coding.\"",
  },
];

export function AeiouModal({ goal, isOpen, onClose, onSuccess }: AeiouModalProps) {
  const [step, setStep] = useState<Step>("greeting");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState({
    activities: "",
    environments: "",
    interactions: "",
    objects: "",
    users_present: "",
    excitement_level: "",
    peak_moments: "",
  });
  const [aiMessage, setAiMessage] = useState("");
  const [showRedFlash, setShowRedFlash] = useState(false);

  if (!isOpen) return null;

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const currentStep = STEPS[stepIndex];

  function handleNext() {
    if (!currentAnswer.trim()) return;

    // Save the current answer
    const answerMap: Record<string, string> = {
      A: "activities",
      E: "environments",
      I: "interactions",
      O: "objects",
      U: "users_present",
      excitement: "excitement_level",
      peak_moments: "peak_moments",
    };

    if (currentStep) {
      const field = answerMap[currentStep.key];
      setAnswers((prev) => ({ ...prev, [field]: currentAnswer.trim() }));
    }

    setCurrentAnswer("");

    // Advance to next step
    if (stepIndex < STEPS.length - 1) {
      setStep(STEPS[stepIndex + 1].key);
    } else {
      // All questions answered — submit
      handleSubmit({
        ...answers,
        [answerMap[currentStep.key]]: currentAnswer.trim(),
      });
    }
  }

  async function handleSubmit(finalAnswers: typeof answers) {
    setStep("evaluating");

    try {
      const res = await fetch("/api/aeiou", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal_id: goal.id,
          ...finalAnswers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiMessage(data.aiMessage || "");

        if (data.wasSuccessful) {
          setStep("success");
          setTimeout(() => {
            onSuccess(data.aeiouResponse.id);
          }, 2000);
        } else {
          setStep("failure");
          setShowRedFlash(true);
          setTimeout(() => {
            setShowRedFlash(false);
            onClose();
          }, 5000);
        }
      } else {
        setStep("failure");
        setAiMessage("Something went wrong. Please try again.");
        setTimeout(onClose, 3000);
      }
    } catch {
      setStep("failure");
      setAiMessage("Connection error. Please try again.");
      setTimeout(onClose, 3000);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center aeiou-fade-in">
      <div className="w-full max-w-2xl mx-auto px-8 flex flex-col items-center">
        {/* Globe */}
        <div
          className={`transition-all duration-500 ${showRedFlash ? "globe-red-flash" : ""}`}
          style={{ transform: "scale(0.35)", transformOrigin: "center center", marginBottom: "-120px", marginTop: "-120px" }}
        >
          <Globe isActive={step === "evaluating"} />
        </div>

        {/* Greeting */}
        {step === "greeting" && (
          <div className="text-center aeiou-slide-up">
            <h2 className="text-2xl font-semibold text-white mb-3">
              Completing: {goal.title}
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              Let&apos;s reflect on this accomplishment together.
              I&apos;ll ask you 7 quick questions about your experience — the more specific you are, the better I can help you find your ideal work.
            </p>
            <button
              onClick={() => setStep("A")}
              className="bg-white text-gray-900 px-8 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Let&apos;s go
            </button>
          </div>
        )}

        {/* AEIOU + Engagement Questions */}
        {currentStep && (
          <div className="w-full aeiou-slide-up" key={currentStep.key}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl font-bold text-white/20">
                {currentStep.letter}
              </span>
              <div className="flex gap-1">
                {STEPS.map((s, i) => (
                  <div
                    key={s.key}
                    className={`w-6 h-1 rounded-full transition-colors ${
                      i <= stepIndex ? "bg-white" : "bg-white/20"
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-white text-lg mb-2">{currentStep.question}</p>
            {currentStep.hint && (
              <p className="text-white/30 text-xs mb-5 italic">{currentStep.hint}</p>
            )}
            {!currentStep.hint && <div className="mb-4" />}

            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your reflection..."
              rows={3}
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 resize-none focus:outline-none focus:border-white/50 text-sm"
            />

            <div className="flex justify-between mt-4">
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white/70 text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!currentAnswer.trim()}
                className="bg-white text-gray-900 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm"
              >
                {stepIndex === STEPS.length - 1 ? "Submit" : "Next"}
              </button>
            </div>
          </div>
        )}

        {/* Evaluating */}
        {step === "evaluating" && (
          <div className="text-center aeiou-slide-up">
            <p className="text-white/60 text-sm">Reflecting on your journey...</p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="text-center aeiou-slide-up">
            <p className="text-white text-lg font-medium mb-2">
              {aiMessage}
            </p>
            <p className="text-white/50 text-sm">
              Preparing your planet reward...
            </p>
          </div>
        )}

        {/* Failure */}
        {step === "failure" && (
          <div className="text-center aeiou-slide-up">
            <p className="text-red-400 text-lg font-medium mb-2">
              {aiMessage || "It seems like this goal isn't quite finished yet."}
            </p>
            <p className="text-white/50 text-sm">
              Give it another shot — you&apos;re closer than you think!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
