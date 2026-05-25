import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";
import { hashPassword } from "@/lib/auth/password";

export async function countUsers() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  return Number(row?.count ?? 0);
}

export async function findUserByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  const [row] = await db.select().from(users).where(eq(users.username, normalized)).limit(1);
  return row ?? null;
}

export async function findUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function listUsers() {
  return db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    isAdmin: users.isAdmin,
    createdAt: users.createdAt,
  }).from(users);
}

export async function createUser(input: {
  username: string;
  password: string;
  displayName?: string;
  isAdmin?: boolean;
}) {
  const username = input.username.trim().toLowerCase();
  if (username.length < 2) throw new Error("USERNAME_TOO_SHORT");
  if (input.password.length < 6) throw new Error("PASSWORD_TOO_SHORT");

  const passwordHash = await hashPassword(input.password);
  const [row] = await db
    .insert(users)
    .values({
      username,
      passwordHash,
      displayName: input.displayName?.trim() || null,
      isAdmin: input.isAdmin ?? false,
    })
    .returning({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
      createdAt: users.createdAt,
    });
  return row;
}

export async function setUserPassword(userId: string, newPassword: string) {
  if (newPassword.length < 6) throw new Error("PASSWORD_TOO_SHORT");
  const passwordHash = await hashPassword(newPassword);
  const [row] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId))
    .returning({ id: users.id, username: users.username });
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

/** First deploy: create admin from env if table is empty */
export async function seedAdminFromEnvIfEmpty() {
  const n = await countUsers();
  if (n > 0) return null;

  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) return null;

  return createUser({
    username,
    password,
    displayName: "Администратор",
    isAdmin: true,
  });
}
