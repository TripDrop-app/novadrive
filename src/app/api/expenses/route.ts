import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { expenseSchema } from "@/lib/validators";
import { syncDailyEntryMiscForDate } from "@/lib/db/entries";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(expenses).orderBy(desc(expenses.expenseDate));
    return NextResponse.json({ expenses: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = expenseSchema.parse(body);

    const [expense] = await db
      .insert(expenses)
      .values({
        expenseDate: parsed.expenseDate,
        category: parsed.category,
        amountMkd: parsed.amountMkd.toString(),
        note: parsed.note,
        chemicalType: parsed.chemicalType ?? null,
        canisterCount: parsed.canisterCount ?? null,
      })
      .returning();

    if (parsed.category !== "chemicals") {
      await syncDailyEntryMiscForDate(parsed.expenseDate);
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
