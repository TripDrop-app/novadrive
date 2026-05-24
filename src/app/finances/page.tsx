"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/metric";
import { formatMkd } from "@/lib/format";
import { t } from "@/lib/i18n";
import { todayDateStr } from "@/lib/format";

type Tab = "costs" | "income";

interface FinancesData {
  monthLabel: string;
  totals: {
    monthCosts: number;
    monthIncome: number;
    monthWashIncome: number;
    monthTokenIncome: number;
    monthOtherIncome: number;
    monthNet: number;
  };
  tokenStats: { outstanding: number };
  chemical: {
    c1: { used: number; yield: number; remaining: number; costMkd: number };
    c2: { used: number; yield: number; remaining: number; costMkd: number };
  };
  expenses: {
    id: string;
    date: string;
    category: string;
    amountMkd: number;
    note: string | null;
    chemicalType: string | null;
  }[];
  tokenSales: {
    id: string;
    date: string;
    quantity: number;
    amountMkd: number;
    note: string | null;
  }[];
  otherIncome: {
    id: string;
    date: string;
    amountMkd: number;
    note: string | null;
  }[];
  washIncome: {
    id: string;
    date: string;
    amountMkd: number;
    profitMkd: number;
    washes: number;
  }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  misc: "Разно",
  equipment: "Опрема",
  repairs: "Поправки",
  chemicals: "Хемикалии",
};

