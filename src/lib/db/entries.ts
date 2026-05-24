import { and, desc, eq, gte, isNotNull, lt, lte, ne, sql } from "drizzle-orm";
import { db } from "./index";
import {
  dailyEntries,
  entryAmendments,
  expenses,
  freeWashes,
  tokenSales,
} from "./schema";
import {
  computeEntrySnapshot,
  parseSettings,
} from "@/lib/calculations";
import { getSettings } from "./settings";

/**
 * Reference meter for delta: last saved reading BEFORE this session date,
 * or settings baseline (your "zero" on the physical clock).
 */
export async function getPreviousMeterReading(
  forSessionDate: string,
  excludeEntryId?: string
) {
  const conditions = [
    lt(dailyEntries.sessionDate, forSessionDate),
    isNotNull(dailyEntries.meterReadingKwh),
  ];
  if (excludeEntryId) {
    conditions.push(ne(dailyEntries.id, excludeEntryId));
  }

  const rows = await db
    .select({ meterReadingKwh: dailyEntries.meterReadingKwh })
    .from(dailyEntries)
    .where(and(...conditions))
    .orderBy(desc(dailyEntries.sessionDate))
    .limit(1);

  if (rows[0]?.meterReadingKwh != null) {
    return Number(rows[0].meterReadingKwh);
  }

  const s = await getSettings();
  if (s.meterBaselineKwh != null) {
    return Number(s.meterBaselineKwh);
  }
  return null;
}

export async function getMiscExpensesForDate(date: string) {
  const rows = await db
    .select({ amount: expenses.amountMkd })
    .from(expenses)
    .where(
      and(
        eq(expenses.expenseDate, date),
        sql`${expenses.category} != 'chemicals'`
      )
    );
  return rows.reduce((sum, r) => sum + Number(r.amount), 0);
}

export async function createDailyEntry(input: {
  sessionDate: string;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  counterResetConfirmed: boolean;
  meterReadingKwh: number;
  cashCollectedMkd: number;
  tokensCollected: number;
  freeWashes: { program: 1 | 2 | 3; quantity: number; reason: "testing" | "complaint" | "family" | "other" }[];
}) {
  const settingsRow = await getSettings();
  const calcSettings = parseSettings(settingsRow);

  const previousMeter = await getPreviousMeterReading(input.sessionDate);
  if (previousMeter != null && input.meterReadingKwh < previousMeter) {
    throw new Error("METER_READING_TOO_LOW");
  }

  const existing = await db
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.sessionDate, input.sessionDate))
    .limit(1);
  if (existing.length > 0) {
    throw new Error("ENTRY_EXISTS_FOR_DATE");
  }

  const misc = await getMiscExpensesForDate(input.sessionDate);
  const snapshot = computeEntrySnapshot({
    counts: { p1: input.p1Count, p2: input.p2Count, p3: input.p3Count },
    settings: calcSettings,
    meterReadingKwh: input.meterReadingKwh,
    previousMeterKwh: previousMeter,
    cashCollectedMkd: input.cashCollectedMkd,
    miscExpensesMkd: misc,
  });

  const [entry] = await db
    .insert(dailyEntries)
    .values({
      sessionDate: input.sessionDate,
      p1Count: input.p1Count,
      p2Count: input.p2Count,
      p3Count: input.p3Count,
      counterResetConfirmed: input.counterResetConfirmed,
      meterReadingKwh: input.meterReadingKwh.toString(),
      cashCollectedMkd: input.cashCollectedMkd.toString(),
      tokensCollected: input.tokensCollected,
      grossRevenueMkd: snapshot.grossRevenueMkd.toString(),
      waterCostMkd: snapshot.waterCostMkd.toString(),
      electricityCostMkd: snapshot.electricityCostMkd.toString(),
      chemical1CostMkd: snapshot.chemical1CostMkd.toString(),
      chemical2CostMkd: snapshot.chemical2CostMkd.toString(),
      miscExpensesMkd: misc.toString(),
      netProfitMkd: snapshot.netProfitMkd.toString(),
      deltaKwh: snapshot.deltaKwh?.toString() ?? null,
      expectedKwh: snapshot.expectedKwh?.toString() ?? null,
      revenuePerWashMkd: snapshot.revenuePerWashMkd?.toString() ?? null,
      costPerWashMkd: snapshot.costPerWashMkd?.toString() ?? null,
      profitPerWashMkd: snapshot.profitPerWashMkd?.toString() ?? null,
      cashDiscrepancyWarning: snapshot.cashDiscrepancyWarning,
    })
    .returning();

  if (input.freeWashes.length > 0) {
    await db.insert(freeWashes).values(
      input.freeWashes.map((fw) => ({
        dailyEntryId: entry.id,
        program: fw.program,
        quantity: fw.quantity,
        reason: fw.reason,
      }))
    );
  }

  return entry;
}

