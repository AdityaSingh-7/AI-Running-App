import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRecoveryAdvice } from "@/lib/groq";
import { estimateRecoveryNeeded } from "@/lib/running-analysis";

function formatLastRunSummary(run: {
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number | null;
  startedAt: Date;
}): string {
  const distKm = (run.totalDistanceM / 1000).toFixed(2);
  const durationMins = Math.floor(run.totalDurationS / 60);
  const durationSecs = run.totalDurationS % 60;
  const durationStr = `${durationMins}:${String(durationSecs).padStart(2, "0")}`;
  const date = run.startedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  let summary = `${distKm} km in ${durationStr} on ${date}`;
  if (run.avgPaceSPerKm) {
    const paceMins = Math.floor(run.avgPaceSPerKm / 60);
    const paceSecs = Math.round(run.avgPaceSPerKm % 60);
    summary += ` at ${paceMins}:${String(paceSecs).padStart(2, "0")}/km avg pace`;
  }
  return summary;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lastRun = await prisma.run.findFirst({
    where: { userId: session.user.id, status: "completed" },
    orderBy: { startedAt: "desc" },
    select: {
      totalDistanceM: true,
      totalDurationS: true,
      avgPaceSPerKm: true,
      startedAt: true,
    },
  });

  if (!lastRun) {
    return NextResponse.json({
      advice: "No runs recorded yet. Lace up and log your first run!",
      intensity: "any",
    });
  }

  const hoursAgo =
    (Date.now() - new Date(lastRun.startedAt).getTime()) / (1000 * 60 * 60);

  if (hoursAgo > 48) {
    return NextResponse.json({
      advice: "You're well rested. Ready for a solid effort!",
      intensity: "any",
    });
  }

  const recovery = estimateRecoveryNeeded({
    totalDistanceM: lastRun.totalDistanceM,
    avgPaceSPerKm: lastRun.avgPaceSPerKm ?? 360,
    startedAt: lastRun.startedAt.toISOString(),
  });

  const runSummary = formatLastRunSummary(lastRun);

  let advice: string;
  if (process.env.GROQ_API_KEY) {
    advice = await generateRecoveryAdvice(
      runSummary,
      recovery.intensity,
      recovery.recoveryHours
    );
  } else {
    advice = recovery.suggestion;
  }

  // Suggest a pace floor for easy/moderate recovery
  let suggestedPace: string | undefined;
  if (lastRun.avgPaceSPerKm) {
    if (recovery.intensity === "hard") {
      // Suggest 90 seconds slower than avg pace
      const easySecs = lastRun.avgPaceSPerKm + 90;
      const mins = Math.floor(easySecs / 60);
      const secs = Math.round(easySecs % 60);
      suggestedPace = `${mins}:${String(secs).padStart(2, "0")}+`;
    } else if (recovery.intensity === "moderate") {
      // Suggest 60 seconds slower
      const easySecs = lastRun.avgPaceSPerKm + 60;
      const mins = Math.floor(easySecs / 60);
      const secs = Math.round(easySecs % 60);
      suggestedPace = `${mins}:${String(secs).padStart(2, "0")}+`;
    }
  }

  return NextResponse.json({
    advice,
    intensity: recovery.intensity,
    ...(suggestedPace ? { suggestedPace } : {}),
    hoursAgo: Math.round(hoursAgo),
    lastRunSummary: runSummary,
  });
}
