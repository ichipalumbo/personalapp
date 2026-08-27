# Relatorio — chore/backend-local-env (2026-08-27)

## 1) Saida literal do portao de base

Comandos executados:

```powershell
git branch --show-current
git status --short
Test-Path 'backend\.env'
Test-Path 'backend\.env.example'
Get-Content '.gitignore'
Select-String -Path 'docs\roadmap.md' -Pattern '3\.2 Rodar o backend localmente'
```

Saida:

```text
chore/backend-local-env
False
False
.DS_Store
node_modules/
*.log
.continue/
graphify-out/
*.zip
*.ps1

docs\roadmap.md:54:| 3     | 3.2 Rodar o backend localmente                   | `[ ]`  | —
docs\roadmap.md:332:### [ ] 3.2 Rodar o backend localmente
```

Observacao: `git status --short` retornou vazio (working tree limpa no portao de base).

## 2) Saida literal do `git check-ignore` para os tres caminhos

Comandos executados:

```powershell
git check-ignore -v backend/.env
git check-ignore -v backend/.env.local
git check-ignore -v backend/.env.example
```

Saida:

```text
.gitignore:12:*.env	backend/.env
.gitignore:11:.env.local	backend/.env.local
.gitignore:13:!.env.example	backend/.env.example
```

Validacao adicional (sem `-v`) para provar que `backend/.env.example` segue versionavel:

```powershell
git check-ignore backend/.env.example
```

Saida:

```text
exit_code_backend_env_example_sem_v=1
```

## 3) Variaveis encontradas em `process.env` e pontos de consumo

- `PORT`
  - `backend/src/config/env.js:13`
- `MONGODB_URI`
  - `backend/src/config/env.js:14`
  - `backend/src/config/database.js:17`
- `GOOGLE_CLIENT_ID`
  - `backend/src/config/env.js:3`
  - `backend/src/controllers/gcalAuthController.js:60`
  - `backend/src/services/gcalSyncService.js:581`
- `GOOGLE_OAUTH_CLIENT_ID`
  - `backend/src/config/env.js:4`
  - `backend/src/controllers/gcalAuthController.js:60`
  - `backend/src/services/gcalSyncService.js:581`
- `GIS_CLIENT_ID`
  - `backend/src/config/env.js:5`
  - `backend/src/controllers/gcalAuthController.js:60`
  - `backend/src/services/gcalSyncService.js:581`
- `GOOGLE_CLIENT_SECRET`
  - `backend/src/controllers/gcalAuthController.js:61`
  - `backend/src/services/gcalSyncService.js:582`
- `GOOGLE_OAUTH_CLIENT_SECRET`
  - `backend/src/controllers/gcalAuthController.js:61`
  - `backend/src/services/gcalSyncService.js:582`
- `ENCRYPTION_KEY`
  - `backend/src/utils/gcalCrypto.js:4`
- `BACKEND_URL`
  - `backend/src/services/gcalSyncService.js:630`
- `GCAL_TIMEZONE`
  - `backend/src/services/gcalSyncService.js:371`
  - `backend/src/services/gcalSyncService.js:526`
- `NODE_ENV`
  - `backend/server.js:11`

## 4) Confirmacao de que nenhum `.js` foi alterado

Comando:

```powershell
git diff --stat -- backend/src/
```

Saida:

```text
(sem saida)
```

Conclusao: nenhum arquivo `.js` em `backend/src/` foi alterado nesta rodada.

## 5) Passo a passo para o desenvolvedor preencher o `.env`

1. No terminal, entrar em `backend/`.
2. Copiar o exemplo: `copy .env.example .env`
3. Preencher cada chave de `backend/.env` com os valores do painel da Vercel:
   - projeto `personal-app-api`
   - `Settings -> Environment Variables`
4. Voltar na raiz e confirmar:
   - `git status --short`
   - esperado: `.env` nao aparece.
5. Subir a API:
   - `cd backend`
   - `npm start`

## 6) Sinais esperados no `npm start`

Sucesso:

- `🔧 Inicializando servidor...`
- `📡 Porta: <n>`
- `✅ Conectado ao MongoDB com sucesso!`
- `🚀 Servidor rodando na porta <n>`

Falha esperada quando `.env` estiver vazio/errado:

- `❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada (MONGODB_URI).`

## 7) Restricao de somente leitura (ate existir o item 3.4)

Enquanto `MONGODB_URI` local apontar para producao, o backend local escreve no banco real. Portanto, a validacao desta rodada deve ser somente leitura (`GET` em rota de listagem), sem `POST`, `PATCH`, `PUT` ou `DELETE`.

## 8) Saida do portao de saida (incluindo `npm test`)

Comandos executados:

```powershell
git status --short
git diff --stat
git diff --stat -- backend/src/
git diff --stat -- assets/
git diff --stat -- index.html
Test-Path 'backend\.env'
git check-ignore -v backend/.env
cd backend
npm test
```

Saida:

```text
M .gitignore
 M README.md
 M docs/roadmap.md
?? backend/.env.example
?? docs/_reports/2026-08-27-chore-backend-local-env.md
 .gitignore      |  8 +++++++-
 README.md       | 35 +++++++++++++++++++++++++++++++----
 docs/roadmap.md | 15 +++++++--------
 3 files changed, 45 insertions(+), 13 deletions(-)
False
.gitignore:12:*.env	backend/.env

> personal-api@1.0.0 test
> node --test

...

ℹ tests 86
ℹ suites 0
ℹ pass 86
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 868.4129
```
