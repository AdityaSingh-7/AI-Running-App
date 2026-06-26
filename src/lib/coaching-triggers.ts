export interface RunContext {
  distanceMeters: number;
  elapsedSeconds: number;
  currentPaceSecsPerKm: number;
  avgPaceSecsPerKm: number;
  splitCount: number;
  lastSplitPace: number | null;
}

export type CoachingTrigger =
  | "split_complete"
  | "pace_drop"
  | "pace_increase"
  | "milestone"
  | "interval";

const MILESTONE_METERS = [
  { meters: 1000, label: "1 kilometre" },
  { meters: 5000, label: "5 kilometres" },
  { meters: 10000, label: "10 kilometres" },
  { meters: 21097, label: "half marathon" },
  { meters: 42195, label: "marathon" },
];

function formatPace(secsPerKm: number): string {
  if (!secsPerKm || secsPerKm <= 0) return "--:--";
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDistance(meters: number, unit: "km" | "miles"): string {
  if (unit === "miles") {
    return `${(meters / 1609.34).toFixed(2)} miles`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function hasCrossedMilestone(
  prevMeters: number,
  currMeters: number
): { meters: number; label: string } | null {
  for (const milestone of MILESTONE_METERS) {
    if (prevMeters < milestone.meters && currMeters >= milestone.meters) {
      return milestone;
    }
  }
  return null;
}

export function checkTriggers(
  current: RunContext,
  previous: RunContext | null,
  lastTriggerTime: number,
  distanceUnit: "km" | "miles"
): { trigger: CoachingTrigger; message: string } | null {
  const now = Date.now();
  const splitDistanceMeters = distanceUnit === "miles" ? 1609.34 : 1000;

  // 1. Split complete — new split crossed since last check
  if (previous !== null) {
    const prevSplits = Math.floor(previous.distanceMeters / splitDistanceMeters);
    const currSplits = Math.floor(current.distanceMeters / splitDistanceMeters);
    if (currSplits > prevSplits && current.splitCount > 0) {
      return {
        trigger: "split_complete",
        message: buildContextMessage("split_complete", current, distanceUnit),
      };
    }
  }

  // 2. Distance milestone
  if (previous !== null) {
    const milestone = hasCrossedMilestone(
      previous.distanceMeters,
      current.distanceMeters
    );
    if (milestone) {
      return {
        trigger: "milestone",
        message: buildContextMessage("milestone", current, distanceUnit, {
          milestoneLabel: milestone.label,
        }),
      };
    }
  }

  // 3. Pace drop >15% vs average (only when we have meaningful pace data)
  if (
    previous !== null &&
    current.avgPaceSecsPerKm > 0 &&
    current.currentPaceSecsPerKm > 0
  ) {
    const paceRatio = current.currentPaceSecsPerKm / current.avgPaceSecsPerKm;
    if (paceRatio > 1.15) {
      return {
        trigger: "pace_drop",
        message: buildContextMessage("pace_drop", current, distanceUnit),
      };
    }
  }

  // 4. Pace improvement >10% vs average
  if (
    previous !== null &&
    current.avgPaceSecsPerKm > 0 &&
    current.currentPaceSecsPerKm > 0
  ) {
    const paceRatio = current.currentPaceSecsPerKm / current.avgPaceSecsPerKm;
    if (paceRatio < 0.9) {
      return {
        trigger: "pace_increase",
        message: buildContextMessage("pace_increase", current, distanceUnit),
      };
    }
  }

  // 5. Interval check-in: >2 minutes since last trigger
  const MIN_INTERVAL_MS = 2 * 60 * 1000;
  if (
    now - lastTriggerTime >= MIN_INTERVAL_MS &&
    current.distanceMeters > 0 &&
    current.elapsedSeconds > 0
  ) {
    return {
      trigger: "interval",
      message: buildContextMessage("interval", current, distanceUnit),
    };
  }

  return null;
}

function buildContextMessage(
  trigger: CoachingTrigger,
  context: RunContext,
  distanceUnit: "km" | "miles",
  extra?: Record<string, string>
): string {
  const dist = formatDistance(context.distanceMeters, distanceUnit);
  const elapsed = formatTime(context.elapsedSeconds);
  const currentPace = formatPace(context.currentPaceSecsPerKm);
  const avgPace = formatPace(context.avgPaceSecsPerKm);

  const base = `Runner stats — distance: ${dist}, elapsed: ${elapsed}, current pace: ${currentPace}/km, avg pace: ${avgPace}/km.`;

  switch (trigger) {
    case "split_complete":
      return `${base} Split ${context.splitCount} just completed.${
        context.lastSplitPace
          ? ` Split pace: ${formatPace(context.lastSplitPace)}/km.`
          : ""
      } Give split feedback and encouragement for the next split.`;

    case "milestone":
      return `${base} Runner just reached the ${extra?.milestoneLabel ?? "milestone"} mark! Celebrate this achievement.`;

    case "pace_drop": {
      const dropPct =
        context.avgPaceSecsPerKm > 0
          ? Math.round(
              ((context.currentPaceSecsPerKm - context.avgPaceSecsPerKm) /
                context.avgPaceSecsPerKm) *
                100
            )
          : 0;
      return `${base} Pace has dropped ~${dropPct}% below average. Provide supportive feedback and pacing advice.`;
    }

    case "pace_increase": {
      const gainPct =
        context.avgPaceSecsPerKm > 0
          ? Math.round(
              ((context.avgPaceSecsPerKm - context.currentPaceSecsPerKm) /
                context.avgPaceSecsPerKm) *
                100
            )
          : 0;
      return `${base} Pace has improved ~${gainPct}% above average. Acknowledge the improvement and coach accordingly.`;
    }

    case "interval":
      return `${base} Provide a brief mid-run check-in with current progress and encouragement.`;
  }
}

export function getCoachMessage(
  trigger: CoachingTrigger,
  context: RunContext,
  personality: string,
  distanceUnit: "km" | "miles" = "km"
): string {
  return buildContextMessage(trigger, context, distanceUnit);
}
