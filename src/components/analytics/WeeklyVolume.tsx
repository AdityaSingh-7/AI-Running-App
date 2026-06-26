"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface WeeklyVolumeDataPoint {
  week: string;
  distanceM: number;
  count: number;
}

interface WeeklyVolumeProps {
  data: WeeklyVolumeDataPoint[];
}

// Parse ISO week string "YYYY-Www" -> label like "Jun 1"
function formatWeekLabel(isoWeek: string): string {
  // isoWeek = "2024-W23"
  const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return isoWeek;
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  // ISO week 1 contains the first Thursday of the year.
  // Monday of week N = Jan 4 + (N-1)*7 days, adjusted to Monday.
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (dayOfWeek - 1) + (week - 1) * 7);
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipPayloadItem {
  value: number;
  payload: WeeklyVolumeDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const km = (item.payload.distanceM / 1000).toFixed(1);
  const count = item.payload.count;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground mb-1">
        {label ? formatWeekLabel(label) : ""}
      </p>
      <p className="font-semibold text-blue-700">
        {km}{" "}
        <span className="text-xs font-normal text-muted-foreground">km</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "run" : "runs"}
      </p>
    </div>
  );
}

export function WeeklyVolume({ data }: WeeklyVolumeProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No weekly data available
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    distanceKm: parseFloat((d.distanceM / 1000).toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.85} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="week"
          tickFormatter={formatWeekLabel}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          minTickGap={30}
        />
        <YAxis
          tickFormatter={(v: number) => `${v}`}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={32}
          unit=" km"
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="distanceKm" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {chartData.map((_, i) => (
            <Cell key={i} fill="url(#barGradient)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