export async function listDailyEntries(from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(gte(dailyEntries.sessionDate, from));
  if (to) conditions.push(lte(dailyEntries.sessionDate, to));

  return db
    .select()
    .from(dailyEntries)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(dailyEntries.sessionDate));
}

export async function getDailyEntryById(id: string) {
  const [entry] = await db
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.id, id))
    .limit(1);
  if (!entry) return null;

  const fw = await db
    .select()
    .from(freeWashes)
    .where(eq(freeWashes.dailyEntryId, id));

  const amendments = await db
    .select()
    .from(entryAmendments)
    .where(eq(entryAmendments.dailyEntryId, id))
    .orderBy(desc(entryAmendments.amendedAt));

  return { entry, freeWashes: fw, amendments };
}

export async function getEntryForDate(date: string) {
  const [entry] = await db
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.sessionDate, date))
    .limit(1);
  return entry ?? null;
}

export async function amendDailyEntry(
  id: string,
  updates: Record<string, string | number | boolean>
) {
  const detail = await getDailyEntryById(id);
  if (!detail) throw new Error("NOT_FOUND");

  const entry = detail.entry;
  const amendmentRows: (typeof entryAmendments.$inferInsert)[] = [];

  for (const [field, newValue] of Object.entries(updates)) {
    const oldVal = String((entry as Record<string, unknown>)[field] ?? "");
    if (oldVal === String(newValue)) continue;
    amendmentRows.push({
      dailyEntryId: id,
      fieldName: field,
      oldValue: oldVal,
      newValue: String(newValue),
    });
  }

  if (amendmentRows.length > 0) {
    await db.insert(entryAmendments).values(amendmentRows);
  }

  const merged = { ...entry, ...updates, updatedAt: new Date() };
  const settingsRow = await getSettings();
  const calcSettings = parseSettings(settingsRow);

  const p1 = Number(merged.p1Count);
  const p2 = Number(merged.p2Count);
  const p3 = Number(merged.p3Count);
  const meter =
    merged.meterReadingKwh != null ? Number(merged.meterReadingKwh) : null;
  const previousMeter = await getPreviousMeterReading(merged.sessionDate, id);
  const misc = Number(merged.miscExpensesMkd);

  const snapshot = computeEntrySnapshot({
    counts: { p1, p2, p3 },
    settings: calcSettings,
    meterReadingKwh: meter,
    previousMeterKwh: previousMeter,
    cashCollectedMkd: Number(merged.cashCollectedMkd),
    miscExpensesMkd: misc,
  });

  const patch: Record<string, unknown> = { ...updates, updatedAt: new Date() };
  if ("cashCollectedMkd" in updates) patch.cashCollectedMkd = String(updates.cashCollectedMkd);
  if ("p1Count" in updates) patch.p1Count = Number(updates.p1Count);
  if ("p2Count" in updates) patch.p2Count = Number(updates.p2Count);
  if ("p3Count" in updates) patch.p3Count = Number(updates.p3Count);
  if ("meterReadingKwh" in updates) patch.meterReadingKwh = updates.meterReadingKwh != null ? String(updates.meterReadingKwh) : null;
  if ("miscExpensesMkd" in updates) patch.miscExpensesMkd = String(updates.miscExpensesMkd);

  const [updated] = await db
    .update(dailyEntries)
    .set({
      ...patch,
      grossRevenueMkd: snapshot.grossRevenueMkd.toString(),
      waterCostMkd: snapshot.waterCostMkd.toString(),
      electricityCostMkd: snapshot.electricityCostMkd.toString(),
      chemical1CostMkd: snapshot.chemical1CostMkd.toString(),
      chemical2CostMkd: snapshot.chemical2CostMkd.toString(),
      netProfitMkd: snapshot.netProfitMkd.toString(),
      deltaKwh: snapshot.deltaKwh?.toString() ?? null,
      expectedKwh: snapshot.expectedKwh?.toString() ?? null,
      revenuePerWashMkd: snapshot.revenuePerWashMkd?.toString() ?? null,
      costPerWashMkd: snapshot.costPerWashMkd?.toString() ?? null,
      profitPerWashMkd: snapshot.profitPerWashMkd?.toString() ?? null,
      cashDiscrepancyWarning: snapshot.cashDiscrepancyWarning,
    })
    .where(eq(dailyEntries.id, id))
    .returning();

  return updated;
}

