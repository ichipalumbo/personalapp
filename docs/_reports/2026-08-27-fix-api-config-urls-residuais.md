# Relatório — fix/api-config-urls-residuais (2026-08-27)

## 1) Escopo

A rodada foi uma correção residual do item 3.3. A centralização em `assets/js/config/api-config.js` havia sido entregue, mas a checagem de regressão mostrou que o frontend ainda tinha 10 ocorrências de URL de produção em 5 arquivos consumidores. O objetivo foi eliminar aquelas chamadas sem reintroduzir o fallback silencioso para produção.

## 2) Causa raiz

`const API_BASE_URL = ...` em um script clássico não cria propriedade em `window`. Como resultado, trechos como:

```js
window.API_BASE_URL || 'https://personal-app-api.vercel.app/api'
```

resolvem sempre para a URL de produção, mesmo quando o app está sendo servido em `localhost`. O fallback nunca era alcançável; ele era de fato o caminho único.

Isso torna o padrão perigoso: em ambiente local, o app pode gravar em banco de produção sem aviso visível. A regra adotada no item 3.3 foi evitar esse cenário e falhar alto quando a configuração não existe.

## 3) Inventário das 10 ocorrências residuais

| Arquivo | Ocorrências | Uso principal |
| --- | ---: | --- |
| `assets/js/view-financas.js` | 4 | histórico, listagem, pagamento e ajuste financeiro |
| `assets/js/modal-acao-slot.js` | 2 | criação e atualização de reposição |
| `assets/js/cascade-sync-aluno.js` | 2 | PUT/POST de agendamentos em cascata |
| `assets/js/view-alunos.js` | 1 | consistência de agenda do aluno |
| `assets/js/google-calendar.js` | 1 | renovação de webhook do Google Calendar |
| Total | 10 | --- |

## 4) Decisão de design

A correção não recriou `window.API_BASE_URL` e não adicionou fallback silencioso. O motivo foi explícito: manter fallback em produção seria equivalente a reintroduzir o bug que o item 3.3 tentou eliminar.

A decisão correta foi usar a leitura direta do objeto compartilhado:

```js
window.APP_API_CONFIG.apiBaseUrl
```

ou

```js
global.APP_API_CONFIG.apiBaseUrl
```

Sem `||`, sem produção por omissão, sem ambiguidade de ambiente.

## 5) Portão de base (checagem antes da correção)

Os comandos executados antes da correção e a saída literal foram:

```powershell
git branch --show-current
Select-String -Path 'assets\js\*.js' -Pattern 'personal-app-api\.vercel\.app' | Measure-Object -Line
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'API_BASE_URL\s*\|\|'
Select-String -Path 'index.html' -Pattern 'api-config\.js'
```

Saída literal:

