import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-auth";
import { createUser, listUsers } from "@/lib/db/users";

const createSchema = z.object({
  username: z.string().min(2).max(32),
  password: z.string().min(6).max(128),
  displayName: z.string().max(64).optional(),
  isAdmin: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = createSchema.parse(await request.json());
    const user = await createUser({
      username: body.username,
      password: body.password,
      displayName: body.displayName,
      isAdmin: body.isAdmin ?? false,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return NextResponse.json({ error: "USERNAME_EXISTS" }, { status: 409 });
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (msg === "USERNAME_TOO_SHORT" || msg === "PASSWORD_TOO_SHORT") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
