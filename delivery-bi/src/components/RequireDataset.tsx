"use client";

import { useDataset } from "@/store/DatasetProvider";
import { EmptyState, ErrorMessage, Loading } from "./States";

/**
 * Evita repetir loading / erro / vazio em cada página. Só renderiza o
 * conteúdo quando existe dataset carregado.
 */
export default function RequireDataset({ children }: { children: React.ReactNode }) {
  const { dataset, status, error, refresh } = useDataset();

  if (status === "erro" && error) {
    return <ErrorMessage message={error} onRetry={() => void refresh(true)} />;
  }
  if (!dataset && (status === "conectando" || status === "atualizando")) {
    return <Loading />;
  }
  if (!dataset) {
    return (
      <EmptyState
        title="Nenhuma planilha conectada"
        description="Cole o link da planilha do Google Sheets com os pedidos do delivery para montar a dashboard."
        actionLabel="Conectar planilha"
        actionHref="/conexao"
      />
    );
  }
  if (!dataset.orders.length) {
    return (
      <EmptyState
        title="Planilha conectada, sem pedidos"
        description="A planilha foi lida, mas nenhuma linha foi reconhecida como pedido. Confira a página de qualidade dos dados para ver o que foi ignorado e por quê."
        actionLabel="Ver qualidade dos dados"
        actionHref="/dados"
      />
    );
  }

  return <>{children}</>;
}
