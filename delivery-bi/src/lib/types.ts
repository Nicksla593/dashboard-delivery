export type IssueCode =
  | "valor_ausente"
  | "valor_invalido"
  | "cliente_ausente"
  | "cliente_numerico"
  | "cliente_e_nome_de_loja"
  | "pagamento_ausente"
  | "pagamento_nao_reconhecido"
  | "pagamento_ambiguo"
  | "loja_ausente"
  | "loja_nao_reconhecida"
  | "data_divergente"
  | "linha_pre_numerada"
  | "celula_total_removida";

export type Issue = {
  code: IssueCode;
  detail?: string;
};

/** Pedido normalizado. Unidade atômica de todo o sistema. */
export type Order = {
  /** Identificador interno: aba + linha física. Estável entre atualizações. */
  id: string;
  /** ISO yyyy-mm-dd */
  date: string;
  sourceSheet: string;
  rowIndex: number;
  /** Numeração sequencial do pedido no dia. NÃO é quantidade de itens. */
  sequence: number | null;
  value: number;
  customer: string | null;
  customerRaw: string;
  payment: string;
  paymentRaw: string;
  storeCode: string | null;
  storeLabel: string;
  storeRaw: string;
  /** Faixa recalculada a partir do valor. */
  band: string;
  /** Faixa como estava na planilha, para conferência. */
  bandRaw: string | null;
  issues: Issue[];
};

export type SheetReport = {
  sheetName: string;
  date: string | null;
  dateSource: "conteudo" | "nome_da_aba" | "indefinida";
  headerRow: number | null;
  rowsRead: number;
  validOrders: number;
  skippedRows: number;
  totalCellsRemoved: number;
  /** Total declarado na própria aba, quando existe. */
  declaredTotal: number | null;
  computedTotal: number;
  /** Diferença entre o total declarado e a soma dos pedidos lidos. */
  totalDelta: number | null;
  errors: string[];
};

export type QualityReport = {
  sheetsProcessed: number;
  rowsRead: number;
  validOrders: number;
  skippedRows: number;
  ordersWithIssues: number;
  issueCounts: Record<string, number>;
  unrecognizedPayments: string[];
  unrecognizedStores: string[];
  unidentifiedCustomers: number;
  sheets: SheetReport[];
};

export type Dataset = {
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  /** Timestamp da leitura (ISO). */
  fetchedAt: string;
  /** modifiedTime do arquivo no Drive — usado para detectar alterações. */
  revision: string | null;
  orders: Order[];
  quality: QualityReport;
};

export type Filters = {
  dateFrom: string | null;
  dateTo: string | null;
  payments: string[];
  stores: string[];
  customers: string[];
  bands: string[];
};

export type Kpis = {
  orders: number;
  revenue: number;
  averageTicket: number;
  uniqueCustomers: number;
  activeDays: number;
  ordersPerDay: number;
  revenuePerDay: number;
};

export type DailyRow = {
  date: string;
  orders: number;
  revenue: number;
  averageTicket: number;
  customers: number;
};

export type CustomerRow = {
  customer: string;
  orders: number;
  revenue: number;
  averageTicket: number;
};

export type BreakdownRow = {
  key: string;
  orders: number;
  revenue: number;
  averageTicket: number;
  ordersShare: number;
  revenueShare: number;
};
