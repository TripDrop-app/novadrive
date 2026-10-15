import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { truckCustomers, truckWashes } from "./schema";

function money(value: string | number) {
  return Number(value);
}

export async function listTruckCustomers() {
  const customers = await db.select().from(truckCustomers).orderBy(asc(truckCustomers.companyName));
  const washes = await db.select().from(truckWashes);

  const rows = customers.map((customer) => {
    const own = washes.filter((w) => w.customerId === customer.id);
    const owed = own.filter((w) => !w.paid).reduce((sum, w) => sum + money(w.amountMkd), 0);
    const unpaidCount = own.filter((w) => !w.paid).length;
    return {
      id: customer.id,
      companyName: customer.companyName,
      phone: customer.phone,
      owed,
      unpaidCount,
      washCount: own.length,
    };
  });

  rows.sort((a, b) => b.owed - a.owed || a.companyName.localeCompare(b.companyName, "mk"));
  const totalOwed = rows.reduce((sum, row) => sum + row.owed, 0);
  return { customers: rows, totalOwed };
}

export async function createTruckCustomer(input: { companyName: string; phone?: string }) {
  const [row] = await db
    .insert(truckCustomers)
    .values({
      companyName: input.companyName.trim(),
      phone: input.phone?.trim() || null,
    })
    .returning();
  return row;
}

export async function getTruckCustomer(id: string) {
  const [customer] = await db.select().from(truckCustomers).where(eq(truckCustomers.id, id)).limit(1);
  if (!customer) return null;

  const washes = await db
    .select()
    .from(truckWashes)
    .where(eq(truckWashes.customerId, id))
    .orderBy(desc(truckWashes.washDate), desc(truckWashes.createdAt));

  const mapped = washes.map((wash) => ({
    id: wash.id,
    plate: wash.plate,
    washDate: wash.washDate,
    amountMkd: money(wash.amountMkd),
    note: wash.note,
    paid: wash.paid,
    paidAt: wash.paidAt,
  }));

  const owed = mapped.filter((w) => !w.paid).reduce((sum, w) => sum + w.amountMkd, 0);

  return {
    id: customer.id,
    companyName: customer.companyName,
    phone: customer.phone,
    owed,
    washes: mapped,
  };
}

export async function addTruckWash(input: {
  customerId: string;
  plate: string;
  washDate: string;
  amountMkd: number;
  note?: string;
  paid: boolean;
}) {
  const [row] = await db
    .insert(truckWashes)
    .values({
      customerId: input.customerId,
      plate: input.plate.trim().toUpperCase(),
      washDate: input.washDate,
      amountMkd: input.amountMkd.toString(),
      note: input.note?.trim() || null,
      paid: input.paid,
      paidAt: input.paid ? new Date() : null,
    })
    .returning();
  return row;
}

export async function setTruckWashPaid(id: string, paid: boolean) {
  const [row] = await db
    .update(truckWashes)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(eq(truckWashes.id, id))
    .returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function markCustomerPaid(customerId: string) {
  await db
    .update(truckWashes)
    .set({ paid: true, paidAt: new Date() })
    .where(and(eq(truckWashes.customerId, customerId), eq(truckWashes.paid, false)));
}

export async function deleteTruckWash(id: string) {
  const [row] = await db.delete(truckWashes).where(eq(truckWashes.id, id)).returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}

export async function deleteTruckCustomer(id: string) {
  const [row] = await db.delete(truckCustomers).where(eq(truckCustomers.id, id)).returning();
  if (!row) throw new Error("NOT_FOUND");
  return row;
}
