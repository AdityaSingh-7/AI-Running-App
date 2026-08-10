"use client";

import * as React from "react";
import Link from "next/link";
import {
  Play,
  Activity,
  Zap,
  Flame,
  Star,
  ChevronRight,
} from "lucide-react";
import { formatPace, formatDuration } from "@/lib/geo";
import { PersonalRecords } from "@/components/analytics/PersonalRecords";
import { RacePredictor } from "@/components/analytics/RacePredictor";

// ─── Types ───────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "all";


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
  runsByWeek: { week: string; distanceM: number; count: number }[];
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

function formatRunDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="size-20 rounded-full bg-[#FCEEE8] flex items-center justify-center">
        <Activity className="size-9 text-[#C15F3C]" />
      </div>
      <div>
        <p className="text-[#2E363B] font-bold text-lg">No runs yet</p>
        <p className="text-sm text-[#6B7680] mt-1 max-w-xs">
          Complete your first run to see your stats and progress here.
        </p>
      </div>
      <Link href="/run">
        <button className="h-14 px-8 rounded-full bg-[#C15F3C] text-white font-bold text-base flex items-center gap-2 hover:bg-[#9B4628] transition-colors">
          <Play className="size-4 fill-current" />
          Start Your First Run
        </button>
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
      .then(async (res: Response) => {
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
      .then((r: Response) => r.json())
      .then((d: SummaryData) => setSummaryData(d))
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  // Fetch achievements once on mount
  React.useEffect(() => {
    setAchievementsLoading(true);
    fetch("/api/analytics/achievements")
      .then((r: Response) => r.json())
      .then((d: AchievementsData) => setAchievementsData(d))
      .catch(() => {})
      .finally(() => setAchievementsLoading(false));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/analytics?period=${period}`)
      .then((res: Response) => {
        if (!res.ok) throw new Error(`Failed to load analytics (${res.status})`);
        return res.json() as Promise<AnalyticsData>;
      })
      .then((json: AnalyticsData) => {
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

  const WEEKLY_GOAL_KM = 30;
  const thisWeekKm = (summaryData?.stats?.thisWeek?.distanceM ?? 0) / 1000;
  const progressPct = Math.min(100, (thisWeekKm / WEEKLY_GOAL_KM) * 100);

  return (
    <div className="w-full text-white space-y-6">
      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <div className="rounded-2xl bg-[#141822] border border-[#FF5252]/40 p-5 flex items-center justify-between gap-4 shadow-xl">
          <div>
            <p className="font-extrabold text-white text-sm uppercase tracking-wide">
              ⚡ Welcome Runner! Setup Your Profile
            </p>
            <p className="text-xs text-[#94A3B8] mt-1">
              Pick your training goal, select a voice coach, and test audio.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/onboarding">
              <button className="h-8 px-4 rounded-xl bg-[#FF5252] text-white font-extrabold text-xs uppercase tracking-wider hover:bg-[#E03E3E] transition-colors athletic-glow-coral">
                Start
              </button>
            </Link>
            <button
              onClick={() => {
                localStorage.setItem("onboarding_complete", "skipped");
                setShowOnboardingBanner(false);
              }}
              className="text-[#94A3B8] hover:text-white text-xl leading-none p-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Greeting Header */}
      <div className="pt-1 pb-2 border-b border-white/10">
        <p className="text-xs font-black uppercase tracking-widest text-[#FF5252] flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#38BDF8] animate-ping" />
          {getTodayLabel()}
        </p>
        <h1 className="font-black text-3xl md:text-4xl text-white tracking-tight italic mt-1 uppercase">
          {getGreeting()}, <span className="text-[#FF5252]">Runner</span>
        </h1>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8 rounded-2xl glass-card p-6 animate-pulse space-y-4">
            <div className="h-16 w-32 bg-white/10 rounded" />
            <div className="h-3 w-48 bg-white/10 rounded" />
            <div className="h-2.5 w-full bg-white/10 rounded-full" />
          </div>
          <div className="md:col-span-4 rounded-2xl glass-card p-6 animate-pulse space-y-4">
            <div className="h-12 w-full bg-white/10 rounded" />
            <div className="h-12 w-full bg-white/10 rounded" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl glass-card p-6 text-center border border-red-500/30">
          <p className="text-sm text-red-400 font-semibold">{error}</p>
          <button
            onClick={() => setPeriod((p) => p)}
            className="mt-3 text-xs uppercase font-extrabold text-[#FF4500]"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.totalRuns === 0 && <EmptyState />}

      {/* Main Responsive Grid Layout */}
      {!loading && !error && data && data.totalRuns > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Primary Focus: Volume & Activities) */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Weekly stats hero card */}
            <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/10 hover:border-[#FF4500]/40 transition-all shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF4500]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-end justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-[#FF4500]/15 text-[#FF4500] px-2.5 py-0.5 rounded-full border border-[#FF4500]/30">
                      TELEMETRY OVERVIEW
                    </span>
                  </div>
                  <p
                    className="font-black leading-none text-[#FF4500] telemetry-mono tracking-tight"
                    style={{ fontSize: 76 }}
                  >
                    {summaryLoading ? (
                      <span className="inline-block h-16 w-32 bg-white/10 rounded animate-pulse" />
                    ) : (
                      thisWeekKm.toFixed(1)
                    )}
                    <span className="text-xl text-[#94A3B8] font-sans font-extrabold ml-2">KM</span>
                  </p>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#94A3B8] mt-2">
                    <span>This Week Target</span>
                    <span className="mx-2 text-white/20">|</span>
                    Goal {WEEKLY_GOAL_KM} km
                  </p>
                </div>
                <div className="text-right mb-1">
                  <span className="text-base font-black text-[#00F2FE] telemetry-mono bg-[#00F2FE]/10 px-3 py-1.5 rounded-xl border border-[#00F2FE]/30 inline-block">
                    {summaryLoading ? "" : `${Math.round(progressPct)}% Complete`}
                  </span>
                </div>
              </div>

              {/* Telemetry SVG Curve Chart */}
              <div className="mt-6 h-20 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 400 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="telemetryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF4500" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FF4500" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#FF4500" />
                      <stop offset="100%" stopColor="#00F2FE" />
                    </linearGradient>
                  </defs>
                  {/* Fill Area */}
                  <path
                    d="M 0 80 Q 50 40, 100 55 T 200 25 T 300 45 T 400 15 L 400 80 Z"
                    fill="url(#telemetryGrad)"
                  />
                  {/* Stroke Line */}
                  <path
                    d="M 0 80 Q 50 40, 100 55 T 200 25 T 300 45 T 400 15"
                    fill="none"
                    stroke="url(#strokeGrad)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Data Points */}
                  <circle cx="100" cy="55" r="4" fill="#FF4500" className="animate-pulse" />
                  <circle cx="200" cy="25" r="4" fill="#00F2FE" className="animate-pulse" />
                  <circle cx="400" cy="15" r="5" fill="#00F2FE" className="athletic-glow-cyan" />
                </svg>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF4500] to-[#00F2FE] transition-all duration-500 shadow-[0_0_15px_rgba(255,69,0,0.5)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* 3-column stats */}
              <div className="mt-6 grid grid-cols-3 gap-4 pt-5 border-t border-white/10">
                <div>
                  <p className="text-2xl font-black text-white telemetry-mono leading-none">
                    {summaryData?.stats.thisWeek.runs ?? data.totalRuns}
                  </p>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1.5">Completed Runs</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#00F2FE] telemetry-mono leading-none">
                    {data.avgPaceSecsPerKm != null ? formatPace(data.avgPaceSecsPerKm) : "--:--"}
                  </p>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1.5">Avg Pace (/km)</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white telemetry-mono leading-none">
                    {formatDuration(
                      summaryData?.stats.thisWeek.durationS ?? data.totalDurationS
                    )}
                  </p>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#94A3B8] mt-1.5">Total Time</p>
                </div>
              </div>
            </div>

            {/* Recent runs section */}
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
                  Recent Activity Log
                </p>
                <Link
                  href="/history"
                  className="text-xs font-black uppercase tracking-wider text-[#FF5252] hover:text-[#FF6B6B] flex items-center gap-1"
                >
                  View All History <ChevronRight className="size-4" />
                </Link>
              </div>

              {data.recentRuns.length === 0 ? (
                <div className="glass-card rounded-2xl p-6 text-center border border-white/10">
                  <p className="text-sm text-[#94A3B8]">No completed runs in this period.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {data.recentRuns.map((run: RecentRun) => (
                    <Link
                      key={run.id}
                      href={`/history/${run.id}`}
                      className="glass-card glass-card-hover rounded-2xl p-4.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-extrabold text-white truncate">
                          {run.title ?? formatRunDate(run.startedAt)}
                        </p>
                        <p className="text-xs font-semibold text-[#94A3B8] mt-1">
                          {run.title ? formatRunDate(run.startedAt) : null}
                          {run.totalDurationS > 0 && (
                            <>
                              {run.title ? " · " : ""}
                              {formatDuration(run.totalDurationS)}
                              {run.avgPaceSPerKm != null
                                ? ` · ${formatPace(run.avgPaceSPerKm)}/km`
                                : ""}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-2xl font-black text-[#FF5252] font-mono leading-none">
                            {(run.totalDistanceM / 1000).toFixed(1)}
                          </p>
                          <p className="text-[10px] font-extrabold text-[#94A3B8] uppercase tracking-wider mt-0.5">KM</p>
                        </div>
                        <ChevronRight className="size-5 text-[#94A3B8]" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Race Predictor & Personal Records Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Race Predictor */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-3">
                  Race Predictor
                </p>
                <div className="glass-card rounded-2xl p-5 border border-white/10 h-full">
                  <RacePredictor />
                </div>
              </div>

              {/* Personal Records */}
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-3">
                  Personal Records
                </p>
                <div className="glass-card rounded-2xl p-5 border border-white/10 h-full">
                  <PersonalRecords />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Secondary Focus: Insights, Streaks, Achievements) */}
          <div className="md:col-span-4 space-y-6">

            {/* Streak card */}
            <div className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-[#FF5252]/20">
              <div className="size-13 rounded-2xl bg-[#FF5252]/15 flex items-center justify-center shrink-0 border border-[#FF5252]/30 athletic-glow-coral">
                <Flame className="size-7 text-[#FF5252]" />
              </div>
              <div className="flex-1">
                {achievementsLoading ? (
                  <div className="h-5 w-28 bg-white/10 rounded animate-pulse" />
                ) : (
                  <>
                    <p className="font-black text-white text-lg tracking-wide uppercase">
                      🔥 {achievementsData?.streak.current ?? 0}-Day Streak
                    </p>
                    {(achievementsData?.streak.max ?? 0) > 0 && (
                      <p className="text-xs text-[#94A3B8] font-semibold mt-0.5">
                        Personal Best: {achievementsData?.streak.max} Days
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* AI Recommendation card */}
            {(!recLoading || recommendation) && !recNoKey && (
              <div className="glass-card rounded-2xl p-5 border border-[#38BDF8]/30 relative overflow-hidden">
                <div className="flex items-start gap-3.5">
                  <div className="size-10 rounded-xl bg-[#38BDF8]/15 flex items-center justify-center shrink-0 border border-[#38BDF8]/40">
                    <Zap className="size-5 text-[#38BDF8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#38BDF8] mb-1">
                      AI Coach Recommendation
                    </p>
                    {recLoading ? (
                      <div className="space-y-1.5 animate-pulse">
                        <div className="h-3.5 bg-white/10 rounded w-4/5" />
                        <div className="h-3.5 bg-white/10 rounded w-3/5" />
                      </div>
                    ) : (
                      <p className="text-xs text-white font-medium leading-relaxed">{recommendation}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Weekly AI Summary */}
            {!summaryLoading && summaryData?.summary && (
              <div className="glass-card rounded-2xl p-5 flex items-start gap-3.5 border border-white/10">
                <div className="size-10 rounded-xl bg-[#FF5252]/15 flex items-center justify-center shrink-0 border border-[#FF5252]/30">
                  <Star className="size-5 text-[#FF5252]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#94A3B8] mb-1">
                    Weekly Insights
                  </p>
                  <p className="text-xs text-white font-medium leading-relaxed">{summaryData.summary}</p>
                </div>
              </div>
            )}

            {/* Consistency Score Card */}
            {!summaryLoading && summaryData && (
              <div className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-white/10">
                <div className="size-11 rounded-xl bg-[#38BDF8]/15 flex items-center justify-center shrink-0 border border-[#38BDF8]/30">
                  <Activity className="size-6 text-[#38BDF8]" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#94A3B8] mb-1">
                    Consistency Score (30 Days)
                  </p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-black text-white font-mono leading-none">
                      {summaryData.consistencyPct}
                    </span>
                    <span className="text-[#38BDF8] font-extrabold text-sm">%</span>
                  </div>
                  <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF5252] to-[#38BDF8] rounded-full transition-all duration-500"
                      style={{ width: `${summaryData.consistencyPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Achievements Showcase */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
                  Badges & Awards
                </p>
                {!achievementsLoading && achievementsData && (
                  <p className="text-xs font-bold text-[#38BDF8] font-mono">
                    {achievementsData.allAchievements.filter((a: AchievementEntry) => a.unlocked).length} /{" "}
                    {achievementsData.allAchievements.length} Unlocked
                  </p>
                )}
              </div>
              <div className="glass-card rounded-2xl p-4 border border-white/10">
                {achievementsLoading ? (
                  <div className="grid grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_: unknown, i: number) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-2 animate-pulse">
                        <div className="size-8 rounded-full bg-white/10" />
                        <div className="h-2 w-10 bg-white/10 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5">
                    {achievementsData?.allAchievements.map((a: AchievementEntry) => (
                      <div
                        key={a.id}
                        title={a.description}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all ${
                          a.unlocked
                            ? "bg-[#FF5252]/15 border border-[#FF5252]/30"
                            : "opacity-30 grayscale border border-white/5"
                        }`}
                      >
                        <span className={`text-2xl leading-none ${a.unlocked ? "" : "blur-[1px]"}`}>
                          {a.unlocked ? a.emoji : "🔒"}
                        </span>
                        <p className={`text-[9px] font-extrabold uppercase tracking-wider leading-tight ${a.unlocked ? "text-white" : "text-[#94A3B8]"}`}>
                          {a.unlocked ? a.name : "Locked"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
