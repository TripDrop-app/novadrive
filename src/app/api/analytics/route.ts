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
import { differenceInDays, format } from "date-fns";
import { db } from "@/lib/db";
import { freeWashes } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") ?? "month") as PeriodType;
    const anchorStr = searchParams.get("anchor");
    const anchor = anchorStr ? new Date(anchorStr) : new Date();

    const bounds = getPeriodBounds(period, anchor);
    const prevBounds = previousPeriodBounds(period, bounds.start, bounds.end);

    const allEntries = await listDailyEntries();
    const settings = await getSettings();

    const currentEntries = filterEntriesByRange(allEntries, bounds.start, bounds.end);
    const previousEntries = filterEntriesByRange(
      allEntries,
      prevBounds.start,
      prevBounds.end
    );

    const current = aggregateEntries(currentEntries);
    const previous = aggregateEntries(previousEntries);

    const freeWashRows = await db.select().from(freeWashes);
    const freeInPeriod = freeWashRows.filter((fw) => {
      const entry = allEntries.find((e) => e.id === fw.dailyEntryId);
      if (!entry) return false;
      const d = new Date(entry.sessionDate + "T12:00:00");
      return d >= bounds.start && d <= bounds.end;
    });
    const freeWashCount = freeInPeriod.reduce((s, fw) => s + fw.quantity, 0);

    const prices = {
      p1: settings.priceP1Mkd,
      p2: settings.priceP2Mkd,
      p3: settings.priceP3Mkd,
    };

    const comparison = {
      revenue: pctChange(current.grossRevenue, previous.grossRevenue),
      profit: pctChange(current.netProfit, previous.netProfit),
      washes: pctChange(current.paid, previous.paid),
      costs: pctChange(current.totalCost, previous.totalCost),
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
    const endStr = format(bounds.end, "yyyy-MM-dd");

    return NextResponse.json({
      period,
      label: bounds.label,
      anchor: anchor.toISOString(),
      current,
      previous,
      comparison,
      revenueByProgram: rev,
      revenueByProgramChart: programRevenueSeries(rev.p1, rev.p2, rev.p3),
      washMixChart: programWashSeries(current.p1, current.p2, current.p3),
      programProfitChart: aggregateProgramProfit(currentEntries, settings),
      costChart: costBreakdownSeries({
        water: current.waterCost,
        electricity: current.electricityCost,
        chemical1: current.chemical1Cost,
        chemical2: current.chemical2Cost,
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
      freeWashCount,
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
