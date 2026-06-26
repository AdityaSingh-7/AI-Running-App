export type RunStatus = "active" | "paused" | "completed" | "discarded";

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

export interface RunStats {
  distanceMeters: number;
  durationSeconds: number;
  currentPaceSecsPerKm: number;
  avgPaceSecsPerKm: number;
  currentSpeed: number;
  elevationGain: number;
  splitCount: number;
}

export interface RunSession {
  id: string;
  status: RunStatus;
  startedAt: Date;
  points: GpsPoint[];
  stats: RunStats;
  coachPersonality?: string;
}
