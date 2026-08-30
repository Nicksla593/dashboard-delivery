/**
 * Verificação do parser contra a planilha real de referência.
 *
 * Roda o pipeline completo (mapeamento -> normalização -> consolidação)
 * sobre um fixture com o conteúdo bruto das 31 abas e confere os números
 * contra os totais declarados pela própria planilha.
 *
 *   npx tsx scripts/verify-parser.ts caminho/para/fixture.json
 */
import { readFileSync } from "node:fs";
import { consolidate, type RawSheet } from "../src/lib/consolidate";
import { computeKpis } from "../src/lib/metrics";

const path = process.argv[2] ?? "fixture.json";
const sheets = JSON.parse(readFileSync(path, "utf8")) as RawSheet[];

const { orders, quality } = consolidate(sheets);
const kpis = computeKpis(orders);

console.log("Abas processadas ....", quality.sheetsProcessed);
console.log("Linhas lidas ........", quality.rowsRead);
console.log("Pedidos válidos .....", quality.validOrders);
console.log("Linhas ignoradas ....", quality.skippedRows);
console.log("Faturamento .........", kpis.revenue.toFixed(2));
console.log("Ticket médio ........", kpis.averageTicket.toFixed(2));
console.log("Clientes únicos .....", kpis.uniqueCustomers);
console.log("Dias com movimento ..", kpis.activeDays);

const declared = quality.sheets.reduce((s, x) => s + (x.declaredTotal ?? 0), 0);
console.log("\nSoma dos totais declarados na planilha:", declared.toFixed(2));
console.log("Diferença contra o calculado:", (kpis.revenue - declared).toFixed(2));

const divergent = quality.sheets.filter(
  (s) => s.totalDelta !== null && Math.abs(s.totalDelta) >= 0.01,
);
console.log("\nAbas com divergência de total:", divergent.length);
divergent.forEach((s) =>
  console.log(`  ${s.sheetName}: lido ${s.computedTotal} vs declarado ${s.declaredTotal}`),
);

console.log("\nObservações:");
Object.entries(quality.issueCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([code, n]) => console.log(`  ${code.padEnd(28)} ${n}`));

console.log("\nFormas de pagamento não reconhecidas:", quality.unrecognizedPayments);
console.log("Lojas não reconhecidas:", quality.unrecognizedStores);