export async function getTokenStats() {
  const sold = await db
    .select({ total: sql<number>`COALESCE(SUM(${tokenSales.quantity}), 0)` })
    .from(tokenSales);
  const redeemed = await db
    .select({ total: sql<number>`COALESCE(SUM(${dailyEntries.tokensCollected}), 0)` })
    .from(dailyEntries);
  const soldCount = Number(sold[0]?.total ?? 0);
  const redeemedCount = Number(redeemed[0]?.total ?? 0);
  return { sold: soldCount, redeemed: redeemedCount, outstanding: soldCount - redeemedCount };
}

export async function getChemicalUsageSinceLastCanister(type: "c1" | "c2") {
  const lastEvent = await db
    .select()
    .from(expenses)
    .where(
      and(
        eq(expenses.category, "chemicals"),
        eq(expenses.chemicalType, type)
      )
    )
    .orderBy(desc(expenses.createdAt))
    .limit(1);

  const sinceDate = lastEvent[0]?.expenseDate ?? "1970-01-01";
  const entries = await db
    .select()
    .from(dailyEntries)
    .where(gte(dailyEntries.sessionDate, sinceDate));

  if (type === "c1") {
    return entries.reduce((s, e) => s + e.p1Count + e.p2Count + e.p3Count, 0);
  }
  return entries.reduce((s, e) => s + e.p2Count + e.p3Count, 0);
}

export async function deleteDailyEntry(id: string) {
  const [deleted] = await db
    .delete(dailyEntries)
    .where(eq(dailyEntries.id, id))
    .returning();
  if (!deleted) throw new Error("NOT_FOUND");
  return deleted;
}

export async function deleteAllDailyEntries() {
  await db.delete(freeWashes);
  await db.delete(entryAmendments);
  await db.delete(dailyEntries);
}

/** Recompute profit after misc expenses change for that session date */
export async function syncDailyEntryMiscForDate(expenseDate: string) {
  const entry = await getEntryForDate(expenseDate);
  if (!entry) {
    return { updated: false as const, message: "Нема дневен внес за тој датум." };
  }
  const misc = await getMiscExpensesForDate(expenseDate);
  const updated = await amendDailyEntry(entry.id, { miscExpensesMkd: misc });
  return {
    updated: true as const,
    sessionDate: expenseDate,
    miscExpensesMkd: misc,
    netProfitMkd: Number(updated.netProfitMkd),
  };
}
