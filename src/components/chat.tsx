/**
 * Chat Component
 *
 * The main chat interface where users talk to First Mate.
 * Handles sending messages, streaming responses from Claude,
 * and detecting when goals are created.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { parseGoalsFromResponse, stripGoalJson, ParsedGoal } from "@/lib/parse-goal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatProps {
  onGoalCreated?: (goal: ParsedGoal) => void;
}

export function Chat({ onGoalCreated }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [input]);

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

            if (saveResponse.ok) {
              onGoalCreated(goal);
            }
          } catch {
            // Goal save failed silently — user can retry via chat
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
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-[#5a7a9a] mt-12">
            <p className="text-lg mb-2">What would you like to accomplish?</p>
            <p className="text-sm">
              Tell me your goals and I&apos;ll help you schedule them.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-[#1e3a5f] text-[#d4c5a0]"
                  : "bg-[#0d1f3c] text-[#d4c5a0] border border-[#1e3a5f]"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-[#0d1f3c] border border-[#1e3a5f] rounded-2xl px-4 py-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[#c9a84c] rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-[#c9a84c] rounded-full animate-bounce [animation-delay:0.1s]" />
                <div className="w-2 h-2 bg-[#c9a84c] rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[#1e3a5f] p-4 bg-[#0a1628]"
      >
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell me what you want to accomplish..."
            rows={1}
            className="flex-1 bg-[#112240] border border-[#1e3a5f] rounded-xl px-4 py-3 text-[#d4c5a0] placeholder-[#5a7a9a] resize-none focus:outline-none focus:border-[#c9a84c] text-sm max-h-32"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-[#c9a84c] hover:bg-[#b8973d] disabled:bg-[#5a7a9a] disabled:cursor-not-allowed text-[#0a1628] font-semibold px-5 py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
