import { NextResponse } from "next/server";
import { z } from "zod";
import { addCatalogItem, deleteCatalogItem, listCatalog } from "@/lib/db/grocery";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  emoji: z.string().max(8).optional(),
});

export async function GET() {
  try {
    const items = await listCatalog();
    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        emoji: i.emoji,
        sortOrder: i.sortOrder,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = createSchema.parse(await request.json());
    const item = await addCatalogItem(body.name, body.emoji);
    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
