import { NextResponse } from "next/server";
import { AuthConfigError, describeAuth } from "./google/auth";
import { SheetsAccessError } from "./google/client";

/**
 * Converte qualquer falha do pipeline em uma resposta com mensagem que o
 * gestor consiga entender e agir — sem vazar detalhe de credencial.
 */
export function errorResponse(error: unknown) {
  if (error instanceof SheetsAccessError) {
    return NextResponse.json(
      { error: error.message, kind: "acesso", identity: describeAuth().identity },
      { status: error.status },
    );
  }
  if (error instanceof AuthConfigError) {
    return NextResponse.json({ error: error.message, kind: "configuracao" }, { status: 500 });
  }
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  return NextResponse.json({ error: message, kind: "desconhecido" }, { status: 500 });
}
