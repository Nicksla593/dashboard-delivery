/**
 * Gera o refresh token do Google usado pelo modo OAuth.
 *
 * Rode uma única vez, na sua máquina:
 *
 *   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... \
 *     node scripts/get-refresh-token.mjs
 *
 * O script abre um endereço para você autorizar no navegador e imprime o
 * refresh token no terminal. Copie-o para a variável
 * GOOGLE_OAUTH_REFRESH_TOKEN. Ele não expira sozinho — só deixa de valer se
 * você revogar o acesso na conta Google.
 */
import { createServer } from "node:http";
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const PORT = 5858;
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;

if (!clientId || !clientSecret) {
  console.error(
    "Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET antes de rodar.",
  );
  process.exit(1);
}

const client = new OAuth2Client({
  clientId,
  clientSecret,
  redirectUri: REDIRECT,
});

const url = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
  ],
});

const server = createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404).end();
    return;
  }
  const code = new URL(req.url, `http://localhost:${PORT}`).searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Código de autorização ausente.");
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<p>Pronto. Volte ao terminal e copie o refresh token.</p>");
    console.log("\nGOOGLE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token + "\n");
    if (!tokens.refresh_token) {
      console.log(
        "O Google não devolveu refresh token. Remova o acesso do app em",
        "https://myaccount.google.com/permissions e rode de novo.",
      );
    }
  } catch (err) {
    res.writeHead(500).end("Falha ao trocar o código pelo token.");
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("\nAbra este endereço no navegador e autorize o acesso:\n");
  console.log(url + "\n");
});
