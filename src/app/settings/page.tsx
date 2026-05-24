"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

interface SettingsForm {
  electricityRateMkd: number;
  waterRateMkdPerM3: number;
  chemical1CostMkd: number;
  chemical2CostMkd: number;
  chemical1YieldWashes: number | null;
  chemical2YieldWashes: number | null;
  meterBaselineKwh: number | null;
  waterPerP1Liters: number;
  waterPerP2P3Liters: number;
  electricityExtraP3Kwh: number;
  baseKwhPerWash: number | null;
  tokenValueMkd: number;
  priceP1Mkd: number;
  priceP2Mkd: number;
  priceP3Mkd: number;
  setupCompleted: boolean;
}

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [suggestedBase, setSuggestedBase] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetch("/api/settings");
      const d = await r.json();
      if (!r.ok) {
        setLoadError(d.hint ?? "Не може да се поврзе со базата. Проверете DATABASE_URL на Vercel.");
        setForm(null);
        return;
      }
      const s = d.settings;
      if (!s) {
        setLoadError("Поставките не се вратени од серверот.");
        return;
      }
      setSuggestedBase(d.suggestedBaseKwh);
      setForm({
        electricityRateMkd: Number(s.electricityRateMkd),
        waterRateMkdPerM3: Number(s.waterRateMkdPerM3),
        chemical1CostMkd: Number(s.chemical1CostMkd),
        chemical2CostMkd: Number(s.chemical2CostMkd),
        chemical1YieldWashes: s.chemical1YieldWashes,
        chemical2YieldWashes: s.chemical2YieldWashes,
        meterBaselineKwh: s.meterBaselineKwh ? Number(s.meterBaselineKwh) : null,
        waterPerP1Liters: s.waterPerP1Liters,
        waterPerP2P3Liters: s.waterPerP2P3Liters,
        electricityExtraP3Kwh: Number(s.electricityExtraP3Kwh),
        baseKwhPerWash: s.baseKwhPerWash ? Number(s.baseKwhPerWash) : null,
        tokenValueMkd: s.tokenValueMkd,
        priceP1Mkd: s.priceP1Mkd,
        priceP2Mkd: s.priceP2Mkd,
        priceP3Mkd: s.priceP3Mkd,
        setupCompleted: s.setupCompleted,
      });
    } catch {
      setLoadError("Мрежна грешка. Проверете интернет и обидете се повторно.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!form) return;
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, setupCompleted: true }),
    });
    setSaving(false);
    load();
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-center text-muted">{t("common.loading")}</p>
      </AppShell>
    );
  }

  if (loadError || !form) {
    return (
      <AppShell>
        <Card className="border-danger bg-red-50 text-center">
          <h2 className="mb-2 text-lg font-bold text-danger">Проблем со базата</h2>
          <p className="mb-4 text-sm">{loadError}</p>
          <p className="mb-4 text-xs text-muted">
            На вашиот компјутер отворете PowerShell во f:\NovaDrive и пуштете: npm run db:push
            <br />
            Потоа на Vercel: Deployments → Redeploy.
          </p>
          <Button onClick={() => load()}>Обиди повторно</Button>
        </Card>
      </AppShell>
    );
  }

  const set = (key: keyof SettingsForm, value: number | null) =>
    setForm({ ...form, [key]: value });

  return (
    <AppShell>
      <h2 className="mb-4 text-xl font-bold">{t("settings.title")}</h2>

      {!form.setupCompleted && (
        <Card className="mb-4 border-primary bg-blue-50">
          <h3 className="mb-2 font-bold">{t("settings.setupTitle")}</h3>
          <p className="mb-3 text-sm">{t("settings.setupMeter")}</p>
          <Input
            label="Базно читање струјомер (kWh)"
            type="number"
            inputMode="decimal"
            value={form.meterBaselineKwh ?? ""}
            onChange={(e) =>
              set("meterBaselineKwh", e.target.value ? parseFloat(e.target.value) : null)
            }
          />
        </Card>
      )}

      <Card className="mb-4 space-y-3">
        <h3 className="font-semibold">{t("settings.rates")}</h3>
        <NumField label="Струја (MKD/kWh)" value={form.electricityRateMkd} onChange={(v) => set("electricityRateMkd", v)} />
        <NumField label="Вода (MKD/m³)" value={form.waterRateMkdPerM3} onChange={(v) => set("waterRateMkdPerM3", v)} />
        <NumField label="Цена P1" value={form.priceP1Mkd} onChange={(v) => set("priceP1Mkd", v)} />
        <NumField label="Цена P2" value={form.priceP2Mkd} onChange={(v) => set("priceP2Mkd", v)} />
        <NumField label="Цена P3 / жетон" value={form.priceP3Mkd} onChange={(v) => set("priceP3Mkd", v)} />
        <NumField label="Вредност жетон" value={form.tokenValueMkd} onChange={(v) => set("tokenValueMkd", v)} />
      </Card>

      <Card className="mb-4 space-y-3">
        <h3 className="font-semibold">{t("settings.chemicals")}</h3>
        <NumField label="Хемикалија 1 (MKD/канистер)" value={form.chemical1CostMkd} onChange={(v) => set("chemical1CostMkd", v)} />
        <NumField label="Хемикалија 2 (MKD/канистер)" value={form.chemical2CostMkd} onChange={(v) => set("chemical2CostMkd", v)} />
        <p className="text-xs text-muted">{t("settings.chemicalYieldHint")}</p>
        <NumField label="Миења/канистер Хем.1" value={form.chemical1YieldWashes ?? 70} onChange={(v) => set("chemical1YieldWashes", v || null)} />
        <NumField label="Миења/канистер Хем.2" value={form.chemical2YieldWashes ?? 70} onChange={(v) => set("chemical2YieldWashes", v || null)} />
      </Card>

      <Card className="mb-4 space-y-3">
        <h3 className="font-semibold">{t("settings.meter")}</h3>
        <NumField label="Базно читање (kWh)" value={form.meterBaselineKwh ?? 0} onChange={(v) => set("meterBaselineKwh", v)} />
        <NumField label="Вода P1 (L)" value={form.waterPerP1Liters} onChange={(v) => set("waterPerP1Liters", v)} />
        <NumField label="Вода P2/P3 (L)" value={form.waterPerP2P3Liters} onChange={(v) => set("waterPerP2P3Liters", v)} />
        <NumField label="Дополнителна струја P3 (kWh)" value={form.electricityExtraP3Kwh} onChange={(v) => set("electricityExtraP3Kwh", v)} />
        <NumField label="Базна струја/миење (kWh)" value={form.baseKwhPerWash ?? 0} onChange={(v) => set("baseKwhPerWash", v || null)} />
        {suggestedBase != null && (
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => set("baseKwhPerWash", suggestedBase)}
          >
            Примени предлог: {suggestedBase.toFixed(4)} kWh (од 30+ дена податоци)
          </button>
        )}
      </Card>

      <Button fullWidth onClick={save} disabled={saving} className="mb-6">
        {saving ? t("common.loading") : t("settings.save")}
      </Button>

      <Card className="mb-4 border-danger bg-red-50 space-y-3">
        <h3 className="font-semibold text-danger">{t("settings.deleteAllHistory")}</h3>
        <p className="text-xs text-muted">{t("history.deleteAllConfirm")}</p>
        <Button
          variant="danger"
          fullWidth
          onClick={async () => {
            const confirm = prompt('Напишете ИЗБРИШИ за да потврдите:');
            if (confirm !== "ИЗБРИШИ") return;
            await fetch("/api/daily-entries", { method: "DELETE" });
            alert("Историјата е избришана.");
          }}
        >
          {t("history.deleteAll")}
        </Button>
      </Card>
    </AppShell>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Input
      label={label}
      type="number"
      inputMode="decimal"
      value={value || ""}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}
