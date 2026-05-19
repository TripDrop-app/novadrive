import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenSales } from "@/lib/db/schema";
import { getSettings } from "@/lib/db/settings";
import { getTokenStats } from "@/lib/db/entries";
import { tokenSaleSchema } from "@/lib/validators";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const sales = await db.select().from(tokenSales).orderBy(desc(tokenSales.soldAt));
    const stats = await getTokenStats();
    return NextResponse.json({ sales, stats });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = tokenSaleSchema.parse(body);
    const settings = await getSettings();
    const perToken = parsed.amountMkd ?? settings.tokenValueMkd;
    const total = perToken * parsed.quantity;

    const [sale] = await db
      .insert(tokenSales)
      .values({
        quantity: parsed.quantity,
        amountMkd: total.toString(),
        soldAt: parsed.soldAt ? new Date(parsed.soldAt) : new Date(),
        note: parsed.note,
      })
      .returning();

    const stats = await getTokenStats();
    return NextResponse.json({ sale, stats }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
