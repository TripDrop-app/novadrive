import type { CalcSettings, WashCounts } from "./types";
import { round2 } from "./index";

export interface ProgramBreakdown {
  program: 1 | 2 | 3;
  count: number;
  revenueMkd: number;
  waterMkd: number;
  chemical1Mkd: number;
  chemical2Mkd: number;
  electricityMkd: number;
  miscMkd: number;
  totalCostMkd: number;
  profitMkd: number;
  profitPerWashMkd: number | null;
  /** Share of session kWh weight (for display) */
  electricityWeightSharePct: number | null;
}

function programPrice(program: 1 | 2 | 3, settings: CalcSettings): number {
  if (program === 1) return settings.priceP1Mkd;
  if (program === 2) return settings.priceP2Mkd;
  return settings.priceP3Mkd;
}

function waterCostForProgram(
  program: 1 | 2 | 3,
  count: number,
  settings: CalcSettings
): number {
  if (count <= 0) return 0;
  const liters =
    program === 1
      ? count * settings.waterPerP1Liters
      : count * settings.waterPerP2P3Liters;
  return (liters / 1000) * settings.waterRateMkdPerM3;
}

/** Split session electricity cost by expected kWh mix (P3 includes drying extra). */
export function allocateElectricityByProgram(
  totalElectricityMkd: number,
  counts: WashCounts,
  settings: CalcSettings
): { p1: number; p2: number; p3: number; weights: { p1: number; p2: number; p3: number } } {
  const base = settings.baseKwhPerWash ?? 1;
  const extra = settings.electricityExtraP3Kwh;
  const w1 = counts.p1 * base;
  const w2 = counts.p2 * base;
  const w3 = counts.p3 * (base + extra);
  const total = w1 + w2 + w3;

  if (total <= 0 || totalElectricityMkd <= 0) {
    return { p1: 0, p2: 0, p3: 0, weights: { p1: 0, p2: 0, p3: 0 } };
  }

  return {
    p1: totalElectricityMkd * (w1 / total),
    p2: totalElectricityMkd * (w2 / total),
    p3: totalElectricityMkd * (w3 / total),
    weights: { p1: w1, p2: w2, p3: w3 },
  };
}

export function computeProgramBreakdowns(params: {
  counts: WashCounts;
  settings: CalcSettings;
  electricityCostMkd: number;
  chemical1CostMkd: number;
  chemical2CostMkd: number;
  miscExpensesMkd: number;
}): ProgramBreakdown[] {
  const { counts, settings, electricityCostMkd, chemical1CostMkd, chemical2CostMkd, miscExpensesMkd } =
    params;
  const paid = counts.p1 + counts.p2 + counts.p3;
  const elec = allocateElectricityByProgram(electricityCostMkd, counts, settings);

  const chem1PerWash =
    paid > 0 && settings.chemical1YieldWashes && settings.chemical1YieldWashes > 0
      ? settings.chemical1CostMkd / settings.chemical1YieldWashes
      : paid > 0
        ? chemical1CostMkd / paid
        : 0;

  const chem2Programs = counts.p2 + counts.p3;
  const chem2PerWash =
    chem2Programs > 0 && settings.chemical2YieldWashes && settings.chemical2YieldWashes > 0
      ? settings.chemical2CostMkd / settings.chemical2YieldWashes
      : chem2Programs > 0
        ? chemical2CostMkd / chem2Programs
        : 0;

  const totalWeight = elec.weights.p1 + elec.weights.p2 + elec.weights.p3;

  const programs: { program: 1 | 2 | 3; count: number }[] = [
    { program: 1, count: counts.p1 },
    { program: 2, count: counts.p2 },
    { program: 3, count: counts.p3 },
  ];

  return programs.map(({ program, count }) => {
    const revenue = count * programPrice(program, settings);
    const water = waterCostForProgram(program, count, settings);
    const chemical1 = count * chem1PerWash;
    const chemical2 = program === 1 ? 0 : count * chem2PerWash;
    const electricity =
      program === 1 ? elec.p1 : program === 2 ? elec.p2 : elec.p3;
    const misc = paid > 0 ? (count / paid) * miscExpensesMkd : 0;
    const totalCost = water + chemical1 + chemical2 + electricity + misc;
    const profit = revenue - totalCost;
    const weight =
      program === 1 ? elec.weights.p1 : program === 2 ? elec.weights.p2 : elec.weights.p3;

    return {
      program,
      count,
      revenueMkd: round2(revenue),
      waterMkd: round2(water),
      chemical1Mkd: round2(chemical1),
      chemical2Mkd: round2(chemical2),
      electricityMkd: round2(electricity),
      miscMkd: round2(misc),
      totalCostMkd: round2(totalCost),
      profitMkd: round2(profit),
      profitPerWashMkd: count > 0 ? round2(profit / count) : null,
      electricityWeightSharePct:
        totalWeight > 0 && count > 0 ? round2((weight / totalWeight) * 100) : null,
    };
  });
}

/** Estimated cost/profit for a single wash per program (no entry today). */
export function computeUnitEconomics(settings: CalcSettings): ProgramBreakdown[] {
  const counts: WashCounts = { p1: 1, p2: 1, p3: 1 };
  const base = settings.baseKwhPerWash ?? 1;
  const extra = settings.electricityExtraP3Kwh;
  const sessionKwh = base + base + (base + extra);
  const electricityCostMkd = sessionKwh * settings.electricityRateMkd;
  const chem1 =
    settings.chemical1YieldWashes && settings.chemical1YieldWashes > 0
      ? (3 * settings.chemical1CostMkd) / settings.chemical1YieldWashes
      : 0;
  const chem2 =
    settings.chemical2YieldWashes && settings.chemical2YieldWashes > 0
      ? (2 * settings.chemical2CostMkd) / settings.chemical2YieldWashes
      : 0;

  return computeProgramBreakdowns({
    counts,
    settings,
    electricityCostMkd,
    chemical1CostMkd: chem1,
    chemical2CostMkd: chem2,
    miscExpensesMkd: 0,
  });
}
