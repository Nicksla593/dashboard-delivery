import { REQUIRED_FIELDS } from "./config";
import { detectHeader, inferFallbackYear, resolveSheetDate } from "./mapping";
import {
  cleanText,
  computeBand,
  isTotalLabel,
  normalizeCustomer,
  normalizePayment,
  normalizeStore,
  parseMoney,
} from "./normalize";
import type { Issue, Order, QualityReport, SheetReport } from "./types";

export type RawSheet = { sheetName: string; rows: unknown[][] };

type TotalScan = {
  /** Índices de células que fazem parte de uma totalização. */
  masked: Set<number>;
  declaredTotal: number | null;
};

/**
 * Localiza células de totalização dentro de uma linha.
 *
 * Esta é a parte mais delicada do parser. Na maioria das abas a linha
 * "Total" fica isolada abaixo dos pedidos, e descartar a linha inteira
 * funcionaria. Mas na base de referência há abas (28/07 e 29/07) em que o
 * rótulo "Total" e o =SUM() foram parar nas colunas G e H **da mesma linha
 * de um pedido real** — descartar a linha apagaria dois pedidos legítimos e
 * o faturamento não bateria com o total declarado pela própria planilha.
 *
 * Por isso removemos células, nunca linhas: mascaramos o rótulo e o número
 * imediatamente à direita dele, e deixamos o resto da linha intacto.
 */
function scanTotals(row: unknown[]): TotalScan {
  const masked = new Set<number>();
  let declaredTotal: number | null = null;

  for (let i = 0; i < row.length; i++) {
    if (!isTotalLabel(row[i])) continue;
    masked.add(i);
    // O valor do total costuma estar na célula seguinte; aceitamos um
    // pequeno salto para tolerar uma célula vazia entre rótulo e número.
    for (let j = i + 1; j < Math.min(row.length, i + 3); j++) {
      const n = parseMoney(row[j]);
      if (n !== null) {
        masked.add(j);
        declaredTotal = n;
        break;
      }
      if (cleanText(row[j]) !== "") break;
    }
  }
  return { masked, declaredTotal };
}

function cellAt(row: unknown[], masked: Set<number>, index: number | undefined): unknown {
  if (index === undefined) return null;
  if (masked.has(index)) return null;
  return row[index] ?? null;
}

export type ConsolidateResult = {
  orders: Order[];
  quality: QualityReport;
};

