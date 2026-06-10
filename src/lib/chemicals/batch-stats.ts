import type { DailyEntry } from "@/lib/db/schema";
import type { CalcSettings } from "@/lib/calculations/types";
import { round2 } from "@/lib/calculations";

export interface ChemicalBatchStats {
  washCount: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  revenueMkd: number;
  waterCostMkd: number;
  electricityCostMkd: number;
  profitMkd: number;
}

export function computeBatchStats(
  entries: DailyEntry[],
  type: "c1" | "c2",
  canisterCost: number,
  settings: CalcSettings,
  active = false
): ChemicalBatchStats {
  let washCount = 0;
  let p1Count = 0;
  let p2Count = 0;
  let p3Count = 0;
  let revenueMkd = 0;
  let waterCostMkd = 0;
  let electricityCostMkd = 0;

  for (const e of entries) {
    p1Count += e.p1Count;
    p2Count += e.p2Count;
    p3Count += e.p3Count;
    waterCostMkd += Number(e.waterCostMkd);
    electricityCostMkd += Number(e.electricityCostMkd);

    if (type === "c1") {
      const washes = e.p1Count + e.p2Count + e.p3Count;
      washCount += washes;
      revenueMkd += Number(e.grossRevenueMkd);
    } else {
      washCount += e.p2Count + e.p3Count;
      revenueMkd += e.p2Count * settings.priceP2Mkd + e.p3Count * settings.priceP3Mkd;
    }
  }

  const yieldWashes = type === "c1" ? settings.chemical1YieldWashes! : settings.chemical2YieldWashes!;
  const chemCost = active
    ? (washCount / yieldWashes) * canisterCost
    : canisterCost;

  const profitMkd = revenueMkd - waterCostMkd - electricityCostMkd - chemCost;

  return {
    washCount,
    p1Count,
    p2Count,
    p3Count,
    revenueMkd: round2(revenueMkd),
    waterCostMkd: round2(waterCostMkd),
    electricityCostMkd: round2(electricityCostMkd),
    profitMkd: round2(profitMkd),
  };
}
