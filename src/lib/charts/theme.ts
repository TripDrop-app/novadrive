/** Shared palette for Recharts — car wash brand blues + semantic accents */
export const CHART = {
  primary: "#1A6EFF",
  primaryLight: "#60A5FA",
  primaryPale: "#BFDBFE",
  success: "#10B981",
  successLight: "#6EE7B7",
  danger: "#EF4444",
  warning: "#F59E0B",
  violet: "#8B5CF6",
  slate: "#94A3B8",
  grid: "#E2E8F0",
  tooltipBg: "#0F172A",
} as const;

export const PROGRAM_COLORS = {
  p1: "#1A6EFF",
  p2: "#3B82F6",
  p3: "#8B5CF6",
} as const;

export const COST_COLORS = {
  water: "#38BDF8",
  electricity: "#1A6EFF",
  chemical1: "#6366F1",
  chemical2: "#A78BFA",
  misc: "#CBD5E1",
} as const;

export const CHART_ANIMATION = {
  duration: 1400,
  easing: "ease-out" as const,
};

export function formatChartMkd(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ден.`;
  return `${Math.round(value)} ден.`;
}
