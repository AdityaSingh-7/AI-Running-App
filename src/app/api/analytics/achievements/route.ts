import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  calculateAchievements,
  calculateStreak,
  ACHIEVEMENTS,
  type UserStats,
} from "@/lib/achievements";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const runs = await prisma.run.findMany({
    where: { userId, status: "completed" },
    select: {
      startedAt: true,
      totalDistanceM: true,
      avgPaceSPerKm: true,
    },
    orderBy: { startedAt: "asc" },
  });

  if (runs.length === 0) {
    return NextResponse.json({
      achievements: [],
      allAchievements: ACHIEVEMENTS.map(({ id, name, description, emoji }) => ({
        id,
        name,
        description,
        emoji,
        unlocked: false,
      })),
      streak: { current: 0, max: 0 },
      stats: {
        totalRuns: 0,
        totalDistanceM: 0,
        longestRunM: 0,
        fastestPaceSecsPerKm: 0,
        currentStreak: 0,
        maxStreak: 0,
      } satisfies UserStats,
    });
  }

  const totalRuns = runs.length;
  const totalDistanceM = runs.reduce((s: number, r) => s + r.totalDistanceM, 0);
  const longestRunM = Math.max(...runs.map((r) => r.totalDistanceM));

  const paced = runs.filter((r) => r.avgPaceSPerKm && r.avgPaceSPerKm > 0);
  const fastestPaceSecsPerKm =
    paced.length > 0
      ? Math.min(...paced.map((r) => r.avgPaceSPerKm ?? Infinity))
      : 0;

  const streak = calculateStreak(
    runs.map((r) => ({ startedAt: r.startedAt.toISOString() }))
  );

  const stats: UserStats = {
    totalRuns,
    totalDistanceM,
    longestRunM,
    fastestPaceSecsPerKm,
    currentStreak: streak.current,
    maxStreak: streak.max,
  };

  const unlocked = calculateAchievements(stats);
  const unlockedIds = new Set(unlocked.map((a) => a.id));

  const allAchievements = ACHIEVEMENTS.map(
    ({ id, name, description, emoji }) => ({
      id,
      name,
      description,
      emoji,
      unlocked: unlockedIds.has(id),
    })
  );

  return NextResponse.json({
    achievements: unlocked.map(({ id, name, description, emoji }) => ({
      id,
      name,
      description,
      emoji,
    })),
    allAchievements,
    streak,
    stats,
  });
}
