"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMkd } from "@/lib/format";
import { t } from "@/lib/i18n";

interface CustomerRow {
  id: string;
  companyName: string;
  phone: string | null;
  owed: number;
  unpaidCount: number;
  washCount: number;
}

export default function TrucksPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [onlyOwing, setOnlyOwing] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/trucks")
      .then((r) => r.json())
      .then((data) => {
        setCustomers(data.customers ?? []);
        setTotalOwed(data.totalOwed ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCustomer() {
    if (!companyName.trim()) return;
    const res = await fetch("/api/trucks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName, phone: phone || undefined }),
    });
    if (!res.ok) {
      alert(t("common.error"));
      return;
    }
    const data = await res.json();
    setCompanyName("");
    setPhone("");
    window.location.href = `/trucks/${data.customer.id}`;
  }

  const visible = onlyOwing ? customers.filter((c) => c.owed > 0) : customers;

  return (
    <AppShell>
      <h2 className="mb-1 text-xl font-bold">{t("trucks.title")}</h2>
      <p className="mb-4 text-xs text-muted">{t("trucks.subtitle")}</p>

      <Card className="mb-4 overflow-hidden border-0 p-0">
        <div className="bg-slate-900 px-4 py-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{t("trucks.totalOwed")}</p>
          <p className="mt-2 text-4xl font-black">{formatMkd(totalOwed)}</p>
        </div>
      </Card>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setOnlyOwing(true)}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${onlyOwing ? "bg-white text-primary shadow-sm" : "text-muted"}`}
        >
          {t("trucks.unpaid")}
        </button>
        <button
          type="button"
          onClick={() => setOnlyOwing(false)}
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold ${!onlyOwing ? "bg-white text-primary shadow-sm" : "text-muted"}`}
        >
          {t("trucks.all")}
        </button>
      </div>

      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : visible.length === 0 ? (
        <Card className="mb-4 text-center text-sm text-muted">{t("trucks.empty")}</Card>
      ) : (
        <ul className="mb-4 space-y-2">
          {visible.map((customer) => (
            <li key={customer.id}>
              <Link href={`/trucks/${customer.id}`}>
                <Card className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{customer.companyName}</p>
                    <p className="text-xs text-muted">
                      {customer.phone || "—"}
                      {customer.unpaidCount > 0 ? ` · ${customer.unpaidCount} ${t("trucks.openWashes")}` : ""}
                    </p>
                  </div>
                  <p className={`shrink-0 font-bold ${customer.owed > 0 ? "text-danger" : "text-success"}`}>
                    {customer.owed > 0 ? formatMkd(customer.owed) : t("trucks.settled")}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Card className="space-y-3">
        <h3 className="font-semibold">{t("trucks.addCustomer")}</h3>
        <Input label={t("trucks.company")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <Input label={t("trucks.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button fullWidth onClick={addCustomer}>
          {t("trucks.saveCustomer")}
        </Button>
      </Card>
    </AppShell>
  );
}
