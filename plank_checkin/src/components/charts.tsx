"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CheckinRow, TrendPoint } from "@/lib/types";

const chartColor = "#165ca5";
const amber = "#f39a16";

function shortDate(value: string) {
  const calendarDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!calendarDate) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${calendarDate}T12:00:00Z`));
}

export function ParticipationChart({ data }: { data: TrendPoint[] }) {
  const chartData = data.map((point) => ({ ...point, label: shortDate(point.date) }));
  return (
    <div className="chart-wrap" aria-label="Ten day participation chart">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="rgba(15,45,79,.12)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#51677d", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="people" allowDecimals={false} tick={{ fill: "#51677d", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis yAxisId="seconds" orientation="right" tick={{ fill: "#51677d", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,45,79,.14)" }} />
          <Bar yAxisId="people" dataKey="participants" name="Check-ins" fill="rgba(22,92,165,.3)" radius={[5, 5, 0, 0]} />
          <Line yAxisId="seconds" dataKey="averageSeconds" name="Average seconds" stroke={amber} strokeWidth={2.5} dot={{ r: 3, fill: amber }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportChart({ data }: { data: CheckinRow[] }) {
  const chartData = data.slice(0, 30).reverse().map((point) => ({
    ...point,
    label: shortDate(point.date),
  }));
  return (
    <div className="chart-wrap" aria-label="Personal plank time chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="rgba(15,45,79,.12)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#51677d", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={20} />
          <YAxis tick={{ fill: "#51677d", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(15,45,79,.14)" }} />
          <Line dataKey="seconds" name="Seconds" stroke={chartColor} strokeWidth={2.5} dot={{ r: 3, fill: chartColor }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
