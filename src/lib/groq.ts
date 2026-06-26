import Groq from "groq-sdk";

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new Groq({ apiKey });
}

export async function generateCoachingResponse(
  systemPrompt: string,
  runContext: string,
  trigger: string
): Promise<string> {
  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `[Trigger: ${trigger}]\n${runContext}\n\nGive a short coaching response (under 40 words).`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generateCoachingWithMemory(
  systemPrompt: string,
  runContext: string,
  trigger: string,
  lastRunSummary: string | null
): Promise<string> {
  if (!lastRunSummary) {
    return generateCoachingResponse(systemPrompt, runContext, trigger);
  }

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Previous run: ${lastRunSummary}\n\nCurrent run: ${runContext}\n\n[Trigger: ${trigger}]\nReference the previous run if relevant. Give a short coaching response (under 40 words).`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generatePostRunAnalysis(runData: {
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number;
  splits: Array<{
    splitNumber: number;
    durationS: number;
    avgPaceSPerKm: number;
  }>;
  coachPersonality: string | null;
}): Promise<string> {
  const splitsTable = runData.splits
    .map(
      (s) =>
        `  Split ${s.splitNumber}: ${formatPace(s.avgPaceSPerKm)} min/km (${s.durationS}s)`
    )
    .join("\n");

  const userMessage = `Run data:
${JSON.stringify(
  {
    totalDistanceM: runData.totalDistanceM,
    totalDurationS: runData.totalDurationS,
    avgPaceSPerKm: runData.avgPaceSPerKm,
    coachPersonality: runData.coachPersonality,
  },
  null,
  2
)}

Splits breakdown:
${splitsTable || "  No splits recorded"}`;

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an expert running coach analyzing a completed run. Give specific, actionable feedback about pacing strategy, consistency, and areas for improvement. Reference specific split numbers and pace data. Keep it under 150 words.",
      },
      { role: "user", content: userMessage },
    ],
    max_tokens: 300,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generateTrainingRecommendation(
  recentRuns: Array<{
    totalDistanceM: number;
    totalDurationS: number;
    avgPaceSPerKm: number;
    startedAt: string;
  }>
): Promise<string> {
  const runsSummary = recentRuns
    .map(
      (r, i) =>
        `Run ${i + 1} (${r.startedAt}): ${(r.totalDistanceM / 1000).toFixed(2)}km, avg pace ${formatPace(r.avgPaceSPerKm)} min/km, duration ${Math.floor(r.totalDurationS / 60)}min`
    )
    .join("\n");

  const userMessage = `Recent training history (most recent first):\n${runsSummary}`;

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an expert running coach. Based on the runner's recent training history, suggest their next run. Be specific about distance, pace, and type (easy, tempo, intervals, long run). Consider recovery and progressive overload. Keep it under 80 words.",
      },
      { role: "user", content: userMessage },
    ],
    max_tokens: 200,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? "";
}

function formatPace(paceSPerKm: number): string {
  const mins = Math.floor(paceSPerKm / 60);
  const secs = Math.round(paceSPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export async function generateRunTitle(runData: {
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number;
  startedAt: string; // ISO date
  coachPersonality: string | null;
}): Promise<string> {
  const distanceKm = (runData.totalDistanceM / 1000).toFixed(2);
  const durationMins = Math.round(runData.totalDurationS / 60);
  const paceStr = formatPace(runData.avgPaceSPerKm);
  const hour = new Date(runData.startedAt).getHours();
  const timeOfDay =
    hour < 6
      ? "night"
      : hour < 12
        ? "morning"
        : hour < 17
          ? "afternoon"
          : hour < 21
            ? "evening"
            : "night";

  const userMessage =
    `Distance: ${distanceKm}km, duration: ${durationMins} min, avg pace: ${paceStr} min/km, ` +
    `time of day: ${timeOfDay}, coach personality: ${runData.coachPersonality ?? "default"}.`;

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          'Generate a short, catchy run title (3-6 words). Consider: time of day, distance, pace (was it fast/tempo/easy?), any notable achievement. Examples: "Morning Tempo Blast", "Easy Evening 5K", "New PR — Sub-25!", "Rainy Recovery Run". Return ONLY the title, nothing else.',
      },
      { role: "user", content: userMessage },
    ],
    max_tokens: 30,
    temperature: 0.9,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  // Strip surrounding quotes if the model wraps in them
  return raw.replace(/^["']|["']$/g, "").trim();
}

export async function generateGoalPlan(
  goal: string,
  recentRunsSummary: string
): Promise<string> {
  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are an expert running coach. Generate specific, actionable training plans. Format your response as markdown with clear week headers and daily workouts. Include rest days. Be concise and practical.",
      },
      {
        role: "user",
        content: `The runner's goal is: ${goal}. Based on their recent runs: ${recentRunsSummary}. Generate a specific 4-week training plan. Format as markdown with weeks and daily workouts. Include rest days. Keep it under 300 words.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function generateRecoveryAdvice(
  lastRunSummary: string,
  intensity: "easy" | "moderate" | "hard",
  recoveryHours: number
): Promise<string> {
  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "You are a recovery-focused running coach. Give brief, practical recovery advice in one to two sentences. Be specific about pace guidelines or activity type.",
      },
      {
        role: "user",
        content: `Last run: ${lastRunSummary}. Intensity: ${intensity}. Estimated recovery needed: ${recoveryHours} hours. Give short, natural-language advice about today's recommended activity. Under 40 words.`,
      },
    ],
    max_tokens: 100,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content ?? "";
}
