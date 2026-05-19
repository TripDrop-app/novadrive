import { z } from "zod";

export const freeWashSchema = z.object({
  program: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  quantity: z.number().int().min(1),
  reason: z.enum(["testing", "complaint", "family", "other"]),
});

export const dailyEntryCreateSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  p1Count: z.number().int().min(0),
  p2Count: z.number().int().min(0),
  p3Count: z.number().int().min(0),
  counterResetConfirmed: z.boolean(),
  meterReadingKwh: z.number().min(0).nullable().optional(),
  cashCollectedMkd: z.number().min(0),
  tokensCollected: z.number().int().min(0),
  freeWashes: z.array(freeWashSchema).default([]),
});

export const settingsUpdateSchema = z.object({
  electricityRateMkd: z.number().positive(),
  waterRateMkdPerM3: z.number().positive(),
  chemical1CostMkd: z.number().positive(),
  chemical2CostMkd: z.number().positive(),
  chemical1YieldWashes: z.number().int().positive().nullable(),
  chemical2YieldWashes: z.number().int().positive().nullable(),
  meterBaselineKwh: z.number().min(0).nullable(),
  waterPerP1Liters: z.number().int().positive(),
  waterPerP2P3Liters: z.number().int().positive(),
  electricityExtraP3Kwh: z.number().min(0),
  baseKwhPerWash: z.number().min(0).nullable(),
  tokenValueMkd: z.number().int().positive(),
  priceP1Mkd: z.number().int().positive(),
  priceP2Mkd: z.number().int().positive(),
  priceP3Mkd: z.number().int().positive(),
  setupCompleted: z.boolean().optional(),
});

export const tokenSaleSchema = z.object({
  quantity: z.number().int().min(1),
  amountMkd: z.number().positive().optional(),
  soldAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

export const expenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(["chemicals", "equipment", "repairs", "misc"]),
  amountMkd: z.number().positive(),
  note: z.string().optional(),
  chemicalType: z.enum(["c1", "c2"]).optional(),
  canisterCount: z.number().int().positive().optional(),
});

export const entryAmendSchema = z.object({
  fieldName: z.string(),
  newValue: z.union([z.string(), z.number(), z.boolean()]),
});
