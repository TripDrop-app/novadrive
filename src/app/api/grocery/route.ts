import { NextResponse } from "next/server";
import { getGroceryState } from "@/lib/db/grocery";

export async function GET() {
  try {
    const state = await getGroceryState();
    return NextResponse.json(state);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}
