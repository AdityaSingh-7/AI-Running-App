"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type VoiceCoachStatus = "idle" | "connecting" | "connected" | "error";

export interface UseVoiceCoachFallbackOptions {
  personality: string;
  enabled: boolean;
}

export interface UseVoiceCoachFallbackReturn {
  status: VoiceCoachStatus;
  isMuted: boolean;
  lastMessage: string;
  speak: (text: string) => void;
  start: () => void;
  stop: () => void;
  mute: () => void;
  unmute: () => void;
}

function isSpeechSynthesisAvailable(): boolean {
  return (
    typeof window !== "undefined" && "speechSynthesis" in window
  );
}

function getVoiceSettings(personality: string): {
  pitch: number;
  rate: number;
  lang: string;
} {
  switch (personality) {
    case "motivational":
      return { pitch: 1.2, rate: 1.05, lang: "en-US" };
    case "analytical":
      return { pitch: 0.95, rate: 1.1, lang: "en-US" };
    case "drill_sergeant":
      return { pitch: 0.8, rate: 1.15, lang: "en-US" };
    default:
      return { pitch: 1.0, rate: 1.0, lang: "en-US" };
  }
}

export function useVoiceCoachFallback({
  personality,
  enabled,
}: UseVoiceCoachFallbackOptions): UseVoiceCoachFallbackReturn {
  const [status, setStatus] = useState<VoiceCoachStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [lastMessage, setLastMessage] = useState("");

  const isMutedRef = useRef(false);
  const isActiveRef = useRef(false);
  const utteranceQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  // Keep muted ref in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const processQueue = useCallback(() => {
    if (
      isSpeakingRef.current ||
      utteranceQueueRef.current.length === 0 ||
      isMutedRef.current ||
      !isSpeechSynthesisAvailable()
    ) {
      return;
    }

    const text = utteranceQueueRef.current.shift();
    if (!text) return;

    const settings = getVoiceSettings(personality);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = settings.pitch;
    utterance.rate = settings.rate;
    utterance.lang = settings.lang;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      // Process any remaining queued messages
      processQueue();
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      processQueue();
    };

    window.speechSynthesis.speak(utterance);
  }, [personality]);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !isActiveRef.current || !isSpeechSynthesisAvailable()) {
        return;
      }

      setLastMessage(text);
      utteranceQueueRef.current.push(text);
      processQueue();
    },
    [enabled, processQueue]
  );

  const start = useCallback(() => {
    if (!isSpeechSynthesisAvailable()) {
      setStatus("error");
      return;
    }

    isActiveRef.current = true;
    setStatus("connected");
  }, []);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    utteranceQueueRef.current = [];
    isSpeakingRef.current = false;

    if (isSpeechSynthesisAvailable()) {
      window.speechSynthesis.cancel();
    }

    setStatus("idle");
  }, []);

  const mute = useCallback(() => {
    isMutedRef.current = true;
    setIsMuted(true);

    if (isSpeechSynthesisAvailable()) {
      window.speechSynthesis.cancel();
    }

    isSpeakingRef.current = false;
  }, []);

  const unmute = useCallback(() => {
    isMutedRef.current = false;
    setIsMuted(false);
  }, []);

  // Cancel speech on unmount
  useEffect(() => {
    return () => {
      if (isSpeechSynthesisAvailable()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { status, isMuted, lastMessage, speak, start, stop, mute, unmute };
}
