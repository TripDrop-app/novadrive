import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteTruckWash, setTruckWashPaid } from "@/lib/db/trucks";

const schema = z.object({
  paid: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ washId: string }> }
) {
  try {
    const { washId } = await params;
    const body = schema.parse(await request.json());
    await setTruckWashPaid(washId, body.paid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ washId: string }> }
) {
  try {
    const { washId } = await params;
    await deleteTruckWash(washId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
