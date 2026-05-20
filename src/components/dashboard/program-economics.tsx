"use client";

import { Card } from "@/components/ui/card";
import { formatMkd } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { ProgramBreakdown } from "@/lib/calculations";

const PROGRAM_LABELS: Record<1 | 2 | 3, string> = {
  1: "daily.p1",
  2: "daily.p2",
  3: "daily.p3",
};

function CostLine({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null;
  return (
    <div className="flex justify-between text-xs text-muted">
      <span>{label}</span>
      <span>{formatMkd(value)}</span>
    </div>
  );
}

export function ProgramEconomics({
  rows,
  reference,
}: {
  rows: ProgramBreakdown[];
  /** true = estimated per single wash (no entry today) */
  reference?: boolean;
}) {
  const active = rows.filter((r) => r.count > 0 || reference);

  if (active.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">
        {reference ? t("dashboard.unitEconomicsTitle") : t("dashboard.programEconomicsTitle")}
      </h3>
      {reference && (
        <p className="text-xs text-muted">{t("dashboard.unitEconomicsHint")}</p>
      )}
      {!reference && (
        <p className="text-xs text-muted">{t("dashboard.electricitySplitHint")}</p>
      )}
      {active.map((row) => (
        <Card key={row.program} className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{t(PROGRAM_LABELS[row.program])}</p>
              {!reference && (
                <p className="text-xs text-muted">
                  {row.count} {t("dashboard.washCount")}
                </p>
              )}
            </div>
            {row.profitPerWashMkd != null && (
              <div className="text-right">
                <p className="text-xs text-muted">{t("dashboard.profitPerWash")}</p>
                <p
                  className={`text-lg font-bold ${
                    row.profitPerWashMkd >= 0 ? "text-primary" : "text-danger"
                  }`}
                >
                  {formatMkd(row.profitPerWashMkd)}
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1 border-t border-border pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("dashboard.programRevenue")}</span>
              <span className="font-medium">{formatMkd(row.revenueMkd)}</span>
            </div>
            <CostLine label={t("dashboard.costWater")} value={row.waterMkd} />
            <CostLine label={t("dashboard.costChem1")} value={row.chemical1Mkd} />
            <CostLine label={t("dashboard.costChem2")} value={row.chemical2Mkd} />
            <CostLine label={t("dashboard.costElectricity")} value={row.electricityMkd} />
            <CostLine label={t("dashboard.costMisc")} value={row.miscMkd} />
            <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
              <span>{t("dashboard.programTotalCost")}</span>
              <span>{formatMkd(row.totalCostMkd)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{t("dashboard.programProfit")}</span>
              <span
                className={`font-bold ${row.profitMkd >= 0 ? "text-primary" : "text-danger"}`}
              >
                {formatMkd(row.profitMkd)}
              </span>
            </div>
            {!reference && row.electricityWeightSharePct != null && row.count > 0 && (
              <p className="text-xs text-muted">
                {t("dashboard.electricityShare")}: {row.electricityWeightSharePct}%
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
