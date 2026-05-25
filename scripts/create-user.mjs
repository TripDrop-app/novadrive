/**
 * Create a user from the command line (local .env must have DATABASE_URL).
 *
 * Usage:
 *   node scripts/create-user.mjs <username> <password> [displayName] [--admin]
 *
 * Example:
 *   node scripts/create-user.mjs ana mojaLozinka123 "Ана" 
 *   node scripts/create-user.mjs filip adminPass "Филип" --admin
 */
import { config } from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import pg from "pg";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

const args = process.argv.slice(2).filter((a) => a !== "--admin");
const isAdmin = process.argv.includes("--admin");

if (args.length < 2) {
  console.error("Usage: node scripts/create-user.mjs <username> <password> [displayName] [--admin]");
  process.exit(1);
}

const [usernameRaw, password, displayName] = args;
const username = usernameRaw.trim().toLowerCase();

if (username.length < 2) {
  console.error("Username must be at least 2 characters.");
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters.");
  process.exit(1);
}

const url = process.env.DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
if (!url) {
  console.error("DATABASE_URL missing in .env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const passwordHash = await bcrypt.hash(password, 12);
const id = randomUUID();

try {
  await client.query(
    `INSERT INTO users (id, username, password_hash, display_name, is_admin)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, username, passwordHash, displayName?.trim() || null, isAdmin]
  );
  console.log(`Created user @${username}${isAdmin ? " (admin)" : ""}`);
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("unique") || msg.includes("duplicate")) {
    console.error("Username already exists.");
  } else {
    console.error(msg);
  }
  process.exit(1);
} finally {
  await client.end();
}
