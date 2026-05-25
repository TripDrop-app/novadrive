import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./session";

export async function requireAuth(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", hint: "Најавете се." }, { status: 401 });
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload | NextResponse> {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;
  if (!session.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN", hint: "Само администратор." }, { status: 403 });
  }
  return session;
}
