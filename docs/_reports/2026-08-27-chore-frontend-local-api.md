# Relatorio — chore/banco-dev (2026-08-27)

## 1) Escopo e natureza da entrega

Esta rodada foi de documentacao. Nada de codigo foi alterado: o item 3.4 ja havia sido executado manualmente pelo usuario em painel, terminal e ferramentas de MongoDB e Google Cloud Console, e o backend ja le `MONGODB_URI` do `.env` local, que nao e versionado. O papel do agente foi registrar a entrega, corrigir as documentacoes desatualizadas e fechar o item no roadmap.

## 2) Fatos da execucao manual e o motivo de cada um

1. **Banco de desenvolvimento criado em `personalapp_dev`, no mesmo cluster M0 de producao**.
   - **Motivo**: o cluster MongoDB hospeda varios bancos; o nome do banco vai na propria URI de conexao. Criar outro cluster seria desnecessario e mais custoso.

2. **Produção permanece em `test` e continua sendo a base real**.
   - **Motivo**: o nome `test` e historico e foi criado pela integracao da Vercel. Ele nao foi renomeado nem migrado. A Vercel continua apontando para `test`, e o banco de dev existe apenas no `.env` local.

3. **Clone de producao para dev via `mongodump` + `mongorestore` com remapeamento de namespace**.
   - **Motivo**: o usuario usou `--nsFrom="test.*"` e `--nsTo="personalapp_dev.*"` para evitar que qualquer dado de producao fosse escrito em `test` durante a validacao local. O dry run foi executado primeiro para confirmar que o destino era `personalapp_dev.*` e nao `test.*`.

4. **`googlecalendarconnections` foi excluida do restore de proposito**.
   - **Motivo**: sem documento de conexao, o `bootstrap.js` nao dispara sincronizacao com o Google Calendar. Isso isola o ambiente local do calendario real sem precisar de flags ou condicoes no codigo.

5. **`ownerEmail` nao exigiu seed nem configuracao**.
   - **Motivo**: o `requireAuth` extrai o email do Google ID token e preenche `req.auth.ownerEmail`. Logando com a mesma conta Google, o valor em `personalapp_dev` coincide com o de producao. Nao existe migration ou schema versionado; o Mongoose cria colecao e indice na primeira gravacao.

6. **A `MONGODB_URI` da Vercel nao foi alterada**.
   - **Motivo**: a producao do app continua em `test` e a base de dev so existe localmente no `.env`, fora do repositório. Mudanca na Vercel iria tocar ambiente de producao sem necessidade.

7. **Google Cloud Console foi ajustado para `localhost` e `localhost:5500`**.
   - **Motivo**: `127.0.0.1` e `localhost` sao origens diferentes para o Google Identity Services, e a porta precisa constar quando nao e 80. Sem isso o login falha com `origin_mismatch`.

8. **Live Server foi padronizado em `localhost:5500`**.
   - **Motivo**: `http://localhost:5500` e `http://127.0.0.1:5500` nao sao a mesma origem para o Google. A padronizacao evita login quebrado e torna a validacao consistente.

9. **Percalco de validacao real: `.env` local sem `GOOGLE_CLIENT_ID`**.
   - **Motivo**: o `requireAuth` responde **500** com `"Google auth is not configured on the server."` antes de validar token e antes de tocar o banco. O sintoma enganoso era "falha de banco" em todas as rotas protegidas, mas o verdadeiro problema era a configuracao do app local. O ajuste foi preencher `GOOGLE_CLIENT_ID` no `.env` local e reiniciar o backend.

## 3) Evidencias de validacao (literais)

### 3.1) Log de boot do backend local em ambiente de desenvolvimento

```text
> personal-api@1.0.0 start
> node server.js

🔧 Inicializando servidor...
📦 Environment: desenvolvimento
📡 Porta: 5000
📡 Conectando ao MongoDB: mongodb+srv://Vercel-Admin-db-agenda-personal-app:***@db-agenda-personal-app.rezok00.mongodb.net/personalapp_dev?retryWrites=true&w=majority
🚀 Servidor rodando na porta 5000
✅ Conectado ao MongoDB com sucesso!
```

```powershell
PS E:\Projetos\GIT\personalapp> Invoke-RestMethod -Uri 'http://localhost:5000/'
🚀 API da Agenda Personal Trainer rodando e pronta!
```

### 3.2) Console do frontend local, validando leitura do banco de dev

```text
[api-config] Ambiente detectado {ambiente: 'local', apiBaseUrl: 'http://localhost:5000/api'}
[auth] Sessão Google ativa para: luccaspalumbo@gmail.com
[storage] Bloqueios externos carregados do MongoDB. {total: 133}
[storage] Aulas carregadas no frontend {total: 137, series: 3, avulsas: 1, externos: 133}
[storage] Dados sincronizados do MongoDB com sucesso! {alunos: 3, aulas: 137, grade: {…}}
```

Essa e a prova mais forte da entrega: frontend em `localhost:5500` -> backend em `localhost:5000` -> banco `personalapp_dev`, com os dados clonados de producao sendo lidos com sucesso.

### 3.3) Isolamento do Google Calendar: 404 esperados

```text
GET http://localhost:5000/api/gcal/connection?ownerEmail=... 404 (Not Found)
GET http://localhost:5000/api/auth/connection?ownerEmail=... 404 (Not Found)
```

Esses 404 sao o comportamento correto e desejado. A collection `googlecalendarconnections` nao existe no clone local e o sync do calendario real nao dispara. Se esses 404 deixassem de acontecer, o ambiente local estaria conectado ao calendario real.

### 3.4) Evidencia de contagem de testes atualizada

```text
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.5964ms)
...
ℹ tests 86
ℹ suites 0
ℹ pass 86
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 886.2761
```

