"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMkd } from "@/lib/format";
import { t } from "@/lib/i18n";

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [detail, setDetail] = useState<{
    entry: Record<string, unknown>;
    freeWashes: { program: number; quantity: number; reason: string }[];
    amendments: { fieldName: string; oldValue: string; newValue: string; amendedAt: string }[];
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [cash, setCash] = useState("");

  useEffect(() => {
    fetch(`/api/daily-entries/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setDetail(d);
        setCash(String(d.entry?.cashCollectedMkd ?? ""));
      });
  }, [id]);

  async function saveEdit() {
    if (!detail) return;
    await fetch(`/api/daily-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: { cashCollectedMkd: cash } }),
    });
    setEditing(false);
    const res = await fetch(`/api/daily-entries/${id}`);
    setDetail(await res.json());
  }

  if (!detail?.entry) {
    return (
      <AppShell>
        <p>{t("common.loading")}</p>
      </AppShell>
    );
  }

  const e = detail.entry;

  return (
    <AppShell>
      <Link href="/history" className="mb-4 inline-block text-sm text-primary">
        ← {t("daily.back")}
      </Link>
      <h2 className="mb-4 text-xl font-bold">
        {String(e.sessionDate)}
      </h2>

      <Card className="mb-4 space-y-2 text-sm">
        <Row label="P1 / P2 / P3" value={`${e.p1Count} / ${e.p2Count} / ${e.p3Count}`} />
        <Row label={t("dashboard.grossRevenue")} value={formatMkd(Number(e.grossRevenueMkd))} />
        <Row label="Вода" value={formatMkd(Number(e.waterCostMkd))} />
        <Row label="Струја" value={formatMkd(Number(e.electricityCostMkd))} />
        <Row label="Хем. 1" value={formatMkd(Number(e.chemical1CostMkd))} />
        <Row label="Хем. 2" value={formatMkd(Number(e.chemical2CostMkd))} />
        <Row label={t("dashboard.netProfit")} value={formatMkd(Number(e.netProfitMkd))} large />
        {e.meterReadingKwh != null && (
          <Row label="Струјомер" value={`${e.meterReadingKwh} kWh`} />
        )}
        {e.deltaKwh != null && (
          <Row label="Потрошена струја (Δ)" value={`${e.deltaKwh} kWh`} />
        )}
        {e.expectedKwh != null && (
          <Row label="Очекувано kWh" value={String(e.expectedKwh)} />
        )}
        {editing ? (
          <div className="pt-2">
            <Input label={t("daily.cashCollected")} value={cash} onChange={(ev) => setCash(ev.target.value)} />
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
              <Button onClick={saveEdit}>{t("common.save")}</Button>
            </div>
          </div>
        ) : (
          <>
            <Row label={t("daily.cashCollected")} value={formatMkd(Number(e.cashCollectedMkd))} />
            <Button variant="ghost" className="mt-2" onClick={() => setEditing(true)}>
              {t("common.edit")}
            </Button>
          </>
        )}
      </Card>

      {detail.freeWashes.length > 0 && (
        <Card className="mb-4">
          <h3 className="mb-2 font-semibold">{t("history.freeWashes")}</h3>
          {detail.freeWashes.map((fw, i) => (
            <p key={i} className="text-sm">
              P{fw.program} × {fw.quantity} — {fw.reason}
            </p>
          ))}
        </Card>
      )}

      {detail.amendments.length > 0 && (
        <Card className="mb-4">
          <h3 className="mb-2 font-semibold">{t("history.amendments")}</h3>
          {detail.amendments.map((a) => (
            <p key={a.amendedAt} className="text-xs text-muted">
              {a.fieldName}: {a.oldValue} → {a.newValue}
            </p>
          ))}
        </Card>
      )}

      <Button
        variant="danger"
        fullWidth
        onClick={async () => {
          if (!confirm(t("history.deleteConfirm"))) return;
          await fetch(`/api/daily-entries/${id}`, { method: "DELETE" });
          router.push("/history");
        }}
      >
        {t("history.deleteEntry")}
      </Button>
    </AppShell>
  );
}

function Row({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={large ? "text-lg font-bold text-primary" : "font-medium"}>{value}</span>
    </div>
  );
}
