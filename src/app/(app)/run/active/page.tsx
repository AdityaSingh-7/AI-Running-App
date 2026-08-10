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
          points: pending.map((p: GeoPosition) => ({
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
      .then(async (res: Response) => {
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
      className="fixed inset-0 flex flex-col overflow-hidden bg-[#0B0E14] text-white"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0 border-b border-white/10 bg-[#0F131C]/85 backdrop-blur-2xl">
        <button
          onClick={() => router.back()}
          className="size-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-95"
          aria-label="Go back"
        >
          <X className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#FF5252] animate-ping" />
          <span className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
            LIVE TRACKING
          </span>
        </div>
        {/* Simulation badge */}
        {simulate ? (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-[#FF5252]/20 border border-[#FF5252]/40 text-[#FF5252]"
          >
            <span className="inline-block size-1.5 rounded-full bg-[#FF5252] animate-pulse" />
            SIMULATED
          </div>
        ) : (
          <div className="size-10" aria-hidden />
        )}
      </div>

      {/* Map area */}
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden shrink-0 border border-white/10 shadow-2xl relative" style={{ height: 210, backgroundColor: "#141822" }}>
        <RunMap
          positions={mapPositions}
          isLive={status === "active" || status === "paused"}
          className="w-full h-full"
        />
        <div className="absolute top-2 left-2 pointer-events-none bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-extrabold text-[#38BDF8] uppercase tracking-wider">
          GPS Active
        </div>
      </div>

      {/* VoiceCoach — sits below map */}
      <div className="px-4 pt-3 shrink-0">
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

      {/* Apple Fitness+ Metrics section */}
      <div className="flex-1 flex flex-col justify-center px-4 py-3">
        {/* Main Elapsed Time Display */}
        <div className="text-center mb-4">
          <p
            className="tabular-nums font-mono leading-none tracking-tighter text-white font-black drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            style={{
              fontSize: 78,
            }}
          >
            {formatDuration(elapsedSeconds)}
          </p>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#94A3B8] mt-2">
            Duration
          </p>
        </div>

        {/* 2-Column High-Contrast Stats */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* Distance */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <p
              className="tabular-nums font-mono font-black leading-none text-[#FF5252]"
              style={{ fontSize: 36 }}
            >
              {formatDistance(stats.distanceMeters, "km")}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mt-2">
              Distance (KM)
            </p>
          </div>

          {/* Pace */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 text-center">
            <p
              className="tabular-nums font-mono font-black leading-none text-[#38BDF8]"
              style={{ fontSize: 36 }}
            >
              {formatPace(stats.currentPaceSecsPerKm)}
            </p>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mt-2">
              Current Pace (/KM)
            </p>
          </div>
        </div>
      </div>

      {/* Control buttons */}
      <div className="px-4 pb-8 shrink-0">
        {status === "idle" && (
          <button
            onClick={handleStart}
            className="w-full h-16 rounded-2xl font-black text-xl uppercase tracking-wider text-white bg-[#FF5252] flex items-center justify-center gap-3 athletic-glow-coral transition-all active:scale-95 shadow-2xl"
          >
            <Play className="size-6 fill-current" />
            START RUN
          </button>
        )}

        {status === "active" && (
          <div className="flex gap-3 items-center">
            <button
              onClick={handlePause}
              className="flex-1 h-15 font-black text-base uppercase tracking-wider rounded-2xl border-2 border-white/20 bg-white/10 text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Pause className="size-5 fill-current" />
              PAUSE
            </button>
            <button
              onClick={handleStop}
              className="size-15 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center shadow-2xl transition-all active:scale-95 shrink-0"
              aria-label="Stop run"
            >
              <Square className="size-6 fill-white" />
            </button>
          </div>
        )}

        {status === "paused" && (
          <div className="flex gap-3 items-center">
            <button
              onClick={handleResume}
              className="flex-1 h-15 font-black text-base uppercase tracking-wider rounded-2xl bg-[#FF5252] text-white flex items-center justify-center gap-2 athletic-glow-coral transition-all active:scale-95"
            >
              <Play className="size-5 fill-current" />
              RESUME
            </button>
            <button
              onClick={handleStop}
              className="size-15 rounded-2xl bg-[#EF4444] text-white flex items-center justify-center shadow-2xl transition-all active:scale-95 shrink-0"
              aria-label="Finish run"
            >
              <Square className="size-6 fill-white" />
            </button>
          </div>
        )}

        {status === "completed" && (
          <div className="text-center py-4 glass-card rounded-2xl border border-[#38BDF8]/40">
            <p className="font-black text-[#38BDF8] text-xl uppercase tracking-wider mb-1">RUN COMPLETED 🎉</p>
            <p className="text-sm font-bold text-white">
              {formatDuration(elapsedSeconds)} &middot;{" "}
              <span className="font-mono text-[#FF5252]">
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
          className="fixed inset-0 flex items-center justify-center bg-[#0B0E14]"
        >
          <p className="text-[#94A3B8] text-xs font-black uppercase tracking-widest animate-pulse">Loading Run Engine…</p>
        </div>
      }
    >
      <ActiveRunInner />
    </Suspense>
  );
}
