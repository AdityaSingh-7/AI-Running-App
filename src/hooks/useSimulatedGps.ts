"use client";
import { useState, useRef, useCallback } from "react";
import type { UseGeolocationReturn, GeoPosition } from "./useGeolocation";
import { SIMULATED_ROUTE } from "@/lib/simulated-route";

const INTERVAL_MS = 1000; // one point per second → ~60 s for the full route

/**
 * Drop-in replacement for the return value of useGeolocation.
 * When `enabled` is false every property is in its initial idle state and
 * startTracking / stopTracking are no-ops, so callers don't need to branch.
 */
export function useSimulatedGps(enabled: boolean): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [positions, setPositions] = useState<GeoPosition[]>([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);
  const positionsRef = useRef<GeoPosition[]>([]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!enabled) return;
    if (intervalRef.current !== null) return; // already running

    // Reset state for a fresh playback
    indexRef.current = 0;
    positionsRef.current = [];
    setPositions([]);
    setPosition(null);

    setIsTracking(true);

    intervalRef.current = setInterval(() => {
      const idx = indexRef.current;
      if (idx >= SIMULATED_ROUTE.length) {
        // Route finished — stop automatically
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsTracking(false);
        return;
      }

      const pt = SIMULATED_ROUTE[idx];
      const geoPos: GeoPosition = {
        latitude: pt.latitude,
        longitude: pt.longitude,
        altitude: pt.altitude,
        accuracy: pt.accuracy,
        speed: pt.speed,
        heading: null,
        timestamp: Date.now(),
      };

      positionsRef.current = [...positionsRef.current, geoPos];
      setPositions(positionsRef.current);
      setPosition(geoPos);
      indexRef.current = idx + 1;
    }, INTERVAL_MS);
  }, [enabled]);

  if (!enabled) {
    return {
      position: null,
      error: null,
      isTracking: false,
      startTracking: () => {},
      stopTracking: () => {},
      positions: [],
    };
  }

  return {
    position,
    error: null,
    isTracking,
    startTracking,
    stopTracking,
    positions,
  };
}
