import { config } from "dotenv";
import { neonConfig } from "@neondatabase/serverless";
import { defineConfig } from "drizzle-kit";
import ws from "ws";

config({ path: ".env" });
neonConfig.webSocketConstructor = ws;

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
