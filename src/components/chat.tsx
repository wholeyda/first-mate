/**
 * Chat Component
 *
 * Minimalist chat interface centered on an animated particle globe.
 * Shows only the last assistant message.
 * The globe serves as both visual centerpiece and loading indicator.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { parseGoalsFromResponse, stripGoalJson, ParsedGoal } from "@/lib/parse-goal";
import { Globe } from "@/components/globe";

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
}

export function Chat({ onGoalCreated }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

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
                // Update the last message (assistant) with streamed content
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

      // Check if the response contains goal JSON
      const goals = parseGoalsFromResponse(assistantContent);
      if (goals.length > 0 && onGoalCreated) {
        // Save each goal via the server-side API route
        for (const goal of goals) {
          try {
            const saveResponse = await fetch("/api/goals", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ goal }),
            });

            if (saveResponse.status === 409) {
              // Duplicate goal — inform the user
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

              // Append scheduling confirmation to the assistant message
              if (savedData.proposedBlocks?.length > 0) {
                const block = savedData.proposedBlocks[0];
                const startDate = new Date(block.start_time);
                const timeStr = startDate.toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
                const count = savedData.proposedBlocks.length;
                const suffix = count > 1 ? ` (and ${count - 1} more)` : "";
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: updated[updated.length - 1].content +
                      `\n\nProposed for your ${block.calendar_type} calendar: ${timeStr}${suffix} — check Calendar tab to approve`,
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
              // Goal save failed — show the error to the user
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
            // Goal save failed — network error
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
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Globe */}
      <div className="flex-none pt-6">
        <Globe isActive={isLoading} />
      </div>

      {/* Last assistant response only */}
      <div className="flex-1 flex flex-col justify-start px-8 pt-4 pb-2 max-w-2xl mx-auto w-full overflow-y-auto">
        {displayMessages.length === 0 && !isLoading && (
          <p className="text-center text-gray-400 text-sm mt-4">
            What would you like to accomplish?
          </p>
        )}

        <div className="space-y-5">
          {displayMessages.map((item) => (
            <div
              key={`msg-${item.originalIndex}`}
              className="chat-message-fade"
            >
              <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                {item.message.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="flex-none p-4 max-w-2xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you want to accomplish..."
            rows={1}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:border-gray-400 text-sm max-h-32 bg-white"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gray-900 hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-5 py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
