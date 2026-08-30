"use client";

import { useMemo } from "react";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import PageHeader from "@/components/PageHeader";
import RequireDataset from "@/components/RequireDataset";
import { CategoryBars, ChartPanel } from "@/components/charts/Charts";
import { formatCurrency, formatDate, formatNumber, formatWeekday } from "@/lib/format";
import { computeDaily } from "@/lib/metrics";
import { useFilteredOrders } from "@/store/DatasetProvider";

export default function DiarioPage() {
  return (
    <RequireDataset>
      <PageHeader
        title="Análise diária"
        description="Desempenho dia a dia, calculado a partir dos pedidos filtrados."
      />
      <FilterBar />
      <DiarioContent />
    </RequireDataset>
  );
}

function DiarioContent() {
  const { filtered } = useFilteredOrders();
  const daily = useMemo(() => computeDaily(filtered), [filtered]);

  return (
    <div className="space-y-5">
      <ChartPanel title="Ticket médio por dia" subtitle="Dias sem movimento aparecem como zero">
        <CategoryBars
          data={daily}
          xKey="date"
          yKey="averageTicket"
          name="Ticket médio"
          formatY={formatCurrency}
        />
      </ChartPanel>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Tabela operacional</h2>
          <span className="text-xs text-ink-faint">{daily.length} dias</span>
        </div>
        <DataTable
          rows={daily}
          rowKey={(r) => r.date}
          initialSort={{ key: "date", direction: "asc" }}
          columns={[
            {
              key: "date",
              header: "Data",
              sortValue: (r) => r.date,
              render: (r) => (
                <span className="font-medium text-ink">
                  {formatDate(r.date)}
                  <span className="ml-2 text-xs font-normal text-ink-faint">
                    {formatWeekday(r.date)}
                  </span>
                </span>
              ),
            },
            {
              key: "orders",
              header: "Pedidos",
              align: "right",
              sortValue: (r) => r.orders,
              render: (r) => <span className="tabular">{formatNumber(r.orders)}</span>,
            },
            {
              key: "revenue",
              header: "Faturamento",
              align: "right",
              sortValue: (r) => r.revenue,
              render: (r) => (
                <span className="tabular font-medium text-ink">{formatCurrency(r.revenue)}</span>
              ),
            },
            {
              key: "averageTicket",
              header: "Ticket médio",
              align: "right",
              sortValue: (r) => r.averageTicket,
              render: (r) => <span className="tabular">{formatCurrency(r.averageTicket)}</span>,
            },
            {
              key: "customers",
              header: "Clientes",
              align: "right",
              sortValue: (r) => r.customers,
              render: (r) => <span className="tabular">{formatNumber(r.customers)}</span>,
            },
          ]}
        />
      </section>
    </div>
  );
}
