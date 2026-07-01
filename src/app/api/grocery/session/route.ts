import { NextResponse } from "next/server";
import { completeSession, restartSession } from "@/lib/db/grocery";
import { z } from "zod";

const completeSchema = z.object({ sessionId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "restart") {
      const state = await restartSession();
      return NextResponse.json(state);
    }

    const body = completeSchema.parse(await request.json());
    await completeSession(body.sessionId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
