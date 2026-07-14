import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTrainingRecommendation } from "@/lib/groq";

interface RecRunRow {
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number | null;
  startedAt: Date;
}

export async function GET() {
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

  const recentRuns = (await prisma.run.findMany({
    where: {
      userId: session.user.id,
      status: "completed",
    },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: {
      totalDistanceM: true,
      totalDurationS: true,
      avgPaceSPerKm: true,
      startedAt: true,
    },
  })) as RecRunRow[];

  if (recentRuns.length < 1) {
    return NextResponse.json({
      recommendation:
        "Complete your first run to get personalized recommendations!",
    });
  }

  const recommendation = await generateTrainingRecommendation(
    recentRuns.map((r: RecRunRow) => ({
      totalDistanceM: r.totalDistanceM,
      totalDurationS: r.totalDurationS,
      avgPaceSPerKm: r.avgPaceSPerKm ?? 0,
      startedAt: r.startedAt.toISOString(),
    }))
  );

  return NextResponse.json({ recommendation });
}