export default function FinancesPage() {
  const [data, setData] = useState<FinancesData | null>(null);
  const [tab, setTab] = useState<Tab>("costs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");
  const [expCategory, setExpCategory] = useState<"misc" | "equipment" | "repairs">("misc");
  const [expDate, setExpDate] = useState(todayDateStr());

  const [tokenQty, setTokenQty] = useState("1");
  const [otherAmount, setOtherAmount] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [otherDate, setOtherDate] = useState(todayDateStr());

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/finances")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.hint ?? "Грешка");
        setData(json);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Грешка"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pourChemical(type: "c1" | "c2") {
    const label = type === "c1" ? "Хемикалија 1" : "Хемикалија 2";
    if (!confirm(`${t("finances.pourConfirm")} ${label}?`)) return;
    const res = await fetch("/api/chemical-pour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chemicalType: type }),
    });
    if (res.ok) load();
    else alert(t("common.error"));
  }

  async function addExpense() {
    const amount = parseFloat(expAmount);
    if (!amount) return;
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        expenseDate: expDate,
        category: expCategory,
        amountMkd: amount,
        note: expNote || undefined,
      }),
    });
    if (res.ok) {
      setExpAmount("");
      setExpNote("");
      load();
    } else alert(t("common.error"));
  }

  async function deleteExpense(id: string) {
    if (!confirm(t("finances.deleteConfirm"))) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  }

  async function addTokens() {
    const qty = parseInt(tokenQty, 10) || 1;
    const res = await fetch("/api/token-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });
    if (res.ok) {
      setTokenQty("1");
      load();
    } else alert(t("common.error"));
  }

  async function addOtherIncome() {
    const amount = parseFloat(otherAmount);
    if (!amount) return;
    const res = await fetch("/api/income", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incomeDate: otherDate,
        amountMkd: amount,
        note: otherNote || undefined,
      }),
    });
    if (res.ok) {
      setOtherAmount("");
      setOtherNote("");
      load();
    } else alert(t("common.error"));
  }

  async function deleteIncome(id: string) {
    if (!confirm(t("finances.deleteConfirm"))) return;
    await fetch(`/api/income/${id}`, { method: "DELETE" });
    load();
  }

  if (loading && !data) {
    return (
      <AppShell>
        <p className="text-muted">{t("common.loading")}</p>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <Card className="text-center">
          <p className="text-danger">{error}</p>
          <Button className="mt-3" onClick={load}>
            {t("common.retry")}
          </Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h2 className="mb-1 text-xl font-bold">{t("finances.title")}</h2>
      <p className="mb-4 text-xs text-muted">{data.monthLabel}</p>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <SummaryTile label={t("finances.monthIncome")} value={formatMkd(data.totals.monthIncome)} positive />
        <SummaryTile label={t("finances.monthCosts")} value={formatMkd(data.totals.monthCosts)} />
        <SummaryTile
          label={t("finances.monthNet")}
          value={formatMkd(data.totals.monthNet)}
          positive={data.totals.monthNet >= 0}
          className="col-span-2"
        />
      </div>

      <Card className="mb-4 space-y-4">
        <h3 className="font-semibold">{t("finances.chemicalPour")}</h3>
        <p className="text-xs text-muted">{t("finances.chemicalPourHint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => pourChemical("c1")}
            className="rounded-2xl bg-gradient-to-br from-primary to-blue-500 p-4 text-left text-white shadow-lg active:scale-[0.98]"
          >
            <span className="text-2xl">🧴</span>
            <p className="mt-2 font-bold">{t("finances.chem1")}</p>
            <p className="text-xs opacity-90">{formatMkd(data.chemical.c1.costMkd)}</p>
          </button>
          <button
            type="button"
            onClick={() => pourChemical("c2")}
            className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-400 p-4 text-left text-white shadow-lg active:scale-[0.98]"
          >
            <span className="text-2xl">🧪</span>
            <p className="mt-2 font-bold">{t("finances.chem2")}</p>
            <p className="text-xs opacity-90">{formatMkd(data.chemical.c2.costMkd)}</p>
          </button>
        </div>
        <ProgressBar
          label={t("dashboard.chemical1Remaining")}
          current={data.chemical.c1.used}
          max={data.chemical.c1.yield}
          warning={data.chemical.c1.remaining / data.chemical.c1.yield < 0.15}
        />
        <ProgressBar
          label={t("dashboard.chemical2Remaining")}
          current={data.chemical.c2.used}
          max={data.chemical.c2.yield}
          warning={data.chemical.c2.remaining / data.chemical.c2.yield < 0.15}
        />
      </Card>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        <TabBtn active={tab === "costs"} onClick={() => setTab("costs")} label={t("finances.tabCosts")} />
        <TabBtn active={tab === "income"} onClick={() => setTab("income")} label={t("finances.tabIncome")} />
      </div>

      {tab === "costs" ? (
        <>
          <Card className="mb-4 space-y-3">
            <h3 className="font-semibold">{t("finances.addCost")}</h3>
            <Input label={t("finances.date")} type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            <select
              className="w-full min-h-12 rounded-xl border border-border px-3"
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as typeof expCategory)}
            >
              <option value="misc">{CATEGORY_LABELS.misc}</option>
              <option value="equipment">{CATEGORY_LABELS.equipment}</option>
              <option value="repairs">{CATEGORY_LABELS.repairs}</option>
            </select>
            <Input label={t("finances.amount")} type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            <Input label={t("finances.note")} value={expNote} onChange={(e) => setExpNote(e.target.value)} />
            <Button fullWidth onClick={addExpense}>
              {t("finances.saveCost")}
            </Button>
          </Card>

          <TransactionList
            title={t("finances.allCosts")}
            empty={t("finances.noCosts")}
            items={data.expenses.map((e) => ({
              id: e.id,
              date: e.date,
              label: CATEGORY_LABELS[e.category] ?? e.category,
              sub: e.note ?? (e.chemicalType ? `Хем. ${e.chemicalType.toUpperCase()}` : undefined),
              amount: -e.amountMkd,
              onDelete: () => deleteExpense(e.id),
            }))}
          />
        </>
      ) : (
        <>
          <Card className="mb-4 space-y-3">
            <h3 className="font-semibold">{t("finances.addTokens")}</h3>
            <p className="text-xs text-muted">
              {t("finances.outstanding")}: {data.tokenStats.outstanding}
            </p>
            <Input label={t("finances.tokenQty")} type="number" value={tokenQty} onChange={(e) => setTokenQty(e.target.value)} />
            <Button fullWidth onClick={addTokens}>
              {t("finances.saveTokens")}
            </Button>
          </Card>

          <Card className="mb-4 space-y-3">
            <h3 className="font-semibold">{t("finances.addOtherIncome")}</h3>
            <Input label={t("finances.date")} type="date" value={otherDate} onChange={(e) => setOtherDate(e.target.value)} />
            <Input label={t("finances.amount")} type="number" value={otherAmount} onChange={(e) => setOtherAmount(e.target.value)} />
            <Input label={t("finances.note")} value={otherNote} onChange={(e) => setOtherNote(e.target.value)} />
            <Button variant="secondary" fullWidth onClick={addOtherIncome}>
              {t("finances.saveIncome")}
            </Button>
          </Card>

          <TransactionList
            title={t("finances.tokenSalesList")}
            empty={t("finances.noIncome")}
            items={data.tokenSales.map((s) => ({
              id: s.id,
              date: s.date,
              label: `${s.quantity} ${t("finances.tokens")}`,
              sub: s.note ?? undefined,
              amount: s.amountMkd,
            }))}
          />

          <TransactionList
            title={t("finances.otherIncomeList")}
            empty={t("finances.noOtherIncome")}
            items={data.otherIncome.map((i) => ({
              id: i.id,
              date: i.date,
              label: t("finances.otherIncome"),
              sub: i.note ?? undefined,
              amount: i.amountMkd,
              onDelete: () => deleteIncome(i.id),
            }))}
          />

          <TransactionList
            title={t("finances.washIncomeList")}
            empty={t("finances.noWashIncome")}
            items={data.washIncome.map((w) => ({
              id: w.id,
              date: w.date,
              label: `${w.washes} ${t("finances.washes")}`,
              sub: `${t("finances.profit")}: ${formatMkd(w.profitMkd)}`,
              amount: w.amountMkd,
              href: `/history/${w.id}`,
            }))}
          />
        </>
      )}
    </AppShell>
  );
}

function SummaryTile({
  label,
  value,
  positive,
  className,
}: {
  label: string;
  value: string;
  positive?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-white p-3 shadow-sm ${className ?? ""}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold ${positive ? "text-success" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${
        active ? "bg-white text-primary shadow-sm" : "text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function TransactionList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: {
    id: string;
    date: string;
    label: string;
    sub?: string;
    amount: number;
    onDelete?: () => void;
    href?: string;
  }[];
}) {
  return (
    <Card className="mb-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-muted">
                  {new Date(item.date + "T12:00:00").toLocaleDateString("mk-MK")}
                  {item.sub ? ` · ${item.sub}` : ""}
                </p>
              </div>
              <p className={`shrink-0 font-bold ${item.amount >= 0 ? "text-success" : "text-danger"}`}>
                {item.amount >= 0 ? "+" : ""}
                {formatMkd(Math.abs(item.amount))}
              </p>
              {item.href && (
                <Link href={item.href} className="text-xs font-semibold text-primary">
                  →
                </Link>
              )}
              {item.onDelete && (
                <button type="button" onClick={item.onDelete} className="text-xs text-danger">
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
