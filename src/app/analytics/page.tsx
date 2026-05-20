"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { PctBadge } from "@/components/ui/metric";
import {
  RevenueProfitAreaChart,
  WashesAreaChart,
  ProgramBarChart,
  ProgramDonutChart,
  CostBreakdownChart,
  WeekdayBarChart,
} from "@/components/charts/analytics-charts";
import { ChartCard } from "@/components/charts/chart-shell";
import { formatMkd, formatNumber } from "@/lib/format";
import { t } from "@/lib/i18n";
import { shiftPeriod, type PeriodType } from "@/lib/analytics";
import type { ProgramChartPoint, TrendPoint, WeekdayPoint } from "@/lib/analytics/series";

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
  revenueByProgramChart: ProgramChartPoint[];
  washMixChart: ProgramChartPoint[];
  programProfitChart: ProgramChartPoint[];
  costChart: { name: string; value: number; fill: string }[];
  weekdayChart: WeekdayPoint[];
  trendFilled: TrendPoint[];
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
      <h2 className="mb-1 text-xl font-bold">{t("analytics.title")}</h2>
      <p className="mb-4 text-xs text-muted">{t("analytics.subtitle")}</p>

      <div className="mb-4 flex gap-1 rounded-2xl bg-slate-100/80 p-1 shadow-inner">
        {PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all duration-300 ${
              period === p
                ? "bg-white text-primary shadow-md"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t(`analytics.period.${p}`)}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-50 to-white px-2 py-1 shadow-sm">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-primary transition hover:bg-primary/10"
          onClick={() => shift(-1)}
        >
          ←
        </button>
        <span className="text-center text-sm font-bold">{data?.label ?? "..."}</span>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-primary transition hover:bg-primary/10"
          onClick={() => shift(1)}
        >
          →
        </button>
      </div>

      {loading || !data ? (
        <p className="animate-pulse text-muted">{t("common.loading")}</p>
      ) : (
        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <KpiTile
              label={t("analytics.revenue")}
              value={formatMkd(data.current.grossRevenue)}
              pct={data.comparison.revenue}
              gradient="from-primary to-blue-400"
            />
            <KpiTile
              label={t("analytics.profit")}
              value={formatMkd(data.current.netProfit)}
              pct={data.comparison.profit}
              gradient="from-emerald-600 to-emerald-400"
            />
            <KpiTile
              label={t("analytics.washes")}
              value={formatNumber(data.current.paid)}
              pct={data.comparison.washes}
              gradient="from-violet-600 to-violet-400"
              sub={`${data.current.avgDailyWashes.toFixed(1)}/ден`}
            />
            <KpiTile
              label={t("analytics.costs")}
              value={formatMkd(data.current.totalCost)}
              pct={data.comparison.costs}
              gradient="from-slate-600 to-slate-400"
              sub={formatMkd(data.current.costPerWash) + "/миење"}
            />
          </div>

          {data.trendFilled.length > 0 && (
            <ChartCard
              title={t("analytics.chartTrend")}
              subtitle={`${t("analytics.vsPrevious")} · ${data.current.entryCount} ${t("analytics.daysWithEntry")}`}
              accent="blue"
              className="shadow-lg shadow-primary/10"
            >
              <RevenueProfitAreaChart data={data.trendFilled} height={260} />
            </ChartCard>
          )}

          {data.trendFilled.length > 1 && (
            <ChartCard title={t("analytics.chartWashes")} accent="violet">
              <WashesAreaChart data={data.trendFilled} height={180} />
            </ChartCard>
          )}

          <ChartCard title={t("analytics.chartRevenuePrograms")} accent="blue">
            <ProgramBarChart data={data.revenueByProgramChart} height={220} />
          </ChartCard>

          <ChartCard title={t("analytics.chartProfitPrograms")} subtitle={t("analytics.chartProfitProgramsSub")} accent="green">
            <ProgramBarChart
              data={data.programProfitChart}
              dataKey="profit"
              name="Профит"
              height={220}
            />
          </ChartCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <ChartCard title={t("analytics.chartWashMix")} accent="violet">
              <ProgramDonutChart
                data={data.washMixChart}
                height={220}
                centerLabel={String(data.current.paid)}
              />
            </ChartCard>
            <ChartCard title={t("analytics.chartCosts")} accent="slate">
              <CostBreakdownChart data={data.costChart} height={220} />
              <p className="px-3 pb-2 text-center text-xs text-muted">
                {t("analytics.electricityNote")}: {data.current.deltaKwh.toFixed(1)} kWh
              </p>
            </ChartCard>
          </div>

          {data.weekdayChart.some((d) => d.revenue > 0) && (
            <ChartCard title={t("analytics.chartWeekday")} subtitle={t("analytics.chartWeekdaySub")} accent="blue">
              <WeekdayBarChart data={data.weekdayChart} height={220} />
            </ChartCard>
          )}

          <Card className="space-y-2 bg-gradient-to-br from-slate-50 to-white">
            <h3 className="font-semibold">{t("analytics.comparison")}</h3>
            <CompareRow
              label={t("analytics.thisPeriod")}
              revenue={data.sideBySide.current.grossRevenue}
              profit={data.sideBySide.current.netProfit}
              washes={data.sideBySide.current.paid}
            />
            <CompareRow
              label={t("analytics.prevPeriod")}
              revenue={data.sideBySide.previousPeriod.grossRevenue}
              profit={data.sideBySide.previousPeriod.netProfit}
              washes={data.sideBySide.previousPeriod.paid}
            />
          </Card>

          {data.records && (
            <Card className="border-l-4 border-l-warning bg-amber-50/50">
              <h3 className="mb-2 font-semibold">{t("analytics.records")}</h3>
              <p className="text-sm">
                {t("analytics.bestRevenue")}: {data.records.bestRevenueDay.date} —{" "}
                {formatMkd(data.records.bestRevenueDay.value)}
              </p>
              <p className="text-sm">
                {t("analytics.mostWashes")}: {data.records.mostWashesDay.date} —{" "}
                {data.records.mostWashesDay.value}
              </p>
              <p className="text-sm">
                {t("analytics.bestProfit")}: {data.records.bestProfitDay.date} —{" "}
                {formatMkd(data.records.bestProfitDay.value)}
              </p>
              <p className="mt-2 text-sm font-medium text-primary">
                {t("analytics.bestDow")}: {data.bestDayOfWeek.dayName} (
                {formatMkd(data.bestDayOfWeek.avgRevenue)} просек)
              </p>
              <p className="text-xs text-muted">
                {t("analytics.freeWashes")}: {data.freeWashCount}
              </p>
            </Card>
          )}

          <Link
            href="/"
            className="block rounded-xl border border-border bg-white py-3 text-center text-sm font-semibold text-primary"
          >
            ← {t("nav.dashboard")}
          </Link>
        </div>
      )}
    </AppShell>
  );
}

function KpiTile({
  label,
  value,
  pct,
  gradient,
  sub,
}: {
  label: string;
  value: string;
  pct: number | null;
  gradient: string;
  sub?: string;
}) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${gradient} p-4 text-white shadow-lg`}>
      <div className="mb-1 flex items-start justify-between gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{label}</span>
        <PctBadge value={pct} light />
      </div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="mt-1 text-[10px] opacity-85">{sub}</p>}
    </div>
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
