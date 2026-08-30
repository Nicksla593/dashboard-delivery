# Delivery BI — Fruit Mania

Dashboard de análise operacional e financeira do delivery, lendo os dados
direto de uma planilha do Google Sheets. Nada é importado, copiado ou colado:
a planilha continua sendo a fonte única, e a dashboard reflete o que estiver
lá dentro.

---

## Índice

1. [Como funciona](#como-funciona)
2. [Rodando na sua máquina](#rodando-na-sua-máquina)
3. [Configurar o acesso ao Google](#configurar-o-acesso-ao-google)
4. [Publicar na internet](#publicar-na-internet)
5. [Conectar uma planilha nova](#conectar-uma-planilha-nova)
6. [Como a planilha é interpretada](#como-a-planilha-é-interpretada)
7. [Ajustar as regras](#ajustar-as-regras)
8. [Estrutura de pastas](#estrutura-de-pastas)

---

## Como funciona

```
Google Sheets
     ↓  Sheets API (leitura) + Drive API (detecção de alteração)
Camada de conexão      src/lib/google/
     ↓
Camada de ingestão     batchGet de todas as abas em uma chamada
     ↓
Camada de mapeamento   src/lib/mapping.ts     encontra cabeçalho e data
     ↓
Camada de normalização src/lib/normalize.ts   limpa valores, clientes, pagamentos
     ↓
Camada de consolidação src/lib/consolidate.ts vira uma lista única de pedidos
     ↓
Camada de cálculo      src/lib/metrics.ts     funções puras, sem UI
     ↓
Camada visual          src/app/ + src/components/
```

Os componentes não calculam nada e o parser não sabe o que é um gráfico. Cada
camada pode ser testada sozinha.

### Atualização dos dados

O Google Sheets não avisa o sistema quando alguém edita a planilha, então não
existe tempo real de verdade aqui. O que existe é uma verificação periódica
barata: a cada intervalo, o servidor consulta o `modifiedTime` do arquivo no
Drive. Se o horário não mudou, a resposta é imediata e nenhuma célula é lida.
Só quando o arquivo muda é que a planilha inteira é relida e reprocessada.

Na prática: um pedido lançado às 10h05 aparece na dashboard até 10h06 com o
intervalo padrão de um minuto. O botão **Atualizar agora** força a leitura na
hora. O intervalo é ajustável em `/conexao`.

---

## Rodando na sua máquina

Requisitos: Node.js 18.17 ou mais novo.

```bash
npm install
cp .env.example .env.local   # preencha conforme a próxima seção
npm run dev
```

Abra `http://localhost:3000`.

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run build` | Compila para produção |
| `npm start` | Sobe a versão compilada |
| `npm run typecheck` | Verifica os tipos sem compilar |
| `npx tsx scripts/verify-parser.ts fixture.json` | Roda o parser sobre um dump da planilha e confere os totais |

---

## Configurar o acesso ao Google

Independente do modo escolhido, faça primeiro isto no
[Google Cloud Console](https://console.cloud.google.com):

1. Crie um projeto (ou selecione um existente).
2. Em **APIs e serviços → Biblioteca**, ative **Google Sheets API**.
3. Ative também **Google Drive API** — é ela que informa quando a planilha
   mudou. Sem ela o sistema funciona, mas relê a planilha inteira a cada
   ciclo, gastando mais cota.

Agora escolha um dos dois modos.

### Modo A — OAuth (recomendado se a criação de chaves estiver bloqueada)

Use este modo quando o Console exibir *"A criação da chave da conta de serviço
está desativada"* (política `iam.disableServiceAccountKeyCreation`). Ele não
usa chave nenhuma, então a política não se aplica.

1. Em **APIs e serviços → Tela de permissão OAuth**, configure a tela. Tipo
   **Externo** serve; adicione seu e-mail em *Usuários de teste*.
2. Em **Credenciais → Criar credenciais → ID do cliente OAuth**, escolha
   **App para computador**. Anote o *Client ID* e o *Client secret*.
3. Gere o refresh token uma única vez, na sua máquina:

   ```bash
   GOOGLE_OAUTH_CLIENT_ID=seu-id \
   GOOGLE_OAUTH_CLIENT_SECRET=seu-secret \
   node scripts/get-refresh-token.mjs
   ```

   O script imprime um endereço. Abra no navegador, autorize com a conta que
   enxerga a planilha, e o refresh token aparece no terminal.

4. Preencha `.env.local`:

   ```
   GOOGLE_AUTH_MODE=oauth
   GOOGLE_OAUTH_CLIENT_ID=...
   GOOGLE_OAUTH_CLIENT_SECRET=...
   GOOGLE_OAUTH_REFRESH_TOKEN=...
   ```

Como o token pertence à sua conta, o sistema enxerga as mesmas planilhas que
você — não é preciso compartilhar nada com ninguém.

### Modo B — Conta de serviço

1. Em **IAM e administrador → Contas de serviço**, crie uma conta.
2. Na aba **Chaves**, gere uma chave **JSON** e baixe o arquivo.
3. Preencha `.env.local` com o JSON inteiro em uma linha:

   ```
   GOOGLE_AUTH_MODE=service_account
   GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account", ...}
   ```

4. Abra a planilha no Google Sheets, clique em **Compartilhar** e adicione o
   `client_email` da conta de serviço como **Leitor**.

Se o passo 2 falhar com a mensagem sobre política da organização, você tem
três saídas: usar o Modo A; criar o projeto em uma conta Google pessoal, que
não pertence a nenhuma organização; ou pedir a um administrador com o papel
*Administrador de políticas da organização* que abra exceção para o projeto.

### Segurança

Nenhuma dessas variáveis chega ao navegador. Elas só existem no servidor, e
todas as chamadas ao Google saem das rotas em `src/app/api/`. Nunca prefixe
essas variáveis com `NEXT_PUBLIC_` — isso as exporia no frontend.

---

## Publicar na internet

### Vercel

1. Suba o projeto para um repositório Git.
2. Em [vercel.com](https://vercel.com), importe o repositório. O Next.js é
   detectado sozinho.
3. Em **Settings → Environment Variables**, cadastre as mesmas variáveis do
   `.env.local`. Marque para *Production* e *Preview*.
4. Faça o deploy.

### Qualquer servidor com Node

```bash
npm ci
npm run build
npm start          # sobe na porta 3000
```

Coloque um proxy reverso com HTTPS na frente. As variáveis de ambiente
precisam estar definidas no processo que roda `npm start`.

---

## Conectar uma planilha nova

1. Abra `/conexao`.
2. Cole a URL da planilha e clique em **Conectar planilha**.
3. Se aparecer erro de permissão: no Modo B, compartilhe a planilha com o
   e-mail da conta de serviço; no Modo A, confirme que a planilha está na
   conta que autorizou o acesso.

A última planilha usada fica salva no navegador e é reconectada sozinha na
próxima visita.

O sistema não exige que a planilha nova seja idêntica à de referência. Ele
procura o cabeçalho nas primeiras linhas de cada aba e reconhece as colunas
por nome, aceitando as variações listadas em `src/lib/config.ts`. Abas com
número diferente de linhas, colunas extras ou cabeçalho em outra altura
funcionam sem ajuste.

---

## Como a planilha é interpretada

Estas regras vieram da análise da planilha real de julho/2026 (31 abas,
896 pedidos, R$ 104.122,55). O script `verify-parser.ts` confere o resultado
contra os totais que a própria planilha declara — atualmente com diferença
zero em todas as abas.

**Uma aba por dia.** A data sai do título no topo (`ENTREGAS - 01/07/26`) e,
quando ele não existe, do nome da aba no padrão `DDMM`. O ano vem das demais
abas. Se as duas fontes discordarem, a dashboard usa o título e registra o
conflito na página de qualidade.

**"Qntd." não é quantidade.** É a numeração sequencial do pedido dentro do
dia. Nenhum indicador usa essa coluna como quantidade de itens.

**Linhas pré-numeradas não são pedidos.** As abas trazem a coluna de
numeração preenchida até o fim mesmo sem pedido. Só vira pedido a linha que
tem valor.

**Células de "Total" são removidas, não linhas.** Na maioria das abas a
totalização fica em uma linha própria. Mas em algumas ela foi parar em
colunas à direita, na mesma linha de um pedido real — descartar a linha
inteira apagaria pedidos legítimos e o faturamento não bateria. Por isso o
parser mascara apenas o rótulo e o número ao lado dele.

**A faixa Alta/Média/Baixa é recalculada.** Na planilha essa coluna é uma
fórmula derivada do valor. O sistema aplica os mesmos limites (até 50 =
Baixa, até 150 = Média, acima = Alta), o que dá o mesmo resultado sem
depender de fórmula intacta.

**Lojas.** `ag ng` é a matriz Agulhas Negras e `mng` é a filial Mangueiral.
Os pedidos das duas entram normalmente em todos os indicadores.

**Cliente com nome de loja.** Os pedidos da filial trazem "mng" na coluna
Cliente. Isso é a loja, não uma pessoa: esses pedidos contam no faturamento
e na contagem, mas ficam fora do ranking de clientes, agrupados como
"Não identificado".

**Formas de pagamento.** Variações como `PIX`/`pix`, `DH`/`dh` e `al`/`alm`
são unificadas. `...` e células vazias viram "Não informado". Valores
desconhecidos são preservados como estão e listados na página de qualidade,
em vez de sumirem dentro de um "Outros".

**Dias sem movimento aparecem como zero.** Se sumissem do gráfico, a média
diária ficaria inflada.

---

## Ajustar as regras

Quase tudo que depende de como a operação preenche a planilha está em
`src/lib/config.ts`:

| O que ajustar | Onde |
| --- | --- |
| Nome novo de coluna | `HEADER_ALIASES` |
| Loja nova ou erro de digitação | `STORES[].aliases` |
| Forma de pagamento nova | `PAYMENT_METHODS` |
| Limites de Alta/Média/Baixa | `VALUE_BANDS` |
| Marcadores de "não preenchido" | `PLACEHOLDER_VALUES` |
| Intervalo padrão de verificação | `DEFAULT_POLL_INTERVAL_MS` |

A página **Qualidade dos dados** lista os valores que o sistema encontrou e
não reconheceu — é de lá que sai a lista do que adicionar aqui.

---

## Estrutura de pastas

```
src/
  app/
    api/sheets/metadata/    valida o link, devolve título e abas
    api/sheets/data/        lê, consolida e devolve os pedidos
    conexao/                tela de conexão e atualização automática
    dashboard/              KPIs, pedidos e faturamento por dia, top clientes
    diario/                 tabela operacional dia a dia
    clientes/               rankings e tabela completa de clientes
    pagamentos/             formas de pagamento, lojas e faixas de valor
    dados/                  qualidade dos dados e detalhe por aba
  components/               KPI card, filtros, tabela, gráficos, estados
  lib/
    config.ts               regras de negócio editáveis
    google/                 autenticação e chamadas à API
    mapping.ts              cabeçalho, colunas e data da aba
    normalize.ts            limpeza de valores e categorias
    consolidate.ts          linhas cruas -> pedidos + relatório de qualidade
    metrics.ts              KPIs e agregações (funções puras)
    types.ts                modelo de dados
  store/
    DatasetProvider.tsx     conexão, filtros e verificação periódica
scripts/
  get-refresh-token.mjs     gera o refresh token do modo OAuth
  verify-parser.ts          confere o parser contra os totais da planilha
```
