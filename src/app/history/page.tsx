"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { formatMkd } from "@/lib/format";
import { t } from "@/lib/i18n";

interface Entry {
  id: string;
  sessionDate: string;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  grossRevenueMkd: string;
  netProfitMkd: string;
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/daily-entries")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <h2 className="mb-4 text-xl font-bold">{t("history.title")}</h2>
      {loading ? (
        <p className="text-muted">{t("common.loading")}</p>
      ) : entries.length === 0 ? (
        <p className="text-muted">{t("history.noEntries")}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id}>
              <Link href={`/history/${e.id}`}>
                <Card className="flex items-center justify-between active:bg-slate-50">
                  <div>
                    <p className="font-semibold">
                      {new Date(e.sessionDate + "T12:00:00").toLocaleDateString("mk-MK", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-muted">
                      {e.p1Count + e.p2Count + e.p3Count} миења · P1:{e.p1Count} P2:{e.p2Count}{" "}
                      P3:{e.p3Count}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatMkd(Number(e.netProfitMkd))}</p>
                    <p className="text-xs text-muted">{formatMkd(Number(e.grossRevenueMkd))}</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
