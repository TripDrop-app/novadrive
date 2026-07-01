import { NextResponse } from "next/server";
import { z } from "zod";
import { removeFromList, setInCart } from "@/lib/db/grocery";

const schema = z.object({
  inCart: z.boolean().optional(),
  remove: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());

    if (body.remove) {
      await removeFromList(id);
      return NextResponse.json({ ok: true });
    }

    if (body.inCart !== undefined) {
      await setInCart(id, body.inCart);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
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
