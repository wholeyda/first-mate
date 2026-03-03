/**
 * useDeepgramSTT — Real-time speech-to-text via server-side proxy
 *
 * Records mic audio in short chunks and POSTs them to /api/voice/transcribe,
 * which forwards to Deepgram's REST API with a server-side Authorization header.
 *
 * Why not WebSocket directly to Deepgram?
 * - Browser WebSocket cannot set Authorization headers
 * - Safari rejects subprotocol auth ["token", key]
 * - Deepgram does NOT support ?token= URL query param
 *
 * Architecture:
 * 1. AudioContext AnalyserNode monitors mic amplitude for planet animation
 * 2. MediaRecorder collects audio chunks every CHUNK_MS milliseconds
 * 3. When enough audio accumulates, it's POSTed to /api/voice/transcribe
 * 4. Silence detection: when amplitude stays below threshold for SILENCE_MS,
 *    the accumulated transcript is fired via onUtteranceEnd callback
 * 5. Audio is also exposed as audioAmplitude (0-1) for planet animations
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// How often MediaRecorder fires ondataavailable
const CHUNK_MS = 2000;

// RMS amplitude below this = silence
const SILENCE_THRESHOLD = 0.015;

// How long silence must persist before auto-send fires (ms)
const SILENCE_MS = 1200;

interface DeepgramSTTResult {
  /** Start capturing mic and streaming to Deepgram */
  startListening: () => Promise<void>;
  /** Stop mic and return the final transcript */
  stopListening: () => string;
  /** Real-time transcript (updates as user speaks) */
  transcript: string;
  /** Whether the mic is currently active */
  isListening: boolean;
  /** Current mic audio amplitude (0-1) for planet animation */
  audioAmplitude: number;
  /** Error message if something went wrong */
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
  const finalTranscriptRef = useRef("");
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const isListeningRef = useRef(false);

  // Silence detection
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceFiredRef = useRef(false);
  const processingChunkRef = useRef(false);
  const mimeTypeRef = useRef("");

  // Keep callback ref in sync
  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  // Amplitude monitoring loop (also drives silence detection)
  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;

    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);

    // Compute RMS amplitude
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const s = (data[i] - 128) / 128;
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / data.length);
    setAudioAmplitude(Math.min(rms * 4, 1)); // scale up for visibility

    // Silence detection — reset timer when user speaks
    if (rms > SILENCE_THRESHOLD) {
      // User is speaking — clear any pending silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      utteranceFiredRef.current = false;
    } else if (
      isListeningRef.current &&
      finalTranscriptRef.current.trim() &&
      !utteranceFiredRef.current &&
      !silenceTimerRef.current
    ) {
      // Silence detected after speech — start countdown
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        if (
          isListeningRef.current &&
          finalTranscriptRef.current.trim() &&
          !utteranceFiredRef.current
        ) {
          utteranceFiredRef.current = true;
          const text = finalTranscriptRef.current.trim();
          finalTranscriptRef.current = "";
          setTranscript("");
          onUtteranceEndRef.current?.(text);
        }
      }, SILENCE_MS);
    }

    animFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  const cleanup = useCallback(() => {
    isListeningRef.current = false;

    // Clear silence timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // Stop animation frame
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;

    // Stop mic tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setAudioAmplitude(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Send an audio chunk to our server proxy
  const transcribeChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000 || processingChunkRef.current) return;
    processingChunkRef.current = true;

    try {
      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": mimeTypeRef.current || blob.type || "audio/webm" },
        body: blob,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[STT] Transcription error:", res.status, errData);
        processingChunkRef.current = false;
        return;
      }

      const data = await res.json();
      const newText = data.transcript?.trim() ?? "";

      if (newText) {
        finalTranscriptRef.current =
          finalTranscriptRef.current
            ? `${finalTranscriptRef.current} ${newText}`
            : newText;
        setTranscript(finalTranscriptRef.current);
      }
    } catch (err) {
      console.error("[STT] Chunk fetch error:", err);
    } finally {
      processingChunkRef.current = false;
    }
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";
    utteranceFiredRef.current = false;

    try {
      // 1. Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Set up AudioContext + AnalyserNode for amplitude & silence detection
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      isListeningRef.current = true;

      // Start amplitude monitoring
      animFrameRef.current = requestAnimationFrame(updateAmplitude);

      // 3. Pick supported MediaRecorder format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      mimeTypeRef.current = mimeType;

      // 4. Start MediaRecorder — fires chunks to our proxy
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isListeningRef.current) {
          transcribeChunk(event.data);
        }
      };

      recorder.start(CHUNK_MS);
      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start mic";
      console.error("[STT] startListening error:", err);
      setError(msg);
      cleanup();
    }
  }, [cleanup, updateAmplitude, transcribeChunk]);

  const stopListening = useCallback(() => {
    cleanup();
    setIsListening(false);
    const final = finalTranscriptRef.current;
    finalTranscriptRef.current = "";
    setTranscript("");
    return final;
  }, [cleanup]);

  return {
    startListening,
    stopListening,
    transcript,
    isListening,
    audioAmplitude,
    error,
  };
}
