/**
 * Chat Component
 *
 * Minimalist chat interface centered on an animated particle globe.
 * Shows only the last assistant message.
 * The globe serves as both visual centerpiece and loading indicator.
 * Planets orbit the globe — clicking one opens a branded removal modal.
 *
 * Voice mode: Hold the Talk button for 1.5s to toggle voice mode on/off.
 * In voice mode the UI fades out leaving only the planet + voice overlay.
 * User speaks freely — Deepgram detects silence (utterance end) and
 * auto-sends the message. AI responds via TTS, then listening resumes.
 * Hold again for 1.5s to exit voice mode.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseGoalsFromResponse, stripGoalJson, ParsedGoal } from "@/lib/parse-goal";
import { Globe } from "@/components/globe";
import { PlanetRemoveModal } from "@/components/planet-remove-modal";
import { Island } from "@/types/database";
import { StarConfig } from "@/types/star-config";
import { useDeepgramSTT } from "@/hooks/useDeepgramSTT";

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
  starConfig?: StarConfig;
  onStarClick?: () => void;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

const HOLD_DURATION = 1500; // ms to hold before activating/deactivating

/**
 * Detect what kind of quick replies to show based on assistant message content.
 */
function detectQuickReplies(text: string): string[] {
  const lower = text.toLowerCase();

  if (/how often|frequency|how frequently|recurring|repeat|recurrence/.test(lower)) {
    return ["Daily", "Weekly", "Monthly"];
  }
  if (/how long|how much time|duration|how many hours|how many minutes|per session|each session/.test(lower)) {
    return ["30 min", "1 hour", "2 hours"];
  }
  if (/priority|how important|urgency|how urgent|critical/.test(lower) && /\?/.test(lower)) {
    return ["Low", "Medium", "High", "Critical"];
  }
  if (/work or personal|personal or work|which calendar|work calendar|personal calendar/.test(lower)) {
    return ["Work", "Personal"];
  }
  if (/hard deadline|flexible|move the date|deadline.*flex|firm.*deadline|fixed.*deadline/.test(lower) && /\?/.test(lower)) {
    return ["Hard deadline", "Flexible"];
  }
  if (/what time of day|morning or|afternoon or|evening|prefer.*morning|prefer.*afternoon|when.*during the day/.test(lower)) {
    return ["Morning", "Afternoon", "Evening"];
  }
  return [];
}

