"use client";

import * as React from "react";
import Link from "next/link";
import {
  Play,
  TrendingUp,
  Route,
  Clock,
  Trophy,
  Activity,
  Zap,
  Flame,
  Star,
  ChevronRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPace, formatDistance, formatDuration } from "@/lib/geo";
import { PersonalRecords } from "@/components/analytics/PersonalRecords";
import { RacePredictor } from "@/components/analytics/RacePredictor";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "all";

interface WeeklyBucket {
  week: string;
  distanceM: number;
  count: number;
}

interface RecentRun {
  id: string;
  startedAt: string;
  completedAt: string | null;
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number | null;
  title: string | null;
  coachPersonality: string | null;
}

interface AnalyticsData {
  period: Period;
  totalRuns: number;
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSecsPerKm: number | null;
  longestRunM: number;
  fastestPaceSecsPerKm: number | null;
  runsByWeek: WeeklyBucket[];
  recentRuns: RecentRun[];
}

interface SummaryData {
  summary: string;
  stats: {
    thisWeek: { runs: number; distanceM: number; durationS: number; avgPaceSPerKm: number | null };
    lastWeek: { runs: number; distanceM: number; durationS: number; avgPaceSPerKm: number | null };
  };
  consistencyPct: number;
}

interface AchievementEntry {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
}

