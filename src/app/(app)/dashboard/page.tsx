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

  // Weekly goal in km (fixed display value)
  const WEEKLY_GOAL_KM = 30;
  const thisWeekKm = summaryData
    ? summaryData.stats.thisWeek.distanceM / 1000
    : 0;
  const progressPct = Math.min(100, (thisWeekKm / WEEKLY_GOAL_KM) * 100);

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto">
      {/* Onboarding banner */}
      {showOnboardingBanner && (
        <div className="rounded-2xl bg-[#FCEEE8] border border-[#F0EDEB] px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-[#2E363B] text-sm">
              New here? Set up your profile
            </p>
            <p className="text-xs text-[#6B7680] mt-0.5">
              Pick your goal, choose a coach, and test your voice.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/onboarding">
              <button className="h-8 px-4 rounded-full bg-[#C15F3C] text-white font-bold text-xs hover:bg-[#9B4628] transition-colors">
                Get Started
              </button>
            </Link>
            <button
              onClick={() => {
                localStorage.setItem("onboarding_complete", "skipped");
                setShowOnboardingBanner(false);
              }}
              className="text-[#6B7680] hover:text-[#2E363B] text-lg leading-none p-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Greeting */}
      <div className="pt-2">
        <p className="text-[13px] font-medium uppercase tracking-widest text-[#6B7680]">
          {getTodayLabel()}
        </p>
        <h1 className="font-semibold text-[30px] text-[#2E363B] leading-tight mt-1">
          {getGreeting()}, Runner
        </h1>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white shadow-sm p-6 animate-pulse">
            <div className="h-16 w-32 bg-[#F0EDEB] rounded mb-3" />
            <div className="h-3 w-48 bg-[#F0EDEB] rounded mb-4" />
            <div className="h-2 w-full bg-[#F0EDEB] rounded-full" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => setPeriod((p) => p)}
            className="mt-3 text-sm text-[#C15F3C] font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data && data.totalRuns === 0 && <EmptyState />}

      {/* Main content */}
      {!loading && !error && data && data.totalRuns > 0 && (
        <>
          {/* Weekly stats card */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
            <div className="flex items-end justify-between">
              <div>
                <p
                  className="font-black leading-none text-[#C15F3C]"
                  style={{ fontSize: 60 }}
                >
                  {summaryLoading ? (
                    <span className="inline-block h-14 w-24 bg-[#F0EDEB] rounded animate-pulse" />
                  ) : (
                    thisWeekKm.toFixed(1)
                  )}
                </p>
                <p className="text-[13px] text-[#6B7680] mt-1">
                  <span className="font-medium">This week</span>
                  <span className="mx-1.5 text-[#D9D2CB]">·</span>
                  Goal {WEEKLY_GOAL_KM} km
                </p>
              </div>
              <span className="text-[13px] font-medium text-[#C15F3C] mb-1">
                {summaryLoading ? "" : `${Math.round(progressPct)}%`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-2 w-full rounded-full bg-[#F0EDEB] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#C15F3C] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* 3-column stats */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[18px] font-bold text-[#2E363B] leading-none">
                  {summaryData?.stats.thisWeek.runs ?? data.totalRuns}
                </p>
                <p className="text-[12px] uppercase tracking-wide text-[#6B7680] mt-1">Runs</p>
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#2E363B] leading-none">
                  {data.avgPaceSecsPerKm != null ? formatPace(data.avgPaceSecsPerKm) : "--:--"}
                </p>
                <p className="text-[12px] uppercase tracking-wide text-[#6B7680] mt-1">Avg pace</p>
              </div>
              <div>
                <p className="text-[18px] font-bold text-[#2E363B] leading-none">
                  {formatDuration(
                    summaryData?.stats.thisWeek.durationS ?? data.totalDurationS
                  )}
                </p>
                <p className="text-[12px] uppercase tracking-wide text-[#6B7680] mt-1">Total time</p>
              </div>
            </div>
          </div>

          {/* Start Run button */}
          <Link href="/run" className="block">
            <button className="w-full h-14 rounded-full bg-[#C15F3C] text-white font-bold text-base flex items-center justify-center gap-2 hover:bg-[#9B4628] transition-colors shadow-[0_2px_8px_rgba(193,95,60,0.3)]">
              <Play className="size-5 fill-current" />
              Start Run
            </button>
          </Link>

          {/* Streak card */}
          <div className="bg-[#FCEEE8] rounded-2xl p-4 flex items-center gap-4">
            <div className="size-11 rounded-full bg-white/60 flex items-center justify-center shrink-0">
              <Flame className="size-5 text-[#C15F3C]" />
            </div>
            <div className="flex-1">
              {achievementsLoading ? (
                <div className="h-5 w-28 bg-[#F0EDEB] rounded animate-pulse" />
              ) : (
                <>
                  <p className="font-bold text-[#2E363B] text-[15px]">
                    {achievementsData?.streak.current ?? 0}-day streak
                  </p>
                  {(achievementsData?.streak.max ?? 0) > 0 && (
                    <p className="text-[12px] text-[#6B7680] mt-0.5">
                      Best: {achievementsData?.streak.max} days
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* AI Recommendation card */}
          {(!recLoading || recommendation) && !recNoKey && (
            <div className="bg-[#FCEEE8] rounded-2xl p-4 flex items-start gap-3">
              <div className="size-9 rounded-full bg-white/60 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="size-4 text-[#C15F3C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-widest text-[#6B7680] mb-1">
                  Next Run
                </p>
                {recLoading ? (
                  <div className="space-y-1.5 animate-pulse">
                    <div className="h-3.5 bg-[#F0EDEB] rounded w-4/5" />
                    <div className="h-3.5 bg-[#F0EDEB] rounded w-3/5" />
                  </div>
                ) : (
                  <p className="text-sm text-[#2E363B] leading-relaxed">{recommendation}</p>
                )}
              </div>
            </div>
          )}

          {/* Weekly AI Summary */}
          {!summaryLoading && summaryData?.summary && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex items-start gap-3">
              <div className="size-9 rounded-full bg-[#FCEEE8] flex items-center justify-center shrink-0 mt-0.5">
                <Star className="size-4 text-[#C15F3C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-widest text-[#6B7680] mb-1">
                  Weekly Summary
                </p>
                <p className="text-sm text-[#2E363B] leading-relaxed">{summaryData.summary}</p>
              </div>
            </div>
          )}

          {/* Recent runs section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680]">
                Recent Runs
              </p>
              <Link
                href="/history"
                className="text-[13px] font-medium text-[#C15F3C] hover:text-[#9B4628]"
              >
                See all
              </Link>
            </div>

            {data.recentRuns.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 text-center">
                <p className="text-sm text-[#6B7680]">No completed runs in this period.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {data.recentRuns.map((run) => (
                  <Link
                    key={run.id}
                    href={`/history/${run.id}`}
                    className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-[#2E363B] truncate">
                        {run.title ?? formatRunDate(run.startedAt)}
                      </p>
                      <p className="text-[13px] text-[#6B7680] mt-0.5">
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
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-[17px] font-bold text-[#2E363B]">
                        {(run.totalDistanceM / 1000).toFixed(1)}
                        <span className="text-[13px] font-medium text-[#6B7680] ml-0.5">km</span>
                      </p>
                      <ChevronRight className="size-4 text-[#6B7680]" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Race Predictor */}
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680] mb-3">
              Race Predictor
            </p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
              <RacePredictor />
            </div>
          </div>

          {/* Personal Records */}
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680] mb-3">
              Personal Records
            </p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5">
              <PersonalRecords />
            </div>
          </div>

          {/* Achievements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680]">
                Achievements
              </p>
              {!achievementsLoading && achievementsData && (
                <p className="text-[12px] text-[#6B7680]">
                  {achievementsData.allAchievements.filter((a) => a.unlocked).length} /{" "}
                  {achievementsData.allAchievements.length}
                </p>
              )}
            </div>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
              {achievementsLoading ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 p-2 animate-pulse">
                      <div className="size-8 rounded-full bg-[#F0EDEB]" />
                      <div className="h-2 w-10 bg-[#F0EDEB] rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {achievementsData?.allAchievements.map((a) => (
                    <div
                      key={a.id}
                      title={a.description}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all ${
                        a.unlocked
                          ? "bg-[#FCEEE8]"
                          : "opacity-40 grayscale"
                      }`}
                    >
                      <span className={`text-2xl leading-none ${a.unlocked ? "" : "blur-[1px]"}`}>
                        {a.unlocked ? a.emoji : "?"}
                      </span>
                      <p className={`text-[10px] font-semibold uppercase tracking-wider leading-tight ${a.unlocked ? "text-[#C15F3C]" : "text-[#6B7680]"}`}>
                        {a.unlocked ? a.name : "???"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Consistency */}
          {!summaryLoading && summaryData && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 flex items-center gap-4">
              <div className="size-10 rounded-full bg-[#FCEEE8] flex items-center justify-center shrink-0">
                <Activity className="size-5 text-[#C15F3C]" />
              </div>
              <div className="flex-1">
                <p className="text-[12px] uppercase tracking-widest text-[#6B7680] font-medium mb-1">
                  Consistency (30d)
                </p>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-[28px] font-black text-[#2E363B] leading-none">
                    {summaryData.consistencyPct}
                  </span>
                  <span className="text-[#6B7680] font-medium">%</span>
                </div>
                <div className="h-2 w-full bg-[#F0EDEB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C15F3C] rounded-full transition-all duration-500"
                    style={{ width: `${summaryData.consistencyPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
