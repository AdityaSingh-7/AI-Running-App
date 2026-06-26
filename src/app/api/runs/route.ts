import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const createRunSchema = z.object({
  coachPersonality: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const [runs, total] = await Promise.all([
    prisma.run.findMany({
      where: { userId: session.user.id },
      orderBy: { startedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.run.count({
      where: { userId: session.user.id },
    }),
  ]);

  return NextResponse.json({ runs, total, page, limit });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const run = await prisma.run.create({
    data: {
      userId: session.user.id,
      status: "active",
      startedAt: new Date(),
      coachPersonality: parsed.data.coachPersonality,
    },
  });

  return NextResponse.json(run, { status: 201 });
}
