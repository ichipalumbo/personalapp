# Saga — Montagem do ambiente local

> Consolida 4 rodadas: `2026-08-27-chore-backend-local-env`, `2026-08-27-chore-banco-dev`,
> `2026-08-27-chore-frontend-local-api`, `2026-08-27-fix-api-config-urls-residuais`.
> Os relatórios originais foram removidos na poda de 2026-09-03.
>
> **O passo a passo operacional vive em [`docs/setup-ambiente-local.md`](../setup-ambiente-local.md).**
> Este arquivo guarda só o porquê de cada decisão e o defeito que a saga descobriu.

## Causa-raiz

Não havia isolamento nenhum entre desenvolvimento e produção. O backend local escrevia no
banco de produção, e o frontend local — mesmo quando o backend local existia — continuava
falando com a API de produção por causa de um fallback que era, na prática, o caminho único.

## Linha do tempo

| # | Rodada | O que foi feito |
|---|---|---|
| 1 | `chore-backend-local-env` | Criado `backend/.env.example` versionado, mapeando 11 variáveis. Confirmado que `.gitignore` ignora `*.env` e `.env.local`, mas preserva `!.env.example`. Enquanto a `MONGODB_URI` local apontasse para produção, a validação ficou restrita a somente leitura |
| 2 | `chore-banco-dev` | Banco `personalapp_dev` criado no mesmo cluster M0, via `mongodump` + `mongorestore` com `--nsFrom="test.*" --nsTo="personalapp_dev.*"`. Collection `googlecalendarconnections` deliberadamente fora do clone. Google Cloud Console e Live Server padronizados em `localhost:5500` |
| 3 | `chore-frontend-local-api` | **Este relatório era cópia estrutural do anterior**, com um adendo próprio: o achado das URLs residuais que motivou a rodada seguinte |
| 4 | `fix-api-config-urls-residuais` | As 10 URLs de produção removidas de 5 arquivos |

## O defeito das URLs residuais

`const API_BASE_URL = ...` num script clássico **não cria `window.API_BASE_URL`**. Qualquer
leitura de `window.API_BASE_URL` retorna `undefined`. Portanto o padrão
`window.API_BASE_URL || 'https://personal-app-api.vercel.app/api'` resolvia **sempre** para o
fallback — a URL de produção era o caminho único, nunca a exceção.

Consequência: com frontend e backend rodando em `localhost`, histórico financeiro, pagamento,
ajuste, reposição, sync em cascata e renovação de webhook continuavam gravando em produção,
sem nenhum aviso.

Ocorrências corrigidas:

| Arquivo | Ocorrências |
|---|---|
| `assets/js/view-financas.js` | 4 |
| `assets/js/modal-acao-slot.js` | 2 |
| `assets/js/cascade-sync-aluno.js` | 2 (hardcoded, sem nem `\|\|`) |
| `assets/js/view-alunos.js` | 1 |
| `assets/js/google-calendar.js` | 1 |

Todas trocadas por `APP_API_CONFIG.apiBaseUrl`, **sem fallback**.

## Decisões deliberadas

- **Banco de dev no mesmo cluster.** O nome do banco vai na URI; cluster novo seria custo sem
  ganho.
- **Produção continua no banco `test`.** Nome histórico criado pela integração da Vercel.
  Renomear tocaria produção sem benefício.
- **`googlecalendarconnections` fora do clone.** Sem documento de conexão, o `bootstrap.js`
  não dispara sync — isolamento por ausência de dado, sem nenhuma flag no código. Os `404` em
  `/api/gcal/connection` e `/api/auth/connection` são o sinal de que o isolamento está de pé.
- **Sem seed de `ownerEmail`.** Vem do Google ID token via `requireAuth`; logando com a mesma
  conta, coincide com o dado clonado.
- **Fallback silencioso eliminado, não substituído.** A regra é falhar alto: se
  `api-config.js` não carregar, o app quebra visivelmente. Melhor do que gravar em produção
  sem aviso.

## Armadilha que custou uma sessão de diagnóstico

`.env` local sem `GOOGLE_CLIENT_ID` faz **todas** as rotas protegidas responderem `500` com
`"Google auth is not configured on the server."`. O `requireAuth` falha antes de validar o
token e antes de tocar o banco — o sintoma parece falha de MongoDB, e não é.

## Limites herdados

- Não há guard de staging: qualquer `.env` apontando para a URI da Vercel toca produção.
- A checagem de que nenhuma requisição vai para produção é manual, pelo DevTools. Não há teste
  automatizado da origem das requisições, então uma URL nova hardcoded regride em silêncio.
- Credenciais não podem ser versionadas — o preenchimento do `.env` continua manual.
