import { NextResponse } from "next/server";
import { getEntryForDate, getTokenStats, getChemicalUsageSinceLastCanister } from "@/lib/db/entries";
import { getSettings } from "@/lib/db/settings";
import { listDailyEntries } from "@/lib/db/entries";
import { todayDateStr } from "@/lib/format";

export async function GET() {
  try {
    const today = todayDateStr();
    const settings = await getSettings();
    const todayEntry = await getEntryForDate(today);
    const tokenStats = await getTokenStats();
    const c1Used = await getChemicalUsageSinceLastCanister("c1");
    const c2Used = await getChemicalUsageSinceLastCanister("c2");

    const yield1 = settings.chemical1YieldWashes ?? 0;
    const yield2 = settings.chemical2YieldWashes ?? 0;
    const c1Remaining = yield1 > 0 ? Math.max(0, yield1 - c1Used) : null;
    const c2Remaining = yield2 > 0 ? Math.max(0, yield2 - c2Used) : null;

    const entries = await listDailyEntries();
    const lastEntry = entries[0] ?? null;

    return NextResponse.json({
      today,
      todayEntry,
      tokenStats,
      chemical: {
        c1Used,
        c2Used,
        c1Remaining,
        c2Remaining,
        c1Yield: yield1,
        c2Yield: yield2,
        c1Low: c1Remaining != null && yield1 > 0 && c1Remaining / yield1 < 0.15,
        c2Low: c2Remaining != null && yield2 > 0 && c2Remaining / yield2 < 0.15,
      },
      lastEntry,
      setupCompleted: settings.setupCompleted,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}
