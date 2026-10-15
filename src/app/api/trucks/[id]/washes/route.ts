import { NextResponse } from "next/server";
import { z } from "zod";
import { addTruckWash } from "@/lib/db/trucks";

const schema = z.object({
  plate: z.string().trim().min(1).max(20),
  washDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amountMkd: z.coerce.number().positive(),
  note: z.string().trim().max(200).optional(),
  paid: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = schema.parse(await request.json());
    const wash = await addTruckWash({
      customerId: id,
      plate: body.plate,
      washDate: body.washDate,
      amountMkd: body.amountMkd,
      note: body.note,
      paid: body.paid ?? false,
    });
    return NextResponse.json({ wash }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
