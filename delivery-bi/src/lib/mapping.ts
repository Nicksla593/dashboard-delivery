import { HEADER_ALIASES, HEADER_SEARCH_LIMIT, DEFAULT_YEAR } from "./config";

/** Reduz um texto a uma chave comparável: minúsculo, sem acento, sem pontuação. */
export function slug(input: unknown): string {
  return String(input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ColumnMap = Partial<Record<keyof typeof HEADER_ALIASES, number>>;

function matchHeaderCell(cell: unknown): string | null {
  const key = slug(cell);
  if (!key) return null;
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key)) return field;
  }
  return null;
}

export type HeaderDetection = {
  headerRow: number | null;
  columns: ColumnMap;
  score: number;
};

/**
 * Encontra a linha de cabeçalho por pontuação, não por posição fixa.
 *
 * Na base de referência o cabeçalho está sempre na linha 4, mas depender
 * disso quebraria em qualquer aba que ganhasse uma linha a mais no topo.
 * Varremos as primeiras linhas e ficamos com a que reconhece mais campos.
 */
export function detectHeader(rows: unknown[][]): HeaderDetection {
  let best: HeaderDetection = { headerRow: null, columns: {}, score: 0 };

  const limit = Math.min(rows.length, HEADER_SEARCH_LIMIT);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] || [];
    const columns: ColumnMap = {};
    let score = 0;
    for (let c = 0; c < row.length; c++) {
      const field = matchHeaderCell(row[c]);
      if (field && columns[field as keyof ColumnMap] === undefined) {
        columns[field as keyof ColumnMap] = c;
        score++;
      }
    }
    // Exigir ao menos valor + um identificador para evitar falso positivo
    // em linhas de título.
    const usable = columns.value !== undefined && score >= 2;
    if (usable && score > best.score) {
      best = { headerRow: i, columns, score };
    }
  }
  return best;
}

export type SheetDate = {
  date: string | null;
  source: "conteudo" | "nome_da_aba" | "indefinida";
  /** Preenchido quando conteúdo e nome da aba discordam. */
  conflict?: string;
};

function toIso(day: number, month: number, year: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return d.toISOString().slice(0, 10);
}

function expandYear(y: number): number {
  if (y >= 1000) return y;
  return y < 70 ? 2000 + y : 1900 + y;
}

/** Procura uma data escrita em qualquer célula das primeiras linhas. */
function dateFromContent(rows: unknown[][], headerRow: number | null): string | null {
  const limit = headerRow ?? Math.min(rows.length, HEADER_SEARCH_LIMIT);
  for (let i = 0; i < limit; i++) {
    for (const cell of rows[i] || []) {
      const text = String(cell ?? "");
      const m = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
      if (m) {
        const iso = toIso(Number(m[1]), Number(m[2]), expandYear(Number(m[3])));
        if (iso) return iso;
      }
    }
  }
  return null;
}

/** Interpreta nomes de aba no padrão DDMM ou DDMMAA / DDMMAAAA. */
function dateFromSheetName(name: string, fallbackYear: number): string | null {
  const digits = name.replace(/\D/g, "");
  if (digits.length === 8) {
    return toIso(Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), Number(digits.slice(4)));
  }
  if (digits.length === 6) {
    return toIso(
      Number(digits.slice(0, 2)),
      Number(digits.slice(2, 4)),
      expandYear(Number(digits.slice(4))),
    );
  }
  if (digits.length === 4) {
    return toIso(Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), fallbackYear);
  }
  return null;
}

/**
 * Resolve a data da aba.
 *
 * A prioridade é o conteúdo, porque o nome da aba não carrega o ano. Mas o
 * conteúdo não é confiável sozinho: na base de referência a aba 2707 está
 * sem o título de data. Por isso o nome da aba entra como fallback, e
 * divergência entre os dois vira alerta em vez de erro.
 */
export function resolveSheetDate(
  sheetName: string,
  rows: unknown[][],
  headerRow: number | null,
  fallbackYear: number,
): SheetDate {
  const fromContent = dateFromContent(rows, headerRow);
  const fromName = dateFromSheetName(sheetName, fallbackYear);

  if (fromContent && fromName && fromContent.slice(5) !== fromName.slice(5)) {
    return {
      date: fromContent,
      source: "conteudo",
      conflict: `Título indica ${fromContent}, nome da aba indica ${fromName}.`,
    };
  }
  if (fromContent) return { date: fromContent, source: "conteudo" };
  if (fromName) return { date: fromName, source: "nome_da_aba" };
  return { date: null, source: "indefinida" };
}

/**
 * Descobre o ano predominante lendo o conteúdo de todas as abas, para que
 * abas sem título (que só têm DDMM no nome) herdem o ano correto em vez de
 * cair no ano corrente.
 */
export function inferFallbackYear(sheets: { rows: unknown[][] }[]): number {
  if (DEFAULT_YEAR) return DEFAULT_YEAR;
  const counts = new Map<number, number>();
  for (const sheet of sheets) {
    const iso = dateFromContent(sheet.rows, null);
    if (iso) {
      const y = Number(iso.slice(0, 4));
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
  }
  let best = new Date().getFullYear();
  let bestCount = 0;
  for (const [year, count] of counts) {
    if (count > bestCount) {
      best = year;
      bestCount = count;
    }
  }
  return best;
}
