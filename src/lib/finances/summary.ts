import { startOfMonth, endOfMonth, format } from "date-fns";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyEntries, expenses, incomeEntries, tokenSales } from "@/lib/db/schema";
import { getSettings } from "@/lib/db/settings";
import {
  getChemicalUsageSinceLastCanister,
  getTokenStats,
} from "@/lib/db/entries";
import { todayDateStr } from "@/lib/format";

export async function getFinancesSummary() {
  const today = todayDateStr();
  const now = new Date();
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

  const settings = await getSettings();
  const tokenStats = await getTokenStats();
  const c1Yield = settings.chemical1YieldWashes ?? 70;
  const c2Yield = settings.chemical2YieldWashes ?? 70;
  const c1Used = await getChemicalUsageSinceLastCanister("c1");
  const c2Used = await getChemicalUsageSinceLastCanister("c2");

  const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
  const allTokenSales = await db.select().from(tokenSales).orderBy(desc(tokenSales.soldAt));
  const allOtherIncome = await db.select().from(incomeEntries).orderBy(desc(incomeEntries.incomeDate), desc(incomeEntries.createdAt));
  const allEntries = await db.select().from(dailyEntries).orderBy(desc(dailyEntries.sessionDate));

  const monthExpenses = allExpenses.filter((e) => e.expenseDate >= monthStart && e.expenseDate <= monthEnd);
  const monthTokens = allTokenSales.filter((s) => format(s.soldAt, "yyyy-MM-dd") >= monthStart && format(s.soldAt, "yyyy-MM-dd") <= monthEnd);
  const monthOther = allOtherIncome.filter((i) => i.incomeDate >= monthStart && i.incomeDate <= monthEnd);
  const monthEntries = allEntries.filter((e) => e.sessionDate >= monthStart && e.sessionDate <= monthEnd);

  const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

  const monthCostsTotal = sum(monthExpenses.map((e) => Number(e.amountMkd)));
  const monthTokenIncome = sum(monthTokens.map((s) => Number(s.amountMkd)));
  const monthOtherIncome = sum(monthOther.map((i) => Number(i.amountMkd)));
  const monthWashIncome = sum(monthEntries.map((e) => Number(e.grossRevenueMkd)));
  const monthIncomeTotal = monthTokenIncome + monthOtherIncome + monthWashIncome;

  return {
    today,
    monthLabel: format(now, "MMMM yyyy"),
    totals: {
      monthCosts: monthCostsTotal,
      monthIncome: monthIncomeTotal,
      monthWashIncome,
      monthTokenIncome,
      monthOtherIncome,
      monthNet: monthIncomeTotal - monthCostsTotal,
    },
    tokenStats,
    chemical: {
      c1: {
        used: c1Used,
        yield: c1Yield,
        remaining: Math.max(0, c1Yield - c1Used),
        costMkd: Number(settings.chemical1CostMkd),
      },
      c2: {
        used: c2Used,
        yield: c2Yield,
        remaining: Math.max(0, c2Yield - c2Used),
        costMkd: Number(settings.chemical2CostMkd),
      },
    },
    expenses: allExpenses.map(mapExpense),
    tokenSales: allTokenSales.map(mapTokenSale),
    otherIncome: allOtherIncome.map(mapOtherIncome),
    washIncome: allEntries.slice(0, 30).map(mapWashIncome),
  };
}

function mapExpense(e: typeof expenses.$inferSelect) {
  return {
    id: e.id,
    date: e.expenseDate,
    category: e.category,
    amountMkd: Number(e.amountMkd),
    note: e.note,
    chemicalType: e.chemicalType,
    canisterCount: e.canisterCount,
    createdAt: e.createdAt,
  };
}

function mapTokenSale(s: typeof tokenSales.$inferSelect) {
  return {
    id: s.id,
    date: format(s.soldAt, "yyyy-MM-dd"),
    quantity: s.quantity,
    amountMkd: Number(s.amountMkd),
    note: s.note,
    soldAt: s.soldAt,
  };
}

function mapOtherIncome(i: typeof incomeEntries.$inferSelect) {
  return {
    id: i.id,
    date: i.incomeDate,
    amountMkd: Number(i.amountMkd),
    note: i.note,
    createdAt: i.createdAt,
  };
}

function mapWashIncome(e: typeof dailyEntries.$inferSelect) {
  return {
    id: e.id,
    date: e.sessionDate,
    amountMkd: Number(e.grossRevenueMkd),
    profitMkd: Number(e.netProfitMkd),
    washes: e.p1Count + e.p2Count + e.p3Count,
  };
}
