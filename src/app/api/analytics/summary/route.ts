import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getGroqClient } from "@/lib/groq";

function formatPace(secondsPerKm: number): string {
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

interface WeekStats {
  runs: number;
  distanceM: number;
  durationS: number;
  avgPaceSPerKm: number | null;
}

function aggregateRuns(
  runs: Array<{
    totalDistanceM: number;
    totalDurationS: number;
    avgPaceSPerKm: number | null;
  }>
): WeekStats {
  const paced = runs.filter((r) => r.avgPaceSPerKm && r.avgPaceSPerKm > 0);
  return {
    runs: runs.length,
    distanceM: runs.reduce((s: number, r) => s + r.totalDistanceM, 0),
    durationS: runs.reduce((s: number, r) => s + r.totalDurationS, 0),
    avgPaceSPerKm:
      paced.length > 0
        ? paced.reduce((s: number, r) => s + (r.avgPaceSPerKm ?? 0), 0) / paced.length
        : null,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const now = new Date();

  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);
  lastWeekStart.setHours(0, 0, 0, 0);

  const [thisWeekRuns, lastWeekRuns] = await Promise.all([
    prisma.run.findMany({
      where: { userId, status: "completed", startedAt: { gte: thisWeekStart } },
      select: {
        totalDistanceM: true,
        totalDurationS: true,
        avgPaceSPerKm: true,
      },
    }),
    prisma.run.findMany({
      where: {
        userId,
        status: "completed",
        startedAt: { gte: lastWeekStart, lt: thisWeekStart },
      },
      select: {
        totalDistanceM: true,
        totalDurationS: true,
        avgPaceSPerKm: true,
      },
    }),
  ]);

  const thisWeek = aggregateRuns(thisWeekRuns);
  const lastWeek = aggregateRuns(lastWeekRuns);

  // Build a consistency score: runs in last 30 days vs. target of 4/week = ~17
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const last30Runs = await prisma.run.findMany({
    where: { userId, status: "completed", startedAt: { gte: thirtyDaysAgo } },
    select: { startedAt: true },
  });

  // Count unique run days
  const runDays = new Set(
    last30Runs.map((r) => {
      const d = new Date(r.startedAt);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );
  const consistencyPct = Math.min(
    100,
    Math.round((runDays.size / 30) * 100)
  );

  // Build Groq prompt
  const statsStr = [
    `Runs: ${thisWeek.runs}`,
    `Distance: ${(thisWeek.distanceM / 1000).toFixed(1)}km`,
    `Duration: ${Math.floor(thisWeek.durationS / 60)} minutes`,
    thisWeek.avgPaceSPerKm
      ? `Avg pace: ${formatPace(thisWeek.avgPaceSPerKm)}/km`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const comparisonStr = lastWeek.runs > 0
    ? [
        `Last week: ${lastWeek.runs} runs, ${(lastWeek.distanceM / 1000).toFixed(1)}km`,
        lastWeek.avgPaceSPerKm
          ? `avg pace ${formatPace(lastWeek.avgPaceSPerKm)}/km`
          : null,
        thisWeek.distanceM > lastWeek.distanceM
          ? `(+${((thisWeek.distanceM - lastWeek.distanceM) / 1000).toFixed(1)}km vs last week)`
          : `(${((thisWeek.distanceM - lastWeek.distanceM) / 1000).toFixed(1)}km vs last week)`,
      ]
        .filter(Boolean)
        .join(", ")
    : "No runs last week — this is the first week of data.";

  let summary = "";
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a running coach writing a brief weekly summary. Be specific with numbers. Write in an encouraging, direct tone.",
        },
        {
          role: "user",
          content: `Stats this week: ${statsStr}. Last week comparison: ${comparisonStr}. Write a 2-3 sentence motivational summary highlighting progress or areas to focus on. Be specific with numbers.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    summary = completion.choices[0]?.message?.content ?? "";
  } catch {
    summary = "";
  }

  return NextResponse.json({
    summary,
    stats: { thisWeek, lastWeek },
    consistencyPct,
  });
}
