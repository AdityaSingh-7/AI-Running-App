import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateGoalPlan } from "@/lib/groq";

interface GoalRunRow {
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number | null;
  startedAt: Date;
}

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "Groq API key not configured" },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { goal?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { goal } = body;
  if (!goal || typeof goal !== "string" || goal.trim().length === 0) {
    return NextResponse.json({ error: "goal is required" }, { status: 400 });
  }

  // Fetch recent runs for context
  const recentRuns = await prisma.run.findMany({
    where: { userId: session.user.id, status: "completed" },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: {
      totalDistanceM: true,
      totalDurationS: true,
      avgPaceSPerKm: true,
      startedAt: true,
    },
  });

  let recentRunsSummary: string;
  if (recentRuns.length === 0) {
    recentRunsSummary = "No recent runs recorded yet — treat this as a beginner runner.";
  } else {
    recentRunsSummary = recentRuns
      .map((r: GoalRunRow, i: number) => {
        const distKm = (r.totalDistanceM / 1000).toFixed(2);
        const durationMins = Math.floor(r.totalDurationS / 60);
        const date = r.startedAt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        let line = `Run ${i + 1} (${date}): ${distKm} km in ${durationMins} min`;
        if (r.avgPaceSPerKm) {
          const paceMins = Math.floor(r.avgPaceSPerKm / 60);
          const paceSecs = Math.round(r.avgPaceSPerKm % 60);
          line += ` at ${paceMins}:${String(paceSecs).padStart(2, "0")}/km`;
        }
        return line;
      })
      .join("; ");
  }

  const plan = await generateGoalPlan(goal.trim(), recentRunsSummary);

  return NextResponse.json({ plan });
}
