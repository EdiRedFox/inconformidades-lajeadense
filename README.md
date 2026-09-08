# Controle de Inconformidades — Lajeadense Vidros

Micro SaaS para registro e acompanhamento de inconformidades de qualidade,
com painel de indicadores. Front-end em HTML/CSS/JS puro (sem framework),
back-end como funções serverless na Vercel, e Google Sheets como banco de
dados (com Google Drive opcional para armazenar as fotos anexadas).

## Estrutura do projeto

```
lajeadense-inconformidades/
├── api/
│   ├── registros.js          # Endpoint único: GET (listar), POST (criar), PATCH (mudar status)
│   └── _lib/
│       ├── googleAuth.js     # Autenticação via Service Account
│       ├── sheets.js         # Leitura/escrita no Google Sheets
│       └── drive.js          # Upload de fotos no Google Drive
├── public/
│   ├── index.html            # Tela 1 — identificação (nome + setor)
│   ├── app.html               # App (sidebar com as 3 abas)
│   ├── css/style.css
│   ├── js/
│   │   ├── constants.js      # Listas de Setores, Causas, Prioridades, Status
│   │   ├── session.js        # Guarda nome/setor no localStorage do navegador
│   │   ├── api.js            # Chamadas fetch para /api/registros
│   │   ├── modal.js          # Modal de detalhe + troca de status
│   │   ├── utils.js
│   │   ├── identify.js       # Lógica da Tela 1
│   │   ├── app.js            # Shell do app (sidebar, navegação entre abas)
│   │   ├── view-registrar.js # Aba "Registrar"
│   │   ├── view-minhas.js    # Aba "Minhas Inconformidades"
│   │   └── view-painel.js    # Aba "Painel" (KPIs e gráficos)
│   └── assets/logo-icon.png
├── package.json
├── vercel.json
└── .env.example
```

Não há build/bundler: é HTML/CSS/JS puro, então o que você edita é
exatamente o que roda no navegador — ótimo para editar direto no VSCode.

---

## Passo 1 — Criar a planilha no Google Sheets

