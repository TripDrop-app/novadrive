export function formatMkd(amount: number): string {
  return new Intl.NumberFormat("mk-MK", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + " ден.";
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("mk-MK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatPct(n: number | null): string {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}
