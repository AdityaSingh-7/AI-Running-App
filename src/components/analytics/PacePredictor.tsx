"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Split {
  splitNumber: number;
  paceSecsPerKm: number;
}

interface PacePredictorProps {
  splits: Split[];
  targetDistanceKm?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPace(secsPerKm: number): string {
  if (secsPerKm <= 0) return "--:--";
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "--:--";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Linear regression slope for pace over split index.
 * Returns seconds-per-km change per split (negative = getting faster).
 */
function calcPaceTrendSlope(splits: Split[]): number {
  const n = splits.length;
  if (n < 2) return 0;

  // x = 0-indexed split order, y = pace
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += splits[i].paceSecsPerKm;
    sumXY += i * splits[i].paceSecsPerKm;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PacePredictor({ splits, targetDistanceKm }: PacePredictorProps) {
  if (splits.length < 2) return null;

  const slope = calcPaceTrendSlope(splits);

  // Trend: slope < -1 = clearly speeding up, slope > 1 = clearly slowing down, else steady
  const trendLabel =
    slope < -1
      ? "Negative split — picking up pace"
      : slope > 1
      ? "Positive split — slowing down"
      : "Even pace";

  const TrendIcon =
    slope < -1 ? TrendingDown : slope > 1 ? TrendingUp : Minus;

  const trendArrow = slope < -1 ? "↑" : slope > 1 ? "↓" : "→";

  // Actual seconds completed so far (each split = 1 km)
  const actualSecs = splits.reduce((sum, s) => sum + s.paceSecsPerKm, 0);

  // Predicted finish time if targetDistanceKm provided
  let predictedFinishLabel: string | null = null;
  if (targetDistanceKm && targetDistanceKm > splits.length) {
    const completedKm = splits.length;
    const remainingKm = targetDistanceKm - completedKm;
    const lastPace = splits[splits.length - 1].paceSecsPerKm;

    // Extrapolate each remaining km using the linear trend
    let predictedRemainingSecs = 0;
    for (let i = 0; i < remainingKm; i++) {
      const predictedPace = Math.max(120, lastPace + slope * (i + 1)); // clamp at 2:00/km
      predictedRemainingSecs += predictedPace;
    }

    const totalPredicted = actualSecs + predictedRemainingSecs;
    predictedFinishLabel = formatDuration(totalPredicted);
  }

  // Average pace so far
  const avgPaceSoFar = actualSecs / splits.length;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
      {/* Trend icon */}
      <div
        className={[
          "size-8 rounded-lg flex items-center justify-center shrink-0",
          slope < -1 ? "bg-green-50" : slope > 1 ? "bg-amber-50" : "bg-gray-100",
        ].join(" ")}
      >
        <TrendIcon
          className={[
            "size-4",
            slope < -1 ? "text-green-600" : slope > 1 ? "text-amber-600" : "text-gray-500",
          ].join(" ")}
        />
      </div>

      {/* Text block */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none mb-1">
          Pace Prediction
        </p>
        <p
          className={[
            "text-sm font-semibold leading-tight",
            slope < -1 ? "text-green-700" : slope > 1 ? "text-amber-700" : "text-gray-700",
          ].join(" ")}
        >
          {trendLabel} {trendArrow}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Avg so far: {formatPace(avgPaceSoFar)}/km
        </p>
      </div>

      {/* Predicted finish */}
      {predictedFinishLabel && (
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Predicted</p>
          <p className="text-lg font-black text-black tabular-nums leading-none">
            {predictedFinishLabel}
          </p>
        </div>
      )}
    </div>
  );
}
