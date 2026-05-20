"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, CHART_ANIMATION, formatChartMkd } from "@/lib/charts/theme";
import type { ProgramChartPoint, TrendPoint, WeekdayPoint } from "@/lib/analytics/series";
import { ChartGradientDefs } from "./chart-shell";

interface TooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700/20 bg-slate-900 px-3 py-2.5 text-xs text-white shadow-xl">
      {label && <p className="mb-1.5 font-semibold text-slate-300">{label}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: p.color ?? CHART.primary }}
          />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold">{formatChartMkd(Number(p.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}

const axisTick = { fontSize: 11, fill: CHART.slate };
const gridProps = { stroke: CHART.grid, strokeDasharray: "4 6", vertical: false };

export function RevenueProfitAreaChart({
  data,
  height = 240,
  compact,
}: {
  data: TrendPoint[];
  height?: number;
  compact?: boolean;
}) {
  if (data.length === 0) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <ChartGradientDefs />
        <CartesianGrid {...gridProps} />
        <XAxis
          dataKey="label"
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          interval={compact ? "preserveStartEnd" : 0}
        />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatChartMkd(v)}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Приход"
          stroke={CHART.primary}
          strokeWidth={2.5}
          fill="url(#gradRevenue)"
          animationDuration={CHART_ANIMATION.duration}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: CHART.primary }}
        />
        <Area
          type="monotone"
          dataKey="profit"
          name="Профит"
          stroke={CHART.success}
          strokeWidth={2.5}
          fill="url(#gradProfit)"
          animationDuration={CHART_ANIMATION.duration}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: CHART.success }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WashesAreaChart({ data, height = 160 }: { data: TrendPoint[]; height?: number }) {
  if (data.length === 0) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <ChartGradientDefs />
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="washes"
          name="Миења"
          stroke={CHART.violet}
          strokeWidth={2}
          fill="url(#gradWashes)"
          animationDuration={CHART_ANIMATION.duration}
          dot={false}
          activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2, fill: CHART.violet }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProgramBarChart({
  data,
  height = 220,
  dataKey = "value",
  name = "Приход",
}: {
  data: ProgramChartPoint[];
  height?: number;
  dataKey?: string;
  name?: string;
}) {
  const filtered = data.filter((d) => d.value !== 0 || (d.profit !== undefined && d.profit !== 0));
  if (filtered.length === 0) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={filtered} margin={{ top: 12, right: 8, left: -8, bottom: 4 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="name" tick={{ ...axisTick, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => formatChartMkd(v)} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          dataKey={dataKey}
          name={name}
          radius={[10, 10, 4, 4]}
          animationDuration={CHART_ANIMATION.duration}
          maxBarSize={56}
        >
          {filtered.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ProgramDonutChart({
  data,
  height = 220,
  centerLabel,
}: {
  data: ProgramChartPoint[];
  height?: number;
  centerLabel?: string;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <ChartEmpty />;

  const total = filtered.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={filtered}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={4}
            cornerRadius={6}
            animationDuration={CHART_ANIMATION.duration}
            stroke="none"
          >
            {filtered.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{centerLabel}</span>
          <span className="text-xs text-muted">вкупно</span>
        </div>
      )}
      {!centerLabel && total > 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted">миења</span>
        </div>
      )}
      <div className="mt-1 flex justify-center gap-4">
        {filtered.map((d) => (
          <span key={d.name} className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CostBreakdownChart({
  data,
  height = 200,
}: {
  data: { name: string; value: number; fill: string }[];
  height?: number;
}) {
  if (data.length === 0) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid {...gridProps} horizontal={false} vertical strokeDasharray="4 6" />
        <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => formatChartMkd(v)} />
        <YAxis type="category" dataKey="name" tick={{ ...axisTick, fontSize: 12 }} width={52} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Трошок" radius={[0, 8, 8, 0]} animationDuration={CHART_ANIMATION.duration} barSize={22}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WeekdayBarChart({ data, height = 200 }: { data: WeekdayPoint[]; height?: number }) {
  const hasData = data.some((d) => d.revenue > 0);
  if (!hasData) return <ChartEmpty />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 4 }}>
        <ChartGradientDefs />
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="name" tick={{ ...axisTick, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => formatChartMkd(v)} width={48} />
        <Tooltip content={<ChartTooltip />} />
        <Bar
          yAxisId="left"
          dataKey="revenue"
          name="Приход"
          fill="url(#gradBarBlue)"
          radius={[8, 8, 4, 4]}
          animationDuration={CHART_ANIMATION.duration}
          maxBarSize={40}
        />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="profit"
          name="Профит"
          stroke={CHART.success}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART.success, strokeWidth: 0 }}
          animationDuration={CHART_ANIMATION.duration}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SparklineChart({ data, height = 72 }: { data: TrendPoint[]; height?: number }) {
  if (data.length < 2) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <ChartGradientDefs />
        <defs>
          <linearGradient id="sparkProfit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="profit"
          stroke={CHART.success}
          strokeWidth={2}
          fill="url(#sparkProfit)"
          animationDuration={800}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ChartEmpty() {
  return (
    <div className="flex h-[160px] items-center justify-center rounded-xl bg-slate-50 text-sm text-muted">
      Нема податоци за графикон
    </div>
  );
}

/** @deprecated use ProgramBarChart */
export function RevenueBarChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ProgramBarChart
      data={data.map((d, i) => ({
        name: d.name,
        program: (i + 1) as 1 | 2 | 3,
        value: d.value,
        fill: ["#1A6EFF", "#3B82F6", "#8B5CF6"][i] ?? "#1A6EFF",
      }))}
    />
  );
}

/** @deprecated use RevenueProfitAreaChart */
export function TrendLineChart({ data }: { data: { date: string; revenue: number; profit: number }[] }) {
  return (
    <RevenueProfitAreaChart
      data={data.map((d) => ({
        date: d.date,
        label: d.date.slice(5).replace("-", "."),
        revenue: d.revenue,
        profit: d.profit,
        washes: 0,
      }))}
    />
  );
}

/** @deprecated use ProgramDonutChart */
export function WashDonutChart({ p1, p2, p3 }: { p1: number; p2: number; p3: number }) {
  return (
    <ProgramDonutChart
      data={[
        { name: "P1", program: 1, value: p1, fill: "#1A6EFF" },
        { name: "P2", program: 2, value: p2, fill: "#3B82F6" },
        { name: "P3", program: 3, value: p3, fill: "#8B5CF6" },
      ]}
    />
  );
}

/** @deprecated use CostBreakdownChart */
export function CostStackChart(props: {
  water: number;
  electricity: number;
  chemical1: number;
  chemical2: number;
  misc: number;
}) {
  return (
    <CostBreakdownChart
      data={[
        { name: "Вода", value: props.water, fill: "#38BDF8" },
        { name: "Струја", value: props.electricity, fill: "#1A6EFF" },
        { name: "Хем.1", value: props.chemical1, fill: "#6366F1" },
        { name: "Хем.2", value: props.chemical2, fill: "#A78BFA" },
        { name: "Друго", value: props.misc, fill: "#CBD5E1" },
      ].filter((c) => c.value > 0)}
    />
  );
}
