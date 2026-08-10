"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, History as HistoryIcon } from "lucide-react";
import { formatPace, formatDuration } from "@/lib/geo";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = "date" | "distance";
type SortDir = "asc" | "desc";

interface Run {
  id: string;
  startedAt: string;
  completedAt: string | null;
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm: number | null;
  title: string | null;
  coachPersonality: string | null;
  status: string;
}

interface RunsResponse {
  runs: Run[];
  total: number;
  page: number;
  limit: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRunDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDayLabel(dateStr: string): { day: string; dayNum: string } {
  const d = new Date(dateStr);
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    dayNum: d.getDate().toString(),
  };
}

function getMonthLabel(dateStr: string): string {
  return new Date(dateStr)
    .toLocaleDateString("en-US", { month: "long", year: "numeric" })
    .toUpperCase();
}

function getWeekGroup(dateStr: string): "THIS WEEK" | "LAST WEEK" | string {
  const d = new Date(dateStr);
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

  if (d >= startOfThisWeek) return "THIS WEEK";
  if (d >= startOfLastWeek) return "LAST WEEK";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

function getWeekStripDays(): { label: string; date: Date }[] {
  const now = new Date();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  sunday.setHours(0, 0, 0, 0);
  return ["S", "M", "T", "W", "T", "F", "S"].map((label: string, i: number) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return { label, date: d };
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sortRuns(runs: Run[], field: SortField, dir: SortDir): Run[] {
  return [...runs].sort((a, b) => {
    let cmp = 0;
    if (field === "date") {
      cmp =
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    } else {
      cmp = a.totalDistanceM - b.totalDistanceM;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4 glass-card rounded-2xl border border-white/10 p-8">
      <div className="size-16 rounded-2xl bg-[#FF5252]/15 flex items-center justify-center border border-[#FF5252]/30">
        <HistoryIcon className="size-8 text-[#FF5252]" />
      </div>
      <div>
        <p className="text-white font-black text-lg uppercase tracking-wide">No activities logged yet</p>
        <p className="text-xs text-[#94A3B8] mt-1 max-w-xs">
          Complete your first run to record your activity history and splits.
        </p>
      </div>
      <Link href="/run">
        <button className="h-12 px-7 rounded-2xl bg-[#FF5252] text-white font-black text-xs uppercase tracking-wider hover:bg-[#E03E3E] athletic-glow-coral transition-all active:scale-95">
          START A RUN
        </button>
      </Link>
    </div>
  );
}

// ─── Run card ──────────────────────────────────────────────────────────────────

function RunCard({ run }: { run: Run }) {
  const { day, dayNum } = getDayLabel(run.startedAt);
  return (
    <Link
      href={`/history/${run.id}`}
      className="glass-card glass-card-hover rounded-2xl p-4 flex items-center gap-3.5 border border-white/10"
    >
      {/* Day badge */}
      <div className="size-13 rounded-xl bg-[#FF5252]/15 border border-[#FF5252]/30 flex flex-col items-center justify-center shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#FF5252]">{day}</span>
        <span className="text-base font-black text-white leading-none mt-0.5 font-mono">{dayNum}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-base font-extrabold text-white truncate">
          {run.title ?? formatRunDate(run.startedAt)}
        </p>
        <p className="text-xs text-[#94A3B8] mt-0.5 font-semibold">
          {formatDuration(run.totalDurationS)}
          {run.avgPaceSPerKm != null
            ? ` · ${formatPace(run.avgPaceSPerKm)}/km`
            : ""}
          {run.status !== "completed" && (
            <span className="ml-2 text-[10px] font-black uppercase bg-white/10 text-white/70 px-2 py-0.5 rounded-full border border-white/10">
              {run.status}
            </span>
          )}
        </p>
      </div>

      {/* Distance + chevron */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-xl font-black text-[#FF5252] font-mono leading-none">
            {(run.totalDistanceM / 1000).toFixed(1)}
          </p>
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">km</p>
        </div>
        <ChevronRight className="size-4 text-[#94A3B8]" />
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

export default function HistoryPage() {
  const [page, setPage] = React.useState(1);
  const [response, setResponse] = React.useState<RunsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<SortField>("date");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/runs?page=${page}&limit=${PAGE_LIMIT}`)
      .then((res: Response) => {
        if (!res.ok) throw new Error(`Failed to load runs (${res.status})`);
        return res.json() as Promise<RunsResponse>;
      })
      .then((json: RunsResponse) => {
        if (!cancelled) {
          setResponse(json);
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
  }, [page]);

  const totalPages = response
    ? Math.ceil(response.total / PAGE_LIMIT)
    : 0;

  const sortedRuns = React.useMemo(
    () => sortRuns(response?.runs ?? [], sortField, sortDir),
    [response?.runs, sortField, sortDir]
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // Week strip: which days of this week have runs
  const weekDays = getWeekStripDays();
  const runDates = React.useMemo(
    () => (response?.runs ?? []).map((r: Run) => new Date(r.startedAt)),
    [response?.runs]
  );

  // Group runs by week label
  const groupedRuns = React.useMemo(() => {
    const groups: { label: string; runs: Run[] }[] = [];
    const groupMap = new Map<string, Run[]>();
    for (const run of sortedRuns) {
      const key = getWeekGroup(run.startedAt);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
        groups.push({ label: key, runs: groupMap.get(key)! });
      }
      groupMap.get(key)!.push(run);
    }
    return groups;
  }, [sortedRuns]);

  // Current month label from top run
  const monthLabel =
    sortedRuns.length > 0 ? getMonthLabel(sortedRuns[0].startedAt) : "";

  return (
    <div className="w-full text-white space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1 pb-2 border-b border-white/10">
        <div>
          {monthLabel && (
            <p className="text-xs font-black uppercase tracking-widest text-[#FF5252]">
              {monthLabel}
            </p>
          )}
          <h1 className="font-black text-3xl md:text-4xl text-white uppercase italic tracking-tight mt-1">
            ACTIVITY <span className="text-[#FF5252]">FEED</span>
          </h1>
          {response != null && (
            <p className="text-xs font-semibold text-[#94A3B8] mt-1">
              {response.total} total session{response.total !== 1 ? "s" : ""} logged
            </p>
          )}
        </div>

        {/* Sort controls */}
        {(response?.runs.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-[#94A3B8] uppercase tracking-wider">SORT:</span>
            <button
              onClick={() => toggleSort("date")}
              className={`h-8 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                sortField === "date"
                  ? "bg-[#FF5252] text-white athletic-glow-coral"
                  : "bg-white/5 text-[#94A3B8] hover:bg-white/10 border border-white/10"
              }`}
            >
              Date {sortField === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </button>
            <button
              onClick={() => toggleSort("distance")}
              className={`h-8 px-4 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                sortField === "distance"
                  ? "bg-[#FF5252] text-white athletic-glow-coral"
                  : "bg-white/5 text-[#94A3B8] hover:bg-white/10 border border-white/10"
              }`}
            >
              Distance {sortField === "distance" ? (sortDir === "desc" ? "↓" : "↑") : ""}
            </button>
          </div>
        )}
      </div>

      {/* Week strip */}
      {!loading && sortedRuns.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="grid grid-cols-7 gap-2 text-center">
            {weekDays.map(({ label, date }: { label: string; date: Date }, i: number) => {
              const hasRun = runDates.some((rd: Date) => isSameDay(rd, date));
              return (
                <div key={i} className="flex flex-col items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-black text-[#94A3B8] uppercase">
                    {label}
                  </span>
                  <div
                    className={`size-3 rounded-full transition-all ${
                      hasRun ? "bg-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.8)]" : "bg-white/10"
                    }`}
                  />
                  <span className="text-xs font-mono text-white font-bold">{date.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Column (Activities Feed) */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_: unknown, i: number) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-4 flex gap-3.5 items-center animate-pulse border border-white/10"
                >
                  <div className="size-13 rounded-xl bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-white/10 rounded" />
                    <div className="h-3 w-28 bg-white/10 rounded" />
                  </div>
                  <div className="h-5 w-12 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-2xl glass-card p-6 text-center border border-red-500/30">
              <p className="text-sm text-red-400 font-semibold">{error}</p>
              <button
                onClick={() => setPage(1)}
                className="mt-3 text-xs font-black uppercase tracking-wider text-[#FF5252]"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && sortedRuns.length === 0 && <EmptyState />}

          {/* Run groups */}
          {!loading && !error && groupedRuns.length > 0 && (
            <div className="space-y-6">
              {groupedRuns.map(({ label, runs }: { label: string; runs: Run[] }) => (
                <div key={label}>
                  <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-3">
                    {label}
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {runs.map((run: Run) => (
                      <RunCard key={run.id} run={run} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-white/10 text-white text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="size-4" />
                Previous Page
              </button>
              <span className="text-xs font-mono font-bold text-[#94A3B8]">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-white/10 text-white text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-white/10 transition-colors"
              >
                Next Page
                <ArrowRight className="size-4" />
              </button>
            </div>
          )}

        </div>

        {/* Right Column (Monthly Volume & Lifetime Stats Card) */}
        <div className="md:col-span-4 space-y-6 sticky top-20">
          <p className="text-xs font-black uppercase tracking-widest text-[#94A3B8]">
            Activity Summary
          </p>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF5252]">Total Distance Logged</p>
              <p className="text-4xl font-black text-white font-mono leading-none mt-1">
                {(
                  (response?.runs ?? []).reduce((acc: number, r: Run) => acc + r.totalDistanceM, 0) / 1000
                ).toFixed(1)}
                <span className="text-sm text-[#94A3B8] font-sans font-bold ml-1.5">KM</span>
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-semibold">Total Sessions</span>
                <span className="text-white font-mono font-bold">{response?.total ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#94A3B8] font-semibold">Average Session Distance</span>
                <span className="text-[#38BDF8] font-mono font-bold">
                  {response?.runs.length
                    ? (
                        (response.runs.reduce((acc: number, r: Run) => acc + r.totalDistanceM, 0) / response.runs.length) /
                        1000
                      ).toFixed(1)
                    : 0}{" "}
                  km
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
