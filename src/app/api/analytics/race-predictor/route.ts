import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Riegel formula: T2 = T1 × (D2 / D1)^1.06
function riegelPredict(
  bestTimeS: number,
  bestDistanceM: number,
  targetDistanceM: number
): number {
  return bestTimeS * Math.pow(targetDistanceM / bestDistanceM, 1.06);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Get runs > 3km for a meaningful pace sample, last 90 days preferred
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const recentRuns = await prisma.run.findMany({
    where: {
      userId,
      status: "completed",
      totalDistanceM: { gte: 3000 },
      avgPaceSPerKm: { gt: 0 },
      startedAt: { gte: ninetyDaysAgo },
    },
    select: {
      totalDistanceM: true,
      totalDurationS: true,
      avgPaceSPerKm: true,
    },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  if (recentRuns.length === 0) {
    return NextResponse.json({
      predictions: [],
      message: "Complete at least one run over 3km to see race predictions.",
    });
  }

  // Find the run with the best (lowest) pace as our reference point
  const bestRun = recentRuns.reduce(
    (best, r) =>
      (r.avgPaceSPerKm ?? Infinity) < (best?.avgPaceSPerKm ?? Infinity)
        ? r
        : best,
    null as (typeof recentRuns)[0] | null
  )!;

  const referenceDistanceM = bestRun.totalDistanceM;
  const referenceTimeS = bestRun.totalDurationS;

  const targets = [
    { distance: "5K", distanceKm: 5, distanceM: 5000 },
    { distance: "10K", distanceKm: 10, distanceM: 10000 },
    { distance: "Half Marathon", distanceKm: 21.1, distanceM: 21097.5 },
    { distance: "Marathon", distanceKm: 42.2, distanceM: 42195 },
  ];

  const predictions = targets.map((target) => {
    const predictedSeconds = riegelPredict(
      referenceTimeS,
      referenceDistanceM,
      target.distanceM
    );
    return {
      distance: target.distance,
      distanceKm: target.distanceKm,
      predictedSeconds: Math.round(predictedSeconds),
      formatted: formatTime(predictedSeconds),
    };
  });

  return NextResponse.json({
    predictions,
    basedOnRun: {
      distanceKm: (referenceDistanceM / 1000).toFixed(2),
      durationS: referenceTimeS,
      paceSPerKm: bestRun.avgPaceSPerKm,
    },
  });
}
