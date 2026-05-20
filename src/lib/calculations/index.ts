import type { CalcSettings, EntrySnapshot, WashCounts } from "./types";

export {
  allocateElectricityByProgram,
  computeProgramBreakdowns,
  computeUnitEconomics,
  type ProgramBreakdown,
} from "./per-program";

export function totalPaidWashes(counts: WashCounts): number {
  return counts.p1 + counts.p2 + counts.p3;
}

export function grossRevenue(counts: WashCounts, settings: CalcSettings): number {
  return (
    counts.p1 * settings.priceP1Mkd +
    counts.p2 * settings.priceP2Mkd +
    counts.p3 * settings.priceP3Mkd
  );
}

export function waterCost(counts: WashCounts, settings: CalcSettings): number {
  const liters =
    counts.p1 * settings.waterPerP1Liters +
    (counts.p2 + counts.p3) * settings.waterPerP2P3Liters;
  return (liters / 1000) * settings.waterRateMkdPerM3;
}

export function expectedKwh(
  counts: WashCounts,
  settings: CalcSettings
): number | null {
  if (settings.baseKwhPerWash == null) return null;
  const base = settings.baseKwhPerWash;
  const p3Extra = settings.electricityExtraP3Kwh;
  return (
    (counts.p1 + counts.p2) * base +
    counts.p3 * (base + p3Extra)
  );
}

/** Electricity cost uses actual meter delta only (never estimated kWh for billing). */
export function electricityCost(
  deltaKwh: number | null,
  _expected: number | null,
  settings: CalcSettings
): number {
  if (deltaKwh == null || deltaKwh < 0) return 0;
  return deltaKwh * settings.electricityRateMkd;
}

/** kWh consumed this session = today's clock − (last entry or settings baseline). */
export function meterDeltaKwh(
  meterReadingKwh: number,
  previousMeterKwh: number | null
): number | null {
  if (previousMeterKwh == null) return null;
  return meterReadingKwh - previousMeterKwh;
}

export function chemical1CostPerSession(
  counts: WashCounts,
  settings: CalcSettings
): number {
  if (!settings.chemical1YieldWashes || settings.chemical1YieldWashes <= 0) {
    return 0;
  }
  const paid = totalPaidWashes(counts);
  const perWash = settings.chemical1CostMkd / settings.chemical1YieldWashes;
  return paid * perWash;
}

export function chemical2CostPerSession(
  counts: WashCounts,
  settings: CalcSettings
): number {
  if (!settings.chemical2YieldWashes || settings.chemical2YieldWashes <= 0) {
    return 0;
  }
  const perWash = settings.chemical2CostMkd / settings.chemical2YieldWashes;
  return (counts.p2 + counts.p3) * perWash;
}

export function netProfit(
  revenue: number,
  water: number,
  electricity: number,
  chem1: number,
  chem2: number,
  miscExpenses: number
): number {
  return revenue - water - electricity - chem1 - chem2 - miscExpenses;
}

export function perWashMetric(total: number, washCount: number): number | null {
  if (washCount <= 0) return null;
  return total / washCount;
}

export function cashDiscrepancyWarning(
  cashCollected: number,
  expectedRevenue: number
): boolean {
  if (expectedRevenue <= 0) return false;
  return Math.abs(cashCollected - expectedRevenue) / expectedRevenue > 0.2;
}

export function computeEntrySnapshot(params: {
  counts: WashCounts;
  settings: CalcSettings;
  meterReadingKwh: number | null;
  previousMeterKwh: number | null;
  cashCollectedMkd: number;
  miscExpensesMkd: number;
}): EntrySnapshot {
  const { counts, settings, meterReadingKwh, previousMeterKwh, cashCollectedMkd, miscExpensesMkd } =
    params;

  const revenue = grossRevenue(counts, settings);
  const water = waterCost(counts, settings);
  const expected = expectedKwh(counts, settings);

  let delta: number | null = null;
  if (meterReadingKwh != null && previousMeterKwh != null) {
    delta = meterReadingKwh - previousMeterKwh;
  }

  const elec = electricityCost(delta, expected, settings);
  const chem1 = chemical1CostPerSession(counts, settings);
  const chem2 = chemical2CostPerSession(counts, settings);
  const profit = netProfit(revenue, water, elec, chem1, chem2, miscExpensesMkd);
  const paid = totalPaidWashes(counts);
  const totalCost = water + elec + chem1 + chem2 + miscExpensesMkd;

  return {
    grossRevenueMkd: round2(revenue),
    waterCostMkd: round2(water),
    electricityCostMkd: round2(elec),
    chemical1CostMkd: round2(chem1),
    chemical2CostMkd: round2(chem2),
    netProfitMkd: round2(profit),
    deltaKwh: delta != null ? round3(delta) : null,
    expectedKwh: expected != null ? round3(expected) : null,
    revenuePerWashMkd: perWashMetric(revenue, paid) != null ? round2(perWashMetric(revenue, paid)!) : null,
    costPerWashMkd: perWashMetric(totalCost, paid) != null ? round2(perWashMetric(totalCost, paid)!) : null,
    profitPerWashMkd: perWashMetric(profit, paid) != null ? round2(perWashMetric(profit, paid)!) : null,
    cashDiscrepancyWarning: cashDiscrepancyWarning(cashCollectedMkd, revenue),
  };
}

/** Suggest base kWh per wash after 30+ days of meter data */
export function suggestBaseKwhPerWash(
  entries: { deltaKwh: number; p1: number; p2: number; p3: number }[]
): number | null {
  if (entries.length < 30) return null;

  let totalDelta = 0;
  let totalP3Extra = 0;
  let totalNonP3 = 0;

  for (const e of entries) {
    totalDelta += e.deltaKwh;
    totalP3Extra += e.p3 * 11;
    totalNonP3 += e.p1 + e.p2;
  }

  if (totalNonP3 <= 0) return null;
  const base = (totalDelta - totalP3Extra) / totalNonP3;
  return round4(Math.max(0, base));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function parseSettings(row: {
  electricityRateMkd: string;
  waterRateMkdPerM3: string;
  chemical1CostMkd: string;
  chemical2CostMkd: string;
  chemical1YieldWashes: number | null;
  chemical2YieldWashes: number | null;
  waterPerP1Liters: number;
  waterPerP2P3Liters: number;
  electricityExtraP3Kwh: string;
  baseKwhPerWash: string | null;
  priceP1Mkd: number;
  priceP2Mkd: number;
  priceP3Mkd: number;
}): CalcSettings {
  return {
    electricityRateMkd: Number(row.electricityRateMkd),
    waterRateMkdPerM3: Number(row.waterRateMkdPerM3),
    chemical1CostMkd: Number(row.chemical1CostMkd),
    chemical2CostMkd: Number(row.chemical2CostMkd),
    chemical1YieldWashes: row.chemical1YieldWashes,
    chemical2YieldWashes: row.chemical2YieldWashes,
    waterPerP1Liters: row.waterPerP1Liters,
    waterPerP2P3Liters: row.waterPerP2P3Liters,
    electricityExtraP3Kwh: Number(row.electricityExtraP3Kwh),
    baseKwhPerWash: row.baseKwhPerWash != null ? Number(row.baseKwhPerWash) : null,
    priceP1Mkd: row.priceP1Mkd,
    priceP2Mkd: row.priceP2Mkd,
    priceP3Mkd: row.priceP3Mkd,
  };
}
