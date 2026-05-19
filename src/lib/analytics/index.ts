import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
} from "date-fns";
import type { DailyEntry } from "@/lib/db/schema";

export type PeriodType = "day" | "week" | "month" | "year";

export function getPeriodBounds(
  type: PeriodType,
  anchor: Date
): { start: Date; end: Date; label: string } {
  switch (type) {
    case "day":
      return {
        start: startOfDay(anchor),
        end: endOfDay(anchor),
        label: format(anchor, "d MMM yyyy"),
      };
    case "week":
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(anchor, { weekStartsOn: 1 }),
        label: `Недела ${format(anchor, "w, yyyy")}`,
      };
    case "month":
      return {
        start: startOfMonth(anchor),
        end: endOfMonth(anchor),
        label: format(anchor, "MMMM yyyy"),
      };
    case "year":
      return {
        start: startOfYear(anchor),
        end: endOfYear(anchor),
        label: format(anchor, "yyyy"),
      };
  }
}

export function shiftPeriod(type: PeriodType, anchor: Date, delta: number): Date {
  if (delta === 0) return anchor;
  const sign = delta > 0 ? 1 : -1;
  const steps = Math.abs(delta);
  let d = anchor;
  for (let i = 0; i < steps; i++) {
    if (type === "day") d = sign > 0 ? addDays(d, 1) : subDays(d, 1);
    else if (type === "week") d = sign > 0 ? addWeeks(d, 1) : subWeeks(d, 1);
    else if (type === "month") d = sign > 0 ? addMonths(d, 1) : subMonths(d, 1);
    else d = sign > 0 ? addYears(d, 1) : subYears(d, 1);
  }
  return d;
}

export function previousPeriodBounds(type: PeriodType, start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - duration);
  return { start: prevStart, end: prevEnd };
}

export function filterEntriesByRange(
  entries: DailyEntry[],
  start: Date,
  end: Date
) {
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");
  return entries.filter((e) => e.sessionDate >= startStr && e.sessionDate <= endStr);
}

export function aggregateEntries(entries: DailyEntry[]) {
  const sum = (fn: (e: DailyEntry) => number) =>
    entries.reduce((a, e) => a + fn(e), 0);

  const p1 = sum((e) => e.p1Count);
  const p2 = sum((e) => e.p2Count);
  const p3 = sum((e) => e.p3Count);
  const tokens = sum((e) => e.tokensCollected);
  const paid = p1 + p2 + p3;

  const grossRevenue = sum((e) => Number(e.grossRevenueMkd));
  const waterCost = sum((e) => Number(e.waterCostMkd));
  const electricityCost = sum((e) => Number(e.electricityCostMkd));
  const chemical1Cost = sum((e) => Number(e.chemical1CostMkd));
  const chemical2Cost = sum((e) => Number(e.chemical2CostMkd));
  const miscCost = sum((e) => Number(e.miscExpensesMkd));
  const netProfit = sum((e) => Number(e.netProfitMkd));
  const totalCost = waterCost + electricityCost + chemical1Cost + chemical2Cost + miscCost;

  const deltaKwh = sum((e) => Number(e.deltaKwh ?? 0));
  const expectedKwh = sum((e) => Number(e.expectedKwh ?? 0));

  return {
    p1,
    p2,
    p3,
    paid,
    tokens,
    cashWashes: paid - tokens,
    grossRevenue,
    waterCost,
    electricityCost,
    chemical1Cost,
    chemical2Cost,
    miscCost,
    totalCost,
    netProfit,
    profitMargin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0,
    revenuePerWash: paid > 0 ? grossRevenue / paid : 0,
    costPerWash: paid > 0 ? totalCost / paid : 0,
    profitPerWash: paid > 0 ? netProfit / paid : 0,
    deltaKwh,
    expectedKwh,
    entryCount: entries.length,
    avgDailyRevenue: entries.length > 0 ? grossRevenue / entries.length : 0,
    avgDailyWashes: entries.length > 0 ? paid / entries.length : 0,
  };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function revenueByProgram(entries: DailyEntry[], prices: { p1: number; p2: number; p3: number }) {
  const p1 = entries.reduce((s, e) => s + e.p1Count, 0) * prices.p1;
  const p2 = entries.reduce((s, e) => s + e.p2Count, 0) * prices.p2;
  const p3 = entries.reduce((s, e) => s + e.p3Count, 0) * prices.p3;
  return { p1, p2, p3, total: p1 + p2 + p3 };
}

export function dailyTrend(entries: DailyEntry[]) {
  return entries
    .map((e) => ({
      date: e.sessionDate,
      revenue: Number(e.grossRevenueMkd),
      profit: Number(e.netProfitMkd),
      washes: e.p1Count + e.p2Count + e.p3Count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function findRecords(allEntries: DailyEntry[]) {
  if (allEntries.length === 0) return null;
  let bestRevenue = allEntries[0];
  let mostWashes = allEntries[0];
  let bestProfit = allEntries[0];

  for (const e of allEntries) {
    if (Number(e.grossRevenueMkd) > Number(bestRevenue.grossRevenueMkd)) bestRevenue = e;
    if (e.p1Count + e.p2Count + e.p3Count > mostWashes.p1Count + mostWashes.p2Count + mostWashes.p3Count)
      mostWashes = e;
    if (Number(e.netProfitMkd) > Number(bestProfit.netProfitMkd)) bestProfit = e;
  }

  return {
    bestRevenueDay: { date: bestRevenue.sessionDate, value: Number(bestRevenue.grossRevenueMkd) },
    mostWashesDay: {
      date: mostWashes.sessionDate,
      value: mostWashes.p1Count + mostWashes.p2Count + mostWashes.p3Count,
    },
    bestProfitDay: { date: bestProfit.sessionDate, value: Number(bestProfit.netProfitMkd) },
  };
}

export function bestDayOfWeek(entries: DailyEntry[]) {
  const byDow: Record<number, { revenue: number; count: number }> = {};
  for (const e of entries) {
    const d = new Date(e.sessionDate + "T12:00:00").getDay();
    if (!byDow[d]) byDow[d] = { revenue: 0, count: 0 };
    byDow[d].revenue += Number(e.grossRevenueMkd);
    byDow[d].count += 1;
  }
  let best = 0;
  let bestAvg = 0;
  for (const [dow, data] of Object.entries(byDow)) {
    const avg = data.count > 0 ? data.revenue / data.count : 0;
    if (avg > bestAvg) {
      bestAvg = avg;
      best = Number(dow);
    }
  }
  const names = ["Нед", "Пон", "Вто", "Сре", "Чет", "Пет", "Саб"];
  return { dayIndex: best, dayName: names[best], avgRevenue: bestAvg };
}
