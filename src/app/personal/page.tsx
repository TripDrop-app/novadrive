"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMkd, todayDateStr } from "@/lib/format";
import { t } from "@/lib/i18n";

type Tab = "overview" | "add";

interface PersonalData {
  monthLabel: string;
  business: {
    monthNet: number;
    availableInBusiness: number;
    allTimeNet: number;
  };
  personal: {
    withdrawalsMonth: number;
    spentMonth: number;
    pocketMonth: number;
    livingCovered: boolean;
  };
  categoryBreakdown: { category: string; label: string; amount: number }[];
  ledger: {
    id: string;
    date: string;
    direction: "in" | "out";
    amountMkd: number;
    label: string;
    sub?: string;
    kind: "withdrawal" | "personal_expense";
  }[];
}

const CATEGORIES = [
  "food",
  "housing",
  "transport",
  "health",
  "family",
  "entertainment",
  "other",
] as const;

export default function PersonalPage() {
  const [data, setData] = useState<PersonalData | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wdAmount, setWdAmount] = useState("");
  const [wdNote, setWdNote] = useState("");
  const [wdDate, setWdDate] = useState(todayDateStr());
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");
  const [expDate, setExpDate] = useState(todayDateStr());
  const [expCategory, setExpCategory] = useState<(typeof CATEGORIES)[number]>("food");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/personal")
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

  async function addWithdrawal() {
    const amount = parseFloat(wdAmount);
    if (!amount) return;
    const res = await fetch("/api/personal/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ withdrawalDate: wdDate, amountMkd: amount, note: wdNote || undefined }),
    });
    if (res.ok) {
      setWdAmount("");
      setWdNote("");
      setTab("overview");
      load();
    } else alert(t("common.error"));
  }

  async function addExpense() {
    const amount = parseFloat(expAmount);
    if (!amount) return;
    const res = await fetch("/api/personal/expenses", {
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

  async function deleteItem(id: string, kind: "withdrawal" | "personal_expense") {
    if (!confirm(t("personal.deleteConfirm"))) return;
    const path =
      kind === "withdrawal"
        ? `/api/personal/withdrawals/${id}`
        : `/api/personal/expenses/${id}`;
    await fetch(path, { method: "DELETE" });
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

  const canLive = data.personal.livingCovered;

  return (
    <AppShell>
      <h2 className="mb-1 text-xl font-bold">{t("personal.title")}</h2>
      <p className="mb-4 text-xs text-muted">{data.monthLabel} · {t("personal.subtitle")}</p>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        <TabBtn active={tab === "overview"} onClick={() => setTab("overview")} label={t("personal.tabOverview")} />
        <TabBtn active={tab === "add"} onClick={() => setTab("add")} label={t("personal.tabAdd")} />
      </div>

      {tab === "overview" ? (
        <>
          <Card className="mb-4 overflow-hidden border-0 p-0 shadow-lg shadow-primary/20">
            <div className="bg-gradient-to-br from-primary to-blue-500 px-4 py-6 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-90">
                {t("personal.availableInBusiness")}
              </p>
              <p className="mt-2 text-4xl font-black">{formatMkd(data.business.availableInBusiness)}</p>
              <p className="mt-2 text-sm opacity-90">{t("personal.availableHint")}</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-border bg-white">
              <div className="px-3 py-4 text-center">
                <p className="text-[10px] font-bold uppercase text-muted">{t("personal.businessMonth")}</p>
                <p className={`mt-1 text-lg font-bold ${data.business.monthNet >= 0 ? "text-success" : "text-danger"}`}>
                  {data.business.monthNet >= 0 ? "+" : "−"}
                  {formatMkd(Math.abs(data.business.monthNet))}
                </p>
              </div>
              <div className="px-3 py-4 text-center">
                <p className="text-[10px] font-bold uppercase text-muted">{t("personal.inPocket")}</p>
                <p className={`mt-1 text-lg font-bold ${data.personal.pocketMonth >= 0 ? "text-success" : "text-danger"}`}>
                  {formatMkd(data.personal.pocketMonth)}
                </p>
              </div>
            </div>
          </Card>

          <Card className={`mb-4 ${canLive ? "border-success bg-green-50" : "border-danger bg-red-50"}`}>
            <p className="text-sm font-semibold">
              {canLive ? t("personal.livingOk") : t("personal.livingOver")}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t("personal.withdrawn")}: {formatMkd(data.personal.withdrawalsMonth)} ·{" "}
              {t("personal.spent")}: {formatMkd(data.personal.spentMonth)}
            </p>
          </Card>

          {data.categoryBreakdown.length > 0 && (
            <Card className="mb-4">
              <h3 className="mb-3 font-semibold">{t("personal.byCategory")}</h3>
              {data.categoryBreakdown.map((c) => (
                <div key={c.category} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
                  <span>{c.label}</span>
                  <span className="font-semibold text-danger">−{formatMkd(c.amount)}</span>
                </div>
              ))}
            </Card>
          )}

          <Card className="mb-4">
            <h3 className="mb-3 font-semibold">{t("personal.ledger")}</h3>
            {data.ledger.length === 0 ? (
              <p className="text-sm text-muted">{t("personal.ledgerEmpty")}</p>
            ) : (
              <ul className="divide-y divide-border">
                {data.ledger.map((line) => (
                  <li key={`${line.kind}-${line.id}`} className="flex items-center gap-2 py-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        line.direction === "in" ? "bg-green-100 text-success" : "bg-red-100 text-danger"
                      }`}
                    >
                      {line.direction === "in" ? "+" : "−"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{line.label}</p>
                      <p className="text-xs text-muted">
                        {new Date(line.date + "T12:00:00").toLocaleDateString("mk-MK")}
                        {line.sub ? ` · ${line.sub}` : ""}
                      </p>
                    </div>
                    <p className={`font-bold ${line.direction === "in" ? "text-success" : "text-danger"}`}>
                      {line.direction === "in" ? "+" : "−"}
                      {formatMkd(line.amountMkd)}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteItem(line.id, line.kind)}
                      className="text-xs text-danger"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : (
        <>
          <Card className="mb-4 space-y-3">
            <h3 className="font-semibold">{t("personal.addWithdrawal")}</h3>
            <p className="text-xs text-muted">{t("personal.withdrawalHint")}</p>
            <Input label={t("finances.date")} type="date" value={wdDate} onChange={(e) => setWdDate(e.target.value)} />
            <Input label={t("finances.amount")} type="number" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} />
            <Input label={t("finances.note")} value={wdNote} onChange={(e) => setWdNote(e.target.value)} />
            <Button fullWidth onClick={addWithdrawal}>
              {t("personal.saveWithdrawal")}
            </Button>
          </Card>

          <Card className="mb-4 space-y-3">
            <h3 className="font-semibold">{t("personal.addExpense")}</h3>
            <p className="text-xs text-muted">{t("personal.expenseHint")}</p>
            <Input label={t("finances.date")} type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            <select
              className="w-full min-h-12 rounded-xl border border-border px-3"
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as typeof expCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`personal.categories.${c}`)}
                </option>
              ))}
            </select>
            <Input label={t("finances.amount")} type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} />
            <Input label={t("finances.note")} value={expNote} onChange={(e) => setExpNote(e.target.value)} />
            <Button variant="secondary" fullWidth onClick={addExpense}>
              {t("personal.saveExpense")}
            </Button>
          </Card>
        </>
      )}
    </AppShell>
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
