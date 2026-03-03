/**
 * useDeepgramSTT — Speech-to-text via server-side Deepgram proxy
 *
 * Strategy: buffer ALL audio while the user speaks, then send the
 * entire utterance as one blob when silence is detected.
 *
 * Why not WebSocket directly to Deepgram?
 * - Browser WebSocket cannot set Authorization headers
 * - Safari rejects subprotocol auth ["token", key]
 * - Deepgram does NOT support ?token= URL query param
 *
 * Flow:
 * 1. MediaRecorder fires small chunks every 250ms into a buffer array
 * 2. AnalyserNode monitors RMS amplitude at 60fps
 * 3. When RMS drops below SILENCE_THRESHOLD for SILENCE_MS:
 *    - Concatenate all buffered chunks into one blob
 *    - POST the full utterance blob to /api/voice/transcribe
 *    - Fire onUtteranceEnd with the transcript
 * 4. audioAmplitude (0-1) exposed for planet animation
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Small chunks — just for buffering, not individual transcription
const CHUNK_MS = 250;

// RMS amplitude below this = silence
const SILENCE_THRESHOLD = 0.012;

// How long silence must persist before we send (ms)
const SILENCE_MS = 1400;

// Minimum audio duration before we attempt transcription (ms)
// Prevents sending tiny blobs from background noise
const MIN_SPEECH_MS = 300;

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
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const isListeningRef = useRef(false);
  const mimeTypeRef = useRef("");

  // Audio buffering — collect ALL chunks, send on silence
  const audioChunksRef = useRef<Blob[]>([]);
  const speechStartTimeRef = useRef<number>(0);
  const hasSpeechRef = useRef(false);

  // Silence detection
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceFiredRef = useRef(false);
  const isSendingRef = useRef(false);

  // Keep callback ref in sync
  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  // Send all buffered audio as one utterance
  const sendUtterance = useCallback(async () => {
    if (isSendingRef.current) return;
    if (audioChunksRef.current.length === 0) return;

    // Check minimum speech duration
    const speechDuration = Date.now() - speechStartTimeRef.current;
    if (speechDuration < MIN_SPEECH_MS && !hasSpeechRef.current) return;

    isSendingRef.current = true;

    // Grab all buffered chunks and reset buffer immediately
    const chunks = audioChunksRef.current.splice(0);
    hasSpeechRef.current = false;
    utteranceFiredRef.current = true;

    const mimeType = mimeTypeRef.current || "audio/webm";
    const blob = new Blob(chunks, { type: mimeType });

    if (blob.size < 2000) {
      // Too small — probably just background noise
      isSendingRef.current = false;
      utteranceFiredRef.current = false;
      return;
    }

    try {
      const res = await fetch("/api/voice/transcribe", {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error("[STT] Transcription error:", res.status, errData);
        isSendingRef.current = false;
        utteranceFiredRef.current = false;
        return;
      }

      const data = await res.json();
      const text = (data.transcript ?? "").trim();

      if (text && isListeningRef.current) {
        setTranscript(text);
        onUtteranceEndRef.current?.(text);
        setTranscript("");
      }
    } catch (err) {
      console.error("[STT] Send error:", err);
    } finally {
      isSendingRef.current = false;
    }
  }, []);

  // Amplitude monitoring + silence detection (runs at ~60fps)
  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;

    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);

    // RMS amplitude
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) {
      const s = (data[i] - 128) / 128;
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / data.length);
    setAudioAmplitude(Math.min(rms * 5, 1));

    if (rms > SILENCE_THRESHOLD) {
      // User is speaking — clear silence timer, mark that we have real speech
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (!hasSpeechRef.current) {
        hasSpeechRef.current = true;
        speechStartTimeRef.current = Date.now();
      }
      utteranceFiredRef.current = false;
    } else if (
      isListeningRef.current &&
      hasSpeechRef.current &&
      !utteranceFiredRef.current &&
      !silenceTimerRef.current &&
      !isSendingRef.current
    ) {
      // Silence after speech — start countdown to send
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        if (isListeningRef.current && !utteranceFiredRef.current && !isSendingRef.current) {
          sendUtterance();
        }
      }, SILENCE_MS);
    }

    animFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, [sendUtterance]);

  const cleanup = useCallback(() => {
    isListeningRef.current = false;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
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

    audioChunksRef.current = [];
    hasSpeechRef.current = false;
    setAudioAmplitude(0);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    audioChunksRef.current = [];
    hasSpeechRef.current = false;
    utteranceFiredRef.current = false;
    isSendingRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // AudioContext for amplitude monitoring
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

      // Pick best supported format
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      mimeTypeRef.current = mimeType;

      // MediaRecorder buffers audio in small chunks
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0 && isListeningRef.current) {
          audioChunksRef.current.push(event.data);
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
  }, [cleanup, updateAmplitude]);

  const stopListening = useCallback(() => {
    cleanup();
    setIsListening(false);
    setTranscript("");
    return "";
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
