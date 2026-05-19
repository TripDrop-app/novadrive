"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Metric, ProgressBar } from "@/components/ui/metric";
import { formatMkd, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";

interface DashboardData {
  today: string;
  todayEntry: {
    p1Count: number;
    p2Count: number;
    p3Count: number;
    grossRevenueMkd: string;
    netProfitMkd: string;
    profitPerWashMkd: string | null;
    waterCostMkd: string;
    electricityCostMkd: string;
    chemical1CostMkd: string;
    chemical2CostMkd: string;
    createdAt: string;
  } | null;
  tokenStats: { outstanding: number };
  chemical: {
    c1Remaining: number | null;
    c2Remaining: number | null;
    c1Yield: number;
    c2Yield: number;
    c1Used: number;
    c2Used: number;
    c1Low: boolean;
    c2Low: boolean;
  };
  lastEntry: { sessionDate: string; createdAt: string } | null;
  setupCompleted: boolean;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <p className="text-center text-muted">{t("common.loading")}</p>
      </AppShell>
    );
  }

  if (!data?.setupCompleted) {
    return (
      <AppShell>
        <Card className="text-center">
          <h2 className="mb-2 text-lg font-bold">{t("settings.setupTitle")}</h2>
          <p className="mb-4 text-sm text-muted">{t("settings.setupMeter")}</p>
          <Link href="/settings">
            <Button fullWidth>{t("settings.title")}</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  const entry = data.todayEntry;
  const paid = entry ? entry.p1Count + entry.p2Count + entry.p3Count : 0;
  const totalCosts = entry
    ? Number(entry.waterCostMkd) +
      Number(entry.electricityCostMkd) +
      Number(entry.chemical1CostMkd) +
      Number(entry.chemical2CostMkd)
    : 0;

  return (
    <AppShell>
      <p className="mb-4 text-sm text-muted">
        {t("dashboard.today")} — {new Date(data.today).toLocaleDateString("mk-MK", { weekday: "long", day: "numeric", month: "long" })}
      </p>

      {!entry ? (
        <Card className="mb-4 text-center">
          <p className="mb-4 text-muted">{t("dashboard.noEntryToday")}</p>
          <Link href="/daily">
            <Button fullWidth>{t("dashboard.startEntry")}</Button>
          </Link>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <div className="grid grid-cols-3 gap-2 border-b border-border pb-4">
              <Metric label="P1" value={String(entry.p1Count)} />
              <Metric label="P2" value={String(entry.p2Count)} />
              <Metric label="P3" value={String(entry.p3Count)} />
            </div>
            <p className="mt-3 text-center text-sm text-muted">
              {t("dashboard.paidWashes")}: {paid}
            </p>
          </Card>

          <Card className="mb-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted">{t("dashboard.grossRevenue")}</span>
              <span className="font-semibold">{formatMkd(Number(entry.grossRevenueMkd))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">{t("dashboard.estimatedCosts")}</span>
              <span className="font-semibold">{formatMkd(totalCosts)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <Metric
                label={t("dashboard.netProfit")}
                value={formatMkd(Number(entry.netProfitMkd))}
                large
              />
            </div>
            {entry.profitPerWashMkd && (
              <p className="text-center text-sm text-muted">
                {t("dashboard.profitPerWash")}: {formatMkd(Number(entry.profitPerWashMkd))}
              </p>
            )}
          </Card>
        </>
      )}

      <Card className="mb-4 space-y-4">
        {data.chemical.c1Yield > 0 && data.chemical.c1Remaining != null && (
          <ProgressBar
            label={t("dashboard.chemical1Remaining")}
            current={data.chemical.c1Used}
            max={data.chemical.c1Yield}
            warning={data.chemical.c1Low}
          />
        )}
        {data.chemical.c2Yield > 0 && data.chemical.c2Remaining != null && (
          <ProgressBar
            label={t("dashboard.chemical2Remaining")}
            current={data.chemical.c2Used}
            max={data.chemical.c2Yield}
            warning={data.chemical.c2Low}
          />
        )}
        {(data.chemical.c1Low || data.chemical.c2Low) && (
          <p className="text-sm font-semibold text-warning">{t("dashboard.lowChemicalWarning")}</p>
        )}
      </Card>

      <Card className="mb-4">
        <div className="flex justify-between">
          <span className="text-muted">{t("dashboard.outstandingTokens")}</span>
          <span className="text-lg font-bold text-primary">
            {formatNumber(data.tokenStats.outstanding)}
          </span>
        </div>
      </Card>

      {data.lastEntry && (
        <p className="mb-4 text-center text-xs text-muted">
          {t("dashboard.lastEntry")}:{" "}
          {new Date(data.lastEntry.createdAt).toLocaleString("mk-MK")}
        </p>
      )}

      <Link href="/daily">
        <Button fullWidth>{t("dashboard.startEntry")}</Button>
      </Link>
    </AppShell>
  );
}
