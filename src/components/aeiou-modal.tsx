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

function generateQuestions(goal: Goal, previousAnswers: Record<string, string>): { key: Step; letter: string; question: string; hint?: string }[] {
  const goalTitle = goal.title;

  const questions: { key: Step; letter: string; question: string; hint?: string }[] = [];

  // A - Activities (always specific to the goal)
  questions.push({
    key: "A",
    letter: "A",
    question: `What specific activities did you do to complete "${goalTitle}"? Walk me through the key actions step by step.`,
    hint: `Think about the actual tasks — not just "coding" but what specifically you built, designed, or solved.`,
  });

  // E - Environments (context-aware)
  questions.push({
    key: "E",
    letter: "E",
    question: previousAnswers.activities
      ? `You mentioned: "${previousAnswers.activities.slice(0, 80)}..." — where were you doing this? What was the setting like?`
      : `Where did you work on "${goalTitle}"? Describe the environment, atmosphere, and vibe.`,
    hint: "Physical space, noise, lighting, temperature — what made you comfortable or uncomfortable?",
  });

  // I - Interactions (skip people question if answer suggests solo work)
  const activitiesLower = (previousAnswers.activities || "").toLowerCase();
  const envLower = (previousAnswers.environments || "").toLowerCase();
  const seemsSolo = activitiesLower.includes("alone") || activitiesLower.includes("by myself") ||
    activitiesLower.includes("solo") || envLower.includes("alone") || envLower.includes("home office");

  if (seemsSolo) {
    questions.push({
      key: "I",
      letter: "I",
      question: `It sounds like you worked independently on this. What tools, software, or resources did you interact with most? Were there any async interactions (Slack, email, forums)?`,
      hint: "Even solo work involves interactions — with tools, documentation, online communities, or brief check-ins.",
    });
  } else {
    questions.push({
      key: "I",
      letter: "I",
      question: `Who did you interact with while working on "${goalTitle}"? Were these interactions energizing or draining?`,
      hint: "Think about collaborations, meetings, pair work, feedback sessions — which ones fueled you?",
    });
  }

  // O - Objects/Tools (context-aware based on previous answers)
  const mentionedComputer = activitiesLower.includes("computer") || activitiesLower.includes("laptop") ||
    activitiesLower.includes("screen") || activitiesLower.includes("coding") || activitiesLower.includes("code");

  if (mentionedComputer) {
    questions.push({
      key: "O",
      letter: "O",
      question: `Beyond your computer, were there specific tools, frameworks, or resources that made a real difference in completing "${goalTitle}"?`,
      hint: "Specific software, methodologies, reference materials, AI tools, physical tools — what was indispensable?",
    });
  } else {
    questions.push({
      key: "O",
      letter: "O",
      question: `What tools, objects, or devices were central to completing "${goalTitle}"?`,
      hint: "Physical tools, digital tools, reference materials — anything you couldn't have done it without.",
    });
  }

  // U - Users/People (skip or rephrase if solo)
  if (seemsSolo) {
    questions.push({
      key: "U",
      letter: "U",
      question: `Even working solo, other people can influence your experience. Did anyone inspire, support, or challenge you during "${goalTitle}" — even indirectly?`,
      hint: "Mentors, online communities, friends you bounced ideas off, even people whose work inspired you.",
    });
  } else {
    questions.push({
      key: "U",
      letter: "U",
      question: `Of the people involved in "${goalTitle}", who had the biggest impact on your experience — positive or negative? Why?`,
    });
  }

  // Excitement (always specific)
  questions.push({
    key: "excitement",
    letter: "!",
    question: `On a scale from "total grind" to "pure flow state" — where did "${goalTitle}" land for you? What drove that feeling?`,
    hint: "Be specific about what moments felt effortless vs. what moments felt like pulling teeth.",
  });

  // Peak moments (builds on all previous)
  const previousSummary = Object.values(previousAnswers).filter(Boolean).join(" ").slice(0, 150);
  questions.push({
    key: "peak_moments",
    letter: "★",
    question: previousSummary.length > 50
      ? `Based on everything you've shared, what was THE single most energizing moment? And what was the biggest energy drain?`
      : `What specific moment during "${goalTitle}" made you feel most alive? And what moment drained you most?`,
    hint: "The more specific, the better First Mate can match you to work that keeps you in flow.",
  });

  return questions;
}

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

  const steps = generateQuestions(goal, answers);
  const stepIndex = steps.findIndex((s) => s.key === step);
  const currentStep = steps[stepIndex];

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
    const field = answerMap[currentStep.key];
    const updatedAnswers = { ...answers, [field]: currentAnswer.trim() };
    const updatedSteps = generateQuestions(goal, updatedAnswers);
    if (stepIndex < updatedSteps.length - 1) {
      setStep(updatedSteps[stepIndex + 1].key);
    } else {
      // All questions answered — submit
      handleSubmit({
        ...answers,
        [field]: currentAnswer.trim(),
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
              Let&apos;s reflect on completing <strong className="text-white">{goal.title}</strong>.
              I&apos;ll ask you a few questions tailored to your experience — your honest answers help me understand what kind of work energizes you.
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
                {steps.map((s, i) => (
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
                {stepIndex === steps.length - 1 ? "Submit" : "Next"}
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
