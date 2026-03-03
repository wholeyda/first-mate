/**
 * Chat Component
 *
 * Minimalist chat interface centered on an animated particle globe.
 * Shows only the last assistant message.
 * The globe serves as both visual centerpiece and loading indicator.
 * Planets orbit the globe — clicking one opens a branded removal modal.
 *
 * Voice mode: Tap the mic button to enter voice mode.
 * Screen goes black, planet takes center stage and pulses.
 * User speaks freely — Deepgram detects 1.5s silence and auto-sends.
 * AI responds via TTS, planet grows/shrinks with amplitude.
 * Tap the X button to exit voice mode.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { parseGoalsFromResponse, stripGoalJson, ParsedGoal } from "@/lib/parse-goal";
import { Globe } from "@/components/globe";
import { PlanetRemoveModal } from "@/components/planet-remove-modal";
import { Island } from "@/types/database";
import { StarConfig } from "@/types/star-config";
import { useDeepgramSTT } from "@/hooks/useDeepgramSTT";
import { useTheme } from "@/components/theme-provider";

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
  userName?: string;
}

type VoiceState = "idle" | "listening" | "processing" | "speaking";

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

export function Chat({ onGoalCreated, islands, onIslandRemoved, onHistoryCleared, starConfig, onStarClick, userName }: ChatProps) {
  const { isDark: isDarkMode } = useTheme();
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
  const [ttsAmplitude, setTtsAmplitude] = useState(0);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAnimRef = useRef<number>(0);
  const voiceStateRef = useRef<VoiceState>("idle");
  const messagesRef = useRef<Message[]>([]);
  const voicePreferenceRef = useRef<"male" | "female">("female");
  const playTTSRef = useRef<(text: string) => Promise<void>>(async () => {});
  // Safari requires AudioContext to be created during a user gesture.
  // We create + immediately suspend it on the mic tap so it's "unlocked"
  // and can be resumed later for TTS playback without autoplay blocking.
  const safariAudioUnlockedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    voiceStateRef.current = voiceState;
  }, [voiceState]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    voicePreferenceRef.current = voicePreference;
  }, [voicePreference]);

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

      // Keep messagesRef in sync with the completed assistant reply
      // (including the raw content with goal JSON so the full conversation
      // history is sent to the API on the next turn)
      messagesRef.current = [
        ...messagesRef.current,
        { role: "assistant", content: assistantContent },
      ];

      // If in voice mode, play TTS — strip scheduling status lines before speaking
      // (e.g. "Added to your work calendar: Mon, Mar 3..." — not natural spoken)
      const ttsContent = cleanContent
        .split("\n")
        .filter((line) => !line.match(/^(Added to your|Proposed for your|check Calendar tab)/i))
        .join("\n")
        .trim();

      if (fromVoice && ttsContent) {
        await playTTSRef.current(ttsContent);
      } else if (fromVoice) {
        // Nothing to speak — go straight back to listening
        if (voiceStateRef.current !== "idle") {
          setVoiceState("listening");
          voiceStateRef.current = "listening";
          startListening();
        }
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
    console.log("[Voice] Utterance end detected:", text, "state:", voiceStateRef.current);
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

  // ---- TTS Playback (ref-stable so sendMessage's useCallback can call it) ----
  useEffect(() => {
    playTTSRef.current = async (text: string) => {
      setVoiceState("speaking");
      voiceStateRef.current = "speaking";

      function resumeListening() {
        if (voiceStateRef.current !== "idle") {
          setVoiceState("listening");
          voiceStateRef.current = "listening";
          startListening();
        }
      }

      try {
        const res = await fetch("/api/voice/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: voicePreferenceRef.current }),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          console.error("TTS API error:", res.status, errBody);
          throw new Error(`TTS failed: ${res.status} ${errBody}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        // Create and attach audio element to DOM for Safari compatibility
        // Safari requires audio elements in the DOM to use Web Audio API
        const audio = document.createElement("audio");
        audio.style.display = "none";
        audio.preload = "auto";
        document.body.appendChild(audio);
        ttsAudioRef.current = audio;

        // Use a simple sinusoidal pulse for TTS amplitude (avoids AudioContext
        // autoplay restrictions on Safari — Web Audio needs a user gesture context)
        let pulseT = 0;
        function pulseTtsAmplitude() {
          pulseT += 0.05;
          const pulse = 0.25 + Math.sin(pulseT * 3.5) * 0.15;
          setTtsAmplitude(pulse);
          ttsAnimRef.current = requestAnimationFrame(pulseTtsAmplitude);
        }
        ttsAnimRef.current = requestAnimationFrame(pulseTtsAmplitude);

        audio.onended = () => {
          cancelAnimationFrame(ttsAnimRef.current);
          setTtsAmplitude(0);
          URL.revokeObjectURL(url);
          if (audio.parentNode) audio.parentNode.removeChild(audio);
          ttsAudioRef.current = null;
          resumeListening();
        };

        audio.onerror = (e) => {
          console.error("Audio playback error:", e);
          cancelAnimationFrame(ttsAnimRef.current);
          setTtsAmplitude(0);
          URL.revokeObjectURL(url);
          if (audio.parentNode) audio.parentNode.removeChild(audio);
          ttsAudioRef.current = null;
          resumeListening();
        };

        audio.src = url;
        await audio.play();
      } catch (err) {
        console.error("TTS playback error:", err);
        cancelAnimationFrame(ttsAnimRef.current);
        setTtsAmplitude(0);
        resumeListening();
      }
    };
  }, [startListening]);

  // ---- Tap to enter voice mode ----
  function handleTalkClick() {
    if (voiceStateRef.current === "idle") {
      // Unlock audio autoplay on Safari.
      // Safari requires audio.play() to be called during a user gesture.
      // Playing a silent 0-duration audio now primes the audio session
      // so TTS can play later without being blocked.
      if (!safariAudioUnlockedRef.current) {
        try {
          // Method 1: Silent AudioContext pulse
          const ctx = new AudioContext();
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
          ctx.close();
        } catch {
          // Non-critical
        }
        try {
          // Method 2: Silent HTML audio element — more reliably unlocks Safari
          const silentAudio = document.createElement("audio");
          silentAudio.style.display = "none";
          // Shortest valid MP3: 44 bytes of silence
          silentAudio.src = "data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
          document.body.appendChild(silentAudio);
          silentAudio.play().catch(() => {});
          setTimeout(() => {
            if (silentAudio.parentNode) silentAudio.parentNode.removeChild(silentAudio);
          }, 500);
        } catch {
          // Non-critical
        }
        safariAudioUnlockedRef.current = true;
      }

      // Play greeting, then start listening after it finishes
      const greeting = userName
        ? `Hey ${userName}! This is First Mate. What do we want to accomplish?`
        : `Hey! This is First Mate. What do we want to accomplish?`;

      // Set to speaking state for the greeting, then transition to listening
      setVoiceState("speaking");
      voiceStateRef.current = "speaking";

      playTTSRef.current(greeting).then(() => {
        // playTTSRef handles transitioning to "listening" + startListening on finish
      });
    }
  }

  // Exit voice mode — full cleanup
  function exitVoiceMode() {
    // Stop STT
    if (isListening) stopListeningFn();

    // Stop TTS
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      if (ttsAudioRef.current.parentNode) {
        ttsAudioRef.current.parentNode.removeChild(ttsAudioRef.current);
      }
      ttsAudioRef.current = null;
    }
    if (ttsAnimRef.current) cancelAnimationFrame(ttsAnimRef.current);
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

  // In voice mode, add a gentle base pulse so the planet always moves
  // even when there's no audio signal (0.05 base keeps it visually alive)
  const voiceModeBaseAmplitude = inVoiceMode ? 0.05 : 0;
  const effectiveAmplitude = Math.max(currentAmplitude, voiceModeBaseAmplitude);

  return (
    <div className={`relative flex flex-col h-full overflow-hidden transition-colors duration-300 ${
      isDarkMode ? "bg-black" : "bg-white"
    }`}>
      {/* Globe — absolute background filling the entire panel */}
      <div className="absolute inset-0 z-0">
        <Globe
          isActive={isLoading}
          islands={islands}
          onIslandClick={handlePlanetClick}
          starConfig={starConfig}
          onStarClick={onStarClick}
          voiceAmplitude={effectiveAmplitude}
          voiceMode={inVoiceMode}
        />
      </div>

      {/* Voice mode overlay — minimal, planet takes center stage */}
      {inVoiceMode && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-between py-12 pointer-events-none">
          {/* Top area: live transcript */}
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            {voiceState === "listening" && transcript && (
              <p className={`text-sm text-center max-w-xs px-4 leading-relaxed ${isDarkMode ? "text-white/60" : "text-black/50"}`}>
                {transcript}
              </p>
            )}
          </div>

          {/* Bottom area: status label + exit button */}
          <div className="flex flex-col items-center gap-5 pointer-events-auto">
            {/* Status */}
            <p className={`text-xs font-medium tracking-widest uppercase ${isDarkMode ? "text-white/50" : "text-black/40"}`}>
              {voiceStatusLabel}
            </p>

            {/* Voice preference toggle */}
            <button
              onClick={toggleVoicePreference}
              className={`text-[10px] transition-colors cursor-pointer tracking-wide ${isDarkMode ? "text-white/30 hover:text-white/60" : "text-black/30 hover:text-black/60"}`}
            >
              {voicePreference === "female" ? "♀ Female" : "♂ Male"}
            </button>

            {/* Exit button — simple tap */}
            <button
              onClick={exitVoiceMode}
              className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-200 cursor-pointer ${
                isDarkMode
                  ? "bg-white/8 hover:bg-white/15 border-white/15"
                  : "bg-black/5 hover:bg-black/10 border-black/15"
              }`}
              title="Exit voice mode"
            >
              <svg className={`w-4 h-4 ${isDarkMode ? "text-white/50" : "text-black/40"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* STT error */}
            {sttError && (
              <p className="text-red-500/70 text-[10px]">{sttError}</p>
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
                className="px-4 py-1.5 text-sm rounded-full border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/8 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/15 transition-colors cursor-pointer"
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
              className="text-xs text-gray-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer whitespace-nowrap self-center"
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
            className="flex-1 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:border-gray-400 dark:focus:border-white/20 text-sm max-h-32 bg-white dark:bg-white/5"
            disabled={isLoading || inVoiceMode}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gray-900 dark:bg-white/90 hover:bg-gray-700 dark:hover:bg-white disabled:bg-gray-300 dark:disabled:bg-white/20 disabled:cursor-not-allowed text-white dark:text-gray-900 font-medium px-5 py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            Send
          </button>
          {/* Talk button — tap to enter voice mode */}
          <button
            type="button"
            onClick={handleTalkClick}
            className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-400 px-3 py-3 rounded-xl transition-colors cursor-pointer"
            title="Talk to First Mate"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </button>
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
