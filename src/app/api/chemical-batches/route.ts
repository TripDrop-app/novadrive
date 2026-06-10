import { NextResponse } from "next/server";
import {
  formatBatchRow,
  getActiveBatchLive,
  getBatchHistory,
} from "@/lib/db/chemical-batches";

export async function GET() {
  try {
    const [c1Active, c2Active, c1History, c2History] = await Promise.all([
      getActiveBatchLive("c1"),
      getActiveBatchLive("c2"),
      getBatchHistory("c1"),
      getBatchHistory("c2"),
    ]);

    return NextResponse.json({
      active: { c1: c1Active, c2: c2Active },
      history: {
        c1: c1History.map(formatBatchRow),
        c2: c2History.map(formatBatchRow),
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}
