/**
 * useDeepgramSTT — Real-time speech-to-text via Deepgram WebSocket
 *
 * Captures mic audio, streams to Deepgram for real-time transcription,
 * and exposes audioAmplitude (0-1) from the mic's AnalyserNode
 * for driving planet animations.
 *
 * Uses `utterance_end_ms` so Deepgram fires an event when the user
 * stops speaking for a natural pause — this triggers auto-send.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const finalTranscriptRef = useRef("");
  const onUtteranceEndRef = useRef(onUtteranceEnd);

  // Keep callback ref in sync
  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  // Amplitude monitoring loop
  const updateAmplitude = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length / 255; // normalize to 0-1
    setAudioAmplitude(avg);
    animFrameRef.current = requestAnimationFrame(updateAmplitude);
  }, []);

  const cleanup = useCallback(() => {
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

    // Close WebSocket
    if (websocketRef.current) {
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.close();
      }
      websocketRef.current = null;
    }

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

  const startListening = useCallback(async () => {
    setError(null);
    setTranscript("");
    finalTranscriptRef.current = "";

    try {
      // 1. Get mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 2. Set up AudioContext + AnalyserNode for amplitude
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start amplitude monitoring
      animFrameRef.current = requestAnimationFrame(updateAmplitude);

      // 3. Open Deepgram WebSocket
      const dgKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!dgKey || dgKey === "placeholder") {
        setError("Deepgram API key not configured");
        cleanup();
        return;
      }

      // utterance_end_ms=1500 — Deepgram fires UtteranceEnd event when
      // silence exceeds 1.5s after the last final transcript
      const ws = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&smart_format=true&interim_results=true&endpointing=300&utterance_end_ms=1500`,
        ["token", dgKey]
      );
      websocketRef.current = ws;

      ws.onopen = () => {
        // 4. Start MediaRecorder to send audio chunks
        // Safari doesn't support webm — pick a supported format
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(event.data);
          }
        };

        recorder.start(250); // Send chunks every 250ms
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle UtteranceEnd event — user stopped speaking
          if (data.type === "UtteranceEnd") {
            const text = finalTranscriptRef.current.trim();
            if (text && onUtteranceEndRef.current) {
              onUtteranceEndRef.current(text);
              // Reset transcript for next utterance
              finalTranscriptRef.current = "";
              setTranscript("");
            }
            return;
          }

          if (data.channel?.alternatives?.[0]) {
            const alt = data.channel.alternatives[0];
            if (data.is_final) {
              finalTranscriptRef.current += (finalTranscriptRef.current ? " " : "") + alt.transcript;
              setTranscript(finalTranscriptRef.current);
            } else {
              // Show interim results appended to final
              const interim = alt.transcript;
              setTranscript(
                finalTranscriptRef.current + (finalTranscriptRef.current && interim ? " " : "") + interim
              );
            }
          }
        } catch {
          // Skip malformed messages
        }
      };

      ws.onerror = () => {
        setError("Deepgram connection error");
        cleanup();
        setIsListening(false);
      };

      ws.onclose = () => {
        // Cleanup happens via stopListening or error handler
      };

      setIsListening(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start mic";
      setError(msg);
      cleanup();
    }
  }, [cleanup, updateAmplitude]);

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
