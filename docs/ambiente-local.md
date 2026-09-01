# Ambiente local — como rodar e como destravar

> **Papel deste arquivo**: procedimento. O que fazer para o projeto subir na sua máquina, e o que fazer quando não sobe.
>
> Este arquivo muda quando o **ambiente** muda. Estrutura de código fica em [`mapa-do-codigo.md`](mapa-do-codigo.md); regra de negócio fica nas specs em [`specs/`](specs/).
>
> **Atualizado**: 2026-09-01

---

## Antes de começar

Não existe `npm run dev`, watch mode, seed automático nem ambiente de staging. O que existe é: frontend servido por Live Server, backend por `npm start`, e um banco de desenvolvimento separado.

---

## 1) Frontend

1. Use uma extensão de servidor local (Live Server no VS Code).
2. Sirva em `http://localhost:5500` e padronize o host como `localhost` — no Live Server, `"liveServer.settings.host": "localhost"`.
3. **Não alterne para `127.0.0.1`.** `http://127.0.0.1:5500` e `http://localhost:5500` são origens diferentes para o Google Identity Services.
4. A URL da API é escolhida por hostname em `assets/js/config/api-config.js`, que é o **único** lugar do frontend que define isso:
   - `localhost`, `127.0.0.1`, `::1` → `http://localhost:5000/api`
   - qualquer outro hostname → `https://personal-app-api.vercel.app/api`
5. Em ambiente local aparece uma tarja discreta no canto inferior direito com `LOCAL` e a `apiBaseUrl` ativa. Ela nunca aparece em produção.
6. O OAuth do Google precisa aceitar `http://localhost` e `http://localhost:5500` em *Authorized JavaScript origins*. Faltando qualquer uma, o login falha com `origin_mismatch`.
7. O backend local precisa estar rodando na porta `5000`.

Se `config/api-config.js` não carregar antes de `state.js`/`storage.js`, o frontend **falha alto de propósito**, em vez de cair silenciosamente para produção. Isso é intencional: evita que um ambiente local mal configurado volte a escrever no banco produtivo sem aviso.

---

## 2) Backend

Na pasta `backend`:

```bash
npm install
copy .env.example .env
npm start
```

Preencha o `.env` com os valores do ambiente local. Obrigatórias para a API responder:

- **`MONGODB_URI`** — apontando para o banco de desenvolvimento `personalapp_dev`. Copie a linha **inteira** do painel da Vercel (`personal-app-api` → Settings → Environment Variables). Montar a URI à mão ou substituir o placeholder de senha manualmente já custou uma rodada inteira de diagnóstico.
- **`GOOGLE_CLIENT_ID`** — sem ele, `requireAuth` devolve **500** com `"Google auth is not configured on the server."` em todas as rotas protegidas, antes de validar o token e antes de tocar o banco. O sintoma engana: parece falha de banco, e não é.

Opcionais, necessárias apenas para o fluxo de Google Calendar: `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY`, `BACKEND_URL`, `GCAL_TIMEZONE`.

O `dotenv` só lê o arquivo no boot — depois de editar o `.env`, reinicie.

O banco `test` é **produção** e não deve ser usado localmente.

### Sinais de sucesso no boot

```
🔧 Inicializando servidor...
📡 Porta: 5000
✅ Conectado ao MongoDB com sucesso!
🚀 Servidor rodando na porta 5000
```

Sinal de `.env` vazio ou inválido:

```
❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada (MONGODB_URI).
```

### Confirme que o `.env` não será versionado

```bash
git status --short
```

O `.env` não deve aparecer na saída.

---

## 3) Testes

```bash
cd backend
npm test
```

Executados com `node --test`. Toda alteração em código que calcula dinheiro exige rodar a suíte **antes e depois**, e reportar os dois números.

---

## Troubleshooting

| Sintoma | Causa e contorno |
| --- | --- |
| `querySrv ECONNREFUSED 127.0.0.1:53` | O resolvedor DNS local do Windows não responde e a resolução `mongodb+srv://` falha. O topo de `backend/server.js` força DNS da Cloudflare **apenas em execução local**, dentro do guard `if (require.main === module)`. Já foi testado remover: quebra. Não remova. |
| `EADDRINUSE :::5000` | Instância órfã de um `npm start` anterior, não conflito com outro programa. Diagnostique com `Get-NetTCPConnection -LocalPort 5000 -State Listen` e encerre o `OwningProcess`. |
| `bad auth : authentication failed` | Credencial inválida no `.env`. Copie a linha `MONGODB_URI` inteira do painel da Vercel. |
| `origin_mismatch` no login | Origem local ausente em *Authorized JavaScript origins* do Client ID. |
| 404 em `/api/gcal/connection` e `/api/auth/connection` | **Esperado no local.** O banco de dev foi clonado sem a collection `googlecalendarconnections`, de propósito. Não é bug. |
| Frontend servindo arquivo antigo | O service worker (`sw.js`) cacheia `index.html`, `assets/css/style.css` e `assets/js/app.js`. Contorno: DevTools → Application → Service Workers → **Update on reload**. |
| Saída de comando ilegível ao redirecionar | `>` no PowerShell grava em UTF-16. Use `npm test 2>&1 \| Out-File -FilePath log.txt -Encoding utf8`. |

---

## Deploy

Dois projetos Vercel independentes, ligados ao mesmo repositório:

| Projeto | Root Directory | URL |
| --- | --- | --- |
| `personal-app-webpage` | raiz do repositório | <https://josy-personal-app.vercel.app/> |
| `personal-app-api` | `backend/` | <https://personal-app-api.vercel.app/> |

**Não existe staging.** Push ou merge na `main` faz redeploy automático em produção nos dois.

Detalhes de painel, branch de publicação e a configuração *"Include source files outside of the Root Directory"* estão em [`contexto-personalapp-para-novas-conversas.md`](contexto-personalapp-para-novas-conversas.md) §3 — são informações que não vivem no repositório.
