"use client";

import { useMemo } from "react";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import RequireDataset from "@/components/RequireDataset";
import {
  CategoryBars,
  ChartPanel,
  ShareDonut,
  TrendLine,
} from "@/components/charts/Charts";
import {
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDecimal,
  formatNumber,
} from "@/lib/format";
import {
  byPayment,
  byStore,
  computeBreakdown,
  computeCustomers,
  computeDaily,
  computeKpis,
  delta,
  previousPeriod,
  rankDays,
} from "@/lib/metrics";
import { useDataset, useFilteredOrders } from "@/store/DatasetProvider";

export default function DashboardPage() {
  return (
    <RequireDataset>
      <PageHeader
        title="Visão geral"
        description="Indicadores calculados a partir dos pedidos lidos na planilha."
      />
      <FilterBar />
      <DashboardContent />
    </RequireDataset>
  );
}

function DashboardContent() {
  const { dataset, filters } = useDataset();
  const { filtered } = useFilteredOrders();

  const view = useMemo(() => {
    const kpis = computeKpis(filtered);
    const previous = previousPeriod(dataset?.orders ?? [], filters);
    const daily = computeDaily(filtered);
    return {
      kpis,
      previous,
      daily,
      payments: computeBreakdown(filtered, byPayment),
      stores: computeBreakdown(filtered, byStore),
      customers: computeCustomers(filtered).slice(0, 10),
      topOrderDays: rankDays(daily, "orders"),
      topRevenueDays: rankDays(daily, "revenue"),
    };
  }, [filtered, dataset, filters]);

  const prev = view.previous?.kpis;
  const comparisonHint = view.previous
    ? `vs. ${formatDate(view.previous.from)} – ${formatDate(view.previous.to)}`
    : "sem período anterior comparável";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Pedidos"
          value={formatNumber(view.kpis.orders)}
          delta={prev ? delta(view.kpis.orders, prev.orders) : null}
          hint={comparisonHint}
        />
        <KpiCard
          label="Faturamento"
          value={formatCurrency(view.kpis.revenue)}
          delta={prev ? delta(view.kpis.revenue, prev.revenue) : null}
          hint={comparisonHint}
        />
        <KpiCard
          label="Ticket médio"
          value={formatCurrency(view.kpis.averageTicket)}
          delta={prev ? delta(view.kpis.averageTicket, prev.averageTicket) : null}
          hint={comparisonHint}
        />
        <KpiCard
          label="Clientes únicos"
          value={formatNumber(view.kpis.uniqueCustomers)}
          hint="pedidos sem cliente identificado não entram na contagem"
        />
        <KpiCard
          label="Pedidos por dia"
          value={formatDecimal(view.kpis.ordersPerDay)}
          hint={`${view.kpis.activeDays} dias com movimento`}
        />
        <KpiCard
          label="Faturamento por dia"
          value={formatCurrency(view.kpis.revenuePerDay)}
          hint="média dos dias com movimento"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Pedidos por dia" subtitle="Dias sem movimento aparecem como zero">
          <TrendLine
            data={view.daily}
            xKey="date"
            yKey="orders"
            name="Pedidos"
            formatX={formatDateShort}
            formatY={(v) => formatNumber(v)}
          />
        </ChartPanel>

        <ChartPanel title="Faturamento por dia">
          <TrendLine
            data={view.daily}
            xKey="date"
            yKey="revenue"
            name="Faturamento"
            formatX={formatDateShort}
            formatY={formatCurrency}
          />
        </ChartPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Faturamento por forma de pagamento">
          <ShareDonut
            data={view.payments.map((p) => ({ key: p.key, value: p.revenue }))}
            formatValue={formatCurrency}
          />
        </ChartPanel>

        <ChartPanel title="Faturamento por loja">
          <CategoryBars
            data={view.stores}
            xKey="key"
            yKey="revenue"
            name="Faturamento"
            horizontal
            formatY={formatCurrency}
          />
        </ChartPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Top 10 clientes</h2>
            <span className="text-xs text-ink-faint">por faturamento</span>
          </div>
          <DataTable
            rows={view.customers}
            rowKey={(r) => r.customer}
            columns={[
              {
                key: "customer",
                header: "Cliente",
                render: (r, i) => (
                  <span className="font-medium text-ink">
                    <span className="tabular mr-2 text-ink-faint">{i + 1}</span>
                    {r.customer}
                  </span>
                ),
              },
              {
                key: "orders",
                header: "Pedidos",
                align: "right",
                render: (r) => <span className="tabular">{formatNumber(r.orders)}</span>,
              },
              {
                key: "revenue",
                header: "Faturamento",
                align: "right",
                render: (r) => (
                  <span className="tabular font-medium text-ink">
                    {formatCurrency(r.revenue)}
                  </span>
                ),
              },
            ]}
          />
        </section>

        <div className="grid gap-5">
          <RankPanel
            title="Dias com mais pedidos"
            rows={view.topOrderDays.map((d) => ({
              date: d.date,
              value: formatNumber(d.orders),
            }))}
          />
          <RankPanel
            title="Dias com maior faturamento"
            rows={view.topRevenueDays.map((d) => ({
              date: d.date,
              value: formatCurrency(d.revenue),
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function RankPanel({
  title,
  rows,
}: {
  title: string;
  rows: { date: string; value: string }[];
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2 className="panel-title">{title}</h2>
      </div>
      <ol className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={r.date} className="flex items-center gap-3 px-5 py-2.5 text-sm">
            <span className="tabular w-4 text-ink-faint">{i + 1}</span>
            <span className="text-ink-soft">{formatDate(r.date)}</span>
            <span className="tabular ml-auto font-medium text-ink">{r.value}</span>
          </li>
        ))}
        {!rows.length && (
          <li className="px-5 py-6 text-center text-sm text-ink-faint">
            Sem dados no período.
          </li>
        )}
      </ol>
    </section>
  );
}
