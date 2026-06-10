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
import type { LedgerLine } from "@/lib/finances/summary";

type Tab = "overview" | "add";

interface FinancesData {
  monthLabel: string;
  totals: {
    moneyIn: number;
    moneyOut: number;
    balance: number;
    breakdown: {
      in: { wash: number; tokens: number; other: number };
      out: {
        water: number;
        electricity: number;
        chemical1: number;
        chemical2: number;
        expenses: number;
      };
    };
  };
  ledger: LedgerLine[];
  tokenStats: { outstanding: number };
  chemical: {
    c1: { used: number; yield: number; remaining: number; costMkd: number };
    c2: { used: number; yield: number; remaining: number; costMkd: number };
  };
}

interface ActiveBatch {
  chemicalType: string;
  startedDate: string;
  yieldWashes: number;
  remainingWashes: number;
  washCount: number;
  revenueMkd: number;
  waterCostMkd: number;
  electricityCostMkd: number;
  profitMkd: number;
  canisterCostMkd: number;
}

interface ClosedBatch {
  id: string;
  startedDate: string;
  endedDate: string | null;
  chemicalType?: string;
  washCount: number;
  revenueMkd: number;
  waterCostMkd: number;
  electricityCostMkd: number;
  profitMkd: number;
  canisterCostMkd: number;
  yieldWashes: number;
}

