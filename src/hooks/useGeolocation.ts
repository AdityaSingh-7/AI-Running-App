"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { haversineDistance } from "@/lib/geo";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
  minAccuracy?: number; // discard points worse than this (meters)
  minDistance?: number; // discard if closer than this to prev (meters)
}

export interface UseGeolocationReturn {
  position: GeoPosition | null;
  error: string | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  positions: GeoPosition[]; // all collected positions
}

const MAX_SPEED_M_S = 12; // ~43 km/h — filter impossible speeds

export function useGeolocation(
  options: UseGeolocationOptions = {}
): UseGeolocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 0,
    timeout = 10000,
    minAccuracy = 30,
    minDistance = 3,
  } = options;

  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [positions, setPositions] = useState<GeoPosition[]>([]);

  const watchIdRef = useRef<number | null>(null);
  const positionsRef = useRef<GeoPosition[]>([]);

  const handleSuccess = useCallback(
    (raw: GeolocationPosition) => {
      const { latitude, longitude, altitude, accuracy, speed, heading } =
        raw.coords;

      // Filter by accuracy
      if (accuracy > minAccuracy) return;

      // Filter impossible speeds (browser may not report speed)
      if (speed !== null && speed > MAX_SPEED_M_S) return;

      const prev =
        positionsRef.current.length > 0
          ? positionsRef.current[positionsRef.current.length - 1]
          : null;

      // Filter by minimum distance to previous point
      if (prev !== null) {
        const dist = haversineDistance(
          prev.latitude,
          prev.longitude,
          latitude,
          longitude
        );
        if (dist < minDistance) return;
      }

      const geoPos: GeoPosition = {
        latitude,
        longitude,
        altitude,
        accuracy,
        speed,
        heading,
        timestamp: raw.timestamp,
      };

      positionsRef.current = [...positionsRef.current, geoPos];
      setPositions(positionsRef.current);
      setPosition(geoPos);
      setError(null);
    },
    [minAccuracy, minDistance]
  );

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err.message);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }
    if (watchIdRef.current !== null) return; // already tracking

    // Reset accumulated positions when starting a fresh track
    positionsRef.current = [];
    setPositions([]);
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, maximumAge, timeout }
    );
    setIsTracking(true);
  }, [enableHighAccuracy, maximumAge, timeout, handleSuccess, handleError]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    position,
    error,
    isTracking,
    startTracking,
    stopTracking,
    positions,
  };
}
