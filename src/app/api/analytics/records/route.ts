import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
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

  // Fetch all completed runs
  const runs = await prisma.run.findMany({
    where: { userId, status: "completed" },
    select: {
      id: true,
      startedAt: true,
      totalDistanceM: true,
      totalDurationS: true,
      avgPaceSPerKm: true,
      elevationGainM: true,
      splits: {
        select: {
          splitNumber: true,
          distanceM: true,
          durationS: true,
          avgPaceSPerKm: true,
        },
        orderBy: { splitNumber: "asc" },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  type RecordEntry = {
    type: string;
    label: string;
    value: number;
    formatted: string;
    unit: string;
    runId: string;
    date: string;
  };

  const records: RecordEntry[] = [];

  // Longest run
  const longestRun = runs.reduce(
    (best, r) => (r.totalDistanceM > (best?.totalDistanceM ?? 0) ? r : best),
    null as (typeof runs)[0] | null
  );
  if (longestRun) {
    records.push({
      type: "longest_run",
      label: "Longest Run",
      value: longestRun.totalDistanceM,
      formatted: `${(longestRun.totalDistanceM / 1000).toFixed(2)} km`,
      unit: "km",
      runId: longestRun.id,
      date: longestRun.startedAt.toISOString(),
    });
  }

  // Fastest avg pace (runs > 1km)
  const fastestPaceRun = runs
    .filter(
      (r) => r.totalDistanceM > 1000 && r.avgPaceSPerKm && r.avgPaceSPerKm > 0
    )
    .reduce(
      (best, r) =>
        (r.avgPaceSPerKm ?? Infinity) < (best?.avgPaceSPerKm ?? Infinity)
          ? r
          : best,
      null as (typeof runs)[0] | null
    );
  if (fastestPaceRun?.avgPaceSPerKm) {
    records.push({
      type: "fastest_pace",
      label: "Fastest Avg Pace",
      value: fastestPaceRun.avgPaceSPerKm,
      formatted: `${formatPace(fastestPaceRun.avgPaceSPerKm)}/km`,
      unit: "min/km",
      runId: fastestPaceRun.id,
      date: fastestPaceRun.startedAt.toISOString(),
    });
  }

  // Most elevation
  const mostElevationRun = runs
    .filter((r) => r.elevationGainM && r.elevationGainM > 0)
    .reduce(
      (best, r) =>
        (r.elevationGainM ?? 0) > (best?.elevationGainM ?? 0) ? r : best,
      null as (typeof runs)[0] | null
    );
  if (mostElevationRun?.elevationGainM) {
    records.push({
      type: "most_elevation",
      label: "Most Elevation",
      value: mostElevationRun.elevationGainM,
      formatted: `${Math.round(mostElevationRun.elevationGainM)} m`,
      unit: "m",
      runId: mostElevationRun.id,
      date: mostElevationRun.startedAt.toISOString(),
    });
  }

  // Fastest 1K split (RunSplit where distanceM ~= 1000)
  const allSplits = runs.flatMap((r) =>
    r.splits
      .filter(
        (s) =>
          s.distanceM >= 900 &&
          s.distanceM <= 1100 &&
          s.avgPaceSPerKm &&
          s.avgPaceSPerKm > 0
      )
      .map((s) => ({ ...s, runId: r.id, runDate: r.startedAt }))
  );
  const fastest1k = allSplits.reduce(
    (best, s) =>
      (s.avgPaceSPerKm ?? Infinity) < (best?.avgPaceSPerKm ?? Infinity)
        ? s
        : best,
    null as (typeof allSplits)[0] | null
  );
  if (fastest1k?.avgPaceSPerKm) {
    records.push({
      type: "fastest_1k",
      label: "Fastest 1K Split",
      value: fastest1k.avgPaceSPerKm,
      formatted: `${formatPace(fastest1k.avgPaceSPerKm)}/km`,
      unit: "min/km",
      runId: fastest1k.runId,
      date: fastest1k.runDate.toISOString(),
    });
  }

  // Fastest 5K — find runs >= 5000m, sum first 5 splits' duration
  const fiveKRuns = runs.filter(
    (r) => r.totalDistanceM >= 5000 && r.splits.length >= 5
  );
  let fastest5kEntry: {
    durationS: number;
    runId: string;
    date: string;
  } | null = null;
  for (const run of fiveKRuns) {
    const first5 = run.splits.slice(0, 5);
    const totalDurationS = first5.reduce((s: number, sp) => s + sp.durationS, 0);
    if (
      !fastest5kEntry ||
      totalDurationS < fastest5kEntry.durationS
    ) {
      fastest5kEntry = {
        durationS: totalDurationS,
        runId: run.id,
        date: run.startedAt.toISOString(),
      };
    }
  }
  if (fastest5kEntry) {
    records.push({
      type: "fastest_5k",
      label: "Fastest 5K",
      value: fastest5kEntry.durationS,
      formatted: formatDuration(fastest5kEntry.durationS),
      unit: "time",
      runId: fastest5kEntry.runId,
      date: fastest5kEntry.date,
    });
  }

  return NextResponse.json({ records });
}
