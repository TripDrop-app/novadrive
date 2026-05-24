import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { getSettings } from "@/lib/db/settings";
import { syncDailyEntryMiscForDate } from "@/lib/db/entries";
import { chemicalPourSchema } from "@/lib/validators";
import { todayDateStr } from "@/lib/format";

export async function POST(request: Request) {
  try {
    const body = chemicalPourSchema.parse(await request.json());
    const settings = await getSettings();
    const date = body.expenseDate ?? todayDateStr();
    const isC1 = body.chemicalType === "c1";
    const amount = isC1 ? Number(settings.chemical1CostMkd) : Number(settings.chemical2CostMkd);
    const label = isC1 ? "Хемикалија 1" : "Хемикалија 2";

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

    return NextResponse.json({
      expense,
      message: `${label}: канистер зачуван (${amount} ден.)`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
