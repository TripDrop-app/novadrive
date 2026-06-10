import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "./index";
import { chemicalBatches, dailyEntries, expenses } from "./schema";
import { getSettings } from "./settings";
import { parseSettings } from "@/lib/calculations";
import { computeBatchStats } from "@/lib/chemicals/batch-stats";

export async function getActiveBatch(type: "c1" | "c2") {
  const [row] = await db
    .select()
    .from(chemicalBatches)
    .where(and(eq(chemicalBatches.chemicalType, type), eq(chemicalBatches.isActive, true)))
    .orderBy(desc(chemicalBatches.startedDate))
    .limit(1);
  return row ?? null;
}

export async function getBatchHistory(type: "c1" | "c2", limit = 20) {
  return db
    .select()
    .from(chemicalBatches)
    .where(and(eq(chemicalBatches.chemicalType, type), eq(chemicalBatches.isActive, false)))
    .orderBy(desc(chemicalBatches.closedAt))
    .limit(limit);
}

async function entriesSinceDate(sinceDate: string) {
  return db
    .select()
    .from(dailyEntries)
    .where(gte(dailyEntries.sessionDate, sinceDate))
    .orderBy(dailyEntries.sessionDate);
}

export async function getActiveBatchLive(type: "c1" | "c2") {
  const settingsRow = await getSettings();
  const settings = parseSettings(settingsRow);
  const yieldWashes = type === "c1" ? settings.chemical1YieldWashes! : settings.chemical2YieldWashes!;
  const canisterCost =
    type === "c1" ? settings.chemical1CostMkd : settings.chemical2CostMkd;

  let batch = await getActiveBatch(type);

  if (!batch) {
    const lastExpense = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.category, "chemicals"), eq(expenses.chemicalType, type)))
      .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
      .limit(1);

    if (!lastExpense[0]) {
      return null;
    }

    const exp = lastExpense[0];
    const [created] = await db
      .insert(chemicalBatches)
      .values({
        chemicalType: type,
        startedDate: exp.expenseDate,
        canisterCostMkd: exp.amountMkd,
        yieldWashes,
        expenseId: exp.id,
        isActive: true,
      })
      .returning();
    batch = created;
  }

  const entries = await entriesSinceDate(batch.startedDate);
  const stats = computeBatchStats(entries, type, Number(batch.canisterCostMkd), settings, true);

  return {
    id: batch.id,
    chemicalType: type,
    startedDate: batch.startedDate,
    canisterCostMkd: Number(batch.canisterCostMkd),
    yieldWashes: batch.yieldWashes,
    remainingWashes: Math.max(0, batch.yieldWashes - stats.washCount),
    ...stats,
  };
}

export async function closeActiveBatch(type: "c1" | "c2", endDate: string) {
  const batch = await getActiveBatch(type);
  if (!batch) return null;

  const settingsRow = await getSettings();
  const settings = parseSettings(settingsRow);
  const entries = await entriesSinceDate(batch.startedDate);
  const stats = computeBatchStats(
    entries,
    type,
    Number(batch.canisterCostMkd),
    settings,
    false
  );

  const [closed] = await db
    .update(chemicalBatches)
    .set({
      isActive: false,
      endedDate: endDate,
      closedAt: new Date(),
      washCount: stats.washCount,
      p1Count: stats.p1Count,
      p2Count: stats.p2Count,
      p3Count: stats.p3Count,
      revenueMkd: stats.revenueMkd.toString(),
      waterCostMkd: stats.waterCostMkd.toString(),
      electricityCostMkd: stats.electricityCostMkd.toString(),
      profitMkd: stats.profitMkd.toString(),
    })
    .where(eq(chemicalBatches.id, batch.id))
    .returning();

  return { batch: closed, stats };
}

export async function openNewBatch(input: {
  type: "c1" | "c2";
  startedDate: string;
  canisterCostMkd: number;
  yieldWashes: number;
  expenseId: string;
}) {
  const [batch] = await db
    .insert(chemicalBatches)
    .values({
      chemicalType: input.type,
      startedDate: input.startedDate,
      canisterCostMkd: input.canisterCostMkd.toString(),
      yieldWashes: input.yieldWashes,
      expenseId: input.expenseId,
      isActive: true,
    })
    .returning();
  return batch;
}

export async function getChemicalUsageFromBatch(type: "c1" | "c2") {
  const live = await getActiveBatchLive(type);
  if (!live) return 0;
  return live.washCount;
}

export function formatBatchRow(batch: typeof chemicalBatches.$inferSelect) {
  return {
    id: batch.id,
    chemicalType: batch.chemicalType,
    startedDate: batch.startedDate,
    endedDate: batch.endedDate,
    canisterCostMkd: Number(batch.canisterCostMkd),
    yieldWashes: batch.yieldWashes,
    washCount: batch.washCount,
    p1Count: batch.p1Count,
    p2Count: batch.p2Count,
    p3Count: batch.p3Count,
    revenueMkd: Number(batch.revenueMkd),
    waterCostMkd: Number(batch.waterCostMkd),
    electricityCostMkd: Number(batch.electricityCostMkd),
    profitMkd: Number(batch.profitMkd),
    isActive: batch.isActive,
    closedAt: batch.closedAt,
  };
}
