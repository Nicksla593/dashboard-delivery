"use client";

import { useMemo } from "react";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import RequireDataset from "@/components/RequireDataset";
import { CategoryBars, ChartPanel } from "@/components/charts/Charts";
import { formatCurrency, formatNumber } from "@/lib/format";
import { computeCustomers } from "@/lib/metrics";
import { UNKNOWN_CUSTOMER_LABEL } from "@/lib/config";
import { useFilteredOrders } from "@/store/DatasetProvider";

export default function ClientesPage() {
  return (
    <RequireDataset>
      <PageHeader
        title="Clientes"
        description="Ranking por faturamento, frequência e ticket médio."
      />
      <FilterBar />
      <ClientesContent />
    </RequireDataset>
  );
}

function ClientesContent() {
  const { filtered } = useFilteredOrders();

  const view = useMemo(() => {
    const all = computeCustomers(filtered);
    // Pedidos sem cliente identificado somam corretamente no faturamento,
    // mas não representam uma pessoa — ficam fora dos rankings.
    const identified = all.filter((c) => c.customer !== UNKNOWN_CUSTOMER_LABEL);
    const unidentified = all.find((c) => c.customer === UNKNOWN_CUSTOMER_LABEL);
    return {
      all,
      identified,
      unidentified,
      topRevenue: identified.slice(0, 10),
      topFrequency: [...identified].sort((a, b) => b.orders - a.orders).slice(0, 10),
      topTicket: [...identified]
        .filter((c) => c.orders >= 2)
        .sort((a, b) => b.averageTicket - a.averageTicket)
        .slice(0, 10),
    };
  }, [filtered]);

  const totalRevenue = view.identified.reduce((s, c) => s + c.revenue, 0);
  const top10Revenue = view.topRevenue.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Clientes identificados"
          value={formatNumber(view.identified.length)}
        />
        <KpiCard
          label="Concentração no top 10"
          value={
            totalRevenue ? `${((top10Revenue / totalRevenue) * 100).toFixed(1)}%` : "—"
          }
          hint="do faturamento com cliente identificado"
        />
        <KpiCard
          label="Pedidos sem cliente"
          value={formatNumber(view.unidentified?.orders ?? 0)}
          hint={
            view.unidentified
              ? `${formatCurrency(view.unidentified.revenue)} em faturamento`
              : "nenhum"
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Maiores faturamentos" subtitle="Top 10 clientes">
          <CategoryBars
            data={view.topRevenue}
            xKey="customer"
            yKey="revenue"
            name="Faturamento"
            horizontal
            height={300}
            formatY={formatCurrency}
          />
        </ChartPanel>

        <ChartPanel title="Mais pedidos" subtitle="Top 10 clientes por frequência">
          <CategoryBars
            data={view.topFrequency}
            xKey="customer"
            yKey="orders"
            name="Pedidos"
            horizontal
            height={300}
            formatY={(v) => formatNumber(v)}
          />
        </ChartPanel>
      </div>

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Todos os clientes</h2>
          <span className="text-xs text-ink-faint">
            {formatNumber(view.all.length)} registros · clique no cabeçalho para ordenar
          </span>
        </div>
        <DataTable
          rows={view.all}
          rowKey={(r) => r.customer}
          pageSize={10}
          initialSort={{ key: "revenue", direction: "desc" }}
          columns={[
            {
              key: "customer",
              header: "Cliente",
              sortValue: (r) => r.customer,
              render: (r) => (
                <span
                  className={
                    r.customer === UNKNOWN_CUSTOMER_LABEL
                      ? "italic text-ink-faint"
                      : "font-medium text-ink"
                  }
                >
                  {r.customer}
                </span>
              ),
            },
            {
              key: "orders",
              header: "Nº de pedidos",
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
          ]}
        />
      </section>
    </div>
  );
}
