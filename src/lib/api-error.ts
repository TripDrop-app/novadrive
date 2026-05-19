import { NextResponse } from "next/server";

export function databaseErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[database]", error);

  const tablesMissing =
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("Failed query");

  const noUrl = message.includes("DATABASE_URL is not set");

  return NextResponse.json(
    {
      error: tablesMissing
        ? "TABLES_MISSING"
        : noUrl
          ? "DATABASE_URL_MISSING"
          : "DATABASE_ERROR",
      hint: tablesMissing
        ? "Run on your PC: npm run db:setup — then push to GitHub / Redeploy on Vercel."
        : noUrl
          ? "DATABASE_URL is not set in Vercel Environment Variables."
          : "Check DATABASE_URL in Vercel. Open /api/health for details.",
      detail: message.slice(0, 200),
    },
    { status: 500 }
  );
}
