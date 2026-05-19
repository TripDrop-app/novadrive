import { describe, expect, it } from "vitest";
import {
  grossRevenue,
  waterCost,
  computeEntrySnapshot,
  chemical1CostPerSession,
  chemical2CostPerSession,
  cashDiscrepancyWarning,
} from "./index";
import type { CalcSettings, WashCounts } from "./types";

const defaultSettings: CalcSettings = {
  electricityRateMkd: 17.99,
  waterRateMkdPerM3: 35.34,
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

describe("grossRevenue", () => {
  it("calculates P1×100 + P2×150 + P3×200", () => {
    expect(grossRevenue(counts, defaultSettings)).toBe(10 * 100 + 5 * 150 + 3 * 200);
    expect(grossRevenue(counts, defaultSettings)).toBe(2350);
  });
});

describe("waterCost", () => {
  it("uses PRD formula", () => {
    const liters = 10 * 100 + (5 + 3) * 125;
    const expected = (liters / 1000) * 35.34;
    expect(waterCost(counts, defaultSettings)).toBeCloseTo(expected, 2);
  });
});

describe("chemical costs", () => {
  it("chemical 1 on all paid washes", () => {
    const cost = chemical1CostPerSession(counts, defaultSettings);
    expect(cost).toBeCloseTo(18 * (2850 / 100), 2);
  });

  it("chemical 2 on P2+P3 only", () => {
    const cost = chemical2CostPerSession(counts, defaultSettings);
    expect(cost).toBeCloseTo(8 * (2850 / 80), 2);
  });
});

describe("computeEntrySnapshot", () => {
  it("produces full snapshot with meter delta", () => {
    const snap = computeEntrySnapshot({
      counts,
      settings: defaultSettings,
      meterReadingKwh: 100,
      previousMeterKwh: 90,
      cashCollectedMkd: 2350,
      miscExpensesMkd: 0,
    });
    expect(snap.grossRevenueMkd).toBe(2350);
    expect(snap.deltaKwh).toBe(10);
    expect(snap.electricityCostMkd).toBeCloseTo(10 * 17.99, 2);
    expect(snap.netProfitMkd).toBeLessThan(snap.grossRevenueMkd);
  });

  it("uses zero electricity cost when no meter delta", () => {
    const snap = computeEntrySnapshot({
      counts,
      settings: defaultSettings,
      meterReadingKwh: null,
      previousMeterKwh: null,
      cashCollectedMkd: 2350,
      miscExpensesMkd: 0,
    });
    expect(snap.deltaKwh).toBeNull();
    expect(snap.electricityCostMkd).toBe(0);
  });

  it("first entry delta from baseline", () => {
    const snap = computeEntrySnapshot({
      counts: { p1: 5, p2: 0, p3: 0 },
      settings: defaultSettings,
      meterReadingKwh: 6220,
      previousMeterKwh: 6213,
      cashCollectedMkd: 500,
      miscExpensesMkd: 0,
    });
    expect(snap.deltaKwh).toBe(7);
    expect(snap.electricityCostMkd).toBeCloseTo(7 * 17.99, 2);
  });
});

describe("cashDiscrepancyWarning", () => {
  it("warns when >20% off", () => {
    expect(cashDiscrepancyWarning(1000, 2350)).toBe(true);
    expect(cashDiscrepancyWarning(2300, 2350)).toBe(false);
  });
});
