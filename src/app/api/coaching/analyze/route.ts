import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generatePostRunAnalysis } from "@/lib/groq";

interface AnalyzeRunRow {
  userId: string;
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number | null;
  coachPersonality: string | null;
  splits: Array<{ splitNumber: number; durationS: number; avgPaceSPerKm: number }>;
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

  let body: { runId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { runId } = body;
  if (!runId || typeof runId !== "string") {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const run = (await prisma.run.findUnique({
    where: { id: runId },
    include: {
      splits: { orderBy: { splitNumber: "asc" } },
    },
  })) as AnalyzeRunRow | null;

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const analysis = await generatePostRunAnalysis({
    totalDistanceM: run.totalDistanceM,
    totalDurationS: run.totalDurationS,
    avgPaceSPerKm: run.avgPaceSPerKm ?? 0,
    splits: run.splits.map((s: { splitNumber: number; durationS: number; avgPaceSPerKm: number }) => ({
      splitNumber: s.splitNumber,
      durationS: s.durationS,
      avgPaceSPerKm: s.avgPaceSPerKm,
    })),
    coachPersonality: run.coachPersonality,
  });

  return NextResponse.json({ analysis });
}
