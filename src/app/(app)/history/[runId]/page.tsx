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
  CheckCircle2,
  Sparkles,
  Share2,
  Download,
  Medal,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className={cn("animate-pulse rounded-md bg-[#F0EDEB]", className)} />
  );
}

function RunDetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-6 w-40" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
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
      <div className="flex flex-col gap-4 max-w-md mx-auto">
        <button
          onClick={() => router.push("/history")}
          className="flex items-center gap-1.5 text-sm text-[#6B7680] hover:text-[#2E363B] w-fit"
        >
          <ArrowLeft className="size-4" />
          Back to History
        </button>
        <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-10 text-center text-[#6B7680]">
          {error ?? "Run not found"}
        </div>
      </div>
    );
  }

  const positions = run.points.map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude,
  }));

  // Build split markers
  const splitMarkers = run.splits
    .map((split) => {
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

  // For pace bar chart: find max pace to normalize bar widths
  const maxPace = run.splits.length > 0
    ? Math.max(...run.splits.map((s) => s.avgPaceSPerKm))
    : 1;
  const minPace = run.splits.length > 0
    ? Math.min(...run.splits.map((s) => s.avgPaceSPerKm))
    : 1;

  // Check if this is a notable run (PR candidate: longest or fastest)
  const isNotable = run.totalDistanceM >= 10000; // 10 km+

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto pb-8">
      {/* Back button */}
      <button
        onClick={() => router.push("/history")}
        className="flex items-center gap-1.5 text-sm text-[#6B7680] hover:text-[#2E363B] w-fit pt-2"
      >
        <ArrowLeft className="size-4" />
        History
      </button>

      {/* Run Complete header */}
      <div className="flex flex-col items-center text-center pt-2 pb-1 gap-3">
        <div className="size-16 rounded-full bg-[#C15F3C] flex items-center justify-center shadow-[0_4px_16px_rgba(193,95,60,0.3)]">
          <CheckCircle2 className="size-8 text-white" strokeWidth={2.5} />
        </div>
        <div>
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(run.title ?? ""); }
                }}
                placeholder="Add a title…"
                className="text-[22px] font-semibold text-[#2E363B] bg-transparent border-b-2 border-[#C15F3C] outline-none text-center"
              />
              <button onClick={saveTitle} className="p-1 text-[#C15F3C]">
                <Check className="size-5" />
              </button>
              <button onClick={() => { setEditingTitle(false); setTitleDraft(run.title ?? ""); }} className="p-1 text-[#6B7680]">
                <X className="size-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-[26px] font-semibold text-[#2E363B]">{title}</h1>
              <button
                onClick={() => setEditingTitle(true)}
                className="p-1 text-[#D9D2CB] hover:text-[#6B7680] opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Edit title"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          )}
          <p className="text-[14px] text-[#6B7680] mt-1">
            {format(runDate, "EEEE, MMMM d · h:mm a")}
          </p>
        </div>
      </div>

      {/* 3-column stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Distance */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col items-center text-center">
          <p className="text-[24px] font-black text-[#C15F3C] leading-none">
            {(run.totalDistanceM / 1000).toFixed(2)}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-[#6B7680] mt-1.5">km</p>
        </div>
        {/* Duration */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col items-center text-center">
          <p className="text-[24px] font-black text-[#2E363B] leading-none tabular-nums">
            {formatDuration(run.totalDurationS)}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-[#6B7680] mt-1.5">Duration</p>
        </div>
        {/* Avg Pace */}
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex flex-col items-center text-center">
          <p className="text-[24px] font-black text-[#2E363B] leading-none tabular-nums">
            {formatPace(run.avgPaceSPerKm)}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-[#6B7680] mt-1.5">/km</p>
        </div>
      </div>

      {/* Elevation stat */}
      {run.elevationGainM > 0 && (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[12px] uppercase tracking-widest text-[#6B7680]">Elevation Gain</p>
            <p className="text-[20px] font-bold text-[#2E363B] mt-0.5">
              {Math.round(run.elevationGainM)}
              <span className="text-[14px] font-medium text-[#6B7680] ml-1">m</span>
            </p>
          </div>
        </div>
      )}

      {/* Route map */}
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680] mb-2">
          Route
        </p>
        {positions.length >= 2 ? (
          <div className="rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <RouteMap
              positions={positions}
              splits={splitMarkers}
              className="h-64 w-full"
            />
          </div>
        ) : (
          <div className="h-48 rounded-2xl bg-[#EFF4EE] flex items-center justify-center text-[#6B7680] text-sm border border-[#E0E8DF]">
            No GPS data recorded
          </div>
        )}
      </div>

      {/* Achievement card (for notable runs) */}
      {isNotable && (
        <div className="bg-[#FCEEE8] rounded-2xl p-4 flex items-center gap-4">
          <div className="size-11 rounded-full bg-white/60 flex items-center justify-center shrink-0">
            <Medal className="size-5 text-[#C15F3C]" />
          </div>
          <div>
            <p className="font-bold text-[#2E363B] text-[15px]">Great effort!</p>
            <p className="text-[13px] text-[#6B7680] mt-0.5">
              You ran {(run.totalDistanceM / 1000).toFixed(1)} km — that&apos;s a long run!
            </p>
          </div>
        </div>
      )}

      {/* Splits section */}
      {run.splits.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680] mb-2">
            Splits
          </p>
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
            {run.splits.map((split, idx) => {
              // Normalize: faster pace = longer bar (invert scale)
              const paceRange = maxPace - minPace || 1;
              const barPct = Math.max(
                20,
                Math.round(((maxPace - split.avgPaceSPerKm) / paceRange) * 80 + 20)
              );
              return (
                <div
                  key={split.id}
                  className={cn(
                    "px-4 py-3 flex items-center gap-3",
                    idx < run.splits.length - 1 ? "border-b border-[#F5F0EB]" : ""
                  )}
                >
                  {/* km label */}
                  <span className="text-[13px] font-medium text-[#6B7680] w-10 shrink-0">
                    {split.splitNumber} km
                  </span>

                  {/* Pace bar */}
                  <div className="flex-1 h-2 rounded-full bg-[#F0EDEB] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#FCEEE8]"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>

                  {/* Pace value */}
                  <span className="text-[13px] font-semibold text-[#2E363B] tabular-nums w-14 text-right shrink-0">
                    {formatPace(split.avgPaceSPerKm)}<span className="text-[#6B7680] font-normal">/km</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680]">
            Notes
          </p>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="p-1 text-[#D9D2CB] hover:text-[#6B7680] transition-colors"
              aria-label="Edit notes"
            >
              <Pencil className="size-4" />
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4">
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
                className="w-full text-sm text-[#2E363B] bg-[#FDF8F4] rounded-xl p-3 border border-[#E8E2DC] outline-none focus:border-[#C15F3C] resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setEditingNotes(false); setNotesDraft(run.notes ?? ""); }}
                  className="h-8 px-3 rounded-full text-sm text-[#6B7680] hover:bg-[#F0EDEB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNotes}
                  className="h-8 px-4 rounded-full bg-[#C15F3C] text-white text-sm font-medium hover:bg-[#9B4628] transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p
              className={cn(
                "text-sm cursor-pointer",
                run.notes ? "text-[#2E363B]" : "text-[#6B7680] italic"
              )}
              onClick={() => setEditingNotes(true)}
            >
              {run.notes ?? "No notes — tap to add."}
            </p>
          )}
        </div>
      </div>

      {/* AI Coach's Analysis */}
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-widest text-[#6B7680] mb-2">
          AI Analysis
        </p>
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 flex items-start gap-3">
          <div className="size-8 rounded-full bg-[#FCEEE8] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="size-4 text-[#C15F3C]" />
          </div>
          <div className="flex-1 min-w-0">
            {analysisLoading && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1 animate-pulse">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#C15F3C]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#C15F3C]" />
                  <div className="h-1.5 w-1.5 rounded-full bg-[#C15F3C]" />
                </div>
                <p className="text-sm text-[#6B7680]">Analyzing your run…</p>
              </div>
            )}
            {!analysisLoading && analysisError === "no-key" && (
              <p className="text-sm text-[#6B7680] italic">
                Set up{" "}
                <code className="text-xs bg-[#F0EDEB] px-1 py-0.5 rounded">GROQ_API_KEY</code>{" "}
                for AI analysis
              </p>
            )}
            {!analysisLoading && analysisError && analysisError !== "no-key" && (
              <p className="text-sm text-[#6B7680] italic">Analysis unavailable — try again later.</p>
            )}
            {!analysisLoading && !analysisError && analysisText && (
              <p className="text-sm text-[#2E363B] leading-relaxed whitespace-pre-line">{analysisText}</p>
            )}
          </div>
        </div>
      </div>

      {/* Share + Done buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleShare}
          className="flex-1 h-12 rounded-full border-2 border-[#C15F3C] text-[#C15F3C] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#FCEEE8] transition-colors"
        >
          <Share2 className="size-4" />
          {copied ? "Copied!" : "Share"}
        </button>
        <button
          onClick={() => router.push("/history")}
          className="flex-1 h-12 rounded-full bg-[#C15F3C] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#9B4628] transition-colors"
        >
          Done
        </button>
      </div>

      {/* Export links */}
      <div className="flex gap-2">
        <a
          href={`/api/runs/${run.id}/export?format=gpx`}
          download
          className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-[#E8E2DC] text-[#6B7680] text-sm hover:bg-[#F0EDEB] transition-colors"
        >
          <Download className="size-3.5" />
          GPX
        </a>
        <a
          href={`/api/runs/${run.id}/export?format=csv`}
          download
          className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-[#E8E2DC] text-[#6B7680] text-sm hover:bg-[#F0EDEB] transition-colors"
        >
          <Download className="size-3.5" />
          CSV
        </a>
      </div>

      {/* Delete */}
      <div className="flex justify-end pb-2">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-[#6B7680]">Delete this run?</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 px-4 rounded-full bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="h-8 px-3 rounded-full text-sm text-[#6B7680] hover:bg-[#F0EDEB] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="size-4" />
            Delete Run
          </button>
        )}
      </div>
    </div>
  );
}
