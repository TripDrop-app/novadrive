import { startOfMonth, endOfMonth, format } from "date-fns";
import { db } from "@/lib/db";
import { dailyEntries, expenses, incomeEntries, personalExpenses, personalWithdrawals, tokenSales } from "@/lib/db/schema";
import { todayDateStr } from "@/lib/format";
import { enrichEntriesForAnalytics } from "@/lib/analytics/enrich";
import { getSettings } from "@/lib/db/settings";

const CATEGORY_LABELS: Record<string, string> = {
  food: "Храна",
  housing: "Дом",
  transport: "Транспорт",
  health: "Здравје",
  family: "Семејство",
  entertainment: "Забава",
  other: "Друго",
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function inRange(dateYmd: string, start: string, end: string) {
  return dateYmd >= start && dateYmd <= end;
}

/** Business net = wash profit snapshots + tokens + other income − operating expenses (no personal). */
export function computeBusinessNet(
  entries: (typeof dailyEntries.$inferSelect)[],
  monthExpenses: (typeof expenses.$inferSelect)[],
  monthTokens: (typeof tokenSales.$inferSelect)[],
  monthOther: (typeof incomeEntries.$inferSelect)[]
) {
  const washIn = sum(entries.map((e) => Number(e.grossRevenueMkd)));
  const tokenIn = sum(monthTokens.map((s) => Number(s.amountMkd)));
  const otherIn = sum(monthOther.map((i) => Number(i.amountMkd)));
  const moneyIn = washIn + tokenIn + otherIn;

  const waterOut = sum(entries.map((e) => Number(e.waterCostMkd)));
  const elecOut = sum(entries.map((e) => Number(e.electricityCostMkd)));
  const chem1Out = sum(entries.map((e) => Number(e.chemical1CostMkd)));
  const chem2Out = sum(entries.map((e) => Number(e.chemical2CostMkd)));
  const manualOut = sum(monthExpenses.map((e) => Number(e.amountMkd)));
  const moneyOut = waterOut + elecOut + chem1Out + chem2Out + manualOut;

  return { moneyIn, moneyOut, net: moneyIn - moneyOut };
}

export async function getPersonalSummary(month?: string) {
  const now = new Date();
  const monthStart = month ? `${month}-01` : format(startOfMonth(now), "yyyy-MM-dd");
  const monthEnd = month
    ? format(endOfMonth(new Date(monthStart + "T12:00:00")), "yyyy-MM-dd")
    : format(endOfMonth(now), "yyyy-MM-dd");
  const monthLabel = format(new Date(monthStart + "T12:00:00"), "MMMM yyyy");

  const settings = await getSettings();
  const [
    allEntriesRaw,
    allExpenses,
    allTokens,
    allOther,
    allWithdrawals,
    allPersonal,
  ] = await Promise.all([
    db.select().from(dailyEntries),
    db.select().from(expenses),
    db.select().from(tokenSales),
    db.select().from(incomeEntries),
    db.select().from(personalWithdrawals),
    db.select().from(personalExpenses),
  ]);
  const allEntries = enrichEntriesForAnalytics(allEntriesRaw, settings);

  const monthEntries = allEntries.filter((e) => inRange(e.sessionDate, monthStart, monthEnd));
  const monthExpenses = allExpenses.filter((e) => inRange(e.expenseDate, monthStart, monthEnd));
  const monthTokens = allTokens.filter((s) =>
    inRange(format(s.soldAt, "yyyy-MM-dd"), monthStart, monthEnd)
  );
  const monthOther = allOther.filter((i) => inRange(i.incomeDate, monthStart, monthEnd));
  const monthWithdrawals = allWithdrawals.filter((w) =>
    inRange(w.withdrawalDate, monthStart, monthEnd)
  );
  const monthPersonal = allPersonal.filter((e) => inRange(e.expenseDate, monthStart, monthEnd));

  const businessMonth = computeBusinessNet(monthEntries, monthExpenses, monthTokens, monthOther);
  const businessAll = computeBusinessNet(allEntries, allExpenses, allTokens, allOther);

  const withdrawalsMonth = sum(monthWithdrawals.map((w) => Number(w.amountMkd)));
  const withdrawalsAll = sum(allWithdrawals.map((w) => Number(w.amountMkd)));
  const personalSpentMonth = sum(monthPersonal.map((e) => Number(e.amountMkd)));
  const personalSpentAll = sum(allPersonal.map((e) => Number(e.amountMkd)));

  const pocketMonth = withdrawalsMonth - personalSpentMonth;
  const pocketAll = withdrawalsAll - personalSpentAll;
  const inBusiness = businessAll.net - withdrawalsAll;

  const byCategory: Record<string, number> = {};
  for (const e of monthPersonal) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amountMkd);
  }

  const categoryBreakdown = Object.entries(byCategory)
    .map(([key, amount]) => ({ category: key, label: CATEGORY_LABELS[key] ?? key, amount }))
    .sort((a, b) => b.amount - a.amount);

  const ledger = [
    ...monthWithdrawals.map((w) => ({
      id: w.id,
      date: w.withdrawalDate,
      sortAt: w.createdAt.toISOString(),
      direction: "in" as const,
      amountMkd: Number(w.amountMkd),
      label: "Подигнување од перална",
      sub: w.note ?? undefined,
      kind: "withdrawal" as const,
    })),
    ...monthPersonal.map((e) => ({
      id: e.id,
      date: e.expenseDate,
      sortAt: e.createdAt.toISOString(),
      direction: "out" as const,
      amountMkd: Number(e.amountMkd),
      label: CATEGORY_LABELS[e.category] ?? e.category,
      sub: e.note ?? undefined,
      kind: "personal_expense" as const,
    })),
  ].sort((a, b) => b.sortAt.localeCompare(a.sortAt));

  return {
    today: todayDateStr(),
    monthLabel,
    monthStart,
    business: {
      monthNet: businessMonth.net,
      monthIn: businessMonth.moneyIn,
      monthOut: businessMonth.moneyOut,
      allTimeNet: businessAll.net,
      availableInBusiness: inBusiness,
    },
    personal: {
      withdrawalsMonth,
      withdrawalsAll,
      spentMonth: personalSpentMonth,
      spentAll: personalSpentAll,
      pocketMonth,
      pocketAll,
      livingCovered: personalSpentMonth <= withdrawalsMonth,
    },
    categoryBreakdown,
    ledger,
    withdrawals: allWithdrawals.map((w) => ({
      id: w.id,
      date: w.withdrawalDate,
      amountMkd: Number(w.amountMkd),
      note: w.note,
    })),
    expenses: allPersonal.map((e) => ({
      id: e.id,
      date: e.expenseDate,
      category: e.category,
      amountMkd: Number(e.amountMkd),
      note: e.note,
    })),
  };
}
