"use client";

import { AlertCircle, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/format";
import { useDataset } from "@/store/DatasetProvider";

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  desconectado: { dot: "bg-ink-faint", label: "Sem planilha conectada" },
  conectando: { dot: "bg-amber-500 animate-pulse", label: "Conectando" },
  atualizando: { dot: "bg-brand animate-pulse", label: "Verificando alterações" },
  conectado: { dot: "bg-brand", label: "Conectado" },
  erro: { dot: "bg-danger", label: "Falha na conexão" },
};

export default function ConnectionBar() {
  const { status, dataset, lastCheckedAt, refresh, justUpdated, autoRefresh, error } =
    useDataset();
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.desconectado;
  const busy = status === "conectando" || status === "atualizando";

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-panel/95 px-5 py-3 backdrop-blur lg:px-8">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${style.dot}`} />
        <span className="text-sm font-medium text-ink">{style.label}</span>
      </div>

      {dataset && (
        <span className="hidden truncate text-sm text-ink-soft md:inline">
          {dataset.spreadsheetTitle}
        </span>
      )}

      {justUpdated && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-dark">
          <Check size={13} /> Dados atualizados
        </span>
      )}

      {error && status !== "erro" && (
        <span className="inline-flex items-center gap-1.5 text-xs text-warn">
          <AlertCircle size={13} /> Última verificação falhou
        </span>
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-ink-faint">
          Última atualização{" "}
          <span className="tabular font-medium text-ink-soft">
            {formatTime(lastCheckedAt)}
          </span>
          {autoRefresh && dataset ? " · verificação automática ativa" : ""}
        </span>

        {dataset ? (
          <button
            type="button"
            onClick={() => void refresh(true)}
            disabled={busy}
            className="btn-ghost"
          >
            <RefreshCw size={14} className={busy ? "animate-spin" : undefined} />
            Atualizar agora
          </button>
        ) : (
          <Link href="/conexao" className="btn-primary">
            Conectar planilha
          </Link>
        )}
      </div>
    </header>
  );
}
