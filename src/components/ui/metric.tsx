import { cn } from "@/lib/cn";

export function Metric({
  label,
  value,
  large,
  className,
  sub,
}: {
  label: string;
  value: string;
  large?: boolean;
  className?: string;
  sub?: string;
}) {
  return (
    <div className={cn("text-center", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("font-bold", large ? "text-3xl text-primary" : "text-xl")}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function PctBadge({ value }: { value: number | null }) {
  if (value == null) return null;
  const positive = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        positive ? "bg-green-100 text-success" : "bg-red-100 text-danger"
      )}
    >
      {positive ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function ProgressBar({
  label,
  current,
  max,
  warning,
}: {
  label: string;
  current: number;
  max: number;
  warning?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const remaining = Math.max(0, max - current);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={warning ? "font-semibold text-warning" : "text-muted"}>
          {remaining} преостанати
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", warning ? "bg-warning" : "bg-primary")}
          style={{ width: `${100 - pct}%` }}
        />
      </div>
    </div>
  );
}
