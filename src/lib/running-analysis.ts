export function analyzePaceVariability(
  splits: Array<{ avgPaceSPerKm: number }>
): {
  variabilityPercent: number;
  trend: "even" | "positive_split" | "negative_split";
  suggestion: string;
} {
  if (splits.length < 2) {
    return {
      variabilityPercent: 0,
      trend: "even",
      suggestion: "Not enough splits to analyze pace consistency.",
    };
  }

  const paces = splits.map((s: { avgPaceSPerKm: number }) => s.avgPaceSPerKm);
  const mean = paces.reduce((a: number, b: number) => a + b, 0) / paces.length;
  const variance =
    paces.reduce((sum: number, p: number) => sum + Math.pow(p - mean, 2), 0) /
    paces.length;
  const stdDev = Math.sqrt(variance);
  const variabilityPercent = (stdDev / mean) * 100;

  // Trend: compare first half average to second half average
  const half = Math.floor(paces.length / 2);
  const firstHalfAvg =
    paces.slice(0, half).reduce((a: number, b: number) => a + b, 0) / half;
  const secondHalfAvg =
    paces.slice(half).reduce((a: number, b: number) => a + b, 0) /
    (paces.length - half);

  // Higher pace seconds = slower, so positive split means slowing down
  let trend: "even" | "positive_split" | "negative_split";
  const diff = secondHalfAvg - firstHalfAvg;
  if (Math.abs(diff) < mean * 0.03) {
    trend = "even";
  } else if (diff > 0) {
    trend = "positive_split";
  } else {
    trend = "negative_split";
  }

  let suggestion: string;
  if (variabilityPercent > 10) {
    suggestion =
      "Your pace varies a lot — try more consistent effort throughout the run.";
  } else if (trend === "positive_split") {
    suggestion =
      "You slowed down in the second half. Try starting slightly easier to finish stronger.";
  } else if (trend === "negative_split") {
    suggestion =
      "Great negative split! You ran the second half faster — excellent pacing discipline.";
  } else {
    suggestion =
      "Excellent pace consistency. You're running a well-controlled effort.";
  }

  return { variabilityPercent, trend, suggestion };
}

export function estimateRecoveryNeeded(lastRun: {
  totalDistanceM: number;
  avgPaceSPerKm: number;
  startedAt: string;
}): {
  recoveryHours: number;
  intensity: "easy" | "moderate" | "hard";
  suggestion: string;
} {
  const distanceKm = lastRun.totalDistanceM / 1000;
  // Easy pace baseline ~6:30/km (390s), hard is faster than ~5:00/km (300s)
  const easyPaceThreshold = 390;
  const hardPaceThreshold = 300;

  let intensity: "easy" | "moderate" | "hard";
  if (
    distanceKm > 10 ||
    lastRun.avgPaceSPerKm < hardPaceThreshold
  ) {
    intensity = "hard";
  } else if (
    distanceKm > 6 ||
    lastRun.avgPaceSPerKm < easyPaceThreshold
  ) {
    intensity = "moderate";
  } else {
    intensity = "easy";
  }

  const recoveryHours = intensity === "hard" ? 48 : intensity === "moderate" ? 24 : 12;

  const suggestion =
    intensity === "hard"
      ? "Take it easy today — your body needs 48 hours after a hard effort."
      : intensity === "moderate"
      ? "A light recovery run or rest day is ideal today."
      : "You're recovering well. A gentle run is fine today.";

  return { recoveryHours, intensity, suggestion };
}

export function predictRaceTime(
  recentPaceSecsPerKm: number,
  targetDistanceKm: number
): {
  predictedSeconds: number;
  formatted: string;
} {
  // Riegel formula: t2 = t1 × (d2/d1)^1.06
  // Use a 1km reference time derived from recent pace
  const referenceDistanceKm = 1;
  const referenceTimeS = recentPaceSecsPerKm * referenceDistanceKm;

  const predictedSeconds =
    referenceTimeS * Math.pow(targetDistanceKm / referenceDistanceKm, 1.06);

  const totalSecs = Math.round(predictedSeconds);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  let formatted: string;
  if (hours > 0) {
    formatted = `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  } else {
    formatted = `${mins}:${String(secs).padStart(2, "0")}`;
  }

  return { predictedSeconds, formatted };
}
