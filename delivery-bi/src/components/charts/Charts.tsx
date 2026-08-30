"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Paleta sóbria de BI: uma cor de marca e degraus neutros. Cor não carrega
 * significado sozinha — os rótulos sempre acompanham.
 */
export const SERIES_COLORS = [
  "#0f7a4a",
  "#3f6f8f",
  "#8a6d3b",
  "#6b5b95",
  "#a15c4a",
  "#5c7a6b",
  "#7d7d7d",
  "#4a6fa5",
];

const AXIS = {
  stroke: "#98a2b3",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

type TooltipFormatter = (value: number) => string;

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  formatter: TooltipFormatter;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 shadow-card">
      {label && <p className="mb-1 text-xs font-medium text-ink">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2 text-xs text-ink-soft">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color ?? SERIES_COLORS[0] }}
          />
          {entry.name && <span>{entry.name}</span>}
          <span className="tabular font-medium text-ink">{formatter(entry.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

export function ChartPanel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-faint">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-2 py-4">{children}</div>
    </section>
  );
}

type SeriesChartProps<T> = {
  data: T[];
  xKey: keyof T & string;
  yKey: keyof T & string;
  formatX?: (value: string) => string;
  formatY: TooltipFormatter;
  height?: number;
  name?: string;
};

export function TrendLine<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  formatX,
  formatY,
  height = 260,
  name,
}: SeriesChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={formatX} {...AXIS} minTickGap={16} />
        <YAxis tickFormatter={(v) => formatY(Number(v))} width={78} {...AXIS} />
        <Tooltip
          content={<ChartTooltip formatter={formatY} />}
          labelFormatter={(l) => (formatX ? formatX(String(l)) : String(l))}
        />
        <Line
          type="monotone"
          dataKey={yKey}
          name={name}
          stroke={SERIES_COLORS[0]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  formatY,
  height = 260,
  horizontal = false,
  name,
}: SeriesChartProps<T> & { horizontal?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 6, right: 16, bottom: 4, left: horizontal ? 8 : 4 }}
      >
        <CartesianGrid stroke="#eef0f3" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={(v) => formatY(Number(v))} {...AXIS} />
            <YAxis type="category" dataKey={xKey} width={130} {...AXIS} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...AXIS} />
            <YAxis tickFormatter={(v) => formatY(Number(v))} width={78} {...AXIS} />
          </>
        )}
        <Tooltip cursor={{ fill: "#f2f4f7" }} content={<ChartTooltip formatter={formatY} />} />
        <Bar dataKey={yKey} name={name} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ShareDonut({
  data,
  formatValue,
  height = 260,
}: {
  data: { key: string; value: number }[];
  formatValue: TooltipFormatter;
  height?: number;
}) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={1}
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={formatValue} />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="w-full shrink-0 space-y-1.5 pr-4 sm:w-52">
        {data.map((entry, i) => (
          <li key={entry.key} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[i % SERIES_COLORS.length] }}
            />
            <span className="truncate text-ink-soft">{entry.key}</span>
            <span className="tabular ml-auto font-medium text-ink">
              {formatValue(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
