"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Check,
  X,
  TrendingUp,
  Clock,
  Gauge,
  Mountain,
  Sparkles,
  Share2,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RouteMap from "@/components/map/RouteMap";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RunPoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude?: number | null;
  timestamp: string;
}

interface RunSplit {
  id: string;
  splitNumber: number;
  distanceM: number;
  durationS: number;
  avgPaceSPerKm: number;
}

interface RunDetail {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  totalDistanceM: number;
  totalDurationS: number;
  avgPaceSPerKm?: number | null;
  elevationGainM: number;
  title?: string | null;
  notes?: string | null;
  points: RunPoint[];
  splits: RunSplit[];
  stats: {
    pointCount: number;
    hasGpsData: boolean;
    durationFormatted: string | null;
    distanceKm: number | null;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPace(secsPerKm: number | null | undefined): string {
  if (!secsPerKm || secsPerKm <= 0) return "--:--";
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  if (meters <= 0) return "0.00 km";
  return `${(meters / 1000).toFixed(2)} km`;
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />
  );
}

function RunDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="h-7 w-48" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="size-8 rounded-lg flex items-center justify-center mb-3 bg-gray-100">
          <Icon className="size-4 text-gray-700" />
        </div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 tabular-nums leading-none">
          {value}
          {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>();
  const router = useRouter();

  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Analysis state
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Editable title / notes state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Share / copy state
  const [copied, setCopied] = useState(false);

  // ── Fetch run ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    fetch(`/api/runs/${runId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Run not found");
        return res.json() as Promise<RunDetail>;
      })
      .then((data) => {
        setRun(data);
        setTitleDraft(data.title ?? "");
        setNotesDraft(data.notes ?? "");
        // Kick off AI analysis asynchronously
        setAnalysisLoading(true);
        fetch("/api/coaching/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runId: data.id }),
        })
          .then(async (res) => {
            if (res.status === 503) {
              setAnalysisError("no-key");
              return;
            }
            if (!res.ok) throw new Error("Analysis failed");
            const json = await res.json() as { analysis?: string; message?: string };
            setAnalysisText(json.analysis ?? json.message ?? "No analysis available.");
          })
          .catch(() => setAnalysisError("failed"))
          .finally(() => setAnalysisLoading(false));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load run"))
      .finally(() => setLoading(false));
  }, [runId]);

  // ── Save title ───────────────────────────────────────────────────────────────
  const saveTitle = useCallback(async () => {
    if (!run) return;
    const trimmed = titleDraft.trim();
    setEditingTitle(false);
    if (trimmed === (run.title ?? "")) return;
    try {
      const res = await fetch(`/api/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed || null }),
      });
      if (res.ok) {
        const updated = await res.json() as RunDetail;
        setRun((prev) => prev ? { ...prev, title: updated.title } : prev);
        setTitleDraft(updated.title ?? "");
      }
    } catch {
      setTitleDraft(run.title ?? "");
    }
  }, [run, titleDraft]);

  // ── Save notes ───────────────────────────────────────────────────────────────
  const saveNotes = useCallback(async () => {
    if (!run) return;
    const trimmed = notesDraft.trim();
    setEditingNotes(false);
    if (trimmed === (run.notes ?? "")) return;
    try {
      const res = await fetch(`/api/runs/${run.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: trimmed || null }),
      });
      if (res.ok) {
        const updated = await res.json() as RunDetail;
        setRun((prev) => prev ? { ...prev, notes: updated.notes } : prev);
        setNotesDraft(updated.notes ?? "");
      }
    } catch {
      setNotesDraft(run.notes ?? "");
    }
  }, [run, notesDraft]);

  // ── Share run ────────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!run) return;
    const shareUrl = `${window.location.origin}/api/runs/${run.id}/og`;
    const pageUrl = window.location.href;
    const runTitle = run.title?.trim() || format(new Date(run.startedAt), "MMMM d, yyyy");
    const distKm = (run.totalDistanceM / 1000).toFixed(2);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${runTitle} — ${distKm} km`,
          text: `I just ran ${distKm} km with RunCoach AI!`,
          url: pageUrl,
        });
        return;
      } catch {
        // Fall through to clipboard if share is cancelled or fails
      }
    }

    // Fallback: copy the page URL (the OG image is linked in the page head)
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  }, [run]);

  // ── Delete run ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!run) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/runs/${run.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/history");
      }
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }, [run, router]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <RunDetailSkeleton />;

  if (error || !run) {
    return (
      <div className="flex flex-col gap-4 max-w-3xl">
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => router.push("/history")}>
          <ArrowLeft className="size-4 mr-1" />
          Back to History
        </Button>
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            {error ?? "Run not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  const positions = run.points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  // Build split markers: use the position closest in time to each split boundary
  const splitMarkers = run.splits
    .map((split) => {
      // Approximate by index proportionally
      if (run.points.length === 0) return null;
      const idx = Math.min(
        Math.round((split.splitNumber / run.splits.length) * (run.points.length - 1)),
        run.points.length - 1
      );
      const pt = run.points[idx];
      return { splitNumber: split.splitNumber, latitude: pt.latitude, longitude: pt.longitude };
    })
    .filter(Boolean) as { splitNumber: number; latitude: number; longitude: number }[];

  const runDate = new Date(run.startedAt);
  const title = run.title?.trim() || format(runDate, "MMMM d, yyyy");

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Back + date */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => router.push("/history")}>
          <ArrowLeft className="size-4 mr-1" />
          History
        </Button>
        <time className="text-sm text-gray-400" dateTime={run.startedAt}>
          {format(runDate, "EEE, MMM d · h:mm a")}
        </time>
      </div>

      {/* Title */}
      <div className="flex items-start gap-2">
        {editingTitle ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(run.title ?? ""); }
              }}
              placeholder="Add a title…"
              className="flex-1 text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-gray-900 outline-none"
            />
            <button onClick={saveTitle} className="p-1 text-gray-700 hover:text-gray-900">
              <Check className="size-5" />
            </button>
            <button onClick={() => { setEditingTitle(false); setTitleDraft(run.title ?? ""); }} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2 group">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <button
              onClick={() => setEditingTitle(true)}
              className="p-1 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Edit title"
            >
              <Pencil className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Map */}
      {positions.length >= 2 ? (
        <RouteMap
          positions={positions}
          splits={splitMarkers}
          className="h-72 w-full border border-gray-200"
        />
      ) : (
        <div className="h-72 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
          No GPS data recorded
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={TrendingUp}
          label="Distance"
          value={(run.totalDistanceM / 1000).toFixed(2)}
          unit="km"
        />
        <StatCard
          icon={Clock}
          label="Duration"
          value={formatDuration(run.totalDurationS)}
        />
        <StatCard
          icon={Gauge}
          label="Avg Pace"
          value={formatPace(run.avgPaceSPerKm)}
          unit="/km"
        />
        <StatCard
          icon={Mountain}
          label="Elevation"
          value={Math.round(run.elevationGainM).toString()}
          unit="m"
        />
      </div>

      {/* Splits table */}
      {run.splits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Splits</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wide">
                    <th className="text-left px-6 py-2 font-medium">#</th>
                    <th className="text-right px-4 py-2 font-medium">Distance</th>
                    <th className="text-right px-4 py-2 font-medium">Time</th>
                    <th className="text-right px-6 py-2 font-medium">Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {run.splits.map((split, idx) => (
                    <tr
                      key={split.id}
                      className={cn(
                        "border-b border-gray-50 last:border-0",
                        idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                      )}
                    >
                      <td className="px-6 py-3 font-medium text-gray-700">{split.splitNumber}</td>
                      <td className="text-right px-4 py-3 tabular-nums text-gray-600">
                        {formatDistance(split.distanceM)}
                      </td>
                      <td className="text-right px-4 py-3 tabular-nums text-gray-600">
                        {formatDuration(split.durationS)}
                      </td>
                      <td className="text-right px-6 py-3 tabular-nums font-medium text-gray-900">
                        {formatPace(split.avgPaceSPerKm)}<span className="text-gray-400 font-normal">/km</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Notes</CardTitle>
            {!editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                aria-label="Edit notes"
              >
                <Pencil className="size-4" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingNotes ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setEditingNotes(false); setNotesDraft(run.notes ?? ""); }
                }}
                placeholder="Add notes about this run…"
                rows={4}
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200 outline-none focus:border-gray-400 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setEditingNotes(false); setNotesDraft(run.notes ?? ""); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveNotes}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p
              className={cn("text-sm cursor-pointer", run.notes ? "text-gray-700" : "text-gray-400 italic")}
              onClick={() => setEditingNotes(true)}
            >
              {run.notes ?? "No notes — click to add."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Coach's Analysis */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gray-700" />
            <CardTitle className="text-xs font-black uppercase tracking-widest text-black">
              AI Analysis
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {analysisLoading && (
            <div className="flex items-center gap-3">
              <div className="animate-pulse flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-gray-300" />
                <div className="h-2 w-2 rounded-full bg-gray-300" />
                <div className="h-2 w-2 rounded-full bg-gray-300" />
              </div>
              <p className="text-sm text-gray-400 animate-pulse">Analyzing your run…</p>
            </div>
          )}
          {!analysisLoading && analysisError === "no-key" && (
            <p className="text-sm text-gray-400 italic">
              Set up <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">GROQ_API_KEY</code> for AI analysis
            </p>
          )}
          {!analysisLoading && analysisError && analysisError !== "no-key" && (
            <p className="text-sm text-gray-400 italic">Analysis unavailable — try again later.</p>
          )}
          {!analysisLoading && !analysisError && analysisText && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{analysisText}</p>
          )}
        </CardContent>
      </Card>

      {/* Share, Export, Delete */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        {/* Share + Export */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-1.5"
          >
            <Share2 className="size-4" />
            {copied ? "Copied!" : "Share"}
          </Button>
          <a
            href={`/api/runs/${run.id}/export?format=gpx`}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Download className="size-4" />
            GPX
          </a>
          <a
            href={`/api/runs/${run.id}/export?format=csv`}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Download className="size-4" />
            CSV
          </a>
        </div>

        {/* Delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">Delete this run?</p>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4 mr-1" />
            Delete Run
          </Button>
        )}
      </div>
    </div>
  );
}
