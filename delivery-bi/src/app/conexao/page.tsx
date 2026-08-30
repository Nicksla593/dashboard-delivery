"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { ErrorMessage } from "@/components/States";
import { formatDateTime } from "@/lib/format";
import { useDataset } from "@/store/DatasetProvider";

export default function ConexaoPage() {
  const {
    url,
    connect,
    disconnect,
    dataset,
    status,
    error,
    lastCheckedAt,
    autoRefresh,
    setAutoRefresh,
    pollIntervalMs,
    setPollIntervalMs,
  } = useDataset();

  const [input, setInput] = useState(url);
  const busy = status === "conectando" || status === "atualizando";

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Conexão"
        description="A dashboard lê os dados direto da planilha. Nada é importado nem copiado."
      />

      <section className="panel px-5 py-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">URL da planilha do Google Sheets</span>
          <input
            className="field"
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && input.trim()) void connect(input.trim());
            }}
          />
        </label>

        <p className="mt-2 text-xs text-ink-faint">
          Abra a planilha no navegador e copie o endereço da barra. A conta usada pelo sistema
          precisa ter acesso de leitura ao arquivo.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={!input.trim() || busy}
            onClick={() => void connect(input.trim())}
          >
            {busy ? "Conectando…" : "Conectar planilha"}
          </button>
          {dataset && (
            <button type="button" className="btn-ghost" onClick={disconnect}>
              Desconectar
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="mt-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {dataset && (
        <section className="panel mt-4">
          <div className="panel-header">
            <h2 className="panel-title">Planilha conectada</h2>
            <a
              href={dataset.spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-dark hover:underline"
            >
              Abrir no Google Sheets <ExternalLink size={12} />
            </a>
          </div>
          <dl className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
            <Info label="Nome" value={dataset.spreadsheetTitle} />
            <Info label="Abas processadas" value={String(dataset.quality.sheetsProcessed)} />
            <Info label="Pedidos reconhecidos" value={String(dataset.quality.validOrders)} />
            <Info label="Última atualização" value={formatDateTime(lastCheckedAt)} />
          </dl>
        </section>
      )}

      <section className="panel mt-4">
        <div className="panel-header">
          <h2 className="panel-title">Atualização automática</h2>
        </div>
        <div className="space-y-4 px-5 py-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#0f7a4a]"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="text-sm text-ink-soft">
              Verificar alterações na planilha automaticamente
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Intervalo de verificação</span>
            <select
              className="field w-[220px]"
              value={pollIntervalMs}
              onChange={(e) => setPollIntervalMs(Number(e.target.value))}
            >
              <option value={30_000}>A cada 30 segundos</option>
              <option value={60_000}>A cada 1 minuto</option>
              <option value={300_000}>A cada 5 minutos</option>
              <option value={900_000}>A cada 15 minutos</option>
            </select>
          </label>

          <p className="text-xs text-ink-faint">
            O Google Sheets não avisa o sistema quando algo muda, então a dashboard consulta a
            planilha no intervalo escolhido. Uma alteração feita agora aparece, no pior caso,
            um intervalo depois. Para ver na hora, use “Atualizar agora”.
          </p>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
