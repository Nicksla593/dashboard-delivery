import {
  PAYMENT_METHODS,
  PLACEHOLDER_VALUES,
  STORES,
  TOTAL_LABELS,
  UNKNOWN_CUSTOMER_LABEL,
  UNKNOWN_PAYMENT_LABEL,
  VALUE_BANDS,
} from "./config";
import { slug } from "./mapping";

/** Texto limpo: espaços colapsados, sem espaço nas pontas. */
export function cleanText(input: unknown): string {
  return String(input ?? "").replace(/\s+/g, " ").trim();
}

export function isPlaceholder(input: unknown): boolean {
  const s = cleanText(input).toLowerCase();
  return s === "" || PLACEHOLDER_VALUES.includes(s);
}

export function isTotalLabel(input: unknown): boolean {
  return TOTAL_LABELS.includes(slug(input));
}

/**
 * Converte um valor monetário para número.
 *
 * A leitura usa UNFORMATTED_VALUE, então o caso comum já chega como número.
 * O tratamento de texto cobre planilhas preenchidas manualmente com
 * "R$ 1.234,56" ou coladas de outro sistema.
 */
export function parseMoney(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const raw = cleanText(input);
  if (!raw) return null;

  let s = raw.replace(/r\$/i, "").replace(/\s/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Formato brasileiro: ponto é milhar, vírgula é decimal.
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  s = s.replace(/[^0-9.\-]/g, "");
  if (!s || s === "-" || s === ".") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export type PaymentResult = {
  canonical: string;
  raw: string;
  recognized: boolean;
  flagged: boolean;
};

export function normalizePayment(input: unknown): PaymentResult {
  const raw = cleanText(input);
  if (isPlaceholder(raw)) {
    return { canonical: UNKNOWN_PAYMENT_LABEL, raw, recognized: true, flagged: false };
  }
  const key = slug(raw);
  for (const method of PAYMENT_METHODS) {
    if (method.aliases.includes(key)) {
      return {
        canonical: method.canonical,
        raw,
        recognized: true,
        flagged: Boolean(method.flagged) && key !== slug(method.canonical),
      };
    }
  }
  // Valor desconhecido: preserva como veio em vez de forçar em "Outros",
  // e sinaliza para a página de Qualidade dos Dados.
  return { canonical: raw, raw, recognized: false, flagged: false };
}

export type StoreResult = {
  code: string | null;
  label: string;
  raw: string;
  recognized: boolean;
};

export function normalizeStore(input: unknown): StoreResult {
  const raw = cleanText(input);
  if (isPlaceholder(raw)) {
    return { code: null, label: "Não informada", raw, recognized: true };
  }
  const key = slug(raw);
  for (const store of STORES) {
    if (store.aliases.map(slug).includes(key) || slug(store.label) === key) {
      return { code: store.code, label: store.shortLabel, raw, recognized: true };
    }
  }
  return { code: null, label: raw, raw, recognized: false };
}

export type CustomerResult = {
  name: string | null;
  raw: string;
  /** true quando o campo trazia o nome de uma loja em vez de um cliente. */
  isStoreName: boolean;
  isNumeric: boolean;
};

/**
 * Normaliza o nome do cliente.
 *
 * Dois casos da base real exigem cuidado. Primeiro, os pedidos da filial
 * Mangueiral trazem "mng" na coluna Cliente — é a loja, não um cliente.
 * Contá-lo como cliente colocaria a própria filial no topo do ranking.
 * Segundo, alguns registros trazem números (código interno ou telefone),
 * que ficam preservados mas marcados.
 */
export function normalizeCustomer(input: unknown): CustomerResult {
  const raw = cleanText(input);
  if (isPlaceholder(raw)) {
    return { name: null, raw, isStoreName: false, isNumeric: false };
  }

  const key = slug(raw);
  const isStoreName = STORES.some((s) => s.aliases.map(slug).includes(key));
  if (isStoreName) {
    return { name: null, raw, isStoreName: true, isNumeric: false };
  }

  const isNumeric = /^[\d\s.,-]+$/.test(raw);

  // Title case preservando preposições, para o ranking não ficar com
  // "maria isabel" e "Maria Isabel" como pessoas diferentes.
  const minor = new Set(["de", "da", "do", "das", "dos", "e"]);
  const name = raw
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && minor.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

  return { name, raw, isStoreName: false, isNumeric };
}

export function customerLabel(name: string | null): string {
  return name ?? UNKNOWN_CUSTOMER_LABEL;
}

/**
 * Recalcula a faixa de valor.
 *
 * A planilha traz essa coluna como fórmula derivada do valor. Recalcular
 * garante o mesmo resultado sem depender de fórmula intacta ou cache.
 */
export function computeBand(value: number): string {
  for (const band of VALUE_BANDS) {
    if (value <= band.max) return band.label;
  }
  return VALUE_BANDS[VALUE_BANDS.length - 1].label;
}
