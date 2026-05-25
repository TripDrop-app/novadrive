import { NextResponse } from "next/server";
import { countUsers, seedAdminFromEnvIfEmpty } from "@/lib/db/users";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  try {
    await seedAdminFromEnvIfEmpty();
    const userCount = await countUsers();
    const session = await getSession();
    return NextResponse.json({
      hasUsers: userCount > 0,
      authenticated: !!session,
      user: session
        ? { username: session.username, isAdmin: session.isAdmin }
        : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
