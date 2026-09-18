# Etapa 6i-b — Apagar reposição órfã quando a exclusão da aula avulsa falhar

Branch: `fix/excluir-serie-toda-coerent` — **pré-condição de branch satisfeita**.

---

## 1. Portão de base

```text
Get-Location
C:\Users\LBRESSIA\OneDrive - azureford\Documents\GitHub Person\personalapp

git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerent

git status --short
<sem saída — working tree limpa>

git log --oneline -4
[... saida podada ...]
```

A etapa 6i já estava commitada (`655f3c3`), então esta rodada partiu de árvore limpa.

### 1.1 Reconferência do código real

A leitura da rodada de planejamento bate integralmente com o código. Nada mudou desde então.

```text
Select-String -Path 'backend\src\routes\reposicaoRoutes.js' -Pattern 'router\.'
backend\src\routes\reposicaoRoutes.js:12:router.post('/:id/historico', adicionarHistoricoReposicao);
backend\src\routes\reposicaoRoutes.js:14:router.route('/')
backend\src\routes\reposicaoRoutes.js:18:router.route('/:id')
```

Confirmados por leitura direta:

- `reposicaoRoutes.js` tinha `GET /`, `POST /`, `GET /:id`, `PATCH /:id` e `POST /:id/historico`.
  **Sem `DELETE`.**
- `reposicaoController.js` exportava `listarReposicoes`, `obterReposicao`, `criarReposicao`,
  `atualizarReposicao`, `adicionarHistoricoReposicao`. **Sem função de exclusão.**
- `excluirAgendamento` em `agendamentoController.js:489` é idempotente como descrito: `findOne`
  primeiro, e se não achar responde `200` com `{ ok: true, deleted: false, id, message }`.
- O `catch` de `executarEnvioParaReposicao`, ramo `!ehSerie`, restaurava `aulas` a partir de
  `_snapshotAulasReposicao` e logava, sem chamada de rede.

---

## 2. Backend — `DELETE /api/reposicoes/:id`

### `excluirReposicao` em `backend/src/controllers/reposicaoController.js`

Adicionada logo antes de `adicionarHistoricoReposicao`, e incluída no `module.exports`. Segue o
formato do prompt, que por sua vez segue `excluirAgendamento`.

### `excluirAgendamento` como modelo — o que se aplicou e o que não

Aplicou-se: a busca prévia com `findOne({ ownerEmail, id })`, a resposta `200` com
`deleted: false` quando o registro não existe, o `findOneAndDelete` escopado por `ownerEmail`, e
o `catch` externo delegando para o `responderErro*` do arquivo.

**Não se aplicou** o bloco de Google Calendar de `excluirAgendamento` — o `try/catch` interno que
chama `deleteEventFromGoogle`, trata `404/410` como sucesso e cai em `montarRespostaFalhaGcal`.
Reposição não tem evento no Google Calendar: quem tem `googleCalendarEventId` é o agendamento, e
a reposição só guarda referências por id (`agendamentoOriginalId`, `agendamentoReposicaoId`).
Copiar essa parte teria criado um caminho morto. `excluirReposicao` ficou, por isso, bem mais
curta que o modelo.

### `backend/src/routes/reposicaoRoutes.js`

`excluirReposicao` importada e `.delete(excluirReposicao)` encadeado em `router.route('/:id')`,
junto de `.get` e `.patch`. **Nenhuma rota em lote foi criada.**

### `Reposicao.js` intocado

Confirmado: `backend/src/models/Reposicao.js` não aparece no `git diff --stat`. A decisão de
apagar em vez de marcar como cancelada eliminou a necessidade de mexer no `enum` de `status`.

---

## 3. Frontend — a chamada no `catch` do Ponto 6

### Ajuste de escopo que o prompt não previa