interface AchievementsData {
  allAchievements: AchievementEntry[];
  streak: { current: number; max: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseISOWeekMonday(isoWeek: string): Date {
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return new Date();
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
  return monday;
}

function formatWeekLabel(isoWeek: string): string {
  const monday = parseISOWeekMonday(isoWeek);
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRunDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Bar chart tooltip ────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  value: number;
  payload: { week: string; distanceKm: number; count: number };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function WeekTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const { distanceKm, count } = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground mb-1">
        {label ? formatWeekLabel(label) : ""}
      </p>
      <p className="font-semibold text-black">
        {distanceKm.toFixed(1)}{" "}
        <span className="text-xs font-normal text-muted-foreground">km</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "run" : "runs"}
      </p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: React.ElementType;
}

function StatCard({
  label,
  value,
  unit,
  icon: Icon,
}: StatCardProps) {
  return (
    <Card className="bg-white border border-gray-200">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500 truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-1 mt-2 flex-wrap">
              <span className="text-4xl font-black text-black leading-none">
                {value}
              </span>
              {unit && (
                <span className="text-sm text-muted-foreground">{unit}</span>
              )}
            </div>
          </div>
          <Icon className="size-5 text-black shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center">
        <Activity className="size-9 text-black" />
      </div>
      <div>
        <p className="text-black font-black text-lg uppercase tracking-wide">No runs yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Complete your first run to see your stats, charts, and progress here.
        </p>
      </div>
      <Link href="/run">
        <Button className="gap-2 mt-2 bg-[#CFFF04] text-black font-black uppercase hover:bg-[#b8e004] border-0">
          <Play className="size-3.5 fill-current" />
          Start Your First Run
        </Button>
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [period, setPeriod] = React.useState<Period>("30d");
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Onboarding banner: show if user hasn't completed onboarding
  const [showOnboardingBanner, setShowOnboardingBanner] = React.useState(false);
  React.useEffect(() => {
    const done = localStorage.getItem("onboarding_complete");
    setShowOnboardingBanner(!done);
  }, []);

  // AI recommendation state
  const [recommendation, setRecommendation] = React.useState<string | null>(null);
  const [recLoading, setRecLoading] = React.useState(true);
  const [recNoKey, setRecNoKey] = React.useState(false);

  // Weekly summary state
  const [summaryData, setSummaryData] = React.useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = React.useState(true);

  // Achievements state
  const [achievementsData, setAchievementsData] = React.useState<AchievementsData | null>(null);
  const [achievementsLoading, setAchievementsLoading] = React.useState(true);

  // Fetch recommendation once on mount
  React.useEffect(() => {
    setRecLoading(true);
    fetch("/api/coaching/recommend")
      .then(async (res) => {
        if (res.status === 503) { setRecNoKey(true); return; }
        if (!res.ok) throw new Error("Failed");
        const json = await res.json() as { recommendation?: string; message?: string };
        setRecommendation(json.recommendation ?? json.message ?? null);
      })
      .catch(() => { /* silent — optional feature */ })
      .finally(() => setRecLoading(false));
  }, []);

  // Fetch weekly summary once on mount
  React.useEffect(() => {
    setSummaryLoading(true);
    fetch("/api/analytics/summary")
      .then((r) => r.json())
      .then((d: SummaryData) => setSummaryData(d))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  // Fetch achievements once on mount
  React.useEffect(() => {
    setAchievementsLoading(true);
    fetch("/api/analytics/achievements")
      .then((r) => r.json())
      .then((d: AchievementsData) => setAchievementsData(d))
      .catch(() => {})
      .finally(() => setAchievementsLoading(false));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/analytics?period=${period}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
        return res.json() as Promise<AnalyticsData>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const chartData = React.useMemo(
    () =>
      (data?.runsByWeek ?? []).map((d) => ({
        ...d,
        distanceKm: parseFloat((d.distanceM / 1000).toFixed(2)),
      })),
    [data?.runsByWeek]
  );

  const periods: { value: Period; label: string }[] = [
    { value: "7d", label: "7D" },
    { value: "30d", label: "30D" },
    { value: "90d", label: "90D" },
    { value: "all", label: "ALL" },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <div className="rounded-2xl bg-[#CFFF04] px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-black text-black uppercase tracking-tight">
              New here? Set up your profile
            </p>
            <p className="text-sm text-black/70 mt-0.5">
              Pick your goal, choose a coach, and test your voice in 2 minutes.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/onboarding">
              <Button className="h-9 px-4 bg-black text-white font-black uppercase hover:bg-black/80 border-0 text-sm">
                Get Started →
              </Button>
            </Link>
            <button
              onClick={() => {
                localStorage.setItem("onboarding_complete", "skipped");
                setShowOnboardingBanner(false);
              }}
              className="text-black/50 hover:text-black text-lg leading-none p-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black uppercase tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Track your progress and training load.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-1">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value as Period)}
                className={
                  period === p.value
                    ? "px-3 py-1.5 text-sm font-black text-black underline underline-offset-4 decoration-2"
                    : "px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-black"
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link href="/run">
            <Button className="h-9 px-4 bg-[#CFFF04] text-black font-black uppercase hover:bg-[#b8e004] border-0 gap-2">
              <Play className="size-3.5 fill-current" />
              Start a Run
            </Button>
          </Link>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-5">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card>
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setPeriod((p) => p)}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.totalRuns === 0 && <EmptyState />}

      {/* Main content */}
      {!loading && !error && data && data.totalRuns > 0 && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Runs"
              value={String(data.totalRuns)}
              icon={TrendingUp}
            />
            <StatCard
              label="Total Distance"
              value={(data.totalDistanceM / 1000).toFixed(1)}
              unit="km"
              icon={Route}
            />
            <StatCard
              label="Avg Pace"
              value={
                data.avgPaceSecsPerKm != null
                  ? formatPace(data.avgPaceSecsPerKm)
                  : "--:--"
              }
              unit="/km"
              icon={Clock}
            />
            <StatCard
              label="Longest Run"
              value={(data.longestRunM / 1000).toFixed(1)}
              unit="km"
              icon={Trophy}
            />
          </div>

          {/* Streak + Consistency row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Streak badge */}
            <Card className="bg-black border-black text-white">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Flame className="size-5 text-[#CFFF04]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-widest text-white/60">
                      Current Streak
                    </p>
                    {achievementsLoading ? (
                      <div className="h-8 w-20 bg-white/20 rounded animate-pulse mt-1" />
                    ) : (
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-4xl font-black text-[#CFFF04] leading-none">
                          {achievementsData?.streak.current ?? 0}
                        </span>
                        <span className="text-sm text-white/60">
                          {achievementsData?.streak.current === 1 ? "day" : "days"}
                        </span>
                        {(achievementsData?.streak.max ?? 0) > 0 && (
                          <span className="text-xs text-white/40 ml-1">
                            best: {achievementsData?.streak.max}d
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Consistency */}
            <Card className="bg-white border border-gray-200">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Activity className="size-5 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
                      Consistency (30d)
                    </p>
                    {summaryLoading ? (
                      <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1" />
                    ) : (
                      <>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-3xl font-black text-black leading-none">
                            {summaryData?.consistencyPct ?? 0}
                          </span>
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#CFFF04] rounded-full transition-all duration-500"
                            style={{ width: `${summaryData?.consistencyPct ?? 0}%` }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weekly AI Summary */}
          <Card className="bg-black border-black text-white">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Star className="size-4 text-[#CFFF04]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                    Weekly Summary
                  </p>
                  {summaryLoading && (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-white/20 rounded w-4/5" />
                      <div className="h-4 bg-white/20 rounded w-3/5" />
                    </div>
                  )}
                  {!summaryLoading && summaryData?.summary && (
                    <p className="text-sm text-white leading-relaxed">{summaryData.summary}</p>
                  )}
                  {!summaryLoading && !summaryData?.summary && (
                    <p className="text-sm text-white/50">
                      Run this week to generate your AI weekly summary.
                    </p>
                  )}
                  {!summaryLoading && summaryData && (
                    <div className="flex gap-5 mt-3 pt-3 border-t border-white/10">
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wider">This week</p>
                        <p className="text-sm font-black text-white mt-0.5">
                          {summaryData.stats.thisWeek.runs} runs ·{" "}
                          {(summaryData.stats.thisWeek.distanceM / 1000).toFixed(1)}km
                        </p>
                      </div>
                      {summaryData.stats.lastWeek.runs > 0 && (
                        <div>
                          <p className="text-xs text-white/40 uppercase tracking-wider">Last week</p>
                          <p className="text-sm font-black text-white/60 mt-0.5">
                            {summaryData.stats.lastWeek.runs} runs ·{" "}
                            {(summaryData.stats.lastWeek.distanceM / 1000).toFixed(1)}km
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendation card */}
          <Card className="bg-black border-black text-white">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="size-4 text-[#CFFF04]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">
                    Next Run
                  </p>
                  {recLoading && (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 bg-white/20 rounded w-4/5" />
                      <div className="h-4 bg-white/20 rounded w-3/5" />
                    </div>
                  )}
                  {!recLoading && recNoKey && (
                    <p className="text-sm text-white/50">
                      Add{" "}
                      <code className="text-xs bg-white/10 px-1 py-0.5 rounded">GROQ_API_KEY</code>{" "}
                      for AI recommendations
                    </p>
                  )}
                  {!recLoading && !recNoKey && !recommendation && (
                    <p className="text-sm text-white/70">
                      Complete your first run to get personalized recommendations
                    </p>
                  )}
                  {!recLoading && !recNoKey && recommendation && (
                    <p className="text-sm text-white leading-relaxed">{recommendation}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly distance chart */}
          {chartData.length > 0 && (
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="font-black uppercase tracking-tight text-black">Weekly Distance</CardTitle>
                <CardDescription>
                  Kilometres run per week over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                    barCategoryGap="32%"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="week"
                      tickFormatter={formatWeekLabel}
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                      unit=" km"
                    />
                    <Tooltip
                      content={<WeekTooltip />}
                      cursor={{ fill: "#f1f5f9" }}
                    />
                    <Bar
                      dataKey="distanceKm"
                      fill="#000000"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={52}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Race Predictor */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-tight text-black">Race Predictor</CardTitle>
              <CardDescription>Estimated finish times based on your recent performance</CardDescription>
            </CardHeader>
            <CardContent>
              <RacePredictor />
            </CardContent>
          </Card>

          {/* Personal Records */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-tight text-black">Personal Records</CardTitle>
              <CardDescription>Your all-time bests</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonalRecords />
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="font-black uppercase tracking-tight text-black">Achievements</CardTitle>
              <CardDescription>
                {achievementsLoading
                  ? "Loading…"
                  : achievementsData
                  ? `${achievementsData.allAchievements.filter((a) => a.unlocked).length} / ${achievementsData.allAchievements.length} unlocked`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {achievementsLoading ? (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-100 animate-pulse">
                      <div className="size-8 rounded-full bg-gray-200" />
                      <div className="h-2.5 w-12 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {achievementsData?.allAchievements.map((a) => (
                    <div
                      key={a.id}
                      title={a.description}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                        a.unlocked
                          ? "border-[#CFFF04] bg-[#CFFF04]/10 hover:bg-[#CFFF04]/20"
                          : "border-gray-100 bg-gray-50 opacity-40 grayscale"
                      }`}
                    >
                      <span className={`text-2xl leading-none ${a.unlocked ? "" : "blur-[1px]"}`}>
                        {a.unlocked ? a.emoji : "?"}
                      </span>
                      <p className={`text-[10px] font-black uppercase tracking-wider leading-tight ${a.unlocked ? "text-black" : "text-gray-400"}`}>
                        {a.unlocked ? a.name : "???"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent runs */}
          <Card className="bg-white border border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-black uppercase tracking-tight text-black">Recent Runs</CardTitle>
                <CardDescription>Your last 5 workouts</CardDescription>
              </div>
              <Link href="/history">
                <Button variant="outline" size="sm" className="border-black text-black hover:bg-black hover:text-white">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {data.recentRuns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    No completed runs in this period.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.recentRuns.map((run) => (
                    <li key={run.id}>
                      <Link
                        href={`/history/${run.id}`}
                        className="flex items-center justify-between gap-4 py-3.5 px-1 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        {/* Date + title */}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-black truncate group-hover:underline transition-colors">
                            {run.title ?? formatRunDate(run.startedAt)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {run.title ? formatRunDate(run.startedAt) : null}
                            {run.coachPersonality && (
                              <Badge
                                variant="outline"
                                className="ml-1.5 py-0 h-4 text-[10px] border-black/20 text-gray-600"
                              >
                                {run.coachPersonality}
                              </Badge>
                            )}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div className="hidden sm:block">
                            <p className="text-xs text-muted-foreground">
                              Distance
                            </p>
                            <p className="text-sm font-semibold text-black">
                              {formatDistance(run.totalDistanceM, "km")}
                            </p>
                          </div>
                          <div className="hidden sm:block">
                            <p className="text-xs text-muted-foreground">
                              Time
                            </p>
                            <p className="text-sm font-semibold text-black">
                              {formatDuration(run.totalDurationS)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Pace
                            </p>
                            <p className="text-sm font-semibold text-black">
                              {run.avgPaceSPerKm != null
                                ? `${formatPace(run.avgPaceSPerKm)}/km`
                                : "--"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
