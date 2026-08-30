import { NextResponse } from "next/server";
import { consolidate } from "@/lib/consolidate";
import {
  getRevision,
  getSpreadsheetMeta,
  parseSpreadsheetId,
  readAllSheets,
} from "@/lib/google/client";
import type { Dataset } from "@/lib/types";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Leitura completa da planilha.
 *
 * Estratégia de atualização: o cliente manda a revisão que já possui. O
 * servidor consulta o modifiedTime do arquivo no Drive — uma chamada barata
 * — e, se nada mudou, responde `unchanged` sem ler nenhuma célula. Isso
 * permite verificar a cada minuto sem estourar a cota da Sheets API.
 *
 * Não é tempo real de verdade: a Sheets API não empurra eventos. A latência
 * é o intervalo de verificação configurado no cliente.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      spreadsheetId?: string;
      knownRevision?: string | null;
      force?: boolean;
    };

    const spreadsheetId = body.spreadsheetId
      ? body.spreadsheetId
      : parseSpreadsheetId(body.url ?? "");

    const revision = await getRevision(spreadsheetId);

    if (!body.force && revision && body.knownRevision && revision === body.knownRevision) {
      return NextResponse.json({
        unchanged: true,
        revision,
        checkedAt: new Date().toISOString(),
      });
    }

    const meta = await getSpreadsheetMeta(spreadsheetId);
    const sheetNames = meta.sheets.map((s) => s.title);
    const raw = await readAllSheets(spreadsheetId, sheetNames);
    const { orders, quality } = consolidate(raw);

    const dataset: Dataset = {
      spreadsheetId,
      spreadsheetTitle: meta.title,
      spreadsheetUrl: meta.spreadsheetUrl,
      fetchedAt: new Date().toISOString(),
      revision,
      orders,
      quality,
    };

    return NextResponse.json({ unchanged: false, dataset });
  } catch (error) {
    return errorResponse(error);
  }
}
