import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findUserById } from "@/lib/db/users";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const row = await findUserById(session.userId);
  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      displayName: row?.displayName ?? null,
      isAdmin: session.isAdmin,
    },
  });
}
