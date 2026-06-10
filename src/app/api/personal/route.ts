import { NextResponse } from "next/server";
import { getPersonalSummary } from "@/lib/personal/summary";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? undefined;
    const summary = await getPersonalSummary(month);
    return NextResponse.json(summary);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}
