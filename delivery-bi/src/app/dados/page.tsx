"use client";

import DataTable from "@/components/DataTable";
import KpiCard from "@/components/KpiCard";
import PageHeader from "@/components/PageHeader";
import RequireDataset from "@/components/RequireDataset";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { useDataset } from "@/store/DatasetProvider";
import type { SheetReport } from "@/lib/types";

/** Rótulos legíveis para cada código de inconsistência. */
const ISSUE_LABELS: Record<string, string> = {
  valor_ausente: "Linha sem valor",
  valor_invalido: "Valor não numérico",
  cliente_ausente: "Pedido sem cliente",
  cliente_numerico: "Cliente registrado como número",
  cliente_e_nome_de_loja: "Campo cliente preenchido com o nome da loja",
  pagamento_ausente: "Pedido sem forma de pagamento",
  pagamento_nao_reconhecido: "Forma de pagamento fora da lista conhecida",
  pagamento_ambiguo: "Forma de pagamento ambígua ou com erro de digitação",
  loja_ausente: "Pedido sem loja",
  loja_nao_reconhecida: "Loja fora da lista conhecida",
  data_divergente: "Data do título diverge do nome da aba",
  linha_pre_numerada: "Linha pré-numerada sem pedido",
  celula_total_removida: "Célula de totalização ignorada na linha",
};

export default function DadosPage() {
  return (
    <RequireDataset>
      <PageHeader
        title="Qualidade dos dados"
        description="O que foi lido, o que foi ignorado e por quê."
      />
      <DadosContent />
    </RequireDataset>
  );
}

function DadosContent() {
  const { dataset, lastCheckedAt } = useDataset();
  if (!dataset) return null;
  const q = dataset.quality;

  const divergent = q.sheets.filter((s) => s.totalDelta !== null && Math.abs(s.totalDelta) >= 0.01);
  const withErrors = q.sheets.filter((s) => s.errors.length);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Abas processadas" value={formatNumber(q.sheetsProcessed)} />
        <KpiCard label="Linhas lidas" value={formatNumber(q.rowsRead)} />
        <KpiCard
          label="Pedidos válidos"
          value={formatNumber(q.validOrders)}
          hint={`${formatNumber(q.ordersWithIssues)} com alguma observação`}
        />
        <KpiCard
          label="Linhas ignoradas"
          value={formatNumber(q.skippedRows)}
          hint="não representam pedidos"
        />
      </div>

      <p className="text-xs text-ink-faint">
        Última leitura: {formatDateTime(lastCheckedAt ?? dataset.fetchedAt)}
      </p>

      {(q.unrecognizedPayments.length > 0 || q.unrecognizedStores.length > 0) && (
        <section className="panel px-5 py-4">
          <h2 className="panel-title">Valores fora das listas conhecidas</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Estes valores foram preservados como estão na planilha. Para agrupá-los com um
            rótulo existente, adicione-os como alias em <code>src/lib/config.ts</code>.
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            {q.unrecognizedPayments.length > 0 && (
              <TagGroup label="Formas de pagamento" values={q.unrecognizedPayments} />
            )}
            {q.unrecognizedStores.length > 0 && (
              <TagGroup label="Lojas" values={q.unrecognizedStores} />
            )}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Observações encontradas</h2>
        </div>
        <ul className="divide-y divide-line">
          {Object.entries(q.issueCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([code, count]) => (
              <li key={code} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="text-ink-soft">{ISSUE_LABELS[code] ?? code}</span>
                <span className="tabular ml-auto font-medium text-ink">
                  {formatNumber(count)}
                </span>
              </li>
            ))}
          {!Object.keys(q.issueCounts).length && (
            <li className="px-5 py-6 text-center text-sm text-ink-faint">
              Nenhuma inconsistência encontrada.
            </li>
          )}
        </ul>
      </section>

      {divergent.length > 0 && (
        <section className="panel border-amber-200 px-5 py-4">
          <h2 className="panel-title">Divergência com o total declarado na planilha</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Nestas abas a soma dos pedidos lidos não bate com a linha de Total da própria
            planilha. Vale conferir a fórmula ou as linhas envolvidas.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {divergent.map((s) => (
              <li key={s.sheetName} className="flex flex-wrap items-center gap-2">
                <span className="chip">{s.sheetName}</span>
                <span className="tabular text-ink-soft">
                  lido {formatCurrency(s.computedTotal)} · declarado{" "}
                  {formatCurrency(s.declaredTotal ?? 0)} · diferença{" "}
                  {formatCurrency(s.totalDelta ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {withErrors.length > 0 && (
        <section className="panel px-5 py-4">
          <h2 className="panel-title">Avisos por aba</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {withErrors.map((s) => (
              <li key={s.sheetName}>
                <span className="chip mr-2">{s.sheetName}</span>
                <span className="text-ink-soft">{s.errors.join(" ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">Detalhe por aba</h2>
        </div>
        <DataTable<SheetReport>
          rows={q.sheets}
          rowKey={(r) => r.sheetName}
          columns={[
            {
              key: "sheetName",
              header: "Aba",
              sortValue: (r) => r.sheetName,
              render: (r) => <span className="font-medium text-ink">{r.sheetName}</span>,
            },
            {
              key: "date",
              header: "Data",
              sortValue: (r) => r.date ?? "",
              render: (r) => (
                <span>
                  {r.date ? formatDate(r.date) : "—"}
                  <span className="ml-2 text-xs text-ink-faint">
                    {r.dateSource === "nome_da_aba" ? "pelo nome da aba" : ""}
                    {r.dateSource === "indefinida" ? "não identificada" : ""}
                  </span>
                </span>
              ),
            },
            {
              key: "headerRow",
              header: "Cabeçalho",
              align: "right",
              sortValue: (r) => r.headerRow ?? 0,
              render: (r) => (
                <span className="tabular">{r.headerRow ? `linha ${r.headerRow}` : "—"}</span>
              ),
            },
            {
              key: "rowsRead",
              header: "Linhas",
              align: "right",
              sortValue: (r) => r.rowsRead,
              render: (r) => <span className="tabular">{formatNumber(r.rowsRead)}</span>,
            },
            {
              key: "validOrders",
              header: "Pedidos",
              align: "right",
              sortValue: (r) => r.validOrders,
              render: (r) => <span className="tabular">{formatNumber(r.validOrders)}</span>,
            },
            {
              key: "skippedRows",
              header: "Ignoradas",
              align: "right",
              sortValue: (r) => r.skippedRows,
              render: (r) => (
                <span className="tabular text-ink-faint">{formatNumber(r.skippedRows)}</span>
              ),
            },
            {
              key: "computedTotal",
              header: "Total lido",
              align: "right",
              sortValue: (r) => r.computedTotal,
              render: (r) => (
                <span className="tabular font-medium text-ink">
                  {formatCurrency(r.computedTotal)}
                </span>
              ),
            },
            {
              key: "totalDelta",
              header: "Diferença",
              align: "right",
              sortValue: (r) => Math.abs(r.totalDelta ?? 0),
              render: (r) =>
                r.totalDelta === null ? (
                  <span className="text-ink-faint">—</span>
                ) : Math.abs(r.totalDelta) < 0.01 ? (
                  <span className="text-ink-faint">confere</span>
                ) : (
                  <span className="tabular font-medium text-warn">
                    {formatCurrency(r.totalDelta)}
                  </span>
                ),
            },
          ]}
        />
      </section>
    </div>
  );
}

function TagGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="chip">
            {v || "(vazio)"}
          </span>
        ))}
      </div>
    </div>
  );
}
