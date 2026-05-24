import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { incomeEntries } from "@/lib/db/schema";
import { incomeEntrySchema } from "@/lib/validators";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(incomeEntries).orderBy(desc(incomeEntries.incomeDate));
    return NextResponse.json({ income: rows });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = incomeEntrySchema.parse(await request.json());
    const [row] = await db
      .insert(incomeEntries)
      .values({
        incomeDate: parsed.incomeDate,
        amountMkd: parsed.amountMkd.toString(),
        note: parsed.note ?? null,
      })
      .returning();
    return NextResponse.json({ income: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
