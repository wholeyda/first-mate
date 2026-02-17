/**
 * Chat Component
 *
 * Minimalist chat interface centered on an animated particle globe.
 * Shows only the last assistant message.
 * The globe serves as both visual centerpiece and loading indicator.
 * Planets orbit the globe — clicking one opens a branded removal modal.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { parseGoalsFromResponse, stripGoalJson, ParsedGoal } from "@/lib/parse-goal";
import { Globe } from "@/components/globe";
import { PlanetRemoveModal } from "@/components/planet-remove-modal";
import { Island } from "@/types/database";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ScheduledBlock {
  start_time: string;
  end_time: string;
  calendar_type: string;
  google_event_id: string;
}

interface ChatProps {
  onGoalCreated?: (goal: ParsedGoal, savedGoal?: Record<string, unknown>, scheduledBlocks?: ScheduledBlock[]) => void;
  islands?: Island[];
  onIslandRemoved?: (islandId: string) => void;
  onHistoryCleared?: () => void;
}

/**
 * Detect what kind of quick replies to show based on assistant message content.
 * Returns an array of suggested reply strings, or empty array for no suggestions.
 */
function detectQuickReplies(text: string): string[] {
  const lower = text.toLowerCase();

  // Frequency-related
  if (
    /how often|frequency|how frequently|recurring|repeat|recurrence/.test(lower)
  ) {
    return ["Daily", "Weekly", "Monthly"];
  }

  // Time/duration-related
  if (
    /how long|how much time|duration|how many hours|how many minutes|per session|each session/.test(lower)
  ) {
    return ["30 min", "1 hour", "2 hours"];
  }

  // Priority-related
  if (
    /priority|how important|urgency|how urgent|critical/.test(lower) &&
    /\?/.test(lower)
  ) {
    return ["Low", "Medium", "High", "Critical"];
  }

  // Work vs personal
  if (
    /work or personal|personal or work|which calendar|work calendar|personal calendar/.test(lower)
  ) {
    return ["Work", "Personal"];
  }

  // Deadline flexibility
  if (
    /hard deadline|flexible|move the date|deadline.*flex|firm.*deadline|fixed.*deadline/.test(lower) &&
    /\?/.test(lower)
  ) {
    return ["Hard deadline", "Flexible"];
  }

  // Time of day
  if (
    /what time of day|morning or|afternoon or|evening|prefer.*morning|prefer.*afternoon|when.*during the day/.test(lower)
  ) {
    return ["Morning", "Afternoon", "Evening"];
  }

  return [];
}

