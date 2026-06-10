import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { personalWithdrawals } from "@/lib/db/schema";
import { personalWithdrawalSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = personalWithdrawalSchema.parse(await request.json());
    const [row] = await db
      .insert(personalWithdrawals)
      .values({
        withdrawalDate: body.withdrawalDate,
        amountMkd: body.amountMkd.toString(),
        note: body.note,
      })
      .returning();
    return NextResponse.json({ withdrawal: row }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
