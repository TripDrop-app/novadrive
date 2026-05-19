import { z } from "zod";

export const freeWashSchema = z.object({
  program: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  quantity: z.coerce.number().int().min(1),
  reason: z.enum(["testing", "complaint", "family", "other"]),
});

export const dailyEntryCreateSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  p1Count: z.coerce.number().int().min(0),
  p2Count: z.coerce.number().int().min(0),
  p3Count: z.coerce.number().int().min(0),
  counterResetConfirmed: z.coerce.boolean(),
  meterReadingKwh: z.coerce.number().min(0),
  cashCollectedMkd: z.coerce.number().min(0),
  tokensCollected: z.coerce.number().int().min(0),
  freeWashes: z.array(freeWashSchema).default([]),
});

export const settingsUpdateSchema = z.object({
  electricityRateMkd: z.coerce.number().positive(),
  waterRateMkdPerM3: z.coerce.number().positive(),
  chemical1CostMkd: z.coerce.number().positive(),
  chemical2CostMkd: z.coerce.number().positive(),
  chemical1YieldWashes: z.coerce.number().int().positive().nullable(),
  chemical2YieldWashes: z.coerce.number().int().positive().nullable(),
  meterBaselineKwh: z.coerce.number().min(0).nullable(),
  waterPerP1Liters: z.coerce.number().int().positive(),
  waterPerP2P3Liters: z.coerce.number().int().positive(),
  electricityExtraP3Kwh: z.coerce.number().min(0),
  baseKwhPerWash: z.coerce.number().min(0).nullable(),
  tokenValueMkd: z.coerce.number().int().positive(),
  priceP1Mkd: z.coerce.number().int().positive(),
  priceP2Mkd: z.coerce.number().int().positive(),
  priceP3Mkd: z.coerce.number().int().positive(),
  setupCompleted: z.coerce.boolean().optional(),
});

export const tokenSaleSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  amountMkd: z.coerce.number().positive().optional(),
  soldAt: z.string().datetime().optional(),
  note: z.string().optional(),
});

export const expenseSchema = z.object({
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(["chemicals", "equipment", "repairs", "misc"]),
  amountMkd: z.coerce.number().positive(),
  note: z.string().optional(),
  chemicalType: z.enum(["c1", "c2"]).optional(),
  canisterCount: z.coerce.number().int().positive().optional(),
});

export const entryAmendSchema = z.object({
  fieldName: z.string(),
  newValue: z.union([z.string(), z.number(), z.boolean()]),
});
