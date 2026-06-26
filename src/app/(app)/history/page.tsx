"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, SortAsc, SortDesc, History as HistoryIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPace, formatDistance, formatDuration } from "@/lib/geo";

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
      <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center">
        <HistoryIcon className="size-7 text-black" />
      </div>
      <p className="text-black font-black uppercase tracking-wide">No runs recorded yet</p>
      <p className="text-sm text-muted-foreground max-w-xs">
        Complete your first run and it will appear here. Your full run history,
        stats, and maps will be stored and accessible any time.
      </p>
      <Link href="/run">
        <Button variant="outline" className="mt-2 gap-2 border-black text-black hover:bg-black hover:text-white">
          Start a Run
        </Button>
      </Link>
    </div>
  );
}

// ─── Run row ──────────────────────────────────────────────────────────────────

function RunCard({ run }: { run: Run }) {
  return (
    <Link
      href={`/history/${run.id}`}
      className="flex items-center justify-between gap-4 py-4 px-2 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      {/* Left: date + title */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-black group-hover:underline transition-colors truncate">
            {run.title ?? formatRunDate(run.startedAt)}
          </p>
          {run.status !== "completed" && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 shrink-0 border-black/20 text-gray-600">
              {run.status}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground">
            {run.title ? formatRunDate(run.startedAt) : null}
          </p>
          {run.coachPersonality && (
            <Badge
              variant="outline"
              className="text-[10px] py-0 h-4 shrink-0 border-black/20 text-gray-600"
            >
              {run.coachPersonality}
            </Badge>
          )}
        </div>
      </div>

      {/* Right: stats */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Distance</p>
          <p className="text-sm font-semibold text-black">
            {formatDistance(run.totalDistanceM, "km")}
          </p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-xs text-muted-foreground">Duration</p>
          <p className="text-sm font-semibold text-black">
            {formatDuration(run.totalDurationS)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Avg Pace</p>
          <p className="text-sm font-semibold text-black">
            {run.avgPaceSPerKm != null
              ? `${formatPace(run.avgPaceSPerKm)}/km`
              : "--"}
          </p>
        </div>
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

  const SortIcon = sortDir === "asc" ? SortAsc : SortDesc;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-black uppercase tracking-tight">Run History</h1>
          <p className="text-gray-500 mt-1">
            {response != null
              ? `${response.total} run${response.total !== 1 ? "s" : ""} recorded`
              : "All your completed runs in one place"}
          </p>
        </div>

        {/* Sort controls */}
        {(response?.runs.length ?? 0) > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <Button
              variant={sortField === "date" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("date")}
              className={sortField === "date" ? "bg-black text-white hover:bg-gray-800 gap-1.5" : "border-black text-black hover:bg-black hover:text-white gap-1.5"}
            >
              Date
              {sortField === "date" && <SortIcon className="size-3" />}
            </Button>
            <Button
              variant={sortField === "distance" ? "default" : "outline"}
              size="sm"
              onClick={() => toggleSort("distance")}
              className={sortField === "distance" ? "bg-black text-white hover:bg-gray-800 gap-1.5" : "border-black text-black hover:bg-black hover:text-white gap-1.5"}
            >
              Distance
              {sortField === "distance" && <SortIcon className="size-3" />}
            </Button>
          </div>
        )}
      </div>

      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="font-black uppercase tracking-tight text-black">Your Runs</CardTitle>
          <CardDescription>
            {response != null && response.total > PAGE_LIMIT
              ? `Showing page ${page} of ${totalPages}`
              : "All time"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4 py-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4 items-center">
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-48 bg-gray-200 rounded" />
                    <div className="h-3 w-24 bg-gray-100 rounded" />
                  </div>
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                  <div className="h-3 w-16 bg-gray-200 rounded hidden sm:block" />
                  <div className="h-3 w-16 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="text-center py-10">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-black text-black hover:bg-black hover:text-white"
                onClick={() => setPage(1)}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && sortedRuns.length === 0 && <EmptyState />}

          {/* Run list */}
          {!loading && !error && sortedRuns.length > 0 && (
            <ul className="divide-y divide-gray-100">
              {sortedRuns.map((run) => (
                <li key={run.id}>
                  <RunCard run={run} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="gap-1.5 border-black text-black hover:bg-black hover:text-white disabled:border-gray-200 disabled:text-gray-400"
          >
            <ArrowLeft className="size-3.5" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="gap-1.5 border-black text-black hover:bg-black hover:text-white disabled:border-gray-200 disabled:text-gray-400"
          >
            Next
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
