import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByUsername, seedAdminFromEnvIfEmpty } from "@/lib/db/users";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, sessionCookieOptions } from "@/lib/auth/session";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await seedAdminFromEnvIfEmpty();

    const { username, password } = schema.parse(await request.json());
    const user = await findUserByUsername(username);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS", hint: "Погрешно корисничко име или лозинка." },
        { status: 401 }
      );
    }

    const token = await signSession({
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
      },
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
