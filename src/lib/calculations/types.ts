export interface CalcSettings {
  electricityRateMkd: number;
  waterRateMkdPerM3: number;
  chemical1CostMkd: number;
  chemical2CostMkd: number;
  chemical1YieldWashes: number | null;
  chemical2YieldWashes: number | null;
  waterPerP1Liters: number;
  waterPerP2P3Liters: number;
  electricityExtraP3Kwh: number;
  baseKwhPerWash: number | null;
  priceP1Mkd: number;
  priceP2Mkd: number;
  priceP3Mkd: number;
}

export interface WashCounts {
  p1: number;
  p2: number;
  p3: number;
}

export interface EntrySnapshot {
  grossRevenueMkd: number;
  waterCostMkd: number;
  electricityCostMkd: number;
  chemical1CostMkd: number;
  chemical2CostMkd: number;
  netProfitMkd: number;
  deltaKwh: number | null;
  expectedKwh: number | null;
  revenuePerWashMkd: number | null;
  costPerWashMkd: number | null;
  profitPerWashMkd: number | null;
  cashDiscrepancyWarning: boolean;
}
