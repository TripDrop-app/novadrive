import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-auth";
import { setUserPassword } from "@/lib/db/users";

const schema = z.object({
  password: z.string().min(6).max(128),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const { password } = schema.parse(await request.json());
    const user = await setUserPassword(id, password);
    return NextResponse.json({ ok: true, username: user.username });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (e instanceof z.ZodError || msg === "PASSWORD_TOO_SHORT") {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
