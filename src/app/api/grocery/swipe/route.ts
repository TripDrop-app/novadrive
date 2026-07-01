import { NextResponse } from "next/server";
import { z } from "zod";
import { swipeItem } from "@/lib/db/grocery";

const schema = z.object({
  sessionId: z.string().uuid(),
  sessionItemId: z.string().uuid(),
  decision: z.enum(["need", "skip"]),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const result = await swipeItem(body.sessionId, body.sessionItemId, body.decision);
    return NextResponse.json(result);
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
