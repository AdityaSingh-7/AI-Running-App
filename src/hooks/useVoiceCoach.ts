"use client";

import { useState, useRef, useCallback } from "react";

export type VoiceCoachStatus = "idle" | "connecting" | "connected" | "error";

interface UseVoiceCoachOptions {
  personality: string;
  enabled: boolean;
}

interface UseVoiceCoachReturn {
  status: VoiceCoachStatus;
  isMuted: boolean;
  transcript: string;
  isSpeaking: boolean;
  start: () => void;
  stop: () => void;
  mute: () => void;
  unmute: () => void;
  triggerCoaching: (trigger: string, runContext: object) => Promise<void>;
}

export function useVoiceCoach({
  personality,
  enabled,
}: UseVoiceCoachOptions): UseVoiceCoachReturn {
  const [status, setStatus] = useState<VoiceCoachStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const isMutedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Queue: string = coaching text waiting to be spoken
  const queueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);

  // ── helpers ─────────────────────────────────────────────────────────────────

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setIsSpeaking(false);
    isPlayingRef.current = false;
  }, []);

  // Drain the queue: speak the next item if not already playing
  const drainQueue = useCallback(() => {
    if (isPlayingRef.current) return;
    const text = queueRef.current.shift();
    if (!text) return;

    if (isMutedRef.current) {
      // Muted — just clear remaining queue items (caller already set transcript)
      queueRef.current = [];
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    // Try ElevenLabs first
    fetch("/api/coaching/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, personality }),
    })
      .then(async (res) => {
        if (res.status === 503) {
          // No ElevenLabs key — fall back to Web Speech
          throw new Error("NO_TTS");
        }
        if (!res.ok) throw new Error(`speak error ${res.status}`);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      })
      .then((url) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          isPlayingRef.current = false;
          setIsSpeaking(false);
          drainQueue();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          isPlayingRef.current = false;
          setIsSpeaking(false);
          drainQueue();
        };
        audio.play().catch(() => {
          // Autoplay blocked — fall through
          isPlayingRef.current = false;
          setIsSpeaking(false);
          drainQueue();
        });
      })
      .catch((err) => {
        if (err.message === "NO_TTS" && typeof window !== "undefined" && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.onend = () => {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            drainQueue();
          };
          utterance.onerror = () => {
            isPlayingRef.current = false;
            setIsSpeaking(false);
            drainQueue();
          };
          window.speechSynthesis.speak(utterance);
        } else {
          isPlayingRef.current = false;
          setIsSpeaking(false);
          drainQueue();
        }
      });
  }, [personality]);

  // ── public API ───────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    setStatus("connected");
  }, []);

  const stop = useCallback(() => {
    stopCurrentAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    isPlayingRef.current = false;
    setStatus("idle");
  }, [stopCurrentAudio]);

  const mute = useCallback(() => {
    isMutedRef.current = true;
    setIsMuted(true);
    stopCurrentAudio();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
  }, [stopCurrentAudio]);

  const unmute = useCallback(() => {
    isMutedRef.current = false;
    setIsMuted(false);
  }, []);

  const triggerCoaching = useCallback(
    async (trigger: string, runContext: object) => {
      if (!enabled || status !== "connected") return;

      let text = "";
      try {
        const res = await fetch("/api/coaching/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ personality, trigger, runContext }),
        });
        if (res.ok) {
          const data = (await res.json()) as { text?: string };
          text = data.text?.trim() ?? "";
        }
      } catch {
        // Network error — skip this coaching event
        return;
      }

      if (!text) return;

      setTranscript(text);

      if (isMutedRef.current) return;

      queueRef.current.push(text);
      drainQueue();
    },
    [enabled, personality, status, drainQueue]
  );

  return {
    status,
    isMuted,
    transcript,
    isSpeaking,
    start,
    stop,
    mute,
    unmute,
    triggerCoaching,
  };
}
