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
  return ["S", "M", "T", "W", "T", "F", "S"].map((label, i) => {
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
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="size-16 rounded-full bg-[#FCEEE8] flex items-center justify-center">
        <HistoryIcon className="size-7 text-[#C15F3C]" />
      </div>
      <p className="text-[#2E363B] font-bold">No runs recorded yet</p>
      <p className="text-sm text-[#6B7680] max-w-xs">
        Complete your first run and it will appear here.
      </p>
      <Link href="/run">
        <button className="mt-2 h-12 px-7 rounded-full bg-[#C15F3C] text-white font-bold text-sm hover:bg-[#9B4628] transition-colors">
          Start a Run
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
      className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
    >
      {/* Day circle */}
      <div className="size-12 rounded-full bg-[#FCEEE8] flex flex-col items-center justify-center shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#C15F3C]">{day}</span>
        <span className="text-[15px] font-bold text-[#C15F3C] leading-none">{dayNum}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#2E363B] truncate">
          {run.title ?? formatRunDate(run.startedAt)}
        </p>
        <p className="text-[13px] text-[#6B7680] mt-0.5">
          {formatDuration(run.totalDurationS)}
          {run.avgPaceSPerKm != null
            ? ` · ${formatPace(run.avgPaceSPerKm)}/km`
            : ""}
          {run.status !== "completed" && (
            <span className="ml-2 text-[11px] bg-[#F0EDEB] text-[#6B7680] px-1.5 py-0.5 rounded-full">
              {run.status}
            </span>
          )}
        </p>
      </div>

      {/* Distance + chevron */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-right">
          <p className="text-[17px] font-bold text-[#2E363B] leading-none">
            {(run.totalDistanceM / 1000).toFixed(1)}
          </p>
          <p className="text-[11px] text-[#6B7680]">km</p>
        </div>
        <ChevronRight className="size-4 text-[#6B7680]" />
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
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load runs (${res.status})`);
        return res.json() as Promise<RunsResponse>;
      })
      .then((json) => {
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
    () => (response?.runs ?? []).map((r) => new Date(r.startedAt)),
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
    <div className="flex flex-col gap-5 max-w-md mx-auto">
      {/* Header */}
      <div className="pt-2">
        {monthLabel && (
          <p className="text-[13px] font-medium uppercase tracking-widest text-[#6B7680]">
            {monthLabel}
          </p>
        )}
        <h1 className="font-semibold text-[30px] text-[#2E363B] leading-tight mt-1">
          History
        </h1>
        {response != null && (
          <p className="text-[14px] text-[#6B7680] mt-0.5">
            {response.total} run{response.total !== 1 ? "s" : ""} recorded
          </p>
        )}
      </div>

      {/* Week strip */}
      {!loading && sortedRuns.length > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(({ label, date }, i) => {
              const hasRun = runDates.some((rd) => isSameDay(rd, date));
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#6B7680] uppercase">
                    {label}
                  </span>
                  <div
                    className={`size-2 rounded-full ${
                      hasRun ? "bg-[#C15F3C]" : "bg-[#D9D2CB]"
                    }`}
                  />
                  <span className="text-[11px] text-[#6B7680]">{date.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort controls */}
      {(response?.runs.length ?? 0) > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#6B7680] uppercase tracking-wide">Sort:</span>
          <button
            onClick={() => toggleSort("date")}
            className={`h-7 px-3 rounded-full text-[12px] font-medium transition-colors ${
              sortField === "date"
                ? "bg-[#C15F3C] text-white"
                : "bg-[#F0EDEB] text-[#6B7680] hover:bg-[#FCEEE8]"
            }`}
          >
            Date {sortField === "date" ? (sortDir === "desc" ? "↓" : "↑") : ""}
          </button>
          <button
            onClick={() => toggleSort("distance")}
            className={`h-7 px-3 rounded-full text-[12px] font-medium transition-colors ${
              sortField === "distance"
                ? "bg-[#C15F3C] text-white"
                : "bg-[#F0EDEB] text-[#6B7680] hover:bg-[#FCEEE8]"
            }`}
          >
            Distance {sortField === "distance" ? (sortDir === "desc" ? "↓" : "↑") : ""}
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex gap-3 items-center animate-pulse"
            >
              <div className="size-12 rounded-full bg-[#F0EDEB] shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-48 bg-[#F0EDEB] rounded" />
                <div className="h-3 w-28 bg-[#F0EDEB] rounded" />
              </div>
              <div className="h-4 w-10 bg-[#F0EDEB] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => setPage(1)}
            className="mt-3 text-sm text-[#C15F3C] font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sortedRuns.length === 0 && <EmptyState />}

      {/* Run groups */}
      {!loading && !error && groupedRuns.length > 0 && (
        <div className="flex flex-col gap-5">
          {groupedRuns.map(({ label, runs }) => (
            <div key={label}>
              <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680] mb-2">
                {label}
              </p>
              <div className="flex flex-col gap-2">
                {runs.map((run) => (
                  <RunCard key={run.id} run={run} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-[#E8E2DC] text-[#2E363B] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F0EDEB] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Previous
          </button>
          <span className="text-sm text-[#6B7680]">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-[#E8E2DC] text-[#2E363B] text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F0EDEB] transition-colors"
          >
            Next
            <ArrowRight className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
