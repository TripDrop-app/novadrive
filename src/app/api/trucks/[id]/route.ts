import { NextResponse } from "next/server";
import { deleteTruckCustomer, getTruckCustomer, markCustomerPaid } from "@/lib/db/trucks";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await getTruckCustomer(id);
    if (!customer) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(customer);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: string };
    if (body.action === "mark-all-paid") {
      await markCustomerPaid(id);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteTruckCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
