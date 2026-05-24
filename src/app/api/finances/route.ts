import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/api-error";
import { getFinancesSummary } from "@/lib/finances/summary";

export async function GET() {
  try {
    const data = await getFinancesSummary();
    return NextResponse.json(data);
  } catch (e) {
    return databaseErrorResponse(e);
  }
}
