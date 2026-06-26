import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateCoachingWithMemory } from "@/lib/groq";
import { getPersonality } from "@/lib/coaching-personalities";

interface RunContext {
  distanceM?: number;
  durationS?: number;
  currentPaceSPerKm?: number;
  avgPaceSPerKm?: number;
  splitNumber?: number;
  splitDurationS?: number;
  // Weather can be embedded in runContext (sent by VoiceCoach) or as a top-level field
  weather?: WeatherContext;
}

interface WeatherContext {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
}

function formatRunContext(ctx: RunContext): string {
  const lines: string[] = [];

  if (ctx.distanceM !== undefined) {
    lines.push(`Distance covered: ${(ctx.distanceM / 1000).toFixed(2)} km`);
  }
  if (ctx.durationS !== undefined) {
    const mins = Math.floor(ctx.durationS / 60);
    const secs = ctx.durationS % 60;
    lines.push(`Elapsed time: ${mins}:${String(secs).padStart(2, "0")}`);
  }
  if (ctx.currentPaceSPerKm !== undefined) {
    const mins = Math.floor(ctx.currentPaceSPerKm / 60);
    const secs = Math.round(ctx.currentPaceSPerKm % 60);
    lines.push(`Current pace: ${mins}:${String(secs).padStart(2, "0")} min/km`);
  }
  if (ctx.avgPaceSPerKm !== undefined) {
    const mins = Math.floor(ctx.avgPaceSPerKm / 60);
    const secs = Math.round(ctx.avgPaceSPerKm % 60);
    lines.push(`Average pace: ${mins}:${String(secs).padStart(2, "0")} min/km`);
  }
  if (ctx.splitNumber !== undefined) {
    lines.push(`Split number: ${ctx.splitNumber}`);
  }
  if (ctx.splitDurationS !== undefined) {
    const mins = Math.floor(ctx.splitDurationS / 60);
    const secs = ctx.splitDurationS % 60;
    lines.push(`Split time: ${mins}:${String(secs).padStart(2, "0")}`);
  }

  return lines.join("\n") || "Run in progress.";
}

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

  let summary = `Distance: ${distKm} km, Duration: ${durationStr}`;
  if (run.avgPaceSPerKm) {
    const paceMins = Math.floor(run.avgPaceSPerKm / 60);
    const paceSecs = Math.round(run.avgPaceSPerKm % 60);
    summary += `, Avg Pace: ${paceMins}:${String(paceSecs).padStart(2, "0")}/km`;
  }
  summary += `, Date: ${date}`;
  return summary;
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

  let body: { personality?: string; trigger?: string; runContext?: RunContext; weather?: WeatherContext };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { personality = "motivational", trigger = "general", runContext = {}, weather } = body;

  const personalityData = getPersonality(personality);
  if (!personalityData) {
    return NextResponse.json({ error: "Unknown personality" }, { status: 400 });
  }

  // Fetch most recent completed run for memory-aware coaching
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

  const lastRunSummary = lastRun ? formatLastRunSummary(lastRun) : null;
  let contextString = formatRunContext(runContext);

  // Weather can come as a top-level field OR embedded inside runContext
  const effectiveWeather = weather ?? runContext.weather;
  if (effectiveWeather) {
    contextString +=
      `\nWeather: ${effectiveWeather.temperature}°C (feels like ${effectiveWeather.feelsLike}°C), ` +
      `${effectiveWeather.condition}, ${effectiveWeather.humidity}% humidity, wind ${effectiveWeather.windSpeed} km/h`;
  }

  const text = await generateCoachingWithMemory(
    personalityData.systemPrompt,
    contextString,
    trigger,
    lastRunSummary
  );

  return NextResponse.json({ text });
}
