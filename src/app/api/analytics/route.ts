import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface RunRow {
  id: string;
  startedAt: Date;
  completedAt: Date | null;
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number | null;
  title: string | null;
  coachPersonality: string | null;
}

type Period = "7d" | "30d" | "90d" | "all";

function getPeriodStart(period: Period): Date | null {
  if (period === "all") return null;
  const now = new Date();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get("period") ?? "30d";
  const validPeriods: Period[] = ["7d", "30d", "90d", "all"];
  const period: Period = validPeriods.includes(rawPeriod as Period)
    ? (rawPeriod as Period)
    : "30d";

  const periodStart = getPeriodStart(period);

  const whereClause = {
    userId: session.user.id,
    status: "completed",
    ...(periodStart ? { startedAt: { gte: periodStart } } : {}),
  };

  // Fetch all completed runs in period for aggregation
  const runs = (await prisma.run.findMany({
    where: whereClause,
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      totalDistanceM: true,
      totalDurationS: true,
      avgPaceSPerKm: true,
      title: true,
      coachPersonality: true,
    },
  })) as RunRow[];

  // Aggregate stats
  const totalRuns = runs.length;
  const totalDistanceM = runs.reduce((sum: number, r: RunRow) => sum + r.totalDistanceM, 0);
  const totalDurationS = runs.reduce((sum: number, r: RunRow) => sum + r.totalDurationS, 0);

  const runsWithPace = runs.filter(
    (r: RunRow) => r.avgPaceSPerKm !== null && r.avgPaceSPerKm > 0
  );
  const avgPaceSecsPerKm =
    runsWithPace.length > 0
      ? runsWithPace.reduce((sum: number, r: RunRow) => sum + (r.avgPaceSPerKm ?? 0), 0) /
        runsWithPace.length
      : null;

  const longestRunM =
    runs.length > 0 ? Math.max(...runs.map((r: RunRow) => r.totalDistanceM)) : 0;

  const fastestPaceSecsPerKm =
    runsWithPace.length > 0
      ? Math.min(...runsWithPace.map((r: RunRow) => r.avgPaceSPerKm ?? Infinity))
      : null;

  // Group by week
  const weekMap = new Map<string, { distanceM: number; count: number }>();
  for (const run of runs) {
    const week = getISOWeek(run.startedAt);
    const existing = weekMap.get(week) ?? { distanceM: 0, count: 0 };
    weekMap.set(week, {
      distanceM: existing.distanceM + run.totalDistanceM,
      count: existing.count + 1,
    });
  }

  // Sort weeks ascending
  const runsByWeek = Array.from(weekMap.entries())
    .map(([week, data]) => ({ week, ...data }))
    .sort((a, b) => a.week.localeCompare(b.week));

  // Recent runs (last 5)
  const recentRuns = runs.slice(0, 5).map((r: RunRow) => ({
    id: r.id,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    totalDistanceM: r.totalDistanceM,
    totalDurationS: r.totalDurationS,
    avgPaceSPerKm: r.avgPaceSPerKm,
    title: r.title,
    coachPersonality: r.coachPersonality,
  }));

  return NextResponse.json({
    period,
    totalRuns,
    totalDistanceM,
    totalDurationS,
    avgPaceSecsPerKm,
    longestRunM,
    fastestPaceSecsPerKm,
    runsByWeek,
    recentRuns,
  });
}
