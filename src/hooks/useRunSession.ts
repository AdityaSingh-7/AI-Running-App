"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { haversineDistance, calculatePace } from "@/lib/geo";
import { useGeolocation, GeoPosition } from "./useGeolocation";
import { useSimulatedGps } from "./useSimulatedGps";

export type RunStatus = "idle" | "active" | "paused" | "completed";

export interface RunStats {
  distanceMeters: number;
  avgPaceSecsPerKm: number;
  currentPaceSecsPerKm: number;
}

export interface UseRunSessionOptions {
  simulate?: boolean;
}

export interface UseRunSessionReturn {
  status: RunStatus;
  elapsedSeconds: number;
  stats: RunStats;
  positions: GeoPosition[];
  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
  stopRun: () => void;
}

const CURRENT_PACE_WINDOW_SECS = 30;

function computeStats(
  positions: GeoPosition[],
  elapsedSeconds: number
): RunStats {
  if (positions.length < 2) {
    return { distanceMeters: 0, avgPaceSecsPerKm: 0, currentPaceSecsPerKm: 0 };
  }

  // Total distance
  let totalDistance = 0;
  for (let i = 1; i < positions.length; i++) {
    totalDistance += haversineDistance(
      positions[i - 1].latitude,
      positions[i - 1].longitude,
      positions[i].latitude,
      positions[i].longitude
    );
  }

  const avgPaceSecsPerKm = calculatePace(totalDistance, elapsedSeconds);

  // Current pace: use only points within the last CURRENT_PACE_WINDOW_SECS seconds
  const now = positions[positions.length - 1].timestamp;
  const windowStart = now - CURRENT_PACE_WINDOW_SECS * 1000;
  const windowPoints = positions.filter((p) => p.timestamp >= windowStart);

  let currentPaceSecsPerKm = 0;
  if (windowPoints.length >= 2) {
    let windowDist = 0;
    for (let i = 1; i < windowPoints.length; i++) {
      windowDist += haversineDistance(
        windowPoints[i - 1].latitude,
        windowPoints[i - 1].longitude,
        windowPoints[i].latitude,
        windowPoints[i].longitude
      );
    }
    const windowDurationSecs =
      (windowPoints[windowPoints.length - 1].timestamp -
        windowPoints[0].timestamp) /
      1000;
    currentPaceSecsPerKm = calculatePace(windowDist, windowDurationSecs);
  }

  return { distanceMeters: totalDistance, avgPaceSecsPerKm, currentPaceSecsPerKm };
}

export function useRunSession(options: UseRunSessionOptions = {}): UseRunSessionReturn {
  const { simulate = false } = options;
  const [status, setStatus] = useState<RunStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stats, setStats] = useState<RunStats>({
    distanceMeters: 0,
    avgPaceSecsPerKm: 0,
    currentPaceSecsPerKm: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track elapsed time independently of render cycles
  const elapsedRef = useRef(0);

  const realGeo = useGeolocation();
  const simGeo = useSimulatedGps(simulate);
  const { startTracking, stopTracking, positions } = simulate ? simGeo : realGeo;

  // Recompute stats whenever new positions arrive
  useEffect(() => {
    if (status === "active" || status === "paused") {
      setStats(computeStats(positions, elapsedRef.current));
    }
  }, [positions, status]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsedSeconds(elapsedRef.current);
    }, 1000);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startRun = useCallback(() => {
    elapsedRef.current = 0;
    setElapsedSeconds(0);
    setStats({ distanceMeters: 0, avgPaceSecsPerKm: 0, currentPaceSecsPerKm: 0 });
    setStatus("active");
    startTracking();
    startInterval();
  }, [startTracking, startInterval]);

  const pauseRun = useCallback(() => {
    if (status !== "active") return;
    stopInterval();
    stopTracking();
    setStatus("paused");
  }, [status, stopInterval, stopTracking]);

  const resumeRun = useCallback(() => {
    if (status !== "paused") return;
    setStatus("active");
    startTracking();
    startInterval();
  }, [status, startTracking, startInterval]);

  const stopRun = useCallback(() => {
    stopInterval();
    stopTracking();
    setStatus("completed");
  }, [stopInterval, stopTracking]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopInterval();
    };
  }, [stopInterval]);

  return {
    status,
    elapsedSeconds,
    stats,
    positions,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
  };
}
