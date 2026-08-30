import { JWT, OAuth2Client } from "google-auth-library";

/**
 * Camada de autenticação.
 *
 * Dois modos, escolhidos por variável de ambiente. O resto do sistema não
 * sabe qual está em uso — só pede um access token.
 *
 *  - "service_account": chave JSON de uma conta de serviço. Exige que a
 *    planilha seja compartilhada com o e-mail da conta de serviço.
 *
 *  - "oauth": client id/secret + refresh token de uma conta Google comum.
 *    Use este modo quando a organização bloqueia criação de chaves
 *    (política iam.disableServiceAccountKeyCreation).
 *
 * Nada disso roda no browser. Estes valores só existem no servidor.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
];

export type AuthMode = "service_account" | "oauth";

export class AuthConfigError extends Error {}

function getMode(): AuthMode {
  const mode = (process.env.GOOGLE_AUTH_MODE || "").trim();
  if (mode === "service_account" || mode === "oauth") return mode;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) return "service_account";
  if (process.env.GOOGLE_OAUTH_REFRESH_TOKEN) return "oauth";
  throw new AuthConfigError(
    "Nenhum método de autenticação configurado. Defina GOOGLE_AUTH_MODE como 'service_account' ou 'oauth' e as variáveis correspondentes.",
  );
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function buildServiceAccountClient(): JWT {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new AuthConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY não definida. Cole o JSON da conta de serviço (em uma linha) nessa variável.",
    );
  }
  let parsed: { client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AuthConfigError(
      "GOOGLE_SERVICE_ACCOUNT_KEY não é um JSON válido. Verifique se o conteúdo foi colado inteiro e sem quebras de linha.",
    );
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new AuthConfigError(
      "JSON da conta de serviço incompleto: faltam client_email ou private_key.",
    );
  }
  return new JWT({
    email: parsed.client_email,
    // Em algumas plataformas as quebras de linha viram \n literais.
    key: parsed.private_key.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
}

function buildOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new AuthConfigError(
      "Modo OAuth exige GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET e GOOGLE_OAUTH_REFRESH_TOKEN.",
    );
  }
  const client = new OAuth2Client({ clientId, clientSecret });
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/** Retorna um access token válido, reaproveitando o anterior enquanto durar. */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const mode = getMode();
  const client = mode === "service_account" ? buildServiceAccountClient() : buildOAuthClient();

  const res = await client.getAccessToken();
  const token = typeof res === "string" ? res : res?.token;
  if (!token) {
    throw new AuthConfigError(
      mode === "service_account"
        ? "Não foi possível obter token com a conta de serviço. Verifique se as APIs Sheets e Drive estão habilitadas no projeto."
        : "Não foi possível renovar o token OAuth. O refresh token pode ter sido revogado — gere um novo.",
    );
  }

  // google-auth-library expõe a expiração nas credenciais após a chamada.
  const expiry = (client.credentials?.expiry_date as number | undefined) ?? Date.now() + 3_300_000;
  cachedToken = { token, expiresAt: expiry };
  return token;
}

/** Identidade em uso, exibida na tela de conexão para orientar o compartilhamento. */
export function describeAuth(): { mode: AuthMode; identity: string | null } {
  try {
    const mode = getMode();
    if (mode === "service_account") {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || "{}");
      return { mode, identity: parsed.client_email ?? null };
    }
    return { mode, identity: null };
  } catch {
    return { mode: "service_account", identity: null };
  }
}
