"use client";

import { useEffect, useRef, useCallback, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Play, Pause, Square, X } from "lucide-react";
import type { WeatherData } from "@/lib/weather";
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
  const router = useRouter();
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
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#E8F0EC" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          onClick={() => router.back()}
          className="size-10 rounded-full bg-white shadow-md flex items-center justify-center"
          aria-label="Go back"
        >
          <X className="size-5 text-[#2E363B]" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest text-[#6B7680]">
          Tracking
        </span>
        {/* Simulation badge */}
        {simulate ? (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: "#FEF0E6", color: "#C15F3C" }}
          >
            <span className="inline-block size-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#C15F3C" }} />
            Sim
          </div>
        ) : (
          <div className="size-10" aria-hidden />
        )}
      </div>

      {/* Map area */}
      <div className="mx-4 rounded-2xl overflow-hidden shrink-0" style={{ height: 220, backgroundColor: "#B8CFC4" }}>
        <RunMap
          positions={mapPositions}
          isLive={status === "active" || status === "paused"}
          className="w-full h-full"
        />
      </div>

      {/* VoiceCoach — sits below map */}
      <div className="px-4 pt-2 shrink-0">
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

      {/* Metrics section */}
      <div className="flex-1 flex flex-col justify-center px-4 py-2">
        {/* Timer */}
        <div className="text-center mb-5">
          <p
            className="tabular-nums leading-none"
            style={{
              fontWeight: 900,
              fontSize: 80,
              color: "#2E363B",
              letterSpacing: "-2px",
            }}
          >
            {formatDuration(elapsedSeconds)}
          </p>
          <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "#6B7680" }}>
            Elapsed Time
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Distance */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p
              className="tabular-nums font-extrabold leading-tight"
              style={{ fontSize: 28, color: "#C15F3C" }}
            >
              {formatDistance(stats.distanceMeters, "km")}
            </p>
            <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "#6B7680" }}>
              Distance
            </p>
          </div>

          {/* Pace */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p
              className="tabular-nums font-extrabold leading-tight"
              style={{ fontSize: 28, color: "#2E363B" }}
            >
              {formatPace(stats.currentPaceSecsPerKm)}
              <span className="text-sm font-normal ml-1" style={{ color: "#6B7680" }}>
                /km
              </span>
            </p>
            <p className="text-xs uppercase tracking-wide mt-1" style={{ color: "#6B7680" }}>
              Pace
            </p>
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="px-4 pb-8 shrink-0">
        {status === "idle" && (
          <button
            onClick={handleStart}
            className="w-full font-bold text-lg text-white rounded-full flex items-center justify-center gap-2 shadow-md transition-opacity hover:opacity-90"
            style={{ height: 72, backgroundColor: "#C15F3C" }}
          >
            <Play className="size-6 fill-current" />
            Start Run
          </button>
        )}

        {status === "active" && (
          <div className="flex gap-3 items-center">
            <button
              onClick={handlePause}
              className="flex-1 font-bold text-base rounded-full border flex items-center justify-center gap-2 transition-colors"
              style={{ height: 56, borderWidth: 1.5, borderColor: "#2E363B", color: "#2E363B", backgroundColor: "transparent" }}
            >
              <Pause className="size-5 fill-current" />
              Pause
            </button>
            <button
              onClick={handleStop}
              className="shrink-0 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-90"
              style={{ width: 56, height: 56, backgroundColor: "#C15F3C" }}
              aria-label="Stop run"
            >
              <Square className="size-5 fill-white text-white" />
            </button>
          </div>
        )}

        {status === "paused" && (
          <div className="flex gap-3 items-center">
            <button
              onClick={handleResume}
              className="flex-1 font-bold text-base rounded-full border flex items-center justify-center gap-2 transition-colors"
              style={{ height: 56, borderWidth: 1.5, borderColor: "#2E363B", color: "#2E363B", backgroundColor: "transparent" }}
            >
              <Play className="size-5 fill-current" />
              Resume
            </button>
            <button
              onClick={handleStop}
              className="shrink-0 rounded-full flex items-center justify-center shadow-md transition-opacity hover:opacity-90"
              style={{ width: 56, height: 56, backgroundColor: "#C15F3C" }}
              aria-label="Finish run"
            >
              <Square className="size-5 fill-white text-white" />
            </button>
          </div>
        )}

        {status === "completed" && (
          <div className="text-center py-3">
            <p className="font-bold text-[#2E363B] text-lg mb-1">Run Complete</p>
            <p className="text-sm text-[#6B7680]">
              {formatDuration(elapsedSeconds)} &middot;{" "}
              <span className="font-bold" style={{ color: "#C15F3C" }}>
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
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "#E8F0EC" }}
        >
          <p className="text-[#6B7680] text-sm">Loading…</p>
        </div>
      }
    >
      <ActiveRunInner />
    </Suspense>
  );
}
