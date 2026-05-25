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

export type LedgerDirection = "in" | "out";

export interface LedgerLine {
  id: string;
  date: string;
  sortAt: string;
  direction: LedgerDirection;
  amountMkd: number;
  label: string;
  sub?: string;
  kind:
    | "wash_in"
    | "token_in"
    | "other_in"
    | "water_out"
    | "electricity_out"
    | "chem1_out"
    | "chem2_out"
    | "expense_out";
  expenseId?: string;
  incomeId?: string;
  entryId?: string;
}

const EXPENSE_LABELS: Record<string, string> = {
  misc: "Разно",
  equipment: "Опрема",
  repairs: "Поправки",
  chemicals: "Хемикалија (канистер)",
};

function sum(nums: number[]) {
  return nums.reduce((a, b) => a + b, 0);
}

function inMonth(dateYmd: string, start: string, end: string) {
  return dateYmd >= start && dateYmd <= end;
}

function buildMonthLedger(
  monthEntries: (typeof dailyEntries.$inferSelect)[],
  monthExpenses: (typeof expenses.$inferSelect)[],
  monthTokens: (typeof tokenSales.$inferSelect)[],
  monthOther: (typeof incomeEntries.$inferSelect)[]
): LedgerLine[] {
  const lines: LedgerLine[] = [];

  for (const e of monthEntries) {
    const washes = e.p1Count + e.p2Count + e.p3Count;
    const revenue = Number(e.grossRevenueMkd);
    const water = Number(e.waterCostMkd);
    const elec = Number(e.electricityCostMkd);
    const c1 = Number(e.chemical1CostMkd);
    const c2 = Number(e.chemical2CostMkd);

    if (revenue > 0) {
      lines.push({
        id: `wash-in-${e.id}`,
        date: e.sessionDate,
        sortAt: `${e.sessionDate}T12:00:00`,
        direction: "in",
        amountMkd: revenue,
        label: "Приход од миења",
        sub: `${washes} миења (P1:${e.p1Count} P2:${e.p2Count} P3:${e.p3Count})`,
        kind: "wash_in",
        entryId: e.id,
      });
    }
    if (water > 0) {
      lines.push({
        id: `water-${e.id}`,
        date: e.sessionDate,
        sortAt: `${e.sessionDate}T12:01:00`,
        direction: "out",
        amountMkd: water,
        label: "Вода",
        sub: "од дневен внес",
        kind: "water_out",
        entryId: e.id,
      });
    }
    if (elec > 0) {
      lines.push({
        id: `elec-${e.id}`,
        date: e.sessionDate,
        sortAt: `${e.sessionDate}T12:02:00`,
        direction: "out",
        amountMkd: elec,
        label: "Струја",
        sub: e.deltaKwh != null ? `${Number(e.deltaKwh).toFixed(1)} kWh` : undefined,
        kind: "electricity_out",
        entryId: e.id,
      });
    }
    if (c1 > 0) {
      lines.push({
        id: `chem1-${e.id}`,
        date: e.sessionDate,
        sortAt: `${e.sessionDate}T12:03:00`,
        direction: "out",
        amountMkd: c1,
        label: "Хемикалија 1",
        sub: "употреба од миења",
        kind: "chem1_out",
        entryId: e.id,
      });
    }
    if (c2 > 0) {
      lines.push({
        id: `chem2-${e.id}`,
        date: e.sessionDate,
        sortAt: `${e.sessionDate}T12:04:00`,
        direction: "out",
        amountMkd: c2,
        label: "Хемикалија 2",
        sub: "употреба од миења",
        kind: "chem2_out",
        entryId: e.id,
      });
    }
  }

  for (const ex of monthExpenses) {
    lines.push({
      id: `exp-${ex.id}`,
      date: ex.expenseDate,
      sortAt: `${ex.expenseDate}T${ex.createdAt.toISOString().slice(11, 19)}`,
      direction: "out",
      amountMkd: Number(ex.amountMkd),
      label: EXPENSE_LABELS[ex.category] ?? ex.category,
      sub: ex.note ?? (ex.chemicalType ? `Хем. ${ex.chemicalType.toUpperCase()}` : undefined),
      kind: "expense_out",
      expenseId: ex.id,
    });
  }

  for (const s of monthTokens) {
    const date = format(s.soldAt, "yyyy-MM-dd");
    lines.push({
      id: `token-${s.id}`,
      date,
      sortAt: s.soldAt.toISOString(),
      direction: "in",
      amountMkd: Number(s.amountMkd),
      label: "Продажба жетони",
      sub: `${s.quantity} жетони`,
      kind: "token_in",
    });
  }

  for (const i of monthOther) {
    lines.push({
      id: `income-${i.id}`,
      date: i.incomeDate,
      sortAt: i.createdAt.toISOString(),
      direction: "in",
      amountMkd: Number(i.amountMkd),
      label: "Друг приход",
      sub: i.note ?? undefined,
      kind: "other_in",
      incomeId: i.id,
    });
  }

  return lines.sort((a, b) => b.sortAt.localeCompare(a.sortAt));
}

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

  const allExpenses = await db
    .select()
    .from(expenses)
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt));
  const allTokenSales = await db.select().from(tokenSales).orderBy(desc(tokenSales.soldAt));
  const allOtherIncome = await db
    .select()
    .from(incomeEntries)
    .orderBy(desc(incomeEntries.incomeDate), desc(incomeEntries.createdAt));
  const allEntries = await db
    .select()
    .from(dailyEntries)
    .orderBy(desc(dailyEntries.sessionDate));

  const monthEntries = allEntries.filter((e) => inMonth(e.sessionDate, monthStart, monthEnd));
  const monthExpenses = allExpenses.filter((e) => inMonth(e.expenseDate, monthStart, monthEnd));
  const monthTokens = allTokenSales.filter((s) =>
    inMonth(format(s.soldAt, "yyyy-MM-dd"), monthStart, monthEnd)
  );
  const monthOther = allOtherIncome.filter((i) => inMonth(i.incomeDate, monthStart, monthEnd));

  const washIn = sum(monthEntries.map((e) => Number(e.grossRevenueMkd)));
  const tokenIn = sum(monthTokens.map((s) => Number(s.amountMkd)));
  const otherIn = sum(monthOther.map((i) => Number(i.amountMkd)));
  const moneyIn = washIn + tokenIn + otherIn;

  const waterOut = sum(monthEntries.map((e) => Number(e.waterCostMkd)));
  const electricityOut = sum(monthEntries.map((e) => Number(e.electricityCostMkd)));
  const chem1Out = sum(monthEntries.map((e) => Number(e.chemical1CostMkd)));
  const chem2Out = sum(monthEntries.map((e) => Number(e.chemical2CostMkd)));
  const expensesOut = sum(monthExpenses.map((e) => Number(e.amountMkd)));
  const moneyOut = waterOut + electricityOut + chem1Out + chem2Out + expensesOut;
  const balance = moneyIn - moneyOut;

  const ledger = buildMonthLedger(monthEntries, monthExpenses, monthTokens, monthOther);

  return {
    today,
    monthLabel: format(now, "MMMM yyyy"),
    totals: {
      moneyIn,
      moneyOut,
      balance,
      breakdown: {
        in: { wash: washIn, tokens: tokenIn, other: otherIn },
        out: {
          water: waterOut,
          electricity: electricityOut,
          chemical1: chem1Out,
          chemical2: chem2Out,
          expenses: expensesOut,
        },
      },
    },
    ledger,
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
    expenses: allExpenses.map((e) => ({
      id: e.id,
      date: e.expenseDate,
      category: e.category,
      amountMkd: Number(e.amountMkd),
      note: e.note,
      chemicalType: e.chemicalType,
      canisterCount: e.canisterCount,
      createdAt: e.createdAt,
    })),
    tokenSales: allTokenSales.map((s) => ({
      id: s.id,
      date: format(s.soldAt, "yyyy-MM-dd"),
      quantity: s.quantity,
      amountMkd: Number(s.amountMkd),
      note: s.note,
      soldAt: s.soldAt,
    })),
    otherIncome: allOtherIncome.map((i) => ({
      id: i.id,
      date: i.incomeDate,
      amountMkd: Number(i.amountMkd),
      note: i.note,
      createdAt: i.createdAt,
    })),
  };
}
