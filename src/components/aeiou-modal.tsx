/**
 * AEIOU Modal — Conversational reflection after goal completion.
 *
 * Two modes:
 * 1. Voice: tap mic, speak freely, AI asks follow-ups, auto-submits when done.
 * 2. Text: type responses, same conversational AI flow.
 *
 * The AI (claude-sonnet) conducts a natural interview, drills into what the
 * user enjoyed, avoids re-asking covered info, and signals [AEIOU_COMPLETE]
 * when it has all fields — then we extract the JSON and call /api/aeiou.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Globe } from "@/components/globe";
import { Goal } from "@/types/database";
import { useDeepgramSTT } from "@/hooks/useDeepgramSTT";
import { useTheme } from "@/components/theme-provider";

interface AeiouModalProps {
  goal: Goal;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (aeiouResponseId: string) => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

type Phase = "intro" | "chat" | "evaluating" | "success" | "failure";

export function AeiouModal({ goal, isOpen, onClose, onSuccess }: AeiouModalProps) {
  const { isDark } = useTheme();
  const [phase, setPhase] = useState<Phase>("intro");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [aiMessage, setAiMessage] = useState(""); // final success/failure message
  const [showRedFlash, setShowRedFlash] = useState(false);
  const [useVoice, setUseVoice] = useState(false);
  const [ttsAmplitude, setTtsAmplitude] = useState(0);

  const messagesRef = useRef<Message[]>([]);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAnimRef = useRef<number>(0);
  const isProcessingRef = useRef(false);
  const safariUnlockedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pendingVoiceSubmitRef = useRef(false);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isAiTyping]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setPhase("intro");
      setMessages([]);
      setInput("");
      setIsAiTyping(false);
      setAiMessage("");
      setShowRedFlash(false);
      setUseVoice(false);
      setTtsAmplitude(0);
      messagesRef.current = [];
      isProcessingRef.current = false;
    }
  }, [isOpen]);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const stopTts = useCallback(() => {
    cancelAnimationFrame(ttsAnimRef.current);
    setTtsAmplitude(0);
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      if (ttsAudioRef.current.parentNode) ttsAudioRef.current.parentNode.removeChild(ttsAudioRef.current);
      ttsAudioRef.current = null;
    }
  }, []);

  const playTts = useCallback(async (text: string, onDone?: () => void) => {
    stopTts();
    // Strip the [AEIOU_COMPLETE] signal and JSON from spoken text
    const speakText = text.split("[AEIOU_COMPLETE]")[0].trim();
    if (!speakText) { onDone?.(); return; }

    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: speakText, voice: "female" }),
      });
      if (!res.ok) { onDone?.(); return; }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = document.createElement("audio");
      audio.style.display = "none";
      document.body.appendChild(audio);
      ttsAudioRef.current = audio;

      let t = 0;
      const pulse = () => {
        t += 0.05;
        setTtsAmplitude(0.25 + Math.sin(t * 3.5) * 0.15);
        ttsAnimRef.current = requestAnimationFrame(pulse);
      };
      ttsAnimRef.current = requestAnimationFrame(pulse);

      audio.onended = () => {
        cancelAnimationFrame(ttsAnimRef.current);
        setTtsAmplitude(0);
        URL.revokeObjectURL(url);
        if (audio.parentNode) audio.parentNode.removeChild(audio);
        ttsAudioRef.current = null;
        onDone?.();
      };
      audio.onerror = () => {
        cancelAnimationFrame(ttsAnimRef.current);
        setTtsAmplitude(0);
        URL.revokeObjectURL(url);
        if (audio.parentNode) audio.parentNode.removeChild(audio);
        ttsAudioRef.current = null;
        onDone?.();
      };
      audio.src = url;
      await audio.play();
    } catch {
      onDone?.();
    }
  }, [stopTts]);

  // ── Submit AEIOU data after AI signals complete ──────────────────────────
  const submitAeiou = useCallback(async (extractedJson: string) => {
    setPhase("evaluating");
    stopTts();
    stopListeningFn();

    try {
      const fields = JSON.parse(extractedJson);
      const res = await fetch("/api/aeiou", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal_id: goal.id, ...fields }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiMessage(data.aiMessage || "");
        if (data.wasSuccessful) {
          setPhase("success");
          // Speak success message
          if (useVoice && data.aiMessage) {
            playTts(data.aiMessage);
          }
          setTimeout(() => onSuccess(data.aeiouResponse.id), 2500);
        } else {
          setPhase("failure");
          setShowRedFlash(true);
          if (useVoice && data.aiMessage) playTts(data.aiMessage);
          setTimeout(() => { setShowRedFlash(false); onClose(); }, 5000);
        }
      } else {
        setPhase("failure");
        setAiMessage("Something went wrong. Please try again.");
        setTimeout(onClose, 3000);
      }
    } catch {
      setPhase("failure");
      setAiMessage("Connection error. Please try again.");
      setTimeout(onClose, 3000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.id, onClose, onSuccess, playTts, stopTts, useVoice]);

  // ── Send user message to AI, stream response ────────────────────────────
  const sendToAi = useCallback(async (userText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const userMsg: Message = { role: "user", content: userText };
    const updated = [...messagesRef.current, userMsg];
    setMessages(updated);
    messagesRef.current = updated;
    setIsAiTyping(true);

    let fullResponse = "";

    try {
      const res = await fetch("/api/aeiou/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, goalTitle: goal.title }),
      });

      if (!res.ok) throw new Error("AI error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      // Add placeholder assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullResponse += parsed.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: fullResponse };
                  return next;
                });
              }
            } catch { /* skip */ }
          }
        }
      }

      // Sync ref with clean text (no AEIOU_COMPLETE signal)
      const displayText = fullResponse.split("[AEIOU_COMPLETE]")[0].trim();
      const finalMsgs = [...messagesRef.current.slice(0, -1), { role: "assistant" as const, content: displayText }];
      // Keep full response in ref so AI has context, show clean in UI
      messagesRef.current = [...messagesRef.current.slice(0, -1), { role: "assistant" as const, content: fullResponse }];
      setMessages(finalMsgs);

      setIsAiTyping(false);

      // Check if AI signalled completion
      if (fullResponse.includes("[AEIOU_COMPLETE]")) {
        const jsonPart = fullResponse.split("[AEIOU_COMPLETE]")[1]?.trim();
        if (jsonPart) {
          if (useVoice) {
            // Speak the last bit before the signal, then submit
            playTts(displayText, () => submitAeiou(jsonPart));
          } else {
            submitAeiou(jsonPart);
          }
          isProcessingRef.current = false;
          return;
        }
      }

      // Speak the response then resume listening
      if (useVoice && displayText) {
        playTts(displayText, () => {
          isProcessingRef.current = false;
          pendingVoiceSubmitRef.current = false;
          startListening();
        });
      } else {
        isProcessingRef.current = false;
      }
    } catch {
      setIsAiTyping(false);
      isProcessingRef.current = false;
      setMessages((prev) => {
        const next = [...prev];
        if (next[next.length - 1]?.role === "assistant") {
          next[next.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Try again." };
        }
        return next;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.title, playTts, submitAeiou, useVoice]);

  // ── STT — utterance end auto-sends ──────────────────────────────────────
  const handleUtteranceEnd = useCallback((text: string) => {
    if (!text.trim()) return;
    stopListeningFn();
    sendToAi(text.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendToAi]);

  const { startListening, stopListening: stopListeningFn, transcript, isListening, audioAmplitude } = useDeepgramSTT(handleUtteranceEnd);

  // ── Start the conversation ───────────────────────────────────────────────
  const startConversation = useCallback(async (withVoice: boolean) => {
    setUseVoice(withVoice);
    setPhase("chat");

    // Unlock Safari audio on the user gesture
    if (withVoice && !safariUnlockedRef.current) {
      try {
        const ctx = new AudioContext();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf; src.connect(ctx.destination); src.start(0); ctx.close();
      } catch { /* non-critical */ }
      safariUnlockedRef.current = true;
    }

    // Kick off with opening question
    isProcessingRef.current = true;
    setIsAiTyping(true);

    let fullResponse = "";

    try {
      const openingMessages: Message[] = [{
        role: "user",
        content: `I just completed my goal: "${goal.title}". I'm ready to reflect on it.`,
      }];
      setMessages(openingMessages);
      messagesRef.current = openingMessages;

      const res = await fetch("/api/aeiou/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: openingMessages, goalTitle: goal.title }),
      });

      if (!res.ok) throw new Error("AI error");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullResponse += parsed.text;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: fullResponse };
                  return next;
                });
              }
            } catch { /* skip */ }
          }
        }
      }

      const displayText = fullResponse.split("[AEIOU_COMPLETE]")[0].trim();
      messagesRef.current = [...messagesRef.current, { role: "assistant", content: fullResponse }];
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: displayText };
        return next;
      });
      setIsAiTyping(false);

      if (withVoice && displayText) {
        playTts(displayText, () => {
          isProcessingRef.current = false;
          startListening();
        });
      } else {
        isProcessingRef.current = false;
      }
    } catch {
      setIsAiTyping(false);
      isProcessingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal.title, playTts]);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!isOpen) {
      stopTts();
      stopListeningFn();
    }
  }, [isOpen, stopTts, stopListeningFn]);

  // Text submit
  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isAiTyping) return;
    const text = input.trim();
    setInput("");
    sendToAi(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e as unknown as React.FormEvent);
    }
  }

  // Amplitude for globe: mic when listening, tts when speaking
  const voiceAmplitude = isListening ? audioAmplitude : ttsAmplitude;
  const globeActive = isAiTyping || phase === "evaluating";

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-300 ${isDark ? "bg-black" : "bg-white"}`}>

      {/* Globe — fills top half */}
      <div
        className={`transition-all duration-500 ${showRedFlash ? "globe-red-flash" : ""}`}
        style={{ flex: "0 0 45%", position: "relative" }}
      >
        <Globe
          isActive={globeActive}
          voiceAmplitude={voiceAmplitude > 0 ? 0.05 + voiceAmplitude * 0.6 : 0}
          voiceMode={phase === "chat" && (isListening || ttsAmplitude > 0)}
        />
      </div>

      {/* Content — bottom half */}
      <div className="flex-1 flex flex-col min-h-0 px-6 pb-6">

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center">
            <div>
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                {goal.title}
              </h2>
              <p className={`text-sm max-w-sm ${isDark ? "text-white/50" : "text-gray-500"}`}>
                Let&apos;s reflect on what you accomplished. I&apos;ll ask a few questions — answer however feels natural.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => startConversation(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                  isDark ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-700"
                }`}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
                Talk it through
              </button>
              <button
                onClick={() => startConversation(false)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm border transition-colors cursor-pointer ${
                  isDark
                    ? "border-white/20 text-white/70 hover:bg-white/10"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Type instead
              </button>
            </div>
            <button
              onClick={onClose}
              className={`text-xs transition-colors cursor-pointer ${isDark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}`}
            >
              Not now
            </button>
          </div>
        )}

        {/* ── CHAT ── */}
        {phase === "chat" && (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 py-2 space-y-3">
              {messages.filter(m => m.role === "assistant" && m.content).map((m, i) => (
                <div key={i} className={`text-sm leading-relaxed ${isDark ? "text-white/90" : "text-gray-800"}`}>
                  {m.content}
                </div>
              ))}
              {messages.filter(m => m.role === "user").slice(-1).map((m, i) => (
                <div key={`u${i}`} className={`text-sm italic ${isDark ? "text-white/40" : "text-gray-400"}`}>
                  {m.content}
                </div>
              ))}
              {isAiTyping && (
                <div className={`text-sm ${isDark ? "text-white/30" : "text-gray-400"}`}>
                  <span className="animate-pulse">...</span>
                </div>
              )}
              {/* Live transcript */}
              {isListening && transcript && (
                <div className={`text-sm italic ${isDark ? "text-white/30" : "text-gray-400"}`}>
                  {transcript}
                </div>
              )}
            </div>

            {/* Input area */}
            {useVoice ? (
              /* Voice mode — status + stop button */
              <div className="flex flex-col items-center gap-3 pt-2">
                <p className={`text-xs tracking-widest uppercase ${
                  isDark ? "text-white/40" : "text-gray-400"
                }`}>
                  {isListening ? "Listening..." : ttsAmplitude > 0 ? "Speaking..." : isAiTyping ? "Thinking..." : ""}
                </p>
                <div className="flex gap-3">
                  {/* Switch to text */}
                  <button
                    onClick={() => {
                      stopTts();
                      stopListeningFn();
                      setUseVoice(false);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? "border-white/20 text-white/40 hover:text-white/70" : "border-gray-200 text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Switch to text
                  </button>
                  <button
                    onClick={() => { stopTts(); stopListeningFn(); onClose(); }}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isDark ? "border-white/20 text-white/40 hover:text-white/70" : "border-gray-200 text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Exit
                  </button>
                </div>
              </div>
            ) : (
              /* Text mode */
              <form onSubmit={handleTextSubmit} className="flex gap-2 pt-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Reply..."
                  rows={2}
                  disabled={isAiTyping}
                  autoFocus
                  className={`flex-1 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none border ${
                    isDark
                      ? "bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/40"
                      : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-gray-400"
                  }`}
                />
                <div className="flex flex-col gap-1">
                  <button
                    type="submit"
                    disabled={!input.trim() || isAiTyping}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-30 ${
                      isDark ? "bg-white text-gray-900 hover:bg-gray-100" : "bg-gray-900 text-white hover:bg-gray-700"
                    }`}
                  >
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={`text-xs transition-colors cursor-pointer ${isDark ? "text-white/30 hover:text-white/60" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    Exit
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* ── EVALUATING ── */}
        {phase === "evaluating" && (
          <div className="flex-1 flex items-center justify-center">
            <p className={`text-sm animate-pulse ${isDark ? "text-white/50" : "text-gray-400"}`}>
              Reflecting on your journey...
            </p>
          </div>
        )}

        {/* ── SUCCESS ── */}
        {phase === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <p className={`text-lg font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
              {aiMessage}
            </p>
            <p className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}>
              Preparing your planet reward...
            </p>
          </div>
        )}

        {/* ── FAILURE ── */}
        {phase === "failure" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-red-400 text-lg font-medium">
              {aiMessage || "It seems like this goal isn't quite finished yet."}
            </p>
            <p className={`text-sm ${isDark ? "text-white/40" : "text-gray-400"}`}>
              Give it another shot — you&apos;re closer than you think!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
