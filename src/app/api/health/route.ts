import { NextResponse } from "next/server";
import { getDatabaseUrl } from "@/lib/db";
import { getSettings } from "@/lib/db/settings";

/** Simple check — open /api/health in browser to see what's wrong */
export async function GET() {
  try {
    const hasUrl = Boolean(process.env.DATABASE_URL?.trim());
    if (!hasUrl) {
      return NextResponse.json({
        ok: false,
        error: "DATABASE_URL_MISSING",
        fix: "Add DATABASE_URL in Vercel → Settings → Environment Variables, then Redeploy.",
      });
    }

    getDatabaseUrl();
    const settings = await getSettings();

    return NextResponse.json({
      ok: true,
      message: "Database connected",
      settingsId: settings.id,
      setupCompleted: settings.setupCompleted,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const tablesMissing =
      message.includes("does not exist") || message.includes("relation");

    return NextResponse.json({
      ok: false,
      error: tablesMissing ? "TABLES_MISSING" : "DATABASE_ERROR",
      detail: message,
      fix: tablesMissing
        ? "Run on your PC: cd f:\\NovaDrive then npm run db:setup — then Redeploy on Vercel."
        : message.includes("DATABASE_URL")
          ? "Fix DATABASE_URL in Vercel (full Neon URI, no quotes)."
          : "Check Neon dashboard is active. Try pooled connection string from Neon Connect.",
    });
  }
}
