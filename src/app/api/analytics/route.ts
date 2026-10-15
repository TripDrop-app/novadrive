import { NextResponse } from "next/server";
import { listDailyEntries } from "@/lib/db/entries";
import { getSettings } from "@/lib/db/settings";
import {
  getPeriodBounds,
  shiftPeriod,
  previousPeriodBounds,
  filterEntriesByRange,
  aggregateEntries,
  pctChange,
  revenueByProgram,
  dailyTrend,
  findRecords,
  bestDayOfWeek,
  type PeriodType,
} from "@/lib/analytics";
import {
  buildTrendSeries,
  weekdaySeries,
  programRevenueSeries,
  programWashSeries,
  aggregateProgramProfit,
  costBreakdownSeries,
} from "@/lib/analytics/series";
import { enrichEntriesForAnalytics } from "@/lib/analytics/enrich";
import { differenceInDays, format } from "date-fns";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "month") as PeriodType;
    const anchorStr = searchParams.get("anchor");
    const anchor = anchorStr ? new Date(anchorStr) : new Date();

    const bounds = getPeriodBounds(period, anchor);
    const prevBounds = previousPeriodBounds(period, bounds.start, bounds.end);

    const allEntriesRaw = await listDailyEntries();
    const settings = await getSettings();
    const allEntries = enrichEntriesForAnalytics(allEntriesRaw);

    const currentEntries = filterEntriesByRange(allEntries, bounds.start, bounds.end);
    const previousEntries = filterEntriesByRange(
      allEntries,
      prevBounds.start,
      prevBounds.end
    );

    const current = aggregateEntries(currentEntries);
    const previous = aggregateEntries(previousEntries);

    const startStr = format(bounds.start, "yyyy-MM-dd");
    const endStr = format(bounds.end, "yyyy-MM-dd");
    const expenseRows = await db.select().from(expenses);
    const periodExpenses = expenseRows.filter(
      (e) => e.expenseDate >= startStr && e.expenseDate <= endStr
    );
    const chemicalExpenseCost = periodExpenses
      .filter((e) => e.category === "chemicals")
      .reduce((s, e) => s + Number(e.amountMkd), 0);

    const prices = {
      p1: settings.priceP1Mkd,
      p2: settings.priceP2Mkd,
      p3: settings.priceP3Mkd,
    };

    const comparison = {
      revenue: pctChange(current.grossRevenue, previous.grossRevenue),
      profit: pctChange(current.netProfit, previous.netProfit),
      washes: pctChange(current.paid, previous.paid),
      costs: pctChange(current.totalCost + chemicalExpenseCost, previous.totalCost),
    };

    const prevWeekAnchor = shiftPeriod(period, anchor, -1);
    const prevWeekBounds = getPeriodBounds(period, prevWeekAnchor);
    const prevWeekEntries = filterEntriesByRange(
      allEntries,
      prevWeekBounds.start,
      prevWeekBounds.end
    );

    const rev = revenueByProgram(currentEntries, prices);
    const trendRaw = dailyTrend(currentEntries);

    return NextResponse.json({
      period,
      label: bounds.label,
      anchor: anchor.toISOString(),
      current: {
        ...current,
        chemical1Cost: 0,
        chemical2Cost: 0,
        totalCost: current.waterCost + current.electricityCost + current.miscCost,
      },
      previous,
      comparison,
      revenueByProgram: rev,
      revenueByProgramChart: programRevenueSeries(rev.p1, rev.p2, rev.p3),
      washMixChart: programWashSeries(current.p1, current.p2, current.p3),
      programProfitChart: aggregateProgramProfit(currentEntries, settings),
      costChart: costBreakdownSeries({
        water: current.waterCost,
        electricity: current.electricityCost,
        chemical1: chemicalExpenseCost,
        chemical2: 0,
        misc: current.miscCost,
      }),
      weekdayChart: weekdaySeries(currentEntries),
      trend: trendRaw,
      trendFilled: buildTrendSeries(
        currentEntries,
        period === "day"
          ? 14
          : Math.min(
              period === "year" ? 90 : differenceInDays(bounds.end, bounds.start) + 1,
              period === "week" ? 7 : period === "month" ? 31 : 90
            ),
        endStr
      ),
      records: findRecords(allEntries),
      bestDayOfWeek: bestDayOfWeek(currentEntries),
      sideBySide: {
        current: aggregateEntries(currentEntries),
        previousPeriod: aggregateEntries(previousEntries),
        previousWeek: aggregateEntries(prevWeekEntries),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}
