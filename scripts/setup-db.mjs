/**
 * Creates all database tables in Neon. Run: npm run db:setup
 */
import { config } from "dotenv";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

let url = process.env.DATABASE_URL;
if (!url) {
  console.error("ERROR: DATABASE_URL is missing in .env");
  process.exit(1);
}

url = url.trim().replace(/^["']|["']$/g, "");

if (!url.includes("postgresql://") && !url.includes("postgres://")) {
  console.error("ERROR: DATABASE_URL must start with postgresql://");
  process.exit(1);
}

console.log("Connecting to Neon...");
console.log("Host:", url.split("@")[1]?.split("/")[0] ?? "(hidden)");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected.");
} catch (e) {
  console.error("Could not connect:", e instanceof Error ? e.message : e);
  console.error("\nTips:");
  console.error("- Copy the FULL connection string from Neon → Connect → URI");
  console.error("- Try the connection string WITH '-pooler' in the hostname for Vercel");
  console.error("- No quotes around the value in .env or Vercel");
  process.exit(1);
}

const migration = readFileSync(join(__dirname, "..", "drizzle", "0000_init.sql"), "utf8");
const statements = migration
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

console.log(`Running ${statements.length} SQL statements...`);

for (const stmt of statements) {
  try {
    await client.query(stmt);
    console.log("OK:", stmt.slice(0, 55).replace(/\n/g, " ") + "...");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already exists")) {
      console.log("SKIP (exists)");
      continue;
    }
    console.error("FAILED:", stmt.slice(0, 80));
    console.error(msg);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("\nDatabase setup complete. Refresh tripdrop.app");