1. Crie uma planilha nova em [sheets.google.com](https://sheets.google.com).
2. Renomeie a primeira aba para **Registros** (exatamente esse nome — ou
   ajuste a variável `GOOGLE_SHEET_TAB` se preferir outro nome).
3. Não precisa criar o cabeçalho manualmente: na primeira vez que a API for
   chamada, ela mesma escreve a linha de cabeçalho automaticamente.
4. Copie o **ID da planilha** a partir da URL:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_TRECHO_AQUI`**`/edit`

Guarde esse ID — ele vai para a variável `GOOGLE_SHEET_ID`.

## Passo 2 — Criar um projeto no Google Cloud e ativar as APIs

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/) e
   crie um novo projeto (ex.: "Lajeadense Inconformidades").
2. No menu **APIs e serviços → Biblioteca**, ative:
   - **Google Sheets API**
   - **Google Drive API** (só é necessária se você quiser salvar fotos)

## Passo 3 — Criar a Service Account (conta de serviço)

1. Em **APIs e serviços → Credenciais → Criar credenciais → Conta de
   serviço**.
2. Dê um nome (ex.: `lajeadense-inconformidades`) e conclua a criação (não
   precisa conceder papéis de projeto — o acesso será dado diretamente na
   planilha, no próximo passo).
3. Abra a conta de serviço criada → aba **Chaves** → **Adicionar chave →
   Criar nova chave → JSON**. Um arquivo `.json` será baixado.
4. Nesse arquivo, você vai usar dois campos:
   - `client_email` → variável `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → variável `GOOGLE_PRIVATE_KEY` (copie o valor inteiro,
     incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`)

**Guarde este arquivo `.json` em local seguro e nunca o envie para o
GitHub.**

## Passo 4 — Compartilhar a planilha com a Service Account

1. Abra a planilha criada no Passo 1.
2. Clique em **Compartilhar**.
3. Cole o `client_email` da Service Account (algo como
   `lajeadense-inconformidades@SEU-PROJETO.iam.gserviceaccount.com`).
4. Dê permissão de **Editor** e envie.

Sem esse passo, a API não consegue ler nem escrever na planilha.

## Passo 5 — (Opcional) Pasta do Google Drive para as fotos

Se quiser que as fotos anexadas nos registros sejam salvas:

1. Crie uma pasta no [drive.google.com](https://drive.google.com), ex.:
   "Fotos Inconformidades".
2. Compartilhe essa pasta com o mesmo `client_email` da Service Account,
   com permissão de **Editor**.
3. Copie o **ID da pasta** a partir da URL:
   `https://drive.google.com/drive/folders/`**`ESTE_TRECHO_AQUI`**
4. Use esse valor na variável `GOOGLE_DRIVE_FOLDER_ID`.

Se você deixar essa variável em branco, o sistema funciona normalmente —
apenas o campo de foto é ignorado ao salvar (o registro é salvo sem foto).

## Passo 6 — Configurar e testar localmente (VSCode)

1. Abra a pasta do projeto no VSCode.
2. Instale a [Vercel CLI](https://vercel.com/docs/cli) globalmente:
   ```bash
   npm install -g vercel
   ```
3. Instale as dependências do projeto:
   ```bash
   npm install
   ```
4. Copie `.env.example` para `.env` e preencha com os valores dos passos
   anteriores:
   ```bash
   cp .env.example .env
   ```
5. Rode localmente:
   ```bash
   npm run local
   ```
   Na primeira vez, a CLI pode pedir para linkar/criar um projeto Vercel —
   pode aceitar as opções padrão. O terminal vai mostrar um endereço local
   (normalmente `http://localhost:3000`) — abra no navegador e teste o
   fluxo completo: identificação → registrar → minhas inconformidades →
   painel.

### Simular uma base local

Para testar sem configurar Google Sheets ou Google Drive, defina no arquivo
`.env`:

```env
DATA_STORE=local
```

Nesse modo, os registros são gravados em `data/registros.json`, criado
automaticamente na primeira inclusão. O restante do fluxo da aplicação é o
mesmo: listar, criar e alterar status pela API local. Para voltar ao Google
Sheets, remova `DATA_STORE` ou deixe a variável vazia.

## Passo 7 — Deploy na Vercel

1. Crie uma conta em [vercel.com](https://vercel.com) (dá para entrar com
   GitHub).
2. Envie o projeto para um repositório no GitHub (recomendado, para ter
   deploy automático a cada alteração):
   ```bash
   git init
   git add .
   git commit -m "Primeira versão do sistema de inconformidades"
   git branch -M main
   git remote add origin <URL_DO_SEU_REPOSITORIO>
   git push -u origin main
   ```
3. No painel da Vercel, clique em **Add New → Project**, escolha o
   repositório e importe.
4. Antes de clicar em **Deploy**, abra **Environment Variables** e cadastre
   as mesmas variáveis do `.env`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (cole exatamente como está no `.env`, com os `\n`)
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SHEET_TAB` (opcional, padrão `Registros`)
   - `GOOGLE_DRIVE_FOLDER_ID` (opcional)
5. Clique em **Deploy**. Em cerca de 1 minuto o site estará no ar em uma
   URL como `https://seu-projeto.vercel.app`.

Qualquer alteração enviada para a branch `main` do GitHub gera um novo
deploy automaticamente.

---

## Customizações rápidas

- **Setores, causas, prioridades e status**: edite
  `public/js/constants.js` — é a única fonte dessas listas no front-end.
- **Cores / identidade visual**: as variáveis de cor ficam no topo de
  `public/css/style.css` (bloco `:root`), extraídas da paleta oficial da
  Lajeadense (vermelho, cinza e azul-marinho).
- **Nome da aba da planilha**: variável `GOOGLE_SHEET_TAB`.
- **Colunas da planilha**: definidas em `api/_lib/sheets.js` (constante
  `HEADERS`) — se adicionar uma coluna nova, mantenha a ordem e atualize
  também `rowToObject`/`objectToRow` no mesmo arquivo.

## Como funciona por baixo dos panos

- A Tela 1 (`index.html`) salva nome + setor no `localStorage` do
  navegador (não é login — é só para não perguntar de novo a cada
  registro no mesmo aparelho). O botão **Sair** limpa essa informação.
- Cada registro recebe um número sequencial por ano, no formato
  `INC-2026-00001`, calculado a partir do maior número já usado naquele
  ano na planilha.
- A aba **Minhas Inconformidades** mostra apenas os registros cujo campo
  "Responsável" é igual ao nome informado na Tela 1.
- A aba **Painel** consolida todos os registros da planilha (de todos os
  setores e pessoas).
- Qualquer pessoa identificada pode abrir um registro (clicando na linha
  da tabela) e mudar o status (Aberta / Em análise / Em tratamento /
  Resolvida) pelo modal de detalhe.

## Erros comuns

| Sintoma | Causa provável |
|---|---|
| "Credenciais do Google não configuradas" | Faltou definir `GOOGLE_SERVICE_ACCOUNT_EMAIL` ou `GOOGLE_PRIVATE_KEY` |
| "GOOGLE_SHEET_ID não configurado" | Variável não definida ou deploy feito antes de configurá-la (refaça o deploy após salvar as variáveis) |
| Erro 403 / permission denied ao salvar | A planilha (ou a pasta do Drive) não foi compartilhada com o e-mail da Service Account |
| Erro ao enviar foto, mas o registro salva mesmo assim | `GOOGLE_DRIVE_FOLDER_ID` não configurado, ou pasta não compartilhada — comportamento esperado (não bloqueia o registro) |
| Chave privada inválida | Ao colar `GOOGLE_PRIVATE_KEY`, confira se as quebras de linha foram preservadas (o valor deve conter `\n`) |

---

Feito com HTML, CSS e JavaScript puro + Vercel Functions + Google Sheets/Drive.
