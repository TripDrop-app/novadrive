import type { DailyEntry } from "@/lib/db/schema";
import {
  chemical1CostPerSession,
  chemical2CostPerSession,
  parseSettings,
  round2,
} from "@/lib/calculations";
import type { Settings } from "@/lib/db/schema";

/** Recompute chemical costs from wash counts so analytics matches current yield settings. */
export function enrichEntriesForAnalytics(
  entries: DailyEntry[],
  settingsRow: Settings
): DailyEntry[] {
  const calc = parseSettings(settingsRow);

  return entries.map((entry) => {
    const counts = {
      p1: entry.p1Count,
      p2: entry.p2Count,
      p3: entry.p3Count,
    };
    const chem1 = chemical1CostPerSession(counts, calc);
    const chem2 = chemical2CostPerSession(counts, calc);
    const water = Number(entry.waterCostMkd);
    const elec = Number(entry.electricityCostMkd);
    const revenue = Number(entry.grossRevenueMkd);
    const misc = Number(entry.miscExpensesMkd);
    const profit = revenue - water - elec - chem1 - chem2 - misc;

    return {
      ...entry,
      chemical1CostMkd: round2(chem1).toString(),
      chemical2CostMkd: round2(chem2).toString(),
      netProfitMkd: round2(profit).toString(),
    };
  });
}
