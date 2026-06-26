"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { formatPace } from "@/lib/geo";

interface PaceDataPoint {
  date: string;
  paceSecsPerKm: number;
}

interface PaceChartProps {
  data: PaceDataPoint[];
}

function formatXDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Recharts passes value as number from the data key
function yAxisFormatter(value: number): string {
  return formatPace(value);
}

interface TooltipPayloadItem {
  value: number;
  name: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const pace = payload[0].value;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 shadow-md text-sm">
      <p className="text-muted-foreground mb-1">
        {label ? formatXDate(label) : ""}
      </p>
      <p className="font-semibold text-purple-700">
        {formatPace(pace)}{" "}
        <span className="text-xs font-normal text-muted-foreground">/km</span>
      </p>
    </div>
  );
}

export function PaceChart({ data }: PaceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No pace data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
      >
        <defs>
          <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tickFormatter={formatXDate}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tickFormatter={yAxisFormatter}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          width={44}
          // Invert domain so faster (lower) pace appears higher on chart
          reversed
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="paceSecsPerKm"
          stroke="#7c3aed"
          strokeWidth={2}
          fill="url(#paceGradient)"
          dot={false}
          activeDot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