export function consolidate(sheets: RawSheet[]): ConsolidateResult {
  const fallbackYear = inferFallbackYear(sheets);

  const orders: Order[] = [];
  const sheetReports: SheetReport[] = [];
  const issueCounts: Record<string, number> = {};
  const unrecognizedPayments = new Set<string>();
  const unrecognizedStores = new Set<string>();
  let unidentifiedCustomers = 0;
  let rowsReadTotal = 0;
  let skippedTotal = 0;
  let ordersWithIssues = 0;

  const countIssue = (code: string) => {
    issueCounts[code] = (issueCounts[code] ?? 0) + 1;
  };

  for (const sheet of sheets) {
    const rows = sheet.rows ?? [];
    const errors: string[] = [];
    const { headerRow, columns } = detectHeader(rows);
    const sheetDate = resolveSheetDate(sheet.sheetName, rows, headerRow, fallbackYear);

    if (headerRow === null) {
      errors.push("Cabeçalho não identificado — aba ignorada.");
      sheetReports.push({
        sheetName: sheet.sheetName,
        date: sheetDate.date,
        dateSource: sheetDate.source,
        headerRow: null,
        rowsRead: rows.length,
        validOrders: 0,
        skippedRows: rows.length,
        totalCellsRemoved: 0,
        declaredTotal: null,
        computedTotal: 0,
        totalDelta: null,
        errors,
      });
      rowsReadTotal += rows.length;
      skippedTotal += rows.length;
      continue;
    }

    if (sheetDate.conflict) errors.push(sheetDate.conflict);
    if (sheetDate.date === null) {
      errors.push("Data da aba não pôde ser determinada — pedidos ficam fora da série temporal.");
    }

    const missingFields = REQUIRED_FIELDS.filter((f) => columns[f] === undefined);
    if (missingFields.length) {
      errors.push(`Colunas obrigatórias ausentes: ${missingFields.join(", ")}.`);
    }

    let rowsRead = 0;
    let validOrders = 0;
    let skipped = 0;
    let totalCellsRemoved = 0;
    let declaredTotal: number | null = null;
    let computedTotal = 0;

    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      const isBlank = row.every((c) => cleanText(c) === "");
      if (isBlank) continue;

      rowsRead++;

      const { masked, declaredTotal: rowTotal } = scanTotals(row);
      if (rowTotal !== null) declaredTotal = rowTotal;
      totalCellsRemoved += masked.size;

      const value = parseMoney(cellAt(row, masked, columns.value));

      if (value === null) {
        // Linhas pré-numeradas: a planilha traz a coluna Qntd. preenchida
        // até 50 mesmo sem pedido. Não são pedidos.
        skipped++;
        const seq = cellAt(row, masked, columns.sequence);
        countIssue(cleanText(seq) !== "" ? "linha_pre_numerada" : "valor_ausente");
        continue;
      }

      const issues: Issue[] = [];
      if (masked.size > 0) {
        issues.push({
          code: "celula_total_removida",
          detail: "Linha continha célula de totalização; apenas a célula foi ignorada.",
        });
      }

      const customer = normalizeCustomer(cellAt(row, masked, columns.customer));
      const payment = normalizePayment(cellAt(row, masked, columns.payment));
      const store = normalizeStore(cellAt(row, masked, columns.store));
      const bandRawCell = cellAt(row, masked, columns.band);
      const sequenceRaw = parseMoney(cellAt(row, masked, columns.sequence));

      if (customer.isStoreName) {
        issues.push({
          code: "cliente_e_nome_de_loja",
          detail: `Campo Cliente continha "${customer.raw}", que é uma loja.`,
        });
      } else if (customer.name === null) {
        issues.push({ code: "cliente_ausente" });
      } else if (customer.isNumeric) {
        issues.push({ code: "cliente_numerico", detail: customer.raw });
      }
      if (customer.name === null) unidentifiedCustomers++;

      if (!payment.recognized) {
        issues.push({ code: "pagamento_nao_reconhecido", detail: payment.raw });
        unrecognizedPayments.add(payment.raw);
      } else if (payment.flagged) {
        issues.push({ code: "pagamento_ambiguo", detail: payment.raw });
      } else if (payment.raw === "") {
        issues.push({ code: "pagamento_ausente" });
      }

      if (!store.recognized) {
        issues.push({ code: "loja_nao_reconhecida", detail: store.raw });
        unrecognizedStores.add(store.raw);
      } else if (store.code === null) {
        issues.push({ code: "loja_ausente" });
      }

      if (sheetDate.conflict) {
        issues.push({ code: "data_divergente", detail: sheetDate.conflict });
      }

      issues.forEach((i) => countIssue(i.code));
      if (issues.length) ordersWithIssues++;

      orders.push({
        // Aba + linha física: estável entre atualizações, independente de
        // ordenação e sem alterar nada na planilha original.
        id: `${sheet.sheetName}:${r + 1}`,
        date: sheetDate.date ?? "",
        sourceSheet: sheet.sheetName,
        rowIndex: r + 1,
        sequence: sequenceRaw,
        value,
        customer: customer.name,
        customerRaw: customer.raw,
        payment: payment.canonical,
        paymentRaw: payment.raw,
        storeCode: store.code,
        storeLabel: store.label,
        storeRaw: store.raw,
        band: computeBand(value),
        bandRaw: cleanText(bandRawCell) || null,
        issues,
      });

      validOrders++;
      computedTotal += value;
    }

    const delta =
      declaredTotal === null ? null : Number((computedTotal - declaredTotal).toFixed(2));
    if (declaredTotal !== null && delta !== null && Math.abs(delta) >= 0.01) {
      errors.push(
        `Soma dos pedidos (${computedTotal.toFixed(2)}) diverge do total declarado na aba (${declaredTotal.toFixed(2)}).`,
      );
    }

    rowsReadTotal += rowsRead;
    skippedTotal += skipped;

    sheetReports.push({
      sheetName: sheet.sheetName,
      date: sheetDate.date,
      dateSource: sheetDate.source,
      headerRow: headerRow + 1,
      rowsRead,
      validOrders,
      skippedRows: skipped,
      totalCellsRemoved,
      declaredTotal,
      computedTotal: Number(computedTotal.toFixed(2)),
      totalDelta: delta,
      errors,
    });
  }

  orders.sort((a, b) =>
    a.date === b.date ? a.rowIndex - b.rowIndex : a.date.localeCompare(b.date),
  );

  return {
    orders,
    quality: {
      sheetsProcessed: sheets.length,
      rowsRead: rowsReadTotal,
      validOrders: orders.length,
      skippedRows: skippedTotal,
      ordersWithIssues,
      issueCounts,
      unrecognizedPayments: [...unrecognizedPayments],
      unrecognizedStores: [...unrecognizedStores],
      unidentifiedCustomers,
      sheets: sheetReports,
    },
  };
}
