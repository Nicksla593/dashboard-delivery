/**
 * Configuração de negócio.
 *
 * Todas as regras que dependem de como a operação preenche a planilha vivem
 * aqui. Nenhuma delas está espalhada pelo parser ou pelos componentes.
 * Ajustar este arquivo é o caminho suportado para adaptar o sistema a uma
 * planilha nova sem tocar em lógica.
 */

/** Rótulos que marcam uma célula (não a linha) como totalização. */
export const TOTAL_LABELS = ["total", "totais", "soma"];

/**
 * Aliases de cabeçalho -> campo canônico.
 * A detecção é case-insensitive, sem acento e sem pontuação.
 */
export const HEADER_ALIASES: Record<string, string[]> = {
  sequence: ["qntd", "qtd", "quantidade", "n", "no", "num", "item"],
  value: ["valor", "vlr", "total do pedido", "preco", "valor total"],
  customer: ["cliente", "nome", "nome do cliente", "comprador"],
  payment: ["forma de pgto", "forma de pagamento", "pgto", "pagamento", "forma"],
  store: ["loja", "unidade", "sede", "filial", "origem"],
  band: ["vendas", "classificacao", "faixa", "porte"],
};

/** Campos sem os quais uma linha não pode ser considerada pedido. */
export const REQUIRED_FIELDS = ["value"] as const;

/**
 * Lojas conhecidas. `aliases` cobre variações e erros de digitação
 * encontrados na base real (ex.: "mmg").
 */
export type StoreConfig = {
  code: string;
  label: string;
  shortLabel: string;
  role: "matriz" | "filial";
  aliases: string[];
};

export const STORES: StoreConfig[] = [
  {
    code: "AGNG",
    label: "Fruit Mania - Agulhas Negras",
    shortLabel: "Agulhas Negras",
    role: "matriz",
    aliases: ["ag ng", "agng", "ag. ng", "agulhas negras", "ag negras"],
  },
  {
    code: "MNG",
    label: "Fruit Mania - Mangueiral",
    shortLabel: "Mangueiral",
    role: "filial",
    aliases: ["mng", "mmg", "mangueiral", "m n g"],
  },
];

/**
 * Formas de pagamento. `canonical` é o rótulo exibido; `aliases` são os
 * valores encontrados na planilha. Nada aqui é inventado — todos os aliases
 * vieram da base de referência.
 */
export type PaymentConfig = {
  canonical: string;
  aliases: string[];
  /** true quando o alias é reconhecidamente ambíguo ou erro de digitação */
  flagged?: boolean;
};

export const PAYMENT_METHODS: PaymentConfig[] = [
  { canonical: "PIX", aliases: ["pix"] },
  { canonical: "Crédito", aliases: ["credito", "crédito", "cred", "cartao credito"] },
  { canonical: "Débito", aliases: ["debito", "débito", "deb", "cartao debito"] },
  { canonical: "DH", aliases: ["dh"] },
  { canonical: "ALM", aliases: ["alm", "al"], flagged: true },
  { canonical: "Link", aliases: ["link"] },
  { canonical: "A Prazo", aliases: ["a prazo", "aprazo", "prazo"] },
  { canonical: "DH/PIX", aliases: ["dh/pix", "dh pix"], flagged: true },
];

/** Valores que significam "campo não preenchido" em qualquer coluna de texto. */
export const PLACEHOLDER_VALUES = ["...", "..", ".", "-", "--", "n/a", "na", "x"];

export const UNKNOWN_PAYMENT_LABEL = "Não informado";
export const UNKNOWN_CUSTOMER_LABEL = "Não identificado";

/**
 * Faixas de valor recalculadas pelo sistema.
 *
 * A planilha traz a coluna "Vendas" como fórmula derivada do próprio Valor
 * (=IF(B<=50;"Baixa";IF(B<=150;"Média";"Alta"))). Recalculamos aqui para não
 * depender de fórmula quebrada, célula em branco ou cache desatualizado.
 * Os limites replicam a fórmula original.
 */
export const VALUE_BANDS = [
  { label: "Baixa", max: 50 },
  { label: "Média", max: 150 },
  { label: "Alta", max: Infinity },
];

/**
 * Ano assumido quando a aba não traz a data no conteúdo e o nome só tem
 * dia+mês (padrão DDMM). Null = usa o ano predominante nas demais abas e,
 * na falta disso, o ano corrente.
 */
export const DEFAULT_YEAR: number | null = null;

/** Intervalo padrão de verificação de alterações na planilha (ms). */
export const DEFAULT_POLL_INTERVAL_MS = 60_000;

/** Linha máxima varrida em busca do cabeçalho dentro de cada aba. */
export const HEADER_SEARCH_LIMIT = 15;