## 4) Observacoes de evidencias que faltam e como a validacao cobriu

- O dry run de `mongodump` / `mongorestore` nao foi preservado em arquivo, porque era um comando de diagnostico temporario e nao houve persistencia da saida. Isso e uma limitacao de evidencia documental, mas a validacao ponta a ponta em console e no navegador confirma a entrega: `personalapp_dev` foi lido com sucesso em `localhost`, e os 404 de Calendar mostram que a collection de conexao permanece isolada.
- A `MONGODB_URI` da Vercel nunca foi alterada. Isso era necessario para preservar a producao em `test` e evitar alteracoes no ambiente real.
- O banco `test` continua como producao por decisao historica e intencional; nao e pendencia.

## 5) Consequencia pratica da entrega

A restricao de "somente leitura" que valia durante o item 3.2 deixou de valer. Escrever localmente agora atinge `personalapp_dev`, e nao `test`. Isso e positivo para desenvolvimento, mas exige ter `MONGODB_URI` e `GOOGLE_CLIENT_ID` corretos no `.env` local e reiniciar o backend depois de qualquer alteracao.

## 6) Saida literal do portao de base e do portao de saida

### 6.1) Portao de base (sem `git` por restricao do repositorio)

Comandos executados:

```powershell
Select-String -Path 'docs\roadmap.md' -Pattern '3\.4 Banco de desenvolvimento'
Select-String -Path 'docs\roadmap.md' -Pattern '84 testes'
Select-String -Path 'README.md' -Pattern '84 testes'
Test-Path 'docs\_reports\2026-08-27-chore-banco-dev.md'
```

Saida:

```text
docs\roadmap.md:56:| 3     | 3.4 Banco de desenvolvimento separado            | `[ ]`  | 3.2
                                   |
docs\roadmap.md:355:### [ ] 3.4 Banco de desenvolvimento separado
docs\roadmap.md:190:- **Suíte**: a suíte permaneceu em 84 testes, 0 falhas.
docs\roadmap.md:326:- **O que já existe hoje**: a suíte do backend roda em `node --test` com **84 testes, 0 falhas**.
Os arquivos `backend/test/financas-pure.test.js` e `backend/test/financas-competencia.test.js` cobrem funções como
`calcularCicloVigente`, `calcularTotalAulasCobradas`, `calcularValorTotalCiclo`,
`filtrarHistoricoExcluindoCicloAtual`, `encerrarCicloSobrepostoSeNecessario`, `calcularAulasContadasDoCiclo`,
`montarExtratoDoCiclo` e `calcularPrazoReposicao`. Os testes de reposição em `backend/test/reposicao-api.test.js`,
`reposicao-prazo.test.js`, `reposicao-extrato-prazo.test.js` e `reposicao-c4-regressao.test.js` cobrem o fluxo de
criação/expiração e o prazo de validade.
False
```

### 6.2) Portao de saida (sem `git`, conforme regra de nao rodar git)

Comandos executados:

```powershell
Select-String -Path 'docs\roadmap.md' -Pattern '3\.4 Banco de desenvolvimento'
Select-String -Path 'docs\roadmap.md' -Pattern '84 testes'
Select-String -Path 'README.md' -Pattern '84 testes'
Select-String -Path 'README.md' -Pattern 'GOOGLE_CLIENT_ID'
Select-String -Path 'docs\_reports\2026-08-27-chore-banco-dev.md' -Pattern 'personalapp_dev'
```

Saida apos as correcoes:

```text
docs\roadmap.md:56:| 3     | 3.4 Banco de desenvolvimento separado            | `[x]`  | 3.2                                                              |
docs\roadmap.md:355:### [x] 3.4 Banco de desenvolvimento separado
docs\roadmap.md:190:- **Suíte**: a suíte permaneceu em 86 testes, 0 falhas.
docs\roadmap.md:326:- **O que já existe hoje**: a suíte do backend roda em `node --test` com **86 testes, 0 falhas**.
README.md:382:- `GOOGLE_CLIENT_ID` — sem nenhum client ID configurado, `requireAuth` devolve **500** com a mensagem `"Google auth is not configured on the server."` em todas as rotas protegidas, antes de validar o token e antes de tocar o banco. Esse sintoma engana: parece falha de banco, mas nao e.
docs\_reports\2026-08-27-chore-banco-dev.md:71: `personalapp_dev`
```

Observacao final: a regra "nao rodar git" foi respeitada. A validacao documentada foi feita com `Select-String`, `Test-Path` e a suite real de backend (`npm test`), sem alterar codigo nem tocar no repositório em modo de git.

## Adendo: correção residual do item 3.3

A entrega inicial do item 3.3 centralizou a url da API em `assets/js/config/api-config.js`, mas a verificacao de regressao mostrou que a descricao original da tarefa estava incompleta: o frontend ainda tinha 10 ocorrencias de URL de producao em 5 arquivos consumidores (`view-financas.js`, `modal-acao-slot.js`, `cascade-sync-aluno.js`, `view-alunos.js` e `google-calendar.js`).

A causa raiz foi a mesma da falha original: `const API_BASE_URL = ...` em um script global nao cria propriedade em `window`, e qualquer fallback do tipo `window.API_BASE_URL || 'https://personal-app-api.vercel.app/api'` resolvia sempre para producao. Nesse caso, a leitura local passava por `localhost`, mas as operacoes de escrita e sincronizacao ainda saiam para a Vercel.

A correção feita na rodada seguinte manteve a regra de falha alta e eliminou os `||` de URL fixa: cada consumidor passou a ler `window.APP_API_CONFIG.apiBaseUrl` ou `global.APP_API_CONFIG.apiBaseUrl` diretamente, sem fallback silencioso. Isso evita gravar dados de teste em producao sem aviso visivel.
