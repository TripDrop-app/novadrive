import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const url = raw.trim().replace(/^["']|["']$/g, "");
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error("DATABASE_URL must be a postgresql:// connection string");
  }
  return url;
}

function createDb() {
  const sql = neon(getDatabaseUrl());
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof createDb>;

let _db: Db | null = null;

export function getDb(): Db {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

/** @deprecated use getDb() */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
