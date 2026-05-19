import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/api-error";
import { getSettings, updateSettings } from "@/lib/db/settings";
import { settingsUpdateSchema } from "@/lib/validators";
import { suggestBaseKwhPerWash } from "@/lib/calculations";
import { listDailyEntries } from "@/lib/db/entries";

export async function GET() {
  try {
    const settings = await getSettings();
    const entries = await listDailyEntries();
    const meterEntries = entries
      .filter((e) => e.deltaKwh != null)
      .slice(0, 60)
      .map((e) => ({
        deltaKwh: Number(e.deltaKwh),
        p1: e.p1Count,
        p2: e.p2Count,
        p3: e.p3Count,
      }));
    const suggestedBaseKwh = suggestBaseKwhPerWash(meterEntries);

    return NextResponse.json({ settings, suggestedBaseKwh });
  } catch (e) {
    return databaseErrorResponse(e);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = settingsUpdateSchema.parse(body);
    const updated = await updateSettings({
      electricityRateMkd: parsed.electricityRateMkd.toString(),
      waterRateMkdPerM3: parsed.waterRateMkdPerM3.toString(),
      chemical1CostMkd: parsed.chemical1CostMkd.toString(),
      chemical2CostMkd: parsed.chemical2CostMkd.toString(),
      chemical1YieldWashes: parsed.chemical1YieldWashes,
      chemical2YieldWashes: parsed.chemical2YieldWashes,
      meterBaselineKwh: parsed.meterBaselineKwh?.toString() ?? null,
      waterPerP1Liters: parsed.waterPerP1Liters,
      waterPerP2P3Liters: parsed.waterPerP2P3Liters,
      electricityExtraP3Kwh: parsed.electricityExtraP3Kwh.toString(),
      baseKwhPerWash: parsed.baseKwhPerWash?.toString() ?? null,
      tokenValueMkd: parsed.tokenValueMkd,
      priceP1Mkd: parsed.priceP1Mkd,
      priceP2Mkd: parsed.priceP2Mkd,
      priceP3Mkd: parsed.priceP3Mkd,
      setupCompleted: parsed.setupCompleted ?? true,
    });
    return NextResponse.json({ settings: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (message.includes("does not exist") || message.includes("DATABASE_URL")) {
      return databaseErrorResponse(e);
    }
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}
