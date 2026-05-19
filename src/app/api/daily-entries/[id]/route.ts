import { NextResponse } from "next/server";
import { databaseErrorResponse } from "@/lib/api-error";
import {
  amendDailyEntry,
  deleteDailyEntry,
  getDailyEntryById,
} from "@/lib/db/entries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detail = await getDailyEntryById(id);
    if (!detail) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await amendDailyEntry(id, body.updates ?? body);
    return NextResponse.json({ entry: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteDailyEntry(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return databaseErrorResponse(e);
  }
}
