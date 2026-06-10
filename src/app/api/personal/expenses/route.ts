import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personalExpenses } from "@/lib/db/schema";
import { personalExpenseSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = personalExpenseSchema.parse(await request.json());
    const [row] = await db
      .insert(personalExpenses)
      .values({
        expenseDate: body.expenseDate,
        category: body.category,
        amountMkd: body.amountMkd.toString(),
        note: body.note,
      })
      .returning();
    return NextResponse.json({ expense: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
