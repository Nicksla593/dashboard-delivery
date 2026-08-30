"use client";

import { useMemo } from "react";
import DataTable from "@/components/DataTable";
import FilterBar from "@/components/FilterBar";
import PageHeader from "@/components/PageHeader";
import RequireDataset from "@/components/RequireDataset";
import { CategoryBars, ChartPanel, ShareDonut } from "@/components/charts/Charts";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { byBand, byPayment, byStore, computeBreakdown } from "@/lib/metrics";
import { UNKNOWN_PAYMENT_LABEL } from "@/lib/config";
import { useFilteredOrders } from "@/store/DatasetProvider";
import type { BreakdownRow } from "@/lib/types";

export default function PagamentosPage() {
  return (
    <RequireDataset>
      <PageHeader
        title="Pagamentos e lojas"
        description="Distribuição por forma de pagamento, unidade e faixa de valor."
      />
      <FilterBar />
      <PagamentosContent />
    </RequireDataset>
  );
}

function PagamentosContent() {
  const { filtered } = useFilteredOrders();

  const view = useMemo(
    () => ({
      payments: computeBreakdown(filtered, byPayment),
      stores: computeBreakdown(filtered, byStore),
      bands: computeBreakdown(filtered, byBand),
    }),
    [filtered],
  );

  const unknown = view.payments.find((p) => p.key === UNKNOWN_PAYMENT_LABEL);

  return (
    <div className="space-y-5">
      {unknown && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {formatNumber(unknown.orders)} pedidos sem forma de pagamento
          </span>{" "}
          ({formatPercent(unknown.ordersShare)} do total no período). Eles entram no
          faturamento normalmente, mas ficam agrupados como “{UNKNOWN_PAYMENT_LABEL}”.
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartPanel title="Faturamento por forma de pagamento">
          <ShareDonut
            data={view.payments.map((p) => ({ key: p.key, value: p.revenue }))}
            formatValue={formatCurrency}
          />
        </ChartPanel>
        <ChartPanel title="Pedidos por forma de pagamento">
          <CategoryBars
            data={view.payments}
            xKey="key"
            yKey="orders"
            name="Pedidos"
            horizontal
            formatY={(v) => formatNumber(v)}
          />
        </ChartPanel>
      </div>

      <BreakdownTable title="Formas de pagamento" rows={view.payments} label="Forma" />
      <BreakdownTable title="Lojas" rows={view.stores} label="Loja" />
      <BreakdownTable
        title="Faixas de valor"
        rows={view.bands}
        label="Faixa"
        note="Faixa recalculada pelo sistema a partir do valor do pedido, com os mesmos limites da planilha."
      />
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  label,
  note,
}: {
  title: string;
  rows: BreakdownRow[];
  label: string;
  note?: string;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          {note && <p className="mt-0.5 text-xs text-ink-faint">{note}</p>}
        </div>
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.key}
        initialSort={{ key: "revenue", direction: "desc" }}
        columns={[
          {
            key: "key",
            header: label,
            sortValue: (r) => r.key,
            render: (r) => <span className="font-medium text-ink">{r.key}</span>,
          },
          {
            key: "orders",
            header: "Pedidos",
            align: "right",
            sortValue: (r) => r.orders,
            render: (r) => <span className="tabular">{formatNumber(r.orders)}</span>,
          },
          {
            key: "ordersShare",
            header: "% dos pedidos",
            align: "right",
            sortValue: (r) => r.ordersShare,
            render: (r) => (
              <span className="tabular text-ink-faint">{formatPercent(r.ordersShare)}</span>
            ),
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
            key: "revenueShare",
            header: "% do faturamento",
            align: "right",
            sortValue: (r) => r.revenueShare,
            render: (r) => (
              <span className="tabular text-ink-faint">{formatPercent(r.revenueShare)}</span>
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
  );
}
