"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, Route, Zap, TrendingUp, Mountain, Timer } from "lucide-react";

interface RecordEntry {
  type: string;
  label: string;
  value: number;
  formatted: string;
  unit: string;
  runId: string;
  date: string;
}

const RECORD_ICONS: Record<string, React.ElementType> = {
  longest_run: Route,
  fastest_pace: Zap,
  most_elevation: Mountain,
  fastest_1k: TrendingUp,
  fastest_5k: Timer,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PersonalRecords() {
  const [records, setRecords] = React.useState<RecordEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/analytics/records")
      .then((r) => r.json())
      .then((data: { records: RecordEntry[] }) => setRecords(data.records ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-amber-100 bg-gradient-to-b from-amber-50 to-white p-4 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-amber-100 mb-3" />
            <div className="h-3 w-24 bg-amber-100 rounded mb-2" />
            <div className="h-5 w-16 bg-amber-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Complete some runs to see your personal records here.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {records.map((record) => {
        const Icon = RECORD_ICONS[record.type] ?? Trophy;
        return (
          <Link
            key={record.type}
            href={`/history/${record.runId}`}
            className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-4 ring-1 ring-amber-100 hover:ring-amber-300 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 group-hover:bg-amber-200 transition-colors">
              <Icon className="size-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                {record.label}
              </p>
              <p className="mt-1 text-xl font-black text-gray-900 font-mono">
                {record.formatted}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(record.date)}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
