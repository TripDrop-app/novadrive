import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/api-error";
import {
  computeProgramBreakdowns,
  computeUnitEconomics,
  parseSettings,
} from "@/lib/calculations";
import { getEntryForDate, getTokenStats, getChemicalUsageSinceLastCanister } from "@/lib/db/entries";
import { getSettings } from "@/lib/db/settings";
import { listDailyEntries } from "@/lib/db/entries";
import { todayDateStr } from "@/lib/format";
import {
  buildTrendSeries,
  programRevenueSeries,
  programWashSeries,
  aggregateProgramProfit,
} from "@/lib/analytics/series";
import {
  filterEntriesByRange,
  getPeriodBounds,
  revenueByProgram,
} from "@/lib/analytics";
import { parseISO } from "date-fns";

export async function GET() {
  try {
    const today = todayDateStr();
    const settings = await getSettings();
    const todayEntry = await getEntryForDate(today);
    const tokenStats = await getTokenStats();
    const c1Used = await getChemicalUsageSinceLastCanister("c1");
    const c2Used = await getChemicalUsageSinceLastCanister("c2");

    const yield1 = settings.chemical1YieldWashes ?? 0;
    const yield2 = settings.chemical2YieldWashes ?? 0;
    const c1Remaining = yield1 > 0 ? Math.max(0, yield1 - c1Used) : null;
    const c2Remaining = yield2 > 0 ? Math.max(0, yield2 - c2Used) : null;

    const entries = await listDailyEntries();
    const lastEntry = entries[0] ?? null;

    const calcSettings = parseSettings(settings);
    let programBreakdown = null;
    let unitEconomics = null;

    if (todayEntry) {
      programBreakdown = computeProgramBreakdowns({
        counts: {
          p1: todayEntry.p1Count,
          p2: todayEntry.p2Count,
          p3: todayEntry.p3Count,
        },
        settings: calcSettings,
        electricityCostMkd: Number(todayEntry.electricityCostMkd),
        chemical1CostMkd: Number(todayEntry.chemical1CostMkd),
        chemical2CostMkd: Number(todayEntry.chemical2CostMkd),
        miscExpensesMkd: Number(todayEntry.miscExpensesMkd),
      });
    } else {
      unitEconomics = computeUnitEconomics(calcSettings);
    }

    const anchor = parseISO(`${today}T12:00:00`);
    const weekBounds = getPeriodBounds("week", anchor);
    const weekEntries = filterEntriesByRange(entries, weekBounds.start, weekBounds.end);
    const trend14 = buildTrendSeries(entries, 14, today);
    const weekRev = revenueByProgram(weekEntries, {
      p1: settings.priceP1Mkd,
      p2: settings.priceP2Mkd,
      p3: settings.priceP3Mkd,
    });
    const weekAgg = weekEntries.reduce(
      (acc, e) => ({
        revenue: acc.revenue + Number(e.grossRevenueMkd),
        profit: acc.profit + Number(e.netProfitMkd),
        washes: acc.washes + e.p1Count + e.p2Count + e.p3Count,
      }),
      { revenue: 0, profit: 0, washes: 0 }
    );

    return NextResponse.json({
      today,
      todayEntry,
      programBreakdown,
      unitEconomics,
      charts: {
        trend14,
        weekRevenueByProgram: programRevenueSeries(weekRev.p1, weekRev.p2, weekRev.p3),
        weekProgramProfit: aggregateProgramProfit(weekEntries, settings),
        weekWashMix: programWashSeries(
          weekEntries.reduce((s, e) => s + e.p1Count, 0),
          weekEntries.reduce((s, e) => s + e.p2Count, 0),
          weekEntries.reduce((s, e) => s + e.p3Count, 0)
        ),
        weekTotals: weekAgg,
      },
      tokenStats,
      chemical: {
        c1Used,
        c2Used,
        c1Remaining,
        c2Remaining,
        c1Yield: yield1,
        c2Yield: yield2,
        c1Low: c1Remaining != null && yield1 > 0 && c1Remaining / yield1 < 0.15,
        c2Low: c2Remaining != null && yield2 > 0 && c2Remaining / yield2 < 0.15,
      },
      lastEntry,
      setupCompleted: settings.setupCompleted,
    });
  } catch (e) {
    return databaseErrorResponse(e);
  }
}