O prompt instruía a "usar a variável `reposicao` que já existe no escopo da função". Ela existe,
mas era `const reposicao = await enviarParaReposicao(...)` **declarada dentro do `try`** — e
`const`/`let` são block-scoped, então o `catch` não a enxergava. Tentar usá-la ali daria
`ReferenceError`.

Correção mínima: a declaração foi içada para o escopo do callback como `let reposicao = null`, e
a atribuição dentro do `try` virou `reposicao = await enviarParaReposicao(...)`. O valor
continua sendo o mesmo retorno de `enviarParaReposicao` — nada é recriado nem buscado de novo,
como o prompt exigia. O `return reposicao` do caminho de sucesso segue funcionando igual.

### A chamada

Dentro do bloco `if (!ehSerie && Array.isArray(_snapshotAulasReposicao))`, **depois** da
restauração de `aulas` e do log de rollback — ordem escolhida conforme o prompt sugeriu, para
que a Josy veja a aula de volta antes de qualquer espera de rede.

O `try/catch` interno é proposital e está comentado no código como best-effort. Falha do `DELETE`
só gera `window.log.error`, sem relançar.

### Toast

Mantido exatamente como estava. O prompt permitia as duas opções; a mensagem atual
("Falha ao enviar para reposição.") não promete nada sobre a reposição ter sido desfeita, então
não havia garantia falsa a corrigir. Mudá-la seria escopo além do decidido.

---

## 4. Testes

Suíte foi de **211** para **218**. Sete testes novos.

### `backend/test/reposicao-api.test.js` — quatro testes

| Teste | Cobre |
| --- | --- |
| `DELETE remove a reposicao do banco e responde deleted true` | sucesso: `findOneAndDelete` chamado uma vez, com `{ ownerEmail, id }` exatos; resposta `200` / `deleted: true` |
| `DELETE de id inexistente responde 200 com deleted false, nao 404` | idempotência; e que `findOneAndDelete` **não** é chamado |
| `DELETE respeita o escopo por ownerEmail e nao apaga reposicao de outro dono` | a busca usa o `ownerEmail` do requisitante; reposição de outro dono não é encontrada nem apagada, e o "banco" simulado continua com um registro |
| `rota de reposicoes expoe DELETE em /:id` | a rota está de fato registrada — inspeciona `router.stack` e confirma `route.methods.delete === true` |

O último é o único teste desta rodada que exercita o `reposicaoRoutes.js` real; sem ele, o
controller poderia estar correto e a rota nunca ter sido plugada. Ele custa ~10s por carregar a
cadeia de `require` do Express até os models.

### `backend/test/gcal-duplicata-fix.test.js` — três testes

O helper `prepararEnvioAvulsaParaReposicao` ganhou o parâmetro opcional `falharDelete`, que faz o
mock de `apiFetchBackend` lançar exceção quando o método é `DELETE`. Os dois testes do Ponto 6
que já existiam não foram alterados.

| Teste | Cobre |
| --- | --- |
| `falha na gravação dispara DELETE da reposição criada, com o id correto` | exatamente 1 `DELETE`, para `https://api.example.com/reposicoes/rep-criada-p6` |
| `sucesso na gravação não dispara DELETE de reposição` | o caminho feliz não apaga nada |
| `DELETE que falha não impede a aula de voltar nem o toast de erro` | o `DELETE` foi tentado, a aula voltou para `aulas` mesmo assim e o toast de erro apareceu |

---

## 5. Provas por mutação — geradas nesta sessão

### Mutação A — desligar a chamada de `DELETE` no frontend

`if (false && reposicao && reposicao.id)` no `catch` do Ponto 6.

```text
npm test

[... saida podada ...]

test at test\gcal-duplicata-fix.test.js:4432:1
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: a reposição órfã precisa ser apagada
  0 !== 1

test at test\gcal-duplicata-fix.test.js:4454:1
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: o DELETE foi tentado
  0 !== 1

ℹ tests 218
ℹ suites 0
ℹ pass 216
ℹ fail 2
ℹ duration_ms 13987.9902
```

Mutação revertida.

