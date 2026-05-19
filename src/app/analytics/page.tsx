"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Metric, PctBadge } from "@/components/ui/metric";
import {
  RevenueBarChart,
  TrendLineChart,
  WashDonutChart,
  CostStackChart,
} from "@/components/charts/analytics-charts";
import { formatMkd, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { shiftPeriod, type PeriodType } from "@/lib/analytics";

interface AnalyticsData {
  period: PeriodType;
  label: string;
  anchor: string;
  current: {
    grossRevenue: number;
    netProfit: number;
    paid: number;
    p1: number;
    p2: number;
    p3: number;
    tokens: number;
    cashWashes: number;
    waterCost: number;
    electricityCost: number;
    chemical1Cost: number;
    chemical2Cost: number;
    miscCost: number;
    totalCost: number;
    profitMargin: number;
    revenuePerWash: number;
    costPerWash: number;
    profitPerWash: number;
    deltaKwh: number;
    expectedKwh: number;
    avgDailyRevenue: number;
    avgDailyWashes: number;
    entryCount: number;
  };
  comparison: {
    revenue: number | null;
    profit: number | null;
    washes: number | null;
    costs: number | null;
  };
  revenueByProgram: { p1: number; p2: number; p3: number };
  trend: { date: string; revenue: number; profit: number; washes: number }[];
  records: {
    bestRevenueDay: { date: string; value: number };
    mostWashesDay: { date: string; value: number };
    bestProfitDay: { date: string; value: number };
  } | null;
  bestDayOfWeek: { dayName: string; avgRevenue: number };
  freeWashCount: number;
  sideBySide: {
    current: { grossRevenue: number; netProfit: number; paid: number };
    previousPeriod: { grossRevenue: number; netProfit: number; paid: number };
    previousWeek: { grossRevenue: number; netProfit: number; paid: number };
  };
}

const PERIODS: PeriodType[] = ["day", "week", "month", "year"];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodType>("month");
  const [anchor, setAnchor] = useState(new Date());
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/analytics?period=${period}&anchor=${anchor.toISOString()}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [period, anchor]);

  useEffect(() => {
    load();
  }, [load]);

  function shift(delta: number) {
    setAnchor(shiftPeriod(period, anchor, delta));
  }

  return (
    <AppShell>
      <h2 className="mb-4 text-xl font-bold">{t("analytics.title")}</h2>

      <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold ${
              period === p ? "bg-white text-primary shadow-sm" : "text-muted"
            }`}
          >
            {t(`analytics.period.${p}`)}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between">
        <button type="button" className="min-h-11 min-w-11 text-2xl text-primary" onClick={() => shift(-1)}>
          ←
        </button>
        <span className="text-sm font-semibold">{data?.label ?? "..."}</span>
        <button type="button" className="min-h-11 min-w-11 text-2xl text-primary" onClick={() => shift(1)}>
          →
        </button>
      </div>

      {loading || !data ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{t("analytics.revenue")}</span>
              <PctBadge value={data.comparison.revenue} />
            </div>
            <p className="text-2xl font-bold text-primary">{formatMkd(data.current.grossRevenue)}</p>
            <p className="text-xs text-muted">{t("analytics.vsPrevious")}</p>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{t("analytics.profit")}</span>
              <PctBadge value={data.comparison.profit} />
            </div>
            <p className="text-2xl font-bold text-success">{formatMkd(data.current.netProfit)}</p>
            <p className="text-sm text-muted">
              Маржа: {data.current.profitMargin.toFixed(1)}% · {formatMkd(data.current.profitPerWash)}/миење
            </p>
          </Card>

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{t("analytics.washes")}</span>
              <PctBadge value={data.comparison.washes} />
            </div>
            <p className="text-xl font-bold">{formatNumber(data.current.paid)} платени</p>
            <p className="text-sm text-muted">
              Просек: {data.current.avgDailyWashes.toFixed(1)}/ден · Бесплатни: {data.freeWashCount}
            </p>
            <p className="text-sm text-muted">
              Жетони: {data.current.tokens} · Кеш: {data.current.cashWashes}
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 font-semibold">Приход по програма</h3>
            <RevenueBarChart
              data={[
                { name: "P1", value: data.revenueByProgram.p1 },
                { name: "P2", value: data.revenueByProgram.p2 },
                { name: "P3", value: data.revenueByProgram.p3 },
              ]}
            />
          </Card>

          <Card>
            <h3 className="mb-2 font-semibold">Миења по програма</h3>
            <WashDonutChart p1={data.current.p1} p2={data.current.p2} p3={data.current.p3} />
          </Card>

          {data.trend.length > 1 && (
            <Card>
              <h3 className="mb-2 font-semibold">Тренд на приход</h3>
              <TrendLineChart data={data.trend} />
            </Card>
          )}

          <Card>
            <div className="mb-2 flex items-center justify-between">
              <span className="font-semibold">{t("analytics.costs")}</span>
              <PctBadge value={data.comparison.costs} />
            </div>
            <CostStackChart
              water={data.current.waterCost}
              electricity={data.current.electricityCost}
              chemical1={data.current.chemical1Cost}
              chemical2={data.current.chemical2Cost}
              misc={data.current.miscCost}
            />
            <p className="mt-2 text-sm text-muted">
              По миење: {formatMkd(data.current.costPerWash)}
            </p>
            <p className="text-sm text-muted">
              Струја: {data.current.deltaKwh.toFixed(1)} kWh (очекувано: {data.current.expectedKwh.toFixed(1)})
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 font-semibold">{t("analytics.comparison")}</h3>
            <CompareRow
              label="Овој период"
              revenue={data.sideBySide.current.grossRevenue}
              profit={data.sideBySide.current.netProfit}
              washes={data.sideBySide.current.paid}
            />
            <CompareRow
              label="Претходен период"
              revenue={data.sideBySide.previousPeriod.grossRevenue}
              profit={data.sideBySide.previousPeriod.netProfit}
              washes={data.sideBySide.previousPeriod.paid}
            />
          </Card>

          {data.records && (
            <Card>
              <h3 className="mb-2 font-semibold">{t("analytics.records")}</h3>
              <p className="text-sm">Најдобар приход: {data.records.bestRevenueDay.date} — {formatMkd(data.records.bestRevenueDay.value)}</p>
              <p className="text-sm">Најмногу миења: {data.records.mostWashesDay.date} — {data.records.mostWashesDay.value}</p>
              <p className="text-sm">Најдобар профит: {data.records.bestProfitDay.date} — {formatMkd(data.records.bestProfitDay.value)}</p>
              <p className="mt-2 text-sm text-muted">
                Најдобар ден: {data.bestDayOfWeek.dayName} (просек {formatMkd(data.bestDayOfWeek.avgRevenue)})
              </p>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}

function CompareRow({
  label,
  revenue,
  profit,
  washes,
}: {
  label: string;
  revenue: number;
  profit: number;
  washes: number;
}) {
  return (
    <div className="border-b border-border py-2 text-sm last:border-0">
      <p className="font-medium">{label}</p>
      <p className="text-muted">
        {formatMkd(revenue)} · {formatMkd(profit)} · {washes} миења
      </p>
    </div>
  );
}
