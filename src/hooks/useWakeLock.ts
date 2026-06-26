"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export interface UseWakeLockReturn {
  isActive: boolean;
  isSupported: boolean;
  request: () => Promise<void>;
  release: () => Promise<void>;
}

export function useWakeLock(active = true): UseWakeLockReturn {
  const isSupported =
    typeof navigator !== "undefined" && "wakeLock" in navigator;

  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setIsActive(false);
    }
  }, []);

  const request = useCallback(async () => {
    if (!isSupported) return;
    try {
      // Release any existing sentinel first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      const sentinel = await navigator.wakeLock.request("screen");
      sentinel.addEventListener("release", () => {
        // The system may release the lock (e.g. tab hidden)
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
          setIsActive(false);
        }
      });
      wakeLockRef.current = sentinel;
      setIsActive(true);
    } catch {
      // Wake lock request may be denied (e.g. low battery)
      setIsActive(false);
    }
  }, [isSupported]);

  // Acquire on mount when active prop is true
  useEffect(() => {
    if (active && isSupported) {
      request();
    }
    return () => {
      // Release on unmount
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isSupported]);

  // Re-acquire when the page becomes visible again
  useEffect(() => {
    if (!isSupported || !active) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        request();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [active, isSupported, request]);

  return { isActive, isSupported, request, release };
}