export function Chat({ onGoalCreated, islands, onIslandRemoved, onHistoryCleared, starConfig, onStarClick }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [removingPlanet, setRemovingPlanet] = useState<Island | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ---- Voice mode state ----
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voicePreference, setVoicePreference] = useState<"male" | "female">("female");
  const [holdProgress, setHoldProgress] = useState(0);
  const [ttsAmplitude, setTtsAmplitude] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartRef = useRef<number>(0);
  const holdAnimRef = useRef<number>(0);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null);
  const ttsContextRef = useRef<AudioContext | null>(null);
  const ttsAnimRef = useRef<number>(0);
  const voiceStateRef = useRef<VoiceState>("idle");
  const messagesRef = useRef<Message[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // ---- Core chat submission (shared by text + voice) ----
  const sendMessage = useCallback(async (text: string, fromVoice: boolean = false) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messagesRef.current, userMessage];

    setMessages(updatedMessages);
    messagesRef.current = updatedMessages;
    setInput("");
    setIsLoading(true);
    setQuickReplies([]);

    if (fromVoice) {
      setVoiceState("processing");
      voiceStateRef.current = "processing";
    }

    let assistantContent = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

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

      // Detect quick replies
      const cleanedForDetection = stripGoalJson(assistantContent);
      const detectedReplies = detectQuickReplies(cleanedForDetection);
      setQuickReplies(detectedReplies);

      // Check for goal JSON
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
                    content: updated[updated.length - 1].content + `\n\n${statusMsg}`,
                  };
                  return updated;
                });
              } else if (savedData.schedulingError) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: updated[updated.length - 1].content + `\n\n(${savedData.schedulingError})`,
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

      // Clean displayed message
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

      // If in voice mode, play TTS — then auto-resume listening
      if (fromVoice && cleanContent) {
        await playTTS(cleanContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I hit a snag. Try again?" },
      ]);
      // If in voice mode, go back to listening
      if (fromVoice && voiceStateRef.current !== "idle") {
        setVoiceState("listening");
        voiceStateRef.current = "listening";
        startListening();
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, onGoalCreated]);

  // ---- Auto-send callback when Deepgram detects user stopped speaking ----
  const handleUtteranceEnd = useCallback((text: string) => {
    // Only auto-send if we're in listening state
    if (voiceStateRef.current !== "listening") return;
    if (!text.trim()) return;

    // Stop listening while we process (will restart after TTS)
    stopListeningFn();
    sendMessage(text.trim(), true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sendMessage]);

  const {
    startListening,
    stopListening: stopListeningFn,
    transcript,
    isListening,
    audioAmplitude: micAmplitude,
    error: sttError,
  } = useDeepgramSTT(handleUtteranceEnd);

  // Determine the current amplitude to drive the planet
  const currentAmplitude = voiceState === "listening" ? micAmplitude
    : voiceState === "speaking" ? ttsAmplitude
    : 0;

  // Fetch voice preference on mount
  useEffect(() => {
    async function fetchPref() {
      try {
        const res = await fetch("/api/voice-preference");
        if (res.ok) {
          const data = await res.json();
          if (data.voicePreference) setVoicePreference(data.voicePreference);
        }
      } catch {
        // Use default
      }
    }
    fetchPref();
  }, []);

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
    sendMessage(input.trim());
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

  // ---- TTS Playback ----
  async function playTTS(text: string) {
    setVoiceState("speaking");
    voiceStateRef.current = "speaking";
    try {
      const res = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: voicePreference }),
      });

      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;

      // Set up AudioContext + AnalyserNode for TTS amplitude
      const audioCtx = new AudioContext();
      ttsContextRef.current = audioCtx;
      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      ttsAnalyserRef.current = analyser;

      // Start TTS amplitude monitoring
      function updateTtsAmplitude() {
        if (!ttsAnalyserRef.current) return;
        const data = new Uint8Array(ttsAnalyserRef.current.frequencyBinCount);
        ttsAnalyserRef.current.getByteFrequencyData(data);
        const sum = data.reduce((a, b) => a + b, 0);
        const avg = sum / data.length / 255;
        setTtsAmplitude(avg);
        ttsAnimRef.current = requestAnimationFrame(updateTtsAmplitude);
      }
      ttsAnimRef.current = requestAnimationFrame(updateTtsAmplitude);

      audio.onended = () => {
        // Cleanup TTS audio resources
        cancelAnimationFrame(ttsAnimRef.current);
        setTtsAmplitude(0);
        URL.revokeObjectURL(url);
        if (ttsContextRef.current && ttsContextRef.current.state !== "closed") {
          ttsContextRef.current.close();
        }
        ttsContextRef.current = null;
        ttsAnalyserRef.current = null;
        ttsAudioRef.current = null;

        // If still in voice mode, go back to listening automatically
        if (voiceStateRef.current !== "idle") {
          setVoiceState("listening");
          voiceStateRef.current = "listening";
          startListening();
        }
      };

      await audio.play();
    } catch (err) {
      console.error("TTS playback error:", err);
      // Fall back — go back to listening if still in voice mode
      const currentState = voiceStateRef.current as string;
      if (currentState !== "idle") {
        setVoiceState("listening");
        voiceStateRef.current = "listening";
        startListening();
      }
    }
  }

  // ---- Hold-to-toggle gesture ----
  // Hold for 1.5s to toggle voice mode ON or OFF
  function handleTalkPointerDown() {
    holdStartRef.current = Date.now();
    setHoldProgress(0);

    // Animate progress ring
    function animateProgress() {
      const elapsed = Date.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);

      if (progress < 1) {
        holdAnimRef.current = requestAnimationFrame(animateProgress);
      }
    }
    holdAnimRef.current = requestAnimationFrame(animateProgress);

    holdTimerRef.current = setTimeout(() => {
      setHoldProgress(0);

      if (voiceStateRef.current === "idle") {
        // ---- Activate voice mode ----
        setVoiceState("listening");
        voiceStateRef.current = "listening";
        startListening();
      } else {
        // ---- Deactivate voice mode ----
        exitVoiceMode();
      }
    }, HOLD_DURATION);
  }

  function handleTalkPointerUp() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    cancelAnimationFrame(holdAnimRef.current);
    setHoldProgress(0);
  }

  // Exit voice mode — full cleanup
  function exitVoiceMode() {
    // Stop STT
    if (isListening) stopListeningFn();

    // Stop TTS
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    if (ttsAnimRef.current) cancelAnimationFrame(ttsAnimRef.current);
    if (ttsContextRef.current && ttsContextRef.current.state !== "closed") {
      ttsContextRef.current.close();
    }
    ttsContextRef.current = null;
    ttsAnalyserRef.current = null;
    setTtsAmplitude(0);
    setVoiceState("idle");
    voiceStateRef.current = "idle";
  }

  // Save voice preference
  async function toggleVoicePreference() {
    const newPref = voicePreference === "female" ? "male" : "female";
    setVoicePreference(newPref);
    try {
      await fetch("/api/voice-preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voicePreference: newPref }),
      });
    } catch {
      // Silent fail
    }
  }

  const voiceStatusLabel =
    voiceState === "listening" ? "Listening..."
    : voiceState === "processing" ? "Thinking..."
    : voiceState === "speaking" ? "Speaking..."
    : "";

  const inVoiceMode = voiceState !== "idle";

  return (
    <div className={`relative flex flex-col h-full overflow-hidden transition-colors duration-500 ${
      inVoiceMode ? "bg-black" : "bg-white dark:bg-gray-950"
    }`}>
      {/* Globe — absolute background filling the entire panel */}
      <div className="absolute inset-0 z-0">
        <Globe
          isActive={isLoading}
          islands={islands}
          onIslandClick={handlePlanetClick}
          starConfig={starConfig}
          onStarClick={onStarClick}
          voiceAmplitude={currentAmplitude}
          voiceMode={inVoiceMode}
        />
      </div>

      {/* Voice mode overlay */}
      {inVoiceMode && (
        <div className={`absolute inset-0 z-20 flex flex-col items-center justify-end pb-8 transition-opacity duration-500 ${
          inVoiceMode ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          {/* No background div needed — parent container is already black in voice mode */}

          {/* Status + controls */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            {/* Live transcript preview */}
            {voiceState === "listening" && transcript && (
              <div className="max-w-md px-6 py-3 bg-black/30 rounded-xl backdrop-blur-sm">
                <p className="text-white/80 text-sm text-center">{transcript}</p>
              </div>
            )}

            {/* Status label */}
            <p className="text-white/70 text-sm font-medium tracking-wide">
              {voiceStatusLabel}
            </p>

            {/* Pulsing indicator for listening state */}
            {voiceState === "listening" && (
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 animate-ping absolute" />
                <div className="w-12 h-12 rounded-full bg-red-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Processing spinner */}
            {voiceState === "processing" && (
              <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            )}

            {/* Speaking waveform indicator */}
            {voiceState === "speaking" && (
              <div className="flex items-center gap-1 h-10">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-1 bg-white/70 rounded-full animate-pulse"
                    style={{
                      height: `${12 + Math.random() * 20}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.6s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* Voice preference toggle */}
            <button
              onClick={toggleVoicePreference}
              className="text-white/50 text-xs hover:text-white/80 transition-colors cursor-pointer"
            >
              Voice: {voicePreference === "female" ? "Female" : "Male"}
            </button>

            {/* Exit voice mode — hold to exit */}
            <div className="relative">
              {holdProgress > 0 && (
                <svg className="absolute -inset-2 w-[72px] h-[72px]" viewBox="0 0 72 72">
                  <circle
                    cx="36" cy="36" r="32"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${holdProgress * 201} 201`}
                    className="opacity-60"
                    transform="rotate(-90 36 36)"
                  />
                </svg>
              )}
              <button
                onPointerDown={handleTalkPointerDown}
                onPointerUp={handleTalkPointerUp}
                onPointerLeave={handleTalkPointerUp}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
                title="Hold to exit voice mode"
              >
                <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-white/30 text-[10px] mt-1">
              Hold to exit
            </p>

            {/* STT error */}
            {sttError && (
              <p className="text-red-400 text-xs">{sttError}</p>
            )}
          </div>
        </div>
      )}

      {/* Content overlay on top of globe (hidden during voice mode) */}
      <div className={`relative z-10 flex flex-col h-full pointer-events-none transition-opacity duration-300 ${
        inVoiceMode ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}>
        {/* Scrollable messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
          <div className="min-h-[60vh]" />

          <div className="flex flex-col justify-start px-8 pt-4 pb-2 max-w-2xl mx-auto w-full pointer-events-auto">
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

        {/* Quick reply pills + Input */}
        <div className="flex-none p-4 max-w-2xl mx-auto w-full pointer-events-auto">
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
              {showClearConfirm ? "Clear all?" : "\u00D7"}
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
            disabled={isLoading || inVoiceMode}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gray-900 dark:bg-gray-100 hover:bg-gray-700 dark:hover:bg-gray-300 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white dark:text-gray-900 font-medium px-5 py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            Send
          </button>
          {/* Talk button — hold to enter/exit voice mode */}
          <div className="relative">
            {holdProgress > 0 && voiceState === "idle" && (
              <svg className="absolute -inset-1 w-[52px] h-[52px]" viewBox="0 0 52 52">
                <circle
                  cx="26" cy="26" r="23"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={`${holdProgress * 144.5} 144.5`}
                  className="text-gray-400 dark:text-gray-500"
                  transform="rotate(-90 26 26)"
                />
              </svg>
            )}
            <button
              type="button"
              onPointerDown={handleTalkPointerDown}
              onPointerUp={handleTalkPointerUp}
              onPointerLeave={handleTalkPointerUp}
              className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-3 rounded-xl transition-colors cursor-pointer"
              title="Hold to talk"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>
          </div>
        </form>
      </div>
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
