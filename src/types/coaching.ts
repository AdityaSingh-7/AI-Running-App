export type CoachingTrigger =
  | "split_complete"
  | "pace_drop"
  | "pace_increase"
  | "milestone"
  | "interval"
  | "manual";

export interface CoachingEvent {
  trigger: CoachingTrigger;
  timestamp: number;
  message: string;
  context?: Record<string, unknown>;
}

export type VoiceCoachState = "idle" | "connecting" | "connected" | "error";