export function Chat({ onGoalCreated, islands, onIslandRemoved, onHistoryCleared }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [removingPlanet, setRemovingPlanet] = useState<Island | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or loading state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Show only the last assistant message
  const displayMessages = messages
    .map((m, i) => ({ message: m, originalIndex: i }))
    .filter((item) => item.message.role === "assistant" && item.message.content.length > 0)
    .slice(-1);

  function handlePlanetClick(island: Island) {
    setRemovingPlanet(island);
  }

  async function handlePlanetRemoveConfirm() {
    if (!removingPlanet || !onIslandRemoved) return;
    try {
      const res = await fetch(`/api/islands?id=${removingPlanet.id}`, { method: "DELETE" });
      if (res.ok) {
        onIslandRemoved(removingPlanet.id);
      }
    } catch {
      // Silent fail
    }
    setRemovingPlanet(null);
  }

  function handleQuickReply(reply: string) {
    setInput(reply);
    setQuickReplies([]);
    // Submit on next tick so the input state is updated
    setTimeout(() => {
      const form = inputRef.current?.closest("form");
      if (form) {
        form.requestSubmit();
      }
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setQuickReplies([]);

    try {
      // Send messages to the chat API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message that we'll stream into
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                assistantContent += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: assistantContent,
                  };
                  return updated;
                });
              }
            } catch {
              // Skip malformed SSE chunks
            }
          }
        }
      }

      // After streaming completes, detect quick replies from the assistant content
      const cleanedForDetection = stripGoalJson(assistantContent);
      const detectedReplies = detectQuickReplies(cleanedForDetection);
      setQuickReplies(detectedReplies);

      // Check if the response contains goal JSON
      const goals = parseGoalsFromResponse(assistantContent);
      if (goals.length > 0 && onGoalCreated) {
        setIsScheduling(true);
        for (const goal of goals) {
          try {
            const saveResponse = await fetch("/api/goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ goal }),
            });

            if (saveResponse.status === 409) {
              const dupData = await saveResponse.json();
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content +
                    `\n\n(A goal called "${dupData.existingGoal?.title || goal.title}" already exists — skipped duplicate.)`,
                };
                return updated;
              });
            } else if (saveResponse.ok) {
              const savedData = await saveResponse.json();
              onGoalCreated(goal, savedData.goal, savedData.proposedBlocks);

              if (savedData.proposedBlocks?.length > 0) {
                const block = savedData.proposedBlocks[0];
                const startDate = new Date(block.start_time);
                const timeStr = startDate.toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "America/Los_Angeles",
                });
                const count = savedData.proposedBlocks.length;
                const suffix = count > 1 ? ` (and ${count - 1} more)` : "";
                const hasGoogleEvent = block.google_event_id;
                const statusMsg = hasGoogleEvent
                  ? `Added to your ${block.calendar_type} calendar: ${timeStr} PST${suffix}`
                  : `Proposed for your ${block.calendar_type} calendar: ${timeStr} PST${suffix} — check Calendar tab to approve`;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: updated[updated.length - 1].content +
                      `\n\n${statusMsg}`,
                  };
                  return updated;
                });
              } else if (savedData.schedulingError) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: updated[updated.length - 1].content +
                      `\n\n(${savedData.schedulingError})`,
                  };
                  return updated;
                });
              }
            } else {
              const errData = await saveResponse.json().catch(() => ({ error: "Unknown error" }));
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: updated[updated.length - 1].content +
                    `\n\n(Failed to save goal: ${errData.error || "please try again"})`,
                };
                return updated;
              });
            }
          } catch {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: "assistant",
                content: updated[updated.length - 1].content +
                  "\n\n(Failed to save goal — please check your connection and try again.)",
              };
              return updated;
            });
          }
        }
        setIsScheduling(false);
      }

      // Clean the displayed message (remove JSON blocks)
      const cleanContent = stripGoalJson(assistantContent);
      if (cleanContent !== assistantContent) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: cleanContent,
          };
          return updated;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I hit a snag. Try again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  async function handleClear() {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }
    try {
      await fetch("/api/clear-history", { method: "DELETE" });
    } catch {
      // Silent fail
    }
    setMessages([]);
    setQuickReplies([]);
    setShowClearConfirm(false);
    onHistoryCleared?.();
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-950 overflow-hidden">
      {/* Scrollable content area: globe + messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Globe */}
        <div className="flex-none pt-6">
          <Globe
            isActive={isLoading}
            islands={islands}
            onIslandClick={handlePlanetClick}
          />
        </div>

        {/* Last assistant response only */}
        <div className="flex flex-col justify-start px-8 pt-4 pb-2 max-w-2xl mx-auto w-full">
        {displayMessages.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-4">
            What would you like to accomplish?
          </p>
        )}

        <div className="space-y-5">
          {displayMessages.map((item) => (
            <div
              key={`msg-${item.originalIndex}`}
              className="chat-message-fade"
            >
              <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                {item.message.content}
              </p>
              {isScheduling && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 animate-pulse">
                  Scheduling...
                </p>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Quick reply pills + Input — always visible at bottom */}
      <div className="flex-none p-4 max-w-2xl mx-auto w-full">
        {quickReplies.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-2 mb-3">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => handleQuickReply(reply)}
                className="px-4 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              onBlur={() => setShowClearConfirm(false)}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors cursor-pointer whitespace-nowrap self-center"
            >
              {showClearConfirm ? "Clear all?" : "×"}
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you want to accomplish..."
            rows={1}
            className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 text-sm max-h-32 bg-white dark:bg-gray-900"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white dark:text-gray-900 font-medium px-5 py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>

      {/* Planet removal modal */}
      {removingPlanet && (
        <PlanetRemoveModal
          planet={removingPlanet}
          isOpen={true}
          onConfirm={handlePlanetRemoveConfirm}
          onCancel={() => setRemovingPlanet(null)}
        />
      )}
    </div>
  );
}
