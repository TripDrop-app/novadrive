"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, NumberStepper } from "@/components/ui/input";
import { formatMkd, todayDateStr } from "@/lib/format";
import { t } from "@/lib/i18n";
import { grossRevenue, parseSettings } from "@/lib/calculations";
import type { CalcSettings } from "@/lib/calculations/types";

type FreeWash = {
  program: 1 | 2 | 3;
  quantity: number;
  reason: "testing" | "complaint" | "family" | "other";
};

const STEPS = 7;

export default function DailyEntryPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [calcSettings, setCalcSettings] = useState<CalcSettings | null>(null);
  const [meterBaseline, setMeterBaseline] = useState<number | null>(null);
  const [lastMeterReading, setLastMeterReading] = useState<number | null>(null);

  const [meter, setMeter] = useState("");
  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);
  const [p3, setP3] = useState(0);
  const [resetConfirmed, setResetConfirmed] = useState(false);
  const [cash, setCash] = useState("");
  const [tokens, setTokens] = useState(0);
  const [freeWashes, setFreeWashes] = useState<FreeWash[]>([]);
  const [fwProgram, setFwProgram] = useState<1 | 2 | 3>(1);
  const [fwQty, setFwQty] = useState(1);
  const [fwReason, setFwReason] = useState<FreeWash["reason"]>("testing");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setCalcSettings(parseSettings(d.settings));
          setMeterBaseline(
            d.settings.meterBaselineKwh != null
              ? Number(d.settings.meterBaselineKwh)
              : null
          );
        }
      });
    fetch("/api/daily-entries")
      .then((r) => r.json())
      .then((d) => {
        const entries = d.entries ?? [];
        const today = todayDateStr();
        const prev = entries.find(
          (e: { sessionDate: string; meterReadingKwh: string | null }) =>
            e.sessionDate < today && e.meterReadingKwh != null
        );
        if (prev?.meterReadingKwh != null) {
          setLastMeterReading(Number(prev.meterReadingKwh));
        }
      });
  }, []);

  const total = p1 + p2 + p3;
  const meterNum = parseFloat(meter);

  const referenceMeter = lastMeterReading ?? meterBaseline;

  const deltaKwh = useMemo(() => {
    if (!meter || Number.isNaN(meterNum) || referenceMeter == null) return null;
    return meterNum - referenceMeter;
  }, [meter, meterNum, referenceMeter]);

  const expectedRevenue = calcSettings
    ? grossRevenue({ p1, p2, p3 }, calcSettings)
    : p1 * 100 + p2 * 150 + p3 * 200;

  const electricityCostPreview =
    deltaKwh != null && calcSettings
      ? deltaKwh * calcSettings.electricityRateMkd
      : null;

  function canGoNext(): boolean {
    if (step === 1) {
      return Boolean(meter) && !Number.isNaN(meterNum) && meterNum > 0;
    }
    if (step === 3) return resetConfirmed;
    return true;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (!meter || Number.isNaN(meterNum)) {
        setError(t("daily.meterRequired"));
        return;
      }

      const res = await fetch("/api/daily-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate: todayDateStr(),
          p1Count: p1,
          p2Count: p2,
          p3Count: p3,
          counterResetConfirmed: resetConfirmed,
          meterReadingKwh: meterNum,
          cashCollectedMkd: parseFloat(cash) || 0,
          tokensCollected: tokens,
          freeWashes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.hint ?? data.details?.join?.(", ") ?? t("common.error"));
        if (data.error === "METER_READING_TOO_LOW") {
          setError(t("daily.meterError"));
        }
        if (data.error === "ENTRY_EXISTS_FOR_DATE") {
          setError("Внес за денес веќе постои. Избришете го од Историја или уредете.");
        }
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError(t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  function addFreeWash() {
    setFreeWashes([...freeWashes, { program: fwProgram, quantity: fwQty, reason: fwReason }]);
    setFwQty(1);
  }

  return (
    <AppShell>
      <div className="mb-4 flex gap-1">
        {Array.from({ length: STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-slate-200"}`}
          />
        ))}
      </div>

      <Card className="mb-4 min-h-[280px]">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">{t("daily.step1")}</h2>
            <Input
              label={t("daily.meterReading")}
              type="number"
              inputMode="decimal"
              step="0.1"
              value={meter}
              onChange={(e) => setMeter(e.target.value)}
              placeholder="6220"
            />
            {meterBaseline != null && (
              <p className="text-sm text-muted">
                {t("daily.meterBaselineHint")}: {meterBaseline} kWh
              </p>
            )}
            {lastMeterReading != null && (
              <p className="text-sm text-muted">
                {t("daily.meterPreviousHint")}: {lastMeterReading} kWh
              </p>
            )}
            {deltaKwh != null && (
              <p className="rounded-lg bg-blue-50 p-3 text-sm font-semibold text-primary">
                {t("daily.meterDelta")}: {deltaKwh.toFixed(1)} kWh
                {electricityCostPreview != null &&
                  ` ≈ ${formatMkd(electricityCostPreview)}`}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">{t("daily.step2")}</h2>
            <NumberStepper label={t("daily.p1")} value={p1} onChange={setP1} />
            <NumberStepper label={t("daily.p2")} value={p2} onChange={setP2} />
            <NumberStepper label={t("daily.p3")} value={p3} onChange={setP3} />
            <p className="text-center text-lg font-bold text-primary">
              {t("daily.total")}: {total}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">{t("daily.step3")}</h2>
            <label className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={resetConfirmed}
                onChange={(e) => setResetConfirmed(e.target.checked)}
                className="h-6 w-6 rounded border-border accent-primary"
              />
              <span className="text-base">{t("daily.confirmReset")}</span>
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">{t("daily.step4")}</h2>
            <Input
              label={t("daily.cashCollected")}
              type="number"
              inputMode="numeric"
              value={cash}
              onChange={(e) => setCash(e.target.value)}
            />
            <p className="text-sm text-muted">
              Очекуван приход: {formatMkd(expectedRevenue)}
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">{t("daily.step5")}</h2>
            <NumberStepper
              label={t("daily.tokensCollected")}
              value={tokens}
              onChange={setTokens}
            />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold">{t("daily.step6")}</h2>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="min-h-12 rounded-xl border border-border px-3"
                value={fwProgram}
                onChange={(e) => setFwProgram(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
              </select>
              <input
                type="number"
                min={1}
                className="min-h-12 rounded-xl border border-border px-3"
                value={fwQty}
                onChange={(e) => setFwQty(parseInt(e.target.value) || 1)}
              />
              <select
                className="col-span-2 min-h-12 rounded-xl border border-border px-3"
                value={fwReason}
                onChange={(e) => setFwReason(e.target.value as FreeWash["reason"])}
              >
                <option value="testing">{t("daily.reasons.testing")}</option>
                <option value="complaint">{t("daily.reasons.complaint")}</option>
                <option value="family">{t("daily.reasons.family")}</option>
                <option value="other">{t("daily.reasons.other")}</option>
              </select>
            </div>
            <Button variant="secondary" fullWidth onClick={addFreeWash}>
              {t("daily.addFreeWash")}
            </Button>
            {freeWashes.length > 0 && (
              <ul className="space-y-1 text-sm">
                {freeWashes.map((fw, i) => (
                  <li key={i} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span>
                      P{fw.program} × {fw.quantity}
                    </span>
                    <button
                      type="button"
                      className="text-danger"
                      onClick={() => setFreeWashes(freeWashes.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">{t("daily.step7")}</h2>
            <SummaryRow label="kWh" value={meter} />
            {deltaKwh != null && (
              <SummaryRow
                label={t("daily.meterDelta")}
                value={`${deltaKwh.toFixed(1)} kWh${electricityCostPreview != null ? ` (${formatMkd(electricityCostPreview)})` : ""}`}
              />
            )}
            <SummaryRow label="P1 / P2 / P3" value={`${p1} / ${p2} / ${p3}`} />
            <SummaryRow label={t("daily.total")} value={String(total)} />
            <SummaryRow label={t("daily.cashCollected")} value={formatMkd(parseFloat(cash) || 0)} />
            <SummaryRow label={t("daily.tokensCollected")} value={String(tokens)} />
            {freeWashes.length > 0 && (
              <SummaryRow label={t("history.freeWashes")} value={String(freeWashes.length)} />
            )}
            {Math.abs((parseFloat(cash) || 0) - expectedRevenue) / Math.max(expectedRevenue, 1) > 0.2 && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-warning">
                {t("daily.cashWarning")}
              </p>
            )}
          </div>
        )}
      </Card>

      {error && <p className="mb-3 text-center text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        {step > 1 && (
          <Button variant="secondary" className="flex-1" onClick={() => setStep(step - 1)}>
            {t("daily.back")}
          </Button>
        )}
        {step < STEPS ? (
          <Button
            className="flex-1"
            onClick={() => setStep(step + 1)}
            disabled={!canGoNext()}
          >
            {t("daily.next")}
          </Button>
        ) : (
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? t("common.loading") : t("daily.save")}
          </Button>
        )}
      </div>
    </AppShell>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
