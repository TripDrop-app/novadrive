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

    return NextResponse.json({
      today,
      todayEntry,
      programBreakdown,
      unitEconomics,
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
