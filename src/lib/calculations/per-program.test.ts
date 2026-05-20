import { describe, expect, it } from "vitest";
import {
  allocateElectricityByProgram,
  computeProgramBreakdowns,
} from "./per-program";
import type { CalcSettings, WashCounts } from "./types";

const settings: CalcSettings = {
  electricityRateMkd: 18,
  waterRateMkdPerM3: 35,
  chemical1CostMkd: 2850,
  chemical2CostMkd: 2850,
  chemical1YieldWashes: 100,
  chemical2YieldWashes: 80,
  waterPerP1Liters: 100,
  waterPerP2P3Liters: 125,
  electricityExtraP3Kwh: 11,
  baseKwhPerWash: 2.5,
  priceP1Mkd: 100,
  priceP2Mkd: 150,
  priceP3Mkd: 200,
};

const counts: WashCounts = { p1: 10, p2: 5, p3: 3 };

describe("allocateElectricityByProgram", () => {
  it("gives P3 a larger share because of drying extra kWh", () => {
    const { p1, p2, p3 } = allocateElectricityByProgram(100, counts, settings);
    const perP1 = p1 / counts.p1;
    const perP2 = p2 / counts.p2;
    const perP3 = p3 / counts.p3;
    expect(perP3).toBeGreaterThan(perP1);
    expect(perP3).toBeGreaterThan(perP2);
    expect(p1 + p2 + p3).toBeCloseTo(100, 2);
  });
});

describe("computeProgramBreakdowns", () => {
  it("sums to session totals within rounding", () => {
    const elec = 10 * 18;
    const rows = computeProgramBreakdowns({
      counts,
      settings,
      electricityCostMkd: elec,
      chemical1CostMkd: 18 * (2850 / 100),
      chemical2CostMkd: 8 * (2850 / 80),
      miscExpensesMkd: 50,
    });

    const sumRevenue = rows.reduce((a, r) => a + r.revenueMkd, 0);
    const sumCost = rows.reduce((a, r) => a + r.totalCostMkd, 0);
    const sumProfit = rows.reduce((a, r) => a + r.profitMkd, 0);

    expect(sumRevenue).toBe(10 * 100 + 5 * 150 + 3 * 200);
    expect(sumCost).toBeCloseTo(
      rows.reduce((a, r) => a + r.waterMkd + r.chemical1Mkd + r.chemical2Mkd + r.electricityMkd + r.miscMkd, 0),
      1
    );
    expect(sumProfit).toBeCloseTo(sumRevenue - sumCost, 1);

    const p3 = rows.find((r) => r.program === 3)!;
    expect(p3.profitPerWashMkd).not.toBeNull();
    expect(p3.chemical2Mkd).toBeGreaterThan(0);
    expect(rows.find((r) => r.program === 1)!.chemical2Mkd).toBe(0);
  });
});
