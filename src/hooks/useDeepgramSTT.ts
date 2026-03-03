/**
 * useDeepgramSTT — Real-time STT via rolling chunk transcription
 *
 * Sends audio to Deepgram every ROLLING_MS while speaking, so transcription
 * happens in parallel with recording (no waiting for full utterance).
 * On silence, flushes any remaining audio and fires onUtteranceEnd.
 *
 * Why chunked HTTP and not WebSocket?
 * - Browser WebSocket cannot set Authorization headers
 * - Safari rejects subprotocol ["token", key]
 * - Deepgram does not support ?token= URL query param
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Send accumulated audio every N ms while the user is actively speaking
const ROLLING_MS = 3000;

// Small MediaRecorder timeslice for smooth buffering
const TIMESLICE_MS = 100;

// RMS below this = silence
const SILENCE_THRESHOLD = 0.012;

// Silence must persist this long before we flush + fire callback (ms)
const SILENCE_MS = 1200;

interface DeepgramSTTResult {
  startListening: () => Promise<void>;
  stopListening: () => string;
  transcript: string;
  isListening: boolean;
  audioAmplitude: number;
  error: string | null;
}

export function useDeepgramSTT(
  onUtteranceEnd?: (transcript: string) => void
): DeepgramSTTResult {
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [audioAmplitude, setAudioAmplitude] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef("");
  const isListeningRef = useRef(false);
  const onUtteranceEndRef = useRef(onUtteranceEnd);

  // Accumulated transcript words from all sent chunks
  const accumulatedRef = useRef("");
  // Chunks buffered since the last send
  const pendingChunksRef = useRef<Blob[]>([]);
  // Whether we've detected real speech (above threshold)
  const hasSpeechRef = useRef(false);
  // Whether we're currently sending a chunk (don't stack requests)
  const sendingRef = useRef(false);
  // Whether utterance has already been fired for this session
  const firedRef = useRef(false);

  // Silence / rolling-send timers
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  // Send whatever is in pendingChunksRef to Deepgram
  const flushChunks = useCallback(async (isFinal: boolean) => {
    if (pendingChunksRef.current.length === 0) return;
    if (sendingRef.current) return;

    const chunks = pendingChunksRef.current.splice(0);
    const mimeType = mimeTypeRef.current || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });

    if (blob.size < 1500) return; // too small, likely silence

    sendingRef.current = true;
    try {
      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      if (!res.ok) {
        console.error("[STT] transcribe error:", res.status);
        return;
      }

      const data = await res.json();
      const text = (data.transcript ?? "").trim();

      if (text) {
        // Append to accumulated — avoid duplicating if Deepgram repeats words
        const prev = accumulatedRef.current;
        accumulatedRef.current = prev ? `${prev} ${text}` : text;
        setTranscript(accumulatedRef.current);
      }

      if (isFinal && !firedRef.current) {
        const full = accumulatedRef.current.trim();
        if (full) {
          firedRef.current = true;
          accumulatedRef.current = "";
          setTranscript("");
          onUtteranceEndRef.current?.(full);
        }
      }
    } catch (err) {
      console.error("[STT] flush error:", err);
    } finally {
      sendingRef.current = false;
    }
  }, []);

  // Amplitude loop — also drives silence detection
  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;

    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);

    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const s = (data[i] - 128) / 128;
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / data.length);
    setAudioAmplitude(Math.min(rms * 5, 1));

    if (rms > SILENCE_THRESHOLD) {
      // Active speech
      hasSpeechRef.current = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      firedRef.current = false;
    } else if (
      isListeningRef.current &&
      hasSpeechRef.current &&
      !firedRef.current &&
      !silenceTimerRef.current
    ) {
      // Silence after speech — countdown to final flush
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        if (!firedRef.current && isListeningRef.current) {
          // Stop rolling sends, do one final flush
          if (rollingTimerRef.current) {
            clearInterval(rollingTimerRef.current);
            rollingTimerRef.current = null;
          }
          flushChunks(true);
        }
      }, SILENCE_MS);
    }

    animFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, [flushChunks]);

  const cleanup = useCallback(() => {
    isListeningRef.current = false;

    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (rollingTimerRef.current) { clearInterval(rollingTimerRef.current); rollingTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    pendingChunksRef.current = [];
    hasSpeechRef.current = false;
    setAudioAmplitude(0);
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    accumulatedRef.current = "";
    pendingChunksRef.current = [];
    hasSpeechRef.current = false;
    firedRef.current = false;
    sendingRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      isListeningRef.current = true;
      animFrameRef.current = requestAnimationFrame(updateAmplitude);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isListeningRef.current) {
          pendingChunksRef.current.push(event.data);
        }
      };

      recorder.start(TIMESLICE_MS);

      // Rolling flush — sends accumulated audio every ROLLING_MS while speaking
      rollingTimerRef.current = setInterval(() => {
        if (hasSpeechRef.current && !firedRef.current && isListeningRef.current) {
          flushChunks(false);
        }
      }, ROLLING_MS);

      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start mic";
      console.error("[STT] startListening error:", err);
      setError(msg);
      cleanup();
    }
  }, [cleanup, updateAmplitude, flushChunks]);

  const stopListening = useCallback(() => {
    cleanup();
    setIsListening(false);
    setTranscript("");
    return "";
  }, [cleanup]);

  return { startListening, stopListening, transcript, isListening, audioAmplitude, error };
}
