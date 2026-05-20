"use client";

import Link from "next/link";
import {
  RevenueProfitAreaChart,
  ProgramDonutChart,
  ProgramBarChart,
  SparklineChart,
} from "@/components/charts/analytics-charts";
import { ChartCard } from "@/components/charts/chart-shell";
import { formatMkd } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { ProgramChartPoint, TrendPoint } from "@/lib/analytics/series";

export interface DashboardChartsProps {
  trend14: TrendPoint[];
  weekRevenueByProgram: ProgramChartPoint[];
  weekProgramProfit: ProgramChartPoint[];
  weekWashMix: ProgramChartPoint[];
  weekTotals: {
    revenue: number;
    profit: number;
    washes: number;
  };
}

export function DashboardCharts({
  trend14,
  weekRevenueByProgram,
  weekProgramProfit,
  weekWashMix,
  weekTotals,
}: DashboardChartsProps) {
  const hasTrend = trend14.some((p) => p.revenue > 0 || p.profit > 0);
  const hasWeek = weekTotals.washes > 0;

  if (!hasTrend && !hasWeek) {
    return (
      <ChartCard title={t("dashboard.chartsTitle")} subtitle={t("dashboard.chartsEmpty")} accent="slate">
        <p className="px-4 py-8 text-center text-sm text-muted">{t("dashboard.chartsEmptyHint")}</p>
      </ChartCard>
    );
  }

  return (
    <section className="mb-4 space-y-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-lg font-bold">{t("dashboard.chartsTitle")}</h2>
        <Link href="/analytics" className="text-sm font-semibold text-primary">
          {t("dashboard.chartsMore")} →
        </Link>
      </div>

      {hasTrend && (
        <ChartCard
          title={t("dashboard.chartTrend14")}
          subtitle={t("dashboard.chartTrend14Sub")}
          accent="blue"
        >
          <RevenueProfitAreaChart data={trend14} height={200} compact />
        </ChartCard>
      )}

      {hasWeek && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-gradient-to-br from-primary to-blue-400 p-3 text-white shadow-lg shadow-primary/25">
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-90">
                {t("dashboard.weekRevenue")}
              </p>
              <p className="mt-1 text-lg font-bold leading-tight">{formatMkd(weekTotals.revenue)}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-400 p-3 text-white shadow-lg shadow-emerald-500/25">
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-90">
                {t("dashboard.weekProfit")}
              </p>
              <p className="mt-1 text-lg font-bold leading-tight">{formatMkd(weekTotals.profit)}</p>
              {hasTrend && (
                <div className="-mx-1 mt-1 opacity-90">
                  <SparklineChart data={trend14} height={36} />
                </div>
              )}
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-400 p-3 text-white shadow-lg shadow-violet-500/25">
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-90">
                {t("dashboard.weekWashes")}
              </p>
              <p className="mt-1 text-lg font-bold leading-tight">{weekTotals.washes}</p>
            </div>
          </div>

          <ChartCard title={t("dashboard.chartWeekMix")} subtitle={t("dashboard.chartWeekMixSub")} accent="violet">
            <ProgramDonutChart
              data={weekWashMix}
              height={200}
              centerLabel={String(weekTotals.washes)}
            />
          </ChartCard>

          <ChartCard
            title={t("dashboard.chartWeekProfit")}
            subtitle={t("dashboard.chartWeekProfitSub")}
            accent="green"
          >
            <ProgramBarChart data={weekProgramProfit} dataKey="profit" name="Профит" height={180} />
          </ChartCard>

          <ChartCard title={t("dashboard.chartWeekRevenue")} accent="blue">
            <ProgramBarChart data={weekRevenueByProgram} height={180} />
          </ChartCard>
        </>
      )}
    </section>
  );
}
