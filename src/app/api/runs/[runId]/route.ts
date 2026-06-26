import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateRunTitle } from "@/lib/groq";

const patchRunSchema = z.object({
  status: z.enum(["active", "completed", "paused"]).optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  totalDistanceM: z.number().nonnegative().optional(),
  totalDurationS: z.number().int().nonnegative().optional(),
  avgPaceSPerKm: z.number().nonnegative().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      points: { orderBy: { timestamp: "asc" } },
      splits: { orderBy: { splitNumber: "asc" } },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Compute stats
  const pointCount = run.points.length;
  const stats = {
    pointCount,
    hasGpsData: pointCount > 0,
    durationFormatted:
      run.totalDurationS > 0
        ? `${Math.floor(run.totalDurationS / 60)}:${String(run.totalDurationS % 60).padStart(2, "0")}`
        : null,
    distanceKm:
      run.totalDistanceM > 0
        ? Math.round(run.totalDistanceM / 10) / 100
        : null,
  };

  return NextResponse.json({ ...run, stats });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  const run = await prisma.run.findUnique({ where: { id: runId } });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { status, ...rest } = parsed.data;

  // When completing a run, generate an AI title if none is set yet
  let aiTitle: string | undefined;
  if (status === "completed" && !run.title) {
    const distanceM =
      parsed.data.totalDistanceM ?? run.totalDistanceM ?? 0;
    const durationS =
      parsed.data.totalDurationS ?? run.totalDurationS ?? 0;
    const avgPace =
      parsed.data.avgPaceSPerKm ?? run.avgPaceSPerKm ?? 0;
    if (distanceM > 0 && durationS > 0 && process.env.GROQ_API_KEY) {
      try {
        aiTitle = await generateRunTitle({
          totalDistanceM: distanceM,
          totalDurationS: durationS,
          avgPaceSPerKm: avgPace,
          startedAt: run.startedAt.toISOString(),
          coachPersonality: run.coachPersonality ?? null,
        });
      } catch {
        // Non-fatal — run completes even without a title
      }
    }
  }

  const updatedRun = await prisma.run.update({
    where: { id: runId },
    data: {
      ...rest,
      ...(status !== undefined ? { status } : {}),
      ...(status === "completed" ? { completedAt: new Date() } : {}),
      ...(aiTitle ? { title: aiTitle } : {}),
    },
  });

  return NextResponse.json(updatedRun);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  const run = await prisma.run.findUnique({ where: { id: runId } });

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (run.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.run.delete({ where: { id: runId } });

  return NextResponse.json({ success: true });
}
