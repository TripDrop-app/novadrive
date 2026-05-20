import { format, parseISO, subDays } from "date-fns";
import type { DailyEntry } from "@/lib/db/schema";
import { computeProgramBreakdowns, parseSettings } from "@/lib/calculations";
import type { CalcSettings } from "@/lib/calculations/types";
import { PROGRAM_COLORS } from "@/lib/charts/theme";

export interface TrendPoint {
  date: string;
  label: string;
  revenue: number;
  profit: number;
  washes: number;
}

export function buildTrendSeries(
  entries: DailyEntry[],
  dayCount: number,
  endDateYmd: string
): TrendPoint[] {
  const byDate = new Map(
    entries.map((e) => [
      e.sessionDate,
      {
        revenue: Number(e.grossRevenueMkd),
        profit: Number(e.netProfitMkd),
        washes: e.p1Count + e.p2Count + e.p3Count,
      },
    ])
  );

  const end = parseISO(`${endDateYmd}T12:00:00`);
  const points: TrendPoint[] = [];

  for (let i = dayCount - 1; i >= 0; i--) {
    const d = subDays(end, i);
    const date = format(d, "yyyy-MM-dd");
    const row = byDate.get(date);
    points.push({
      date,
      label: format(d, "d.M"),
      revenue: row?.revenue ?? 0,
      profit: row?.profit ?? 0,
      washes: row?.washes ?? 0,
    });
  }

  return points;
}

export interface WeekdayPoint {
  name: string;
  revenue: number;
  profit: number;
  washes: number;
  days: number;
}

const WEEKDAY_MK = ["Пон", "Вто", "Сре", "Чет", "Пет", "Саб", "Нед"];

export function weekdaySeries(entries: DailyEntry[]): WeekdayPoint[] {
  const buckets = WEEKDAY_MK.map((name) => ({
    name,
    revenue: 0,
    profit: 0,
    washes: 0,
    days: 0,
  }));

  for (const e of entries) {
    const jsDay = new Date(`${e.sessionDate}T12:00:00`).getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    buckets[idx].revenue += Number(e.grossRevenueMkd);
    buckets[idx].profit += Number(e.netProfitMkd);
    buckets[idx].washes += e.p1Count + e.p2Count + e.p3Count;
    buckets[idx].days += 1;
  }

  return buckets;
}

export interface ProgramChartPoint {
  name: string;
  program: 1 | 2 | 3;
  value: number;
  profit?: number;
  washes?: number;
  fill: string;
}

export function programRevenueSeries(
  p1: number,
  p2: number,
  p3: number
): ProgramChartPoint[] {
  return [
    { name: "P1", program: 1, value: p1, fill: PROGRAM_COLORS.p1 },
    { name: "P2", program: 2, value: p2, fill: PROGRAM_COLORS.p2 },
    { name: "P3", program: 3, value: p3, fill: PROGRAM_COLORS.p3 },
  ];
}

export function programWashSeries(p1: number, p2: number, p3: number): ProgramChartPoint[] {
  const rows: ProgramChartPoint[] = [
    { name: "P1", program: 1, value: p1, washes: p1, fill: PROGRAM_COLORS.p1 },
    { name: "P2", program: 2, value: p2, washes: p2, fill: PROGRAM_COLORS.p2 },
    { name: "P3", program: 3, value: p3, washes: p3, fill: PROGRAM_COLORS.p3 },
  ];
  return rows.filter((d) => d.value > 0);
}

export function aggregateProgramProfit(
  entries: DailyEntry[],
  settingsRow: Parameters<typeof parseSettings>[0]
): ProgramChartPoint[] {
  const settings: CalcSettings = parseSettings(settingsRow);
  const profit = { 1: 0, 2: 0, 3: 0 };
  const revenue = { 1: 0, 2: 0, 3: 0 };
  const washes = { 1: 0, 2: 0, 3: 0 };

  for (const e of entries) {
    const rows = computeProgramBreakdowns({
      counts: { p1: e.p1Count, p2: e.p2Count, p3: e.p3Count },
      settings,
      electricityCostMkd: Number(e.electricityCostMkd),
      chemical1CostMkd: Number(e.chemical1CostMkd),
      chemical2CostMkd: Number(e.chemical2CostMkd),
      miscExpensesMkd: Number(e.miscExpensesMkd),
    });
    for (const r of rows) {
      profit[r.program] += r.profitMkd;
      revenue[r.program] += r.revenueMkd;
      washes[r.program] += r.count;
    }
  }

  return [
    {
      name: "P1",
      program: 1,
      value: profit[1],
      profit: profit[1],
      washes: washes[1],
      fill: PROGRAM_COLORS.p1,
    },
    {
      name: "P2",
      program: 2,
      value: profit[2],
      profit: profit[2],
      washes: washes[2],
      fill: PROGRAM_COLORS.p2,
    },
    {
      name: "P3",
      program: 3,
      value: profit[3],
      profit: profit[3],
      washes: washes[3],
      fill: PROGRAM_COLORS.p3,
    },
  ];
}

export function costBreakdownSeries(costs: {
  water: number;
  electricity: number;
  chemical1: number;
  chemical2: number;
  misc: number;
}) {
  return [
    { name: "Вода", key: "water", value: costs.water, fill: "#38BDF8" },
    { name: "Струја", key: "electricity", value: costs.electricity, fill: "#1A6EFF" },
    { name: "Хем. 1", key: "chemical1", value: costs.chemical1, fill: "#6366F1" },
    { name: "Хем. 2", key: "chemical2", value: costs.chemical2, fill: "#A78BFA" },
    { name: "Друго", key: "misc", value: costs.misc, fill: "#CBD5E1" },
  ].filter((c) => c.value > 0);
}
