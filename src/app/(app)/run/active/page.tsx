"use client";

import { useEffect, useRef, useCallback, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Pause, Square } from "lucide-react";
import type { WeatherData } from "@/lib/weather";
import { Button } from "@/components/ui/button";
import { useRunSession } from "@/hooks/useRunSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import { formatPace, formatDistance, formatDuration } from "@/lib/geo";
import type { GeoPosition } from "@/hooks/useGeolocation";
import RunMap from "@/components/map/RunMap";
import { VoiceCoach } from "@/components/coaching/VoiceCoach";

const COACH_PERSONALITY_MAP: Record<string, string> = {
  "coach-mo": "motivational",
  "coach-data": "analytical",
  "sergeant-steel": "drill_sergeant",
};

const GPS_FLUSH_INTERVAL_MS = 10_000;

function ActiveRunInner() {
  const searchParams = useSearchParams();
  const coachId = searchParams.get("coach") ?? "coach-mo";
  const personality = COACH_PERSONALITY_MAP[coachId] ?? "motivational";
  const simulate = searchParams.get("simulate") === "true";

  const { status, elapsedSeconds, stats, positions, startRun, pauseRun, resumeRun, stopRun } =
    useRunSession({ simulate });

  // Keep screen awake while running
  useWakeLock(status === "active");

  // Track the DB run id once created
  const runIdRef = useRef<string | null>(null);

  // Track how many positions have been flushed to the API
  const flushedUpToRef = useRef(0);

  // Weather state — fetched once from first GPS fix
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const weatherFetchedRef = useRef(false);

  // ── Create run in DB when user starts ────────────────────────────────────
  const handleStart = useCallback(async () => {
    startRun();
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachPersonality: coachId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id: string };
        runIdRef.current = data.id;
        flushedUpToRef.current = 0;
      }
    } catch {
      // Non-fatal — run continues locally even if DB creation fails
    }
  }, [startRun, coachId]);

  // ── Flush accumulated GPS points every 10 s while active ─────────────────
  const flushPositions = useCallback(
    async (positionsSnapshot: GeoPosition[]) => {
      const runId = runIdRef.current;
      if (!runId) return;
      const pending = positionsSnapshot.slice(flushedUpToRef.current);
      if (pending.length === 0) return;

      try {
        const body = {
          points: pending.map((p) => ({
            latitude: p.latitude,
            longitude: p.longitude,
            altitude: p.altitude ?? undefined,
            accuracy: p.accuracy,
            speed: p.speed ?? undefined,
            heading: p.heading ?? undefined,
            timestamp: new Date(p.timestamp).toISOString(),
          })),
        };
        const res = await fetch(`/api/runs/${runId}/points`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          flushedUpToRef.current = positionsSnapshot.length;
        }
      } catch {
        // Will retry on next interval
      }
    },
    []
  );

  // Capture a stable ref to positions so the interval always sees the latest
  const positionsRef = useRef<GeoPosition[]>(positions);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  // Fetch weather from first GPS fix
  useEffect(() => {
    if (weatherFetchedRef.current || positions.length === 0) return;
    weatherFetchedRef.current = true;
    const firstPos = positions[0];
    fetch(`/api/weather?lat=${firstPos.latitude}&lng=${firstPos.longitude}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json() as WeatherData;
          setWeather(data);
        }
      })
      .catch(() => {
        // Non-fatal — run continues without weather
      });
  }, [positions]);

  useEffect(() => {
    if (status !== "active") return;
    const id = setInterval(() => {
      flushPositions(positionsRef.current);
    }, GPS_FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, flushPositions]);

  // ── Stop run: patch DB with final stats ──────────────────────────────────
  const handleStop = useCallback(async () => {
    // Flush any remaining points first
    await flushPositions(positionsRef.current);
    stopRun();

    const runId = runIdRef.current;
    if (!runId) return;
    try {
      await fetch(`/api/runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          totalDistanceM: stats.distanceMeters,
          totalDurationS: elapsedSeconds,
          avgPaceSPerKm: stats.avgPaceSecsPerKm,
        }),
      });
    } catch {
      // Best-effort
    }
  }, [stopRun, flushPositions, stats, elapsedSeconds]);

  const handlePause = useCallback(() => pauseRun(), [pauseRun]);
  const handleResume = useCallback(() => resumeRun(), [resumeRun]);

  // Map positions are compatible directly (GeoPosition has latitude/longitude)
  const mapPositions = positions as { latitude: number; longitude: number }[];

  return (
    <div className="fixed inset-0 text-white flex flex-col overflow-hidden" style={{ backgroundColor: "#000000" }}>
      {/* Map — fills all remaining space */}
      <div className="flex-1 relative">
        <RunMap
          positions={mapPositions}
          isLive={status === "active" || status === "paused"}
          className="absolute inset-0 rounded-none"
        />

        {/* VoiceCoach overlay — top of map */}
        <div className="absolute top-4 left-4 right-4 z-10">
          {simulate && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: "#CFFF04", color: "#000000" }}>
              <span className="inline-block size-2 rounded-full bg-black/40 animate-pulse" />
              Simulation
            </div>
          )}
          <VoiceCoach
            personality={personality}
            isActive={status === "active"}
            stats={{
              distanceMeters: stats.distanceMeters,
              elapsedSeconds: elapsedSeconds,
              currentPaceSecsPerKm: stats.currentPaceSecsPerKm,
              avgPaceSecsPerKm: stats.avgPaceSecsPerKm,
              splitCount: Math.floor(stats.distanceMeters / 1000),
              lastSplitPace: null,
            }}
            distanceUnit="km"
            weather={weather}
          />
        </div>

        {/* Floating metrics overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-2xl p-5 border border-white/10" style={{ backgroundColor: "rgba(0,0,0,0.80)", backdropFilter: "blur(12px)" }}>
            {/* Timer */}
            <div className="text-center mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                Duration
              </p>
              <p className="text-6xl font-mono font-bold text-white tabular-nums tracking-tight">
                {formatDuration(elapsedSeconds)}
              </p>
            </div>

            {/* Distance + Pace */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                  Distance
                </p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatDistance(stats.distanceMeters, "km")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
                  Pace
                </p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {formatPace(stats.currentPaceSecsPerKm)}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    /km
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="px-6 py-5" style={{ backgroundColor: "#000000" }}>
        {status === "idle" && (
          <Button
            onClick={handleStart}
            className="w-full font-black uppercase text-lg tracking-wide text-black rounded-full hover:opacity-90 transition-opacity"
            style={{ minHeight: 56, backgroundColor: "#CFFF04", color: "#000000" }}
          >
            <Play className="size-6 fill-current mr-2" />
            Start Run
          </Button>
        )}

        {status === "active" && (
          <div className="flex gap-3">
            <Button
              onClick={handlePause}
              className="flex-1 font-bold text-base rounded-full border-2"
              style={{ minHeight: 56, borderColor: "#ffffff", color: "#ffffff", backgroundColor: "transparent" }}
            >
              <Pause className="size-5 fill-current mr-2" />
              Pause
            </Button>
            <Button
              onClick={handleStop}
              className="flex-1 text-white font-bold text-base rounded-full hover:opacity-90 transition-opacity"
              style={{ minHeight: 56, backgroundColor: "#FF3B30" }}
            >
              <Square className="size-5 fill-current mr-2" />
              Stop
            </Button>
          </div>
        )}

        {status === "paused" && (
          <div className="flex gap-3">
            <Button
              onClick={handleResume}
              className="flex-1 font-black uppercase text-base tracking-wide text-black rounded-full hover:opacity-90 transition-opacity"
              style={{ minHeight: 56, backgroundColor: "#CFFF04", color: "#000000" }}
            >
              <Play className="size-5 fill-current mr-2" />
              Resume
            </Button>
            <Button
              onClick={handleStop}
              className="flex-1 text-white font-bold text-base rounded-full hover:opacity-90 transition-opacity"
              style={{ minHeight: 56, backgroundColor: "#FF3B30" }}
            >
              <Square className="size-5 fill-current mr-2" />
              Finish
            </Button>
          </div>
        )}

        {status === "completed" && (
          <div className="text-center py-2">
            <p className="font-bold text-white text-lg mb-1 uppercase tracking-wide">Run Complete</p>
            <p className="text-sm text-gray-400">
              {formatDuration(elapsedSeconds)} &middot;{" "}
              <span style={{ color: "#CFFF04" }} className="font-bold">
                {formatDistance(stats.distanceMeters, "km")}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActiveRunPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "#000000" }}>
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      }
    >
      <ActiveRunInner />
    </Suspense>
  );
}
