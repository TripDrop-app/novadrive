"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMkd, todayDateStr } from "@/lib/format";
import { t } from "@/lib/i18n";

interface Wash {
  id: string;
  plate: string;
  washDate: string;
  amountMkd: number;
  note: string | null;
  paid: boolean;
}

interface Customer {
  id: string;
  companyName: string;
  phone: string | null;
  owed: number;
  washes: Wash[];
}

export default function TruckCustomerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [plate, setPlate] = useState("");
  const [washDate, setWashDate] = useState(todayDateStr());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidNow, setPaidNow] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/trucks/${params.id}`)
      .then(async (r) => {
        if (r.status === 404) {
          router.replace("/trucks");
          return;
        }
        setCustomer(await r.json());
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function addWash() {
    const amountMkd = parseFloat(amount);
    if (!plate.trim() || !amountMkd) return;
    const res = await fetch(`/api/trucks/${params.id}/washes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plate,
        washDate,
        amountMkd,
        note: note || undefined,
        paid: paidNow,
      }),
    });
    if (!res.ok) {
      alert(t("common.error"));
      return;
    }
    setPlate("");
    setAmount("");
    setNote("");
    setPaidNow(false);
    load();
  }

  async function setPaid(washId: string, paid: boolean) {
    await fetch(`/api/trucks/washes/${washId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid }),
    });
    load();
  }

  async function removeWash(washId: string) {
    if (!confirm(t("trucks.deleteWashConfirm"))) return;
    await fetch(`/api/trucks/washes/${washId}`, { method: "DELETE" });
    load();
  }

  async function markAllPaid() {
    if (!confirm(t("trucks.markAllConfirm"))) return;
    await fetch(`/api/trucks/${params.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-all-paid" }),
    });
    load();
  }

  async function removeCustomer() {
    if (!confirm(t("trucks.deleteCustomerConfirm"))) return;
    await fetch(`/api/trucks/${params.id}`, { method: "DELETE" });
    router.replace("/trucks");
  }

  if (loading || !customer) {
    return (
      <AppShell>
        <p className="text-muted">{t("common.loading")}</p>
      </AppShell>
    );
  }

  const unpaid = customer.washes.filter((w) => !w.paid);
  const paid = customer.washes.filter((w) => w.paid);

  return (
    <AppShell>
      <Link href="/trucks" className="mb-3 inline-block text-sm text-primary">
        ← {t("trucks.back")}
      </Link>
      <h2 className="text-xl font-bold">{customer.companyName}</h2>
      <p className="mb-4 text-sm text-muted">{customer.phone || t("trucks.noPhone")}</p>

      <Card className="mb-4 text-center">
        <p className="text-xs font-semibold uppercase text-muted">{t("trucks.owes")}</p>
        <p className={`mt-1 text-3xl font-black ${customer.owed > 0 ? "text-danger" : "text-success"}`}>
          {formatMkd(customer.owed)}
        </p>
        {customer.owed > 0 && (
          <Button className="mt-4" variant="secondary" fullWidth onClick={markAllPaid}>
            {t("trucks.markAllPaid")}
          </Button>
        )}
      </Card>

      <Card className="mb-4 space-y-3">
        <h3 className="font-semibold">{t("trucks.addWash")}</h3>
        <Input label={t("trucks.plate")} value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="SK 1234 AB" />
        <Input label={t("trucks.date")} type="date" value={washDate} onChange={(e) => setWashDate(e.target.value)} />
        <Input label={t("trucks.amount")} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label={t("trucks.note")} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("trucks.notePlaceholder")} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} />
          {t("trucks.paidNow")}
        </label>
        <Button fullWidth onClick={addWash}>
          {t("trucks.saveWash")}
        </Button>
      </Card>

      <WashList title={t("trucks.unpaid")} washes={unpaid} onPaid={setPaid} onDelete={removeWash} />
      <WashList title={t("trucks.paid")} washes={paid} onPaid={setPaid} onDelete={removeWash} />

      <Button variant="danger" fullWidth onClick={removeCustomer}>
        {t("trucks.deleteCustomer")}
      </Button>
    </AppShell>
  );
}

function WashList({
  title,
  washes,
  onPaid,
  onDelete,
}: {
  title: string;
  washes: Wash[];
  onPaid: (id: string, paid: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (washes.length === 0) return null;
  return (
    <Card className="mb-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      <ul className="divide-y divide-border">
        {washes.map((wash) => (
          <li key={wash.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{wash.plate}</p>
                <p className="text-xs text-muted">
                  {new Date(wash.washDate + "T12:00:00").toLocaleDateString("mk-MK")}
                  {wash.note ? ` · ${wash.note}` : ""}
                </p>
              </div>
              <p className="font-bold">{formatMkd(wash.amountMkd)}</p>
            </div>
            <div className="mt-2 flex gap-3 text-sm">
              <button type="button" className="font-medium text-primary" onClick={() => onPaid(wash.id, !wash.paid)}>
                {wash.paid ? t("trucks.markUnpaid") : t("trucks.markPaid")}
              </button>
              <button type="button" className="text-danger" onClick={() => onDelete(wash.id)}>
                {t("common.delete")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
