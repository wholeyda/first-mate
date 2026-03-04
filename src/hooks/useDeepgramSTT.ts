/**
 * useDeepgramSTT — Speech-to-text via server-side Deepgram proxy
 *
 * Records the full utterance, then sends it as one complete audio file
 * when silence is detected. This works reliably across all browsers:
 * - Chrome/Firefox: audio/webm (supports streaming chunks)
 * - Safari: audio/mp4 (requires complete file — no partial chunks)
 *
 * Why not WebSocket directly to Deepgram?
 * - Browser WebSocket cannot set Authorization headers
 * - Safari rejects subprotocol auth ["token", key]
 * - Deepgram does not support ?token= URL query param
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// MediaRecorder timeslice — small so we accumulate smoothly
const TIMESLICE_MS = 100;

// RMS below this = silence
const SILENCE_THRESHOLD = 0.012;

// Silence must persist this long before we send (ms)
const SILENCE_MS = 1100;

// Minimum speech detected before we'll send (avoids sending noise)
const MIN_SPEECH_CHUNKS = 5; // ~500ms of actual speech

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

  // All audio chunks buffered since startListening
  const allChunksRef = useRef<Blob[]>([]);
  // Chunks that contain actual speech (above threshold)
  const speechChunkCountRef = useRef(0);
  // Whether we've seen speech above threshold
  const hasSpeechRef = useRef(false);
  // Whether the final send has fired
  const firedRef = useRef(false);
  // Whether a send is in progress
  const sendingRef = useRef(false);

  // Silence timer
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  const sendUtterance = useCallback(async () => {
    if (firedRef.current || sendingRef.current) return;
    if (allChunksRef.current.length === 0) return;
    if (speechChunkCountRef.current < MIN_SPEECH_CHUNKS) return;

    firedRef.current = true;
    sendingRef.current = true;

    const chunks = allChunksRef.current.slice();
    const mimeType = mimeTypeRef.current || "audio/webm";
    // Strip codec params for Deepgram — just the base mime type
    const baseMime = mimeType.split(";")[0].trim();
    const blob = new Blob(chunks, { type: baseMime });

    // Show "processing" in transcript while we wait
    setTranscript("...");

    try {
      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": baseMime },
        body: blob,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[STT] transcribe error:", res.status, errData);
        setTranscript("");
        sendingRef.current = false;
        firedRef.current = false;
        return;
      }

      const data = await res.json();
      const text = (data.transcript ?? "").trim();

      setTranscript(text || "");

      if (text && isListeningRef.current) {
        onUtteranceEndRef.current?.(text);
        setTranscript("");
      } else if (!text) {
        // No speech detected — reset and keep listening
        firedRef.current = false;
        allChunksRef.current = [];
        speechChunkCountRef.current = 0;
        hasSpeechRef.current = false;
      }
    } catch (err) {
      console.error("[STT] send error:", err);
      setTranscript("");
      firedRef.current = false;
    } finally {
      sendingRef.current = false;
    }
  }, []);

  // Amplitude loop + silence detection
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
      !sendingRef.current &&
      !silenceTimerRef.current
    ) {
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        if (isListeningRef.current && !firedRef.current && !sendingRef.current) {
          sendUtterance();
        }
      }, SILENCE_MS);
    }

    animFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, [sendUtterance]);

  const cleanup = useCallback(() => {
    isListeningRef.current = false;

    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = 0; }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    allChunksRef.current = [];
    hasSpeechRef.current = false;
    speechChunkCountRef.current = 0;
    setAudioAmplitude(0);
  }, []);

  useEffect(() => { return cleanup; }, [cleanup]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    allChunksRef.current = [];
    speechChunkCountRef.current = 0;
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

      // Pick best format — prefer webm+opus (Chrome/Firefox), then webm, then ogg+opus.
      // Deliberately avoid audio/mp4: Safari produces a fragmented mp4 container
      // which Deepgram's pre-recorded REST API rejects with a 400 Bad Request.
      // Leaving mimeType empty on Safari lets the browser choose its default,
      // which on modern Safari is audio/mp4 — but we override below if unsupported.
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "";
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0 && isListeningRef.current) {
          allChunksRef.current.push(event.data);
          // Count chunks that arrive while speech is active
          if (hasSpeechRef.current) {
            speechChunkCountRef.current++;
          }
        }
      };

      recorder.start(TIMESLICE_MS);
      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start mic";
      console.error("[STT] startListening error:", err);
      setError(msg);
      cleanup();
    }
  }, [cleanup, updateAmplitude]);

  const stopListening = useCallback(() => {
    cleanup();
    setIsListening(false);
    setTranscript("");
    return "";
  }, [cleanup]);

  return { startListening, stopListening, transcript, isListening, audioAmplitude, error };
}
