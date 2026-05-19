import { eq } from "drizzle-orm";
import { db } from "./index";
import { settings } from "./schema";

export async function getSettings() {
  const rows = await db.select().from(settings).limit(1);
  if (rows.length === 0) {
    const [created] = await db
      .insert(settings)
      .values({
        chemical1YieldWashes: 70,
        chemical2YieldWashes: 70,
      })
      .returning();
    return created;
  }
  return rows[0];
}

export async function updateSettings(
  data: Partial<typeof settings.$inferInsert>
) {
  const current = await getSettings();
  const [updated] = await db
    .update(settings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(settings.id, current.id))
    .returning();
  return updated;
}
