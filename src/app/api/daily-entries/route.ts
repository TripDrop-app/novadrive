import { NextResponse } from "next/server";
import { createDailyEntry, listDailyEntries } from "@/lib/db/entries";
import { dailyEntryCreateSchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const entries = await listDailyEntries(from, to);
    return NextResponse.json({ entries });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = dailyEntryCreateSchema.parse(body);
    const entry = await createDailyEntry({
      sessionDate: parsed.sessionDate,
      p1Count: parsed.p1Count,
      p2Count: parsed.p2Count,
      p3Count: parsed.p3Count,
      counterResetConfirmed: parsed.counterResetConfirmed,
      meterReadingKwh: parsed.meterReadingKwh ?? null,
      cashCollectedMkd: parsed.cashCollectedMkd,
      tokensCollected: parsed.tokensCollected,
      freeWashes: parsed.freeWashes,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "METER_READING_TOO_LOW") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg === "ENTRY_EXISTS_FOR_DATE") {
      return NextResponse.json({ error: msg }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
