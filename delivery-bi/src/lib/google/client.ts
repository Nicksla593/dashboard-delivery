import { getAccessToken } from "./auth";

/** Erro de acesso à planilha, com mensagem já pronta para o usuário final. */
export class SheetsAccessError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Extrai o ID da planilha a partir de uma URL do Google Sheets.
 * Aceita também o ID puro, caso o usuário cole só ele.
 */
export function parseSpreadsheetId(input: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    throw new SheetsAccessError("Informe a URL da planilha.");
  }
  const fromUrl = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) return fromUrl[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  throw new SheetsAccessError(
    "Esse link não parece ser de uma planilha do Google Sheets. Copie a URL da barra de endereços com a planilha aberta.",
  );
}

async function googleFetch<T>(url: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (res.ok) return (await res.json()) as T;

  const body = await res.text();
  if (res.status === 403) {
    throw new SheetsAccessError(
      "Sem permissão para abrir esta planilha. Compartilhe-a com a conta configurada no sistema (permissão de Leitor) e tente de novo.",
      403,
    );
  }
  if (res.status === 404) {
    throw new SheetsAccessError(
      "Planilha não encontrada. Confira se o link está correto e se o arquivo não foi movido para a lixeira.",
      404,
    );
  }
  if (res.status === 429) {
    throw new SheetsAccessError(
      "Limite de requisições do Google atingido. Aguarde um instante antes de atualizar novamente.",
      429,
    );
  }
  throw new SheetsAccessError(
    `Erro ao consultar o Google (${res.status}). ${body.slice(0, 200)}`,
    res.status,
  );
}

export type SpreadsheetMeta = {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: { title: string; rowCount: number; columnCount: number }[];
};

/** Metadados: título e lista de abas. Não lê valores. */
export async function getSpreadsheetMeta(spreadsheetId: string): Promise<SpreadsheetMeta> {
  type Raw = {
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: { title: string };
    sheets: {
      properties: {
        title: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }[];
  };
  const data = await googleFetch<Raw>(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties`,
  );
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title ?? "Planilha sem título",
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: (data.sheets || []).map((s) => ({
      title: s.properties.title,
      rowCount: s.properties.gridProperties?.rowCount ?? 0,
      columnCount: s.properties.gridProperties?.columnCount ?? 0,
    })),
  };
}

/**
 * modifiedTime do arquivo no Drive.
 *
 * É a chamada mais barata que existe para saber se a planilha mudou. O
 * polling consulta isto primeiro e só lê os valores quando o timestamp
 * muda — o que mantém o consumo de cota baixo mesmo com intervalo curto.
 */
export async function getRevision(spreadsheetId: string): Promise<string | null> {
  try {
    const data = await googleFetch<{ modifiedTime: string }>(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=modifiedTime&supportsAllDrives=true`,
    );
    return data.modifiedTime ?? null;
  } catch (err) {
    // A Drive API é um otimização, não um requisito. Sem ela o sistema
    // simplesmente relê a planilha a cada ciclo.
    if (err instanceof SheetsAccessError && err.status === 403) return null;
    return null;
  }
}

export type SheetValues = { sheetName: string; rows: unknown[][] };

/**
 * Lê todas as abas em uma única chamada batchGet.
 *
 * UNFORMATTED_VALUE devolve números como número, evitando ter que
 * desfazer formatação monetária brasileira. Quando o valor vier como texto
 * (planilha preenchida com aspas, colagem de outro sistema), a normalização
 * cuida disso adiante.
 */
export async function readAllSheets(
  spreadsheetId: string,
  sheetNames: string[],
): Promise<SheetValues[]> {
  if (sheetNames.length === 0) return [];

  const results: SheetValues[] = [];
  // A API limita o tamanho da URL; 40 abas por lote é folgado e seguro.
  const CHUNK = 40;
  for (let i = 0; i < sheetNames.length; i += CHUNK) {
    const chunk = sheetNames.slice(i, i + CHUNK);
    const ranges = chunk.map((n) => `ranges=${encodeURIComponent(`'${n.replace(/'/g, "''")}'`)}`).join("&");
    const data = await googleFetch<{ valueRanges: { range: string; values?: unknown[][] }[] }>(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&majorDimension=ROWS`,
    );
    (data.valueRanges || []).forEach((vr, idx) => {
      results.push({ sheetName: chunk[idx], rows: vr.values ?? [] });
    });
  }
  return results;
}
