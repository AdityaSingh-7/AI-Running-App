import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const pointSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  heading: z.number().optional(),
  timestamp: z.string().datetime(),
  distanceFromPrevM: z.number().nonnegative().optional(),
  paceAtPointSPerKm: z.number().nonnegative().optional(),
});

const batchPointsSchema = z.object({
  points: z.array(pointSchema).min(1),
});

export async function POST(
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

  if (run.status !== "active") {
    return NextResponse.json(
      { error: "Run is not active" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = batchPointsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data.points.map((point) => ({
    runId,
    latitude: point.latitude,
    longitude: point.longitude,
    altitude: point.altitude ?? null,
    accuracy: point.accuracy ?? null,
    speed: point.speed ?? null,
    heading: point.heading ?? null,
    timestamp: new Date(point.timestamp),
    distanceFromPrevM: point.distanceFromPrevM ?? null,
    paceAtPointSPerKm: point.paceAtPointSPerKm ?? null,
  }));

  const result = await prisma.runPoint.createMany({ data });

  return NextResponse.json({ count: result.count }, { status: 201 });
}
