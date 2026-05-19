"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = ["#1A6EFF", "#60A5FA", "#93C5FD"];

export function RevenueBarChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => `${Number(v ?? 0).toFixed(0)} ден.`} />
        <Bar dataKey="value" fill="#1A6EFF" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({
  data,
}: {
  data: { date: string; revenue: number; profit: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="revenue" stroke="#1A6EFF" name="Приход" dot={false} />
        <Line type="monotone" dataKey="profit" stroke="#16a34a" name="Профит" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WashDonutChart({
  p1,
  p2,
  p3,
}: {
  p1: number;
  p2: number;
  p3: number;
}) {
  const data = [
    { name: "P1", value: p1 },
    { name: "P2", value: p2 },
    { name: "P3", value: p3 },
  ].filter((d) => d.value > 0);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CostStackChart({
  water,
  electricity,
  chemical1,
  chemical2,
  misc,
}: {
  water: number;
  electricity: number;
  chemical1: number;
  chemical2: number;
  misc: number;
}) {
  const data = [
    {
      name: "Трошоци",
      Вода: water,
      Струја: electricity,
      "Хем.1": chemical1,
      "Хем.2": chemical2,
      Останато: misc,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip />
        <Legend />
        <Bar dataKey="Вода" stackId="a" fill="#60A5FA" />
        <Bar dataKey="Струја" stackId="a" fill="#1A6EFF" />
        <Bar dataKey="Хем.1" stackId="a" fill="#93C5FD" />
        <Bar dataKey="Хем.2" stackId="a" fill="#BFDBFE" />
        <Bar dataKey="Останато" stackId="a" fill="#E2E8F0" />
      </BarChart>
    </ResponsiveContainer>
  );
}
