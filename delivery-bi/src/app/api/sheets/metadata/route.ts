import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { describeAuth } from "@/lib/google/auth";
import { getSpreadsheetMeta, parseSpreadsheetId } from "@/lib/google/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Valida o link e devolve a identificação da planilha.
 * Não lê valores — é a chamada usada pelo botão "Conectar planilha".
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    const spreadsheetId = parseSpreadsheetId(body.url ?? "");
    const meta = await getSpreadsheetMeta(spreadsheetId);
    return NextResponse.json({ ...meta, auth: describeAuth() });
  } catch (error) {
    return errorResponse(error);
  }
}
