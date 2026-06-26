import { create } from "zustand";
import { GpsPoint, RunStats } from "@/types/run";

export type RunStatus = "idle" | "active" | "paused" | "completed";

interface RunState {
  // Data
  runId: string | null;
  status: RunStatus;
  coachPersonality: string | null;
  elapsedSeconds: number;
  distanceMeters: number;
  positions: GpsPoint[];
  stats: RunStats;

  // Actions
  setRunId: (id: string | null) => void;
  updateStatus: (status: RunStatus) => void;
  setCoachPersonality: (personality: string | null) => void;
  addPosition: (point: GpsPoint) => void;
  updateStats: (stats: Partial<RunStats>) => void;
  updateElapsed: (seconds: number) => void;
  resetRun: () => void;
}

const DEFAULT_STATS: RunStats = {
  distanceMeters: 0,
  durationSeconds: 0,
  currentPaceSecsPerKm: 0,
  avgPaceSecsPerKm: 0,
  currentSpeed: 0,
  elevationGain: 0,
  splitCount: 0,
};

export const useRunStore = create<RunState>((set) => ({
  // Initial state
  runId: null,
  status: "idle",
  coachPersonality: null,
  elapsedSeconds: 0,
  distanceMeters: 0,
  positions: [],
  stats: { ...DEFAULT_STATS },

  // Actions
  setRunId: (id) => set({ runId: id }),

  updateStatus: (status) => set({ status }),

  setCoachPersonality: (personality) =>
    set({ coachPersonality: personality }),

  addPosition: (point) =>
    set((state) => ({ positions: [...state.positions, point] })),

  updateStats: (incoming) =>
    set((state) => ({
      stats: { ...state.stats, ...incoming },
      distanceMeters: incoming.distanceMeters ?? state.distanceMeters,
    })),

  updateElapsed: (seconds) => set({ elapsedSeconds: seconds }),

  resetRun: () =>
    set({
      runId: null,
      status: "idle",
      coachPersonality: null,
      elapsedSeconds: 0,
      distanceMeters: 0,
      positions: [],
      stats: { ...DEFAULT_STATS },
    }),
}));
