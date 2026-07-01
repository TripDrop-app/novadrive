import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "./index";
import {
  groceryItems,
  grocerySessionItems,
  grocerySessions,
} from "./schema";

export async function listCatalog() {
  return db.select().from(groceryItems).orderBy(asc(groceryItems.sortOrder), asc(groceryItems.name));
}

export async function addCatalogItem(name: string, emoji?: string) {
  const items = await listCatalog();
  const [row] = await db
    .insert(groceryItems)
    .values({
      name: name.trim(),
      emoji: emoji?.trim() || null,
      sortOrder: items.length,
    })
    .returning();

  const session = await getActiveSession();
  if (session?.phase === "swiping") {
    await db.insert(grocerySessionItems).values({
      sessionId: session.id,
      itemId: row.id,
      decision: "pending",
    });
  }

  return row;
}

export async function deleteCatalogItem(id: string) {
  const [deleted] = await db.delete(groceryItems).where(eq(groceryItems.id, id)).returning();
  if (!deleted) throw new Error("NOT_FOUND");
  return deleted;
}

export async function getActiveSession() {
  const [session] = await db
    .select()
    .from(grocerySessions)
    .orderBy(desc(grocerySessions.createdAt))
    .limit(1);
  return session ?? null;
}

async function syncSessionPhase(sessionId: string) {
  const pending = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(grocerySessionItems)
    .where(
      and(
        eq(grocerySessionItems.sessionId, sessionId),
        eq(grocerySessionItems.decision, "pending")
      )
    );

  if (Number(pending[0]?.count ?? 0) === 0) {
    await db
      .update(grocerySessions)
      .set({ phase: "shopping" })
      .where(eq(grocerySessions.id, sessionId));
    return "shopping" as const;
  }
  return "swiping" as const;
}

export async function getOrCreateSession() {
  const catalog = await listCatalog();
  if (catalog.length === 0) {
    return { session: null, catalogEmpty: true };
  }

  let session = await getActiveSession();
  if (!session) {
    const [created] = await db.insert(grocerySessions).values({ phase: "swiping" }).returning();
    session = created;
    await db.insert(grocerySessionItems).values(
      catalog.map((item) => ({
        sessionId: session!.id,
        itemId: item.id,
        decision: "pending" as const,
      }))
    );
  } else if (session.phase === "swiping") {
    const existing = await db
      .select({ itemId: grocerySessionItems.itemId })
      .from(grocerySessionItems)
      .where(eq(grocerySessionItems.sessionId, session.id));
    const existingIds = new Set(existing.map((e) => e.itemId));
    const missing = catalog.filter((c) => !existingIds.has(c.id));
    if (missing.length > 0) {
      await db.insert(grocerySessionItems).values(
        missing.map((item) => ({
          sessionId: session!.id,
          itemId: item.id,
          decision: "pending" as const,
        }))
      );
    }
  }

  const phase = await syncSessionPhase(session.id);
  const [updated] = await db
    .select()
    .from(grocerySessions)
    .where(eq(grocerySessions.id, session.id))
    .limit(1);

  return { session: updated ?? session, catalogEmpty: false, phase };
}

export async function restartSession() {
  await db.delete(grocerySessions);
  return getOrCreateSession();
}

export async function getNextSwipeItem(sessionId: string) {
  const rows = await db
    .select({
      sessionItemId: grocerySessionItems.id,
      itemId: groceryItems.id,
      name: groceryItems.name,
      emoji: groceryItems.emoji,
    })
    .from(grocerySessionItems)
    .innerJoin(groceryItems, eq(grocerySessionItems.itemId, groceryItems.id))
    .where(
      and(
        eq(grocerySessionItems.sessionId, sessionId),
        eq(grocerySessionItems.decision, "pending")
      )
    )
    .orderBy(asc(groceryItems.sortOrder), asc(groceryItems.name))
    .limit(1);

  return rows[0] ?? null;
}

export async function getSwipeProgress(sessionId: string) {
  const rows = await db
    .select({
      decision: grocerySessionItems.decision,
    })
    .from(grocerySessionItems)
    .where(eq(grocerySessionItems.sessionId, sessionId));

  const total = rows.length;
  const done = rows.filter((r) => r.decision !== "pending").length;
  return { done, total, pending: total - done };
}

export async function swipeItem(
  sessionId: string,
  sessionItemId: string,
  decision: "need" | "skip"
) {
  const [updated] = await db
    .update(grocerySessionItems)
    .set({ decision })
    .where(
      and(
        eq(grocerySessionItems.id, sessionItemId),
        eq(grocerySessionItems.sessionId, sessionId),
        eq(grocerySessionItems.decision, "pending")
      )
    )
    .returning();

  if (!updated) throw new Error("NOT_FOUND");

  const phase = await syncSessionPhase(sessionId);
  const progress = await getSwipeProgress(sessionId);
  const next = phase === "swiping" ? await getNextSwipeItem(sessionId) : null;

  return { phase, progress, next };
}

export async function getShoppingList(sessionId: string) {
  const rows = await db
    .select({
      sessionItemId: grocerySessionItems.id,
      name: groceryItems.name,
      emoji: groceryItems.emoji,
      inCart: grocerySessionItems.inCart,
      removed: grocerySessionItems.removed,
    })
    .from(grocerySessionItems)
    .innerJoin(groceryItems, eq(grocerySessionItems.itemId, groceryItems.id))
    .where(
      and(
        eq(grocerySessionItems.sessionId, sessionId),
        eq(grocerySessionItems.decision, "need"),
        eq(grocerySessionItems.removed, false)
      )
    )
    .orderBy(asc(groceryItems.sortOrder), asc(groceryItems.name));

  return rows;
}

export async function setInCart(sessionItemId: string, inCart: boolean) {
  const [row] = await db
    .update(grocerySessionItems)
    .set({ inCart })
    .where(eq(grocerySessionItems.id, sessionItemId))
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function removeFromList(sessionItemId: string) {
  const [row] = await db
    .update(grocerySessionItems)
    .set({ removed: true, inCart: false })
    .where(eq(grocerySessionItems.id, sessionItemId))
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function completeSession(sessionId: string) {
  await db.delete(grocerySessions).where(eq(grocerySessions.id, sessionId));
}

export async function getGroceryState() {
  const catalog = await listCatalog();
  const { session, catalogEmpty } = await getOrCreateSession();

  if (catalogEmpty || !session) {
    return {
      catalogEmpty: true,
      catalogCount: 0,
      session: null,
      phase: null,
      progress: null,
      currentItem: null,
      list: [],
    };
  }

  const progress = await getSwipeProgress(session.id);
  const currentItem =
    session.phase === "swiping" ? await getNextSwipeItem(session.id) : null;
  const list =
    session.phase === "shopping" ? await getShoppingList(session.id) : [];

  return {
    catalogEmpty: false,
    catalogCount: catalog.length,
    session: { id: session.id, phase: session.phase },
    phase: session.phase,
    progress,
    currentItem,
    list,
  };
}
