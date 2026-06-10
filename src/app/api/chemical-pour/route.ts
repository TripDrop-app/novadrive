import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { getSettings } from "@/lib/db/settings";
import { chemicalPourSchema } from "@/lib/validators";
import { todayDateStr } from "@/lib/format";
import { parseSettings } from "@/lib/calculations";
import {
  closeActiveBatch,
  formatBatchRow,
  getActiveBatchLive,
  openNewBatch,
} from "@/lib/db/chemical-batches";

export async function POST(request: Request) {
  try {
    const body = chemicalPourSchema.parse(await request.json());
    const settingsRow = await getSettings();
    const settings = parseSettings(settingsRow);
    const date = body.expenseDate ?? todayDateStr();
    const isC1 = body.chemicalType === "c1";
    const amount = isC1 ? settings.chemical1CostMkd : settings.chemical2CostMkd;
    const yieldWashes = isC1 ? settings.chemical1YieldWashes! : settings.chemical2YieldWashes!;
    const label = isC1 ? "Хемикалија 1" : "Хемикалија 2";

    const closedResult = await closeActiveBatch(body.chemicalType, date);

    const [expense] = await db
      .insert(expenses)
      .values({
        expenseDate: date,
        category: "chemicals",
        amountMkd: amount.toString(),
        chemicalType: body.chemicalType,
        canisterCount: 1,
        note: `Нов канистер — ${label}`,
      })
      .returning();

    const newBatch = await openNewBatch({
      type: body.chemicalType,
      startedDate: date,
      canisterCostMkd: amount,
      yieldWashes,
      expenseId: expense.id,
    });

    const active = await getActiveBatchLive(body.chemicalType);

    return NextResponse.json({
      expense,
      message: `${label}: нов канистер (~${yieldWashes} миења)`,
      closedBatch: closedResult
        ? { batch: formatBatchRow(closedResult.batch), stats: closedResult.stats }
        : null,
      activeBatch: active,
      yieldWashes,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
