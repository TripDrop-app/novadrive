import type { DailyEntry } from "@/lib/db/schema";
import { round2 } from "@/lib/calculations";

/** Chemicals are manual (pour) only — zero on daily entries; profit uses water + elec + misc. */
export function enrichEntriesForAnalytics(entries: DailyEntry[]): DailyEntry[] {
  return entries.map((entry) => {
    const water = Number(entry.waterCostMkd);
    const elec = Number(entry.electricityCostMkd);
    const revenue = Number(entry.grossRevenueMkd);
    const misc = Number(entry.miscExpensesMkd);
    const profit = revenue - water - elec - misc;

    return {
      ...entry,
      chemical1CostMkd: "0",
      chemical2CostMkd: "0",
      netProfitMkd: round2(profit).toString(),
    };
  });
}