### Mutação B — `excluirReposicao` sem `findOneAndDelete`

Linha `await Reposicao.findOneAndDelete({ ownerEmail, id });` comentada; o controller passa a
responder `deleted: true` sem apagar nada.

```text
npm test

[... saida podada ...]

test at test\reposicao-api.test.js:233:1
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: findOneAndDelete precisa ser chamado
  0 !== 1

ℹ tests 218
ℹ suites 0
ℹ pass 217
ℹ fail 1
ℹ duration_ms 18723.6231
```

Mutação revertida. Vale notar que essa mutação **só** derruba o teste de sucesso — os testes de
idempotência e de escopo continuam verdes, porque eles verificam justamente que
`findOneAndDelete` *não* é chamado. É o comportamento esperado e mostra que os três testes
cobrem coisas diferentes.

### Suíte verde após restaurar as duas mutações

```text
npm test
ℹ tests 218
ℹ suites 0
ℹ pass 218
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14483.0783
```

---

## 6. Documentação

### Item `9.27`

O bloco "Limite conhecido do ponto 6 — reversão remota da reposição criada não foi implementada"
foi substituído por "Reposição órfã do ponto 6 — RESOLVIDO na etapa 6i-b", descrevendo o endpoint
novo, a chamada no `catch`, o motivo de apagar em vez de cancelar, e — explicitamente — que o
`DELETE` é best-effort e **não há garantia de que a reposição órfã sempre será apagada**.

### Item `9.20`

A frase incorreta foi reescrita. O texto antigo dizia que "o rollback existe e reverte a criação
remota e a marcação local em caso de falha". A menção à criação remota saiu da frase principal, e
um parágrafo novo registra a correção: o `catch` do ramo `ehSerie` só restaura
`compromisso.excecoes` em memória e mostra o toast; nenhuma chamada de rede desfaz a reposição
criada nesse ramo. **O ramo `ehSerie` não foi alterado** — só a frase da spec, como o prompt
determinou.

### Item `9.24`

Linha nova apontando para este relatório.

---

## 7. Portão de saída

```text
Set-Location 'C:\Users\LBRESSIA\OneDrive - azureford\Documents\GitHub Person\personalapp\backend'
npm test
ℹ tests 218
ℹ suites 0
ℹ pass 218
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14483.0783

Set-Location 'C:\Users\LBRESSIA\OneDrive - azureford\Documents\GitHub Person\personalapp'

git status --short
[... saida podada ...]

git diff --stat
 assets/js/modal-acao-slot.js                   |  20 ++++-
 backend/src/controllers/reposicaoController.js |  26 ++++++
 backend/src/routes/reposicaoRoutes.js          |   4 +-
 backend/test/gcal-duplicata-fix.test.js        |  45 +++++++++-
 backend/test/reposicao-api.test.js             | 114 +++++++++++++++++++++++++
 docs/specs/gcal-sync.md                        |  16 +++-
 6 files changed, 219 insertions(+), 6 deletions(-)
```

Todos os arquivos alterados estão na lista das Restrições. `backend/src/models/Reposicao.js` não
foi tocado. O diff de `assets/js/modal-acao-slot.js` tem exatamente dois hunks, ambos dentro de
`executarEnvioParaReposicao` — nenhum outro ponto da 6i ou da 6h foi alterado.

---

## 8. O que continua em aberto

1. **O `DELETE` pode falhar.** É best-effort por design. Se a rede cair entre a restauração da UI
   e a chamada de exclusão, a reposição órfã sobrevive e precisa de tratamento manual. Isso está
   registrado no item `9.27` e não é escondido no toast.
2. **O ramo `ehSerie` continua sem reversão remota.** Fora do escopo desta etapa por instrução
   explícita. Só a spec foi corrigida para parar de afirmar o contrário.
3. **Sem validação de UI.** Como sempre neste projeto, o comportamento visível foi validado por
   asserção no harness, não em navegador.