export default function FinancesPage() {
  const [data, setData] = useState<FinancesData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
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
  const [batches, setBatches] = useState<{
    active: { c1: ActiveBatch | null; c2: ActiveBatch | null };
    history: { c1: ClosedBatch[]; c2: ClosedBatch[] };
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetch("/api/finances"), fetch("/api/chemical-batches")])
      .then(async ([finRes, batchRes]) => {
        const json = await finRes.json();
        if (!finRes.ok) throw new Error(json.hint ?? "Грешка");
        setData(json);
        if (batchRes.ok) {
          setBatches(await batchRes.json());
        }
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Грешка"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pourChemical(type: "c1" | "c2") {
    const label = type === "c1" ? t("finances.chem1") : t("finances.chem2");
    if (!confirm(`${t("finances.pourConfirm")} ${label}?`)) return;
    const res = await fetch("/api/chemical-pour", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chemicalType: type }),
    });
    const json = await res.json();
    if (res.ok) {
      let msg = json.message ?? t("finances.pourDone");
      if (json.closedBatch?.stats) {
        const s = json.closedBatch.stats;
        msg += `\n\n${t("finances.batchClosed")}:\n`;
        msg += `${s.washCount} ${t("finances.batchWashes")}\n`;
        msg += `${t("dashboard.grossRevenue")}: ${formatMkd(s.revenueMkd)}\n`;
        msg += `${t("dashboard.netProfit")}: ${formatMkd(s.profitMkd)}`;
      }
      if (json.yieldWashes) {
        msg += `\n\n${t("finances.batchNew")}: ~${json.yieldWashes} ${t("finances.batchWashes")}`;
      }
      alert(msg);
      load();
    } else alert(t("common.error"));
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
      setTab("overview");
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
      setTab("overview");
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
      setTab("overview");
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

  const { totals } = data;
  const positive = totals.balance >= 0;

  return (
    <AppShell>
      <h2 className="mb-1 text-xl font-bold">{t("finances.title")}</h2>
      <p className="mb-4 text-xs text-muted">{data.monthLabel}</p>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")} label={t("finances.tabOverview")} />
        <TabBtn active={tab === "add"} onClick={() => setTab("add")} label={t("finances.tabAdd")} />
      </div>

      {tab === "overview" ? (
        <>
          <Card
            className={`mb-4 overflow-hidden border-0 p-0 shadow-lg ${
              positive ? "shadow-emerald-500/20" : "shadow-red-500/20"
            }`}
          >
            <div
              className={`px-4 py-6 text-center text-white ${
                positive
                  ? "bg-gradient-to-br from-emerald-600 to-emerald-500"
                  : "bg-gradient-to-br from-red-600 to-red-500"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-widest opacity-90">
                {t("finances.totalLeft")}
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight">
                {positive ? "+" : "−"}
                {formatMkd(Math.abs(totals.balance))}
              </p>
              <p className="mt-2 text-sm opacity-90">
                {positive ? t("finances.inProfit") : t("finances.inLoss")}
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border bg-white">
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {t("finances.moneyIn")}
                </p>
                <p className="mt-1 text-xl font-bold text-success">+{formatMkd(totals.moneyIn)}</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  {t("finances.moneyOut")}
                </p>
                <p className="mt-1 text-xl font-bold text-danger">−{formatMkd(totals.moneyOut)}</p>
              </div>
            </div>
          </Card>

          <Card className="mb-4">
            <h3 className="mb-3 text-sm font-semibold text-success">{t("finances.whereIn")}</h3>
            <BreakdownRow label={t("finances.inWash")} amount={totals.breakdown.in.wash} positive />
            <BreakdownRow label={t("finances.inTokens")} amount={totals.breakdown.in.tokens} positive />
            <BreakdownRow label={t("finances.inOther")} amount={totals.breakdown.in.other} positive />
          </Card>

          <Card className="mb-4">
            <h3 className="mb-3 text-sm font-semibold text-danger">{t("finances.whereOut")}</h3>
            <BreakdownRow label={t("finances.outWater")} amount={totals.breakdown.out.water} />
            <BreakdownRow label={t("finances.outElectricity")} amount={totals.breakdown.out.electricity} />
            <BreakdownRow label={t("finances.outChem1")} amount={totals.breakdown.out.chemical1} />
            <BreakdownRow label={t("finances.outChem2")} amount={totals.breakdown.out.chemical2} />
            <BreakdownRow label={t("finances.outManual")} amount={totals.breakdown.out.expenses} />
            <p className="mt-2 text-xs text-muted">{t("finances.outHint")}</p>
          </Card>

          <Card className="mb-4">
            <h3 className="mb-3 font-semibold">{t("finances.ledgerTitle")}</h3>
            {data.ledger.length === 0 ? (
              <p className="text-sm text-muted">{t("finances.ledgerEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.ledger.map((line) => (
                  <li key={line.id} className="flex items-center gap-2 py-3 first:pt-0 last:pb-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        line.direction === "in"
                          ? "bg-green-100 text-success"
                          : "bg-red-100 text-danger"
                      }`}
                    >
                      {line.direction === "in" ? "+" : "−"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight">{line.label}</p>
                      <p className="text-xs text-muted">
                        {new Date(line.date + "T12:00:00").toLocaleDateString("mk-MK")}
                        {line.sub ? ` · ${line.sub}` : ""}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 font-bold ${
                        line.direction === "in" ? "text-success" : "text-danger"
                      }`}
                    >
                      {line.direction === "in" ? "+" : "−"}
                      {formatMkd(line.amountMkd)}
                    </p>
                    {line.entryId && (
                      <Link href={`/history/${line.entryId}`} className="text-xs text-primary">
                        →
                      </Link>
                    )}
                    {line.expenseId && (
                      <button
                        type="button"
                        onClick={() => deleteExpense(line.expenseId!)}
                        className="text-xs text-danger"
                      >
                        ×
                      </button>
                    )}
                    {line.incomeId && (
                      <button
                        type="button"
                        onClick={() => deleteIncome(line.incomeId!)}
                        className="text-xs text-danger"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <>
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
            {batches?.active.c1 && (
              <BatchLiveCard batch={batches.active.c1} label={t("finances.chem1")} />
            )}
            {batches?.active.c2 && (
              <BatchLiveCard batch={batches.active.c2} label={t("finances.chem2")} />
            )}
          </Card>

          {batches && (batches.history.c1.length > 0 || batches.history.c2.length > 0) && (
            <Card className="mb-4">
              <h3 className="mb-3 font-semibold">{t("finances.batchHistory")}</h3>
              <BatchHistoryList batches={[...batches.history.c1, ...batches.history.c2]} />
            </Card>
          )}

          <Card className="mb-4 space-y-3">
            <h3 className="font-semibold">{t("finances.addCost")}</h3>
            <Input label={t("finances.date")} type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            <select
              className="w-full min-h-12 rounded-xl border border-border px-3"
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as typeof expCategory)}
            >
              <option value="misc">Разно</option>
              <option value="equipment">Опрема</option>
              <option value="repairs">Поправки</option>
            </select>
            <Input label={t("finances.amount")} type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            <Input label={t("finances.note")} value={expNote} onChange={(e) => setExpNote(e.target.value)} />
            <Button fullWidth onClick={addExpense}>
              {t("finances.saveCost")}
            </Button>
          </Card>

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
        </>
      )}
    </AppShell>
  );
}

function BreakdownRow({
  label,
  amount,
  positive,
}: {
  label: string;
  amount: number;
  positive?: boolean;
}) {
  if (amount <= 0) return null;
  return (
    <div className="flex justify-between border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold ${positive ? "text-success" : "text-danger"}`}>
        {positive ? "+" : "−"}
        {formatMkd(amount)}
      </span>
    </div>
  );
}

function BatchLiveCard({ batch, label }: { batch: ActiveBatch; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-3 text-sm">
      <p className="font-semibold">{label} — {t("finances.batchActive")}</p>
      <p className="text-xs text-muted">
        {t("finances.batchRemaining")}: {batch.remainingWashes} / {batch.yieldWashes} {t("finances.batchWashes")}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <span>{t("finances.batchWashes")}: <b>{batch.washCount}</b></span>
        <span>{t("dashboard.grossRevenue")}: <b>{formatMkd(batch.revenueMkd)}</b></span>
        <span>{t("dashboard.costWater")}: <b>{formatMkd(batch.waterCostMkd)}</b></span>
        <span>{t("dashboard.costElectricity")}: <b>{formatMkd(batch.electricityCostMkd)}</b></span>
        <span className="col-span-2">{t("dashboard.netProfit")}: <b className="text-success">{formatMkd(batch.profitMkd)}</b></span>
      </div>
    </div>
  );
}

function BatchHistoryList({ batches }: { batches: ClosedBatch[] }) {
  const sorted = [...batches].sort((a, b) => (b.endedDate ?? "").localeCompare(a.endedDate ?? ""));
  return (
    <ul className="divide-y divide-border text-sm">
      {sorted.slice(0, 10).map((b) => (
        <li key={b.id} className="py-3">
          <p className="font-medium">
            {b.chemicalType === "c2" ? "Хем.2" : "Хем.1"} · {b.startedDate} → {b.endedDate ?? "—"}
          </p>
          <p className="text-xs text-muted">
            {b.washCount} {t("finances.batchWashes")} · {formatMkd(b.revenueMkd)} · {t("dashboard.netProfit")}: {formatMkd(b.profitMkd)}
          </p>
        </li>
      ))}
    </ul>
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
