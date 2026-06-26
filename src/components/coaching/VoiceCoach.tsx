"use client";

import { useEffect, useRef, useCallback } from "react";
import { useVoiceCoach } from "@/hooks/useVoiceCoach";
import { checkTriggers, RunContext } from "@/lib/coaching-triggers";
import { getPersonality } from "@/lib/coaching-personalities";
import { playSplitSound } from "@/lib/split-audio";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { WeatherData } from "@/lib/weather";

export interface VoiceCoachProps {
  personality: string;
  isActive: boolean;
  stats: RunContext;
  distanceUnit: "km" | "miles";
  weather?: WeatherData | null;
}

const INTERVAL_TRIGGER_MS = 2 * 60 * 1000; // 2 minutes

function StatusDot({ status }: { status: string }) {
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const isError = status === "error";

  return (
    <span
      className={cn(
        "inline-block size-2 rounded-full",
        isConnected && "bg-[#CFFF04]",
        isConnecting && "animate-pulse bg-yellow-400",
        isError && "bg-red-500",
        !isConnected && !isConnecting && !isError && "bg-gray-400"
      )}
      aria-label={`Coach status: ${status}`}
    />
  );
}

function MuteButton({
  isMuted,
  onMute,
  onUnmute,
}: {
  isMuted: boolean;
  onMute: () => void;
  onUnmute: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={isMuted ? onUnmute : onMute}
      aria-label={isMuted ? "Unmute coach" : "Mute coach"}
      title={isMuted ? "Unmute coach" : "Mute coach"}
    >
      {isMuted ? (
        /* mic-off icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden
        >
          <line x1="2" y1="2" x2="22" y2="22" />
          <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
          <path d="M5 10v2a7 7 0 0 0 12 4.93" />
          <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      ) : (
        /* mic icon */
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      )}
    </Button>
  );
}

export function VoiceCoach({
  personality,
  isActive,
  stats,
  distanceUnit,
  weather,
}: VoiceCoachProps) {
  const { status, isMuted, transcript, isSpeaking, start, stop, mute, unmute, triggerCoaching } =
    useVoiceCoach({ personality, enabled: isActive });

  const coachPersonality = getPersonality(personality);
  const avatar = coachPersonality?.avatar ?? "🏃";
  const displayName = coachPersonality?.displayName ?? "Coach";

  const prevStatsRef = useRef<RunContext | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);
  const lastIntervalTimeRef = useRef<number>(0);
  // Keep a stable ref to weather so callbacks always use the latest value
  const weatherRef = useRef(weather);
  useEffect(() => { weatherRef.current = weather; }, [weather]);

  // Start / stop with isActive
  useEffect(() => {
    if (isActive) {
      start();
    } else {
      stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const handleTrigger = useCallback(
    (context: RunContext) => {
      const result = checkTriggers(
        context,
        prevStatsRef.current,
        lastTriggerTimeRef.current,
        distanceUnit
      );

      if (result) {
        lastTriggerTimeRef.current = Date.now();
        if (result.trigger === "split_complete") {
          playSplitSound();
        }
        // Include weather in runContext so the coaching API can factor it in
        const contextWithWeather = weatherRef.current
          ? { ...context, weather: weatherRef.current }
          : context;
        triggerCoaching(result.trigger, contextWithWeather);
      }

      prevStatsRef.current = context;
    },
    [distanceUnit, triggerCoaching]
  );

  // Check event-based triggers on every stats update
  useEffect(() => {
    if (!isActive || status !== "connected") return;
    handleTrigger(stats);
  }, [stats, isActive, status, handleTrigger]);

  // Periodic 2-minute interval trigger
  useEffect(() => {
    if (!isActive || status !== "connected") return;

    const now = Date.now();
    if (now - lastIntervalTimeRef.current >= INTERVAL_TRIGGER_MS && stats.distanceMeters > 0) {
      lastIntervalTimeRef.current = now;
      triggerCoaching("interval", stats);
    }
  }, [stats, isActive, status, triggerCoaching]);

  return (
    <div className="flex items-center gap-2">
      {/* Weather badge */}
      {weather && (
        <div
          className="flex items-center gap-1 rounded-xl px-2.5 py-2 bg-black/80 backdrop-blur-sm shadow-md border border-white/10 shrink-0"
          aria-label={`Weather: ${weather.temperature}°C, ${weather.condition}`}
        >
          <span className="text-base leading-none select-none" aria-hidden>
            {weather.icon}
          </span>
          <span className="text-xs font-bold text-white tabular-nums">
            {Math.round(weather.temperature)}°C
          </span>
        </div>
      )}

      <div
        className={cn(
          "flex flex-1 items-center gap-2 rounded-xl px-3 py-2",
          "bg-black/80 backdrop-blur-sm shadow-md border border-white/10",
          "text-sm"
        )}
        role="region"
        aria-label="Voice coach"
      >
        {/* Avatar */}
        <span className="text-xl leading-none select-none" aria-hidden>
          {avatar}
        </span>

        {/* Status dot + coach name */}
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusDot status={status} />
          <span className="font-medium text-xs text-white/70">
            {displayName}
          </span>
          {isSpeaking && (
            <span className="text-xs text-[#CFFF04] animate-pulse">speaking</span>
          )}
        </div>

        {/* Last transcript */}
        {transcript && (
          <p className="flex-1 text-xs truncate text-white" title={transcript}>
            {transcript}
          </p>
        )}

        {/* Mute button — only visible when connected */}
        {status === "connected" && (
          <MuteButton isMuted={isMuted} onMute={mute} onUnmute={unmute} />
        )}
      </div>
    </div>
  );
}
