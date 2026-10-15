import { NextResponse } from "next/server";
import { z } from "zod";
import { createTruckCustomer, listTruckCustomers } from "@/lib/db/trucks";

const createSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
});

export async function GET() {
  try {
    return NextResponse.json(await listTruckCustomers());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const customer = await createTruckCustomer(body);
    return NextResponse.json({ customer }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
