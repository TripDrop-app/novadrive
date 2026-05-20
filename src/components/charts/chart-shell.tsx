"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function ChartCard({
  title,
  subtitle,
  children,
  className,
  accent = "blue",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  accent?: "blue" | "green" | "violet" | "slate";
}) {
  const accentBar = {
    blue: "from-primary to-blue-400",
    green: "from-emerald-500 to-emerald-300",
    violet: "from-violet-600 to-violet-400",
    slate: "from-slate-600 to-slate-400",
  }[accent];

  return (
    <Card className={cn("overflow-hidden border-0 p-0 shadow-md shadow-slate-200/60", className)}>
      <div className={cn("h-1 bg-gradient-to-r", accentBar)} />
      <div className="bg-gradient-to-b from-slate-50/90 to-white px-4 pt-4 pb-1">
        <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      <div className="px-1 pb-3 pt-1">{children}</div>
    </Card>
  );
}

export function ChartGradientDefs() {
  return (
    <defs>
      <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#1A6EFF" stopOpacity={0.45} />
        <stop offset="100%" stopColor="#1A6EFF" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradWashes" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
        <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="gradBarBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#60A5FA" />
        <stop offset="100%" stopColor="#1A6EFF" />
      </linearGradient>
    </defs>
  );
}