```text
main

9

assets\js\google-calendar.js:54:        const endpoint = `${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/gcal/webhook/renew`;
assets\js\modal-acao-slot.js:79:    const baseUrl = (window.API_BASE_URL || 'https://personal-app-api.vercel.app/api');
assets\js\modal-acao-slot.js:631:                const respostaPatch = await window.apiFetchBackend(`${window.API_BASE_URL || 'https://personal-app-api.vercel.app/api'}/reposicoes/${encodeURIComponent(repObj.id)}`, {
assets\js\view-alunos.js:282:            const base = window.API_BASE_URL || 'https://personal-app-api.vercel.app/api';
assets\js\view-financas.js:435:            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas/${encodeURIComponent(alunoId)}/historico`, {}, opcoes.timeoutMs || 40000);
assets\js\view-financas.js:579:            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas`, {}, opcoes.timeoutMs || 40000);
assets\js\view-financas.js:665:            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas/${encodeURIComponent(STATE.cardAtivo.cicloId)}/pagamento`, {
assets\js\view-financas.js:705:            const resposta = await global.apiFetchBackend(`${(global.API_BASE_URL || 'https://personal-app-api.vercel.app/api')}/financas/${encodeURIComponent(STATE.cardAtivo.cicloId)}/ajuste`, {
assets\js\cascade-sync-aluno.js:152:                const rota = 'https://personal-app-api.vercel.app/api/agendamentos/' + encodeURIComponent(agendamento.id);
assets\js\cascade-sync-aluno.js:160:                    resp = await apiFetch('https://personal-app-api.vercel.app/api/agendamentos', {

index.html:1568:    <script src="assets/js/config/api-config.js"></script>
```

Observação: a regra do repositório proibiu criar/switchar branch nesta sessão; o trabalho ficou no branch atual (`main`), sem alterar a árvore de branches.

## 6) Portão de saída (após a correção)

Comandos executados:

```powershell
Set-Location 'E:\Projetos\GIT\personalapp'; git branch --show-current; Write-Host '---'; git status --short; Write-Host '---'; Select-String -Path 'assets\js\*.js' -Pattern 'personal-app-api\.vercel\.app'; Write-Host '---'; Select-String -Path 'assets\js\config\api-config.js' -Pattern 'personal-app-api\.vercel\.app' | Measure-Object -Line; Write-Host '---'; Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'API_BASE_URL\s*\|\|'; Write-Host '---'; Select-String -Path 'assets\js\*.js' -Pattern 'APP_API_CONFIG\.apiBaseUrl'; Write-Host '---'; Select-String -Path 'docs\roadmap.md' -Pattern 'três pontos fixos|tres pontos fixos|3 pontos fixos|3\.3.*fixos|3 pontos'; Write-Host '---'; git diff --stat
```

Saída literal:

```text
main
---
 M assets/js/cascade-sync-aluno.js
 M assets/js/google-calendar.js
 M assets/js/modal-acao-slot.js
 M assets/js/view-alunos.js
 M assets/js/view-financas.js
 M docs/_reports/2026-08-27-chore-frontend-local-api.md
 M docs/roadmap.md
---
---
---
---
 assets/js/cascade-sync-aluno.js                      | 6 ++++--
 assets/js/google-calendar.js                         | 2 +-
 assets/js/modal-acao-slot.js                         | 4 ++--
 assets/js/view-alunos.js                             | 2 +-
 assets/js/view-financas.js                           | 8 ++++----
 docs/_reports/2026-08-27-chore-frontend-local-api.md | 8 ++++++++
 docs/roadmap.md                                      | 6 +++---
 7 files changed, 23 insertions(+), 13 deletions(-)
Lines Words Characters Property
----- ----- ---------- --------
    2
```

Evidência de conversão direta da config:

```text
assets\js\view-financas.js:435:            const resposta = await global.apiFetchBackend(`${global.APP_API_CONFIG.apiBaseUrl}/financas/${encodeURIComponent(alunoId)}/historico`, {}, opcoes.timeoutMs || 40000);
assets\js\view-financas.js:579:            const resposta = await global.apiFetchBackend(`${global.APP_API_CONFIG.apiBaseUrl}/financas`, {}, opcoes.timeoutMs || 40000);
assets\js\view-financas.js:665:            const resposta = await global.apiFetchBackend(`${global.APP_API_CONFIG.apiBaseUrl}/financas/${encodeURIComponent(STATE.cardAtivo.cicloId)}/pagamento`, {
assets\js\view-financas.js:705:            const resposta = await global.apiFetchBackend(`${global.APP_API_CONFIG.apiBaseUrl}/financas/${encodeURIComponent(STATE.cardAtivo.cicloId)}/ajuste`, {
assets\js\modal-acao-slot.js:79:    const baseUrl = window.APP_API_CONFIG.apiBaseUrl;
assets\js\modal-acao-slot.js:631:                const respostaPatch = await window.apiFetchBackend(`${window.APP_API_CONFIG.apiBaseUrl}/reposicoes/${encodeURIComponent(repObj.id)}`, {
assets\js\cascade-sync-aluno.js:148:        const apiBaseUrl = global.APP_API_CONFIG.apiBaseUrl;
assets\js\view-alunos.js:282:            const base = window.APP_API_CONFIG.apiBaseUrl;
assets\js\google-calendar.js:54:        const endpoint = `${global.APP_API_CONFIG.apiBaseUrl}/gcal/webhook/renew`;
```

## 7) Validação manual do navegador (documentada, sem execução de mudança de dado)

O checklist de validação manual ficou assim:

1. Backend local rodando em `http://localhost:5000`.
2. Frontend servido em `http://localhost:5500`.
3. Abrir DevTools → Network.
4. Filtrar por `vercel.app`.
5. Carregar a aba Finanças, a aba Alunos e abrir o modal de ação de um slot sem confirmar a ação.
6. Confirmar que nenhuma requisição para `https://personal-app-api.vercel.app` aparece.

Não houve execução de mudança de dado nesta sessão, nem houve ambiente local em execução para fazer o navegador validar a rota real. O registro acima é a checagem estática e de execução de código que garante que a resolução da base de URL deixou de depender de fallback para produção.

## 8) Resultado final

Os 10 pontos residuais foram removidos e a resolução de URL agora passa exclusivamente por `APP_API_CONFIG.apiBaseUrl`, sem `||` e sem fallback silencioso.
