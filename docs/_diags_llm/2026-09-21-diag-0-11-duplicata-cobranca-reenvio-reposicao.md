# Diagnóstico — item 0.11: reenvio de reposição já cobrada duplica cobrança

> Origem: item 0.11 de `docs/roadmap.md`, investigado em 2026-09-21.
> Escopo desta rodada: diagnóstico e plano de correção. **Nenhum código foi alterado.**
> Branch: `main` (decisão do dono — não abrir branch nova para esta rodada de investigação).
>
> **Execução das etapas 5.1.1 e 5.1.2 (Mongo de produção)**: o ambiente do agente não tem
> acesso ao Mongo de produção. O agente pode preparar a consulta/script, mas rodar contra o
> banco e aplicar qualquer correção de dado é tarefa do **dono do repositório**.

---

## 1) Confirmação do bug

O item 0.11 do roadmap está corretamente marcado como `[ ]` (pendente). O bug descrito
existe hoje no código, sem nenhuma mitigação parcial.

## 2) O que é o bug, de forma precisa

**Não é bug**: enviar uma aula para reposição e reenviá-la quantas vezes for preciso
enquanto dentro do prazo (`validoAte`). Isso é o fluxo normal (seção 6.4 da spec
`docs/specs/reposicoes-e-competencia.md`) e o botão "Enviar para reposição" não deve ser
ocultado ou desabilitado de forma geral.

**É bug**: quando uma reposição já **cobrável** (`cobravel: true`) é reagendada
(`window.iniciarReagendamentoReposicao` → o novo agendamento recebe
`isReposicao: true` e `reposicaoId` apontando para o registro original,
[modal-acao-slot.js linha 1821-1823](../../assets/js/modal-acao-slot.js#L1821-L1823)), e essa
**nova aula** é enviada de novo para reposição, `executarEnvioParaReposicao` cria um
**segundo registro `Reposicao` independente**, sem qualquer vínculo com o primeiro:

- `enviarParaReposicao()` ([modal-acao-slot.js linha 192](../../assets/js/modal-acao-slot.js#L192))
  sempre gera `id: gerarIdReposicao()` novo e faz `POST /api/reposicoes`.
- `window.executarEnvioParaReposicao` ([modal-acao-slot.js linha 2532](../../assets/js/modal-acao-slot.js#L2532))
  chama `enviarParaReposicao` direto após a escolha cobrável/não cobrável do modal
  (`abrirModalEscolhaCobrancaReposicao`), **sem nunca consultar** `compromisso.reposicaoId`.
- O backend não tem lógica de "reabertura": `POST /api/reposicoes`
  ([reposicaoController.js linha 144](../../backend/src/controllers/reposicaoController.js#L144))
  só cria; rejeita com 409 se o `id` já existir, mas não sabe nada sobre
  "essa aula já teve uma reposição antes". `PATCH /api/reposicoes/:id`
  ([reposicaoController.js linha 249](../../backend/src/controllers/reposicaoController.js#L249))
  atualiza campos de um registro existente, mas não existe rota nem comando para
  "reabrir X a partir do estado atual de Y".

Se o registro **original** (o primeiro `Reposicao`) já estava `cobravel: true` — ou seja,
já é contado na parcela (B) de `calcularAulasContadasDoCiclo`
([financasService.js](../../backend/src/services/financasService.js), filtro
`reposicao.cobravel === true && dataEmJanela(reposicao.dataOriginal, ...)`) — o segundo
registro, se também `cobravel: true`, **também** entra na parcela (B). A mesma aula de
origem passa a contar duas vezes no financeiro.

Quando o original é `cobravel: false` (ainda não contribuiu para nenhum ciclo), reenviar
não duplica nada — é o caso comum, sem necessidade de aviso.

## 3) Por que hoje nada impede isso

- `Reposicao` ([Reposicao.js](../../backend/src/models/Reposicao.js)) não tem nenhum campo
  que aponte "reposição de origem" (`reposicaoOrigemId` ou similar). O único vínculo que
  existe é `Agendamento.reposicaoId` → `Reposicao.id` (unidirecional, aponta para a
  reposição que **gerou** aquele agendamento), não o inverso — não há como o backend, ao
  criar uma reposição nova a partir de um agendamento que já tem `reposicaoId`, saber que
  deveria reabrir em vez de criar.
- O contrato de `POST /api/reposicoes` não recebe (e o frontend não envia) o
  `reposicaoId` do agendamento de origem. `enviarParaReposicao()` não lê
  `compromisso.reposicaoId` em nenhum momento.
- `calcularAulasContadasDoCiclo` e `montarExtratoDoCiclo`
  ([financasService.js](../../backend/src/services/financasService.js)) tratam todo
  registro `Reposicao` com `cobravel === true` e `dataOriginal` na janela do ciclo como
  uma cobrança válida e independente — não há deduplicação por `agendamentoOriginalId`
  nem por qualquer outra chave que amarre as duas reposições à mesma aula.

## 4) Decisão de produto já registrada no roadmap (não é nova)

O item 0.11 já registra a correção escolhida pelo dono do repo — este diagnóstico não
reabre essa decisão, apenas a detalha tecnicamente:

> Em vez de criar um registro novo do zero, o modal de escolha "Cobrar neste ciclo /
> Cobrar na reposição" passa a **reabrir o mesmo registro `Reposicao` de origem** quando
> a aula reenviada tiver `reposicaoId` — volta para `status: 'pendente'`, zera
> `agendamentoReposicaoId`, e registra o evento no array `historico` do próprio
> documento.

Motivo explícito da escolha: manter o histórico de remarcações em um único documento, em
vez de espalhar em registros desconectados.

Consequência de UI também já registrada: quando o registro de origem já é
`cobravel: true`, a escolha "Cobrar neste ciclo" não deve ser oferecida de novo (a aula
já está contabilizada) — a redação exata do modal nesse caso fica para a implementação.

## 5) Plano de correção

### 5.1 Passo 0 — confirmar dados de produção antes de codar

O item 0.11 já alerta: **"requer confirmar se há registros `Reposicao` duplicados hoje no
banco que precisem de correção manual"**. Antes de tocar em código:

- Rodar uma consulta de leitura (sem escrita) no Mongo de produção agrupando `Reposicao`
  por `alunoId` + `agendamentoOriginalId`-da-cadeia (via `Agendamento.reposicaoId` →
  `Reposicao.id` → `Agendamento` novo → `Reposicao` novo) para achar cadeias de mais de
  um registro `cobravel: true` referentes à mesma aula original.
- Se existirem, decidir com o dono do repo o que fazer com o histórico já cobrado
  incorretamente (fora do escopo de código, decisão de dado).

Esta etapa não estava no escopo desta rodada (só investigação) e deve abrir a próxima
rodada de implementação.

#### 5.1.1 Como identificar cadeias duplicadas (consulta somente leitura)

**Execução: dono do repositório.** O agente não tem acesso ao Mongo de produção neste
ambiente — o passo abaixo é a proposta de consulta para o dono rodar (via `mongosh` ou
script Node com Mongoose, **sem nenhum `update`**):

1. Para cada `ownerEmail`, carregar todos os `Reposicao` e todos os `Agendamento` com
   `reposicaoId` preenchido.
2. Montar a cadeia: partindo de cada `Reposicao` com `cobravel: true`, seguir
   `Reposicao.agendamentoReposicaoId` → `Agendamento` correspondente → verificar se esse
   mesmo `Agendamento.id` aparece como `agendamentoOriginalId` de **outro** `Reposicao`.
   Se aparecer, e esse segundo registro também for `cobravel: true`, a cadeia é uma
   duplicata candidata.
3. Reportar cada cadeia encontrada com: `alunoId`, os dois (ou mais) `id` de `Reposicao`
   envolvidos, `dataOriginal` de cada um, e se cada um já foi efetivamente contado em
   algum ciclo (`cicloCobrancaResolvido` ou `dataEmJanela` contra os ciclos já fechados
   daquele aluno em `CicloFinanceiro`).

Esse levantamento é só leitura e pode ser feito antes de qualquer decisão de código —
inclusive antes de responder as perguntas abertas da seção 5.7, porque o volume de dados
afetados pode influenciar a decisão do dono sobre a Opção A/B do backend.

#### 5.1.2 Correção manual dos dados, se cadeias forem encontradas

**Execução: dono do repositório.** Assim como o levantamento de 5.1.1, qualquer escrita
corretiva no Mongo de produção é feita pelo dono — o agente não executa nem tem acesso a
esse banco. Se o levantamento acima encontrar cadeias duplicadas, a correção de dado é
**separada** da correção de código e precisa ser tratada com o cuidado que a seção 6 das
instruções do repositório exige para código financeiro (nenhuma escrita direta no Mongo
de produção sem plano revisado e sem rede de proteção):

1. **Nunca excluir** o registro duplicado direto. Cada `Reposicao` pode já ter gerado um
   `Agendamento` de reposição real (aluno já repôs a aula) — apagar o documento sem
   verificar quebra o vínculo `agendamentoReposicaoId` e pode deixar um agendamento
   "órfão" na agenda.
2. Para cada cadeia confirmada como duplicata real (mesma aula de origem, dois registros
   `cobravel: true`):
   - Verificar em `CicloFinanceiro` (por `alunoId`) se algum ciclo **já pago** contou a
     aula duplicada — se sim, o valor cobrado do aluno está errado e o ajuste financeiro
     (campo de ajuste manual do ciclo, já usado pelo item 1.9) é o caminho correto para
     compensar, **não** uma edição retroativa do ciclo pago (proibida pela regra de
     congelamento, seção 5 das instruções do repositório).
   - Se nenhum ciclo pago contou ainda (a duplicata está só no ciclo vigente, ainda não
     congelado), a correção pode ser feita apagando ou marcando como `expirada`/inativo
     o registro `Reposicao` mais recente (o segundo, gerado indevidamente pelo bug) —
     mas só depois de confirmar que ele não tem `Agendamento` vinculado que precise
     permanecer na agenda. Se tiver, desvincular o agendamento (`reposicaoId: null`)
     antes de remover o registro de reposição.
   - Registrar cada correção manual em `historico` do registro que permanece (mesmo que
     a escrita seja manual via `mongosh`/script, não pela API), para não perder
     rastreabilidade do que foi ajustado e por quê.
3. Qualquer script de correção de dado deve ser **dry-run primeiro** (imprimir o que
   mudaria, sem `update`) e só então aplicado, com backup/export da coleção `Reposicao`
   (e `CicloFinanceiro` se algum ajuste financeiro for necessário) antes da escrita —
   não há staging (seção 6 das instruções do repositório), então qualquer escrita
   corretiva é direto em produção.
4. Esta etapa (5.1.2) só é necessária **se** o levantamento de 5.1.1 encontrar cadeias
   duplicadas reais. Se o levantamento não encontrar nada, este passo é pulado e a
   implementação segue direto para 5.2 em diante.

### 5.2 Modelo de dados (`backend/src/models/Reposicao.js`)

Nenhum campo novo parece necessário para a mecânica de reabertura em si — o mesmo
documento é atualizado. Mas vale confirmar no schema atual, ao implementar, se o array
`historico` (linha 68-76) já aceita um `evento` livre o suficiente para registrar
"reaberta por reenvio" sem mudança de schema. Pela leitura atual, sim
(`{ evento: String, data: String, agendamentoId: String }`).

### 5.3 Backend — nova operação de reabertura

Duas rotas possíveis, a decidir na implementação (nenhuma delas exige rota HTTP nova
necessariamente):

- **Opção A (preferida, menor superfície nova)**: estender `atualizarReposicao`
  (`PATCH /api/reposicoes/:id`) para aceitar um "modo reabertura" quando o corpo pedir
  `status: 'pendente'` explicitamente sobre um registro que já está
  `agendada`/`realizada`/`expirada`, zerando `agendamentoReposicaoId` e empurrando em
  `historico` no mesmo `findOneAndUpdate`. Hoje o controller já tem guarda para campos
  imutáveis (`cobravel`, `dataOriginal`, `dataEnvio`, `agendamentoOriginalId`,
  `ownerEmail`, `historico` via corpo direto) — a reabertura precisa continuar
  respeitando essas guardas e usar o endpoint dedicado de histórico
  (`POST /api/reposicoes/:id/historico`) ou um push interno equivalente, não abrir uma
  brecha para o cliente escrever em `historico` livremente.
- **Opção B**: rota nova dedicada, ex. `POST /api/reposicoes/:id/reabrir`, que faz o
  `findOneAndUpdate` de status + zera vínculo + grava histórico numa única operação
  atômica. Mais explícita sobre intenção, mas adiciona rota nova.

Em ambos os casos, o backend precisa:

1. Rejeitar reabertura se o registro de origem for `cobravel: true` **e** a UI não tiver
   passado por essa aula como "já contabilizada" (ver 5.4) — ou aceitar e deixar a UI
   nunca oferecer esse caminho. A decisão de onde fica a guarda (client-only vs.
   client+server) precisa ser tomada explicitamente; regra geral do projeto é preferir
   validar no servidor porque o cliente não é fonte de verdade de regra de negócio
   (seção 4.3 das instruções do repositório).
2. Nunca deixar dois registros de reposição cobráveis vivos e apontando (via a cadeia de
   agendamentos) para a mesma aula de origem — isso é a causa raiz do bug, então a
   correção precisa fechar esse caminho, não só abrir uma UI melhor.

### 5.4 Frontend (`assets/js/modal-acao-slot.js`)

- `executarEnvioParaReposicao` precisa, antes de chamar `enviarParaReposicao`, verificar
  `compromisso.reposicaoId`. Se existir:
  - Buscar o registro de reposição original (já deve estar em memória via
    `window.reposicoes` carregado no boot, `storage.js` linha ~364, ou buscar na API).
  - Se `original.cobravel === true`: **não oferecer** a opção "Cobrar neste ciclo" no
    modal de escolha (`abrirModalEscolhaCobrancaReposicao`) — a aula já está
    contabilizada. A exata redação/UX desse estado fica a decidir na implementação
    (seção 9.3 da spec já tem o texto padrão das duas opções; precisa de uma terceira
    variante ou anotação quando uma delas for desabilitada).
  - Chamar a operação de reabertura (5.3) em vez de `enviarParaReposicao` (que cria).
- `enviarParaReposicao()` deixa de ser chamada nesse caminho — ou passa a aceitar um
  parâmetro opcional que sinalize reabertura, dependendo de como a Opção A/B do backend
  for resolvida.

### 5.5 Spec — atualização obrigatória antes de fechar

`docs/specs/reposicoes-e-competencia.md` precisa documentar o caso de borda, como o
próprio item 0.11 já pede:

- Seção 5.3 (vínculo bidirecional `reposicaoId`/`agendamentoReposicaoId`): acrescentar a
  regra de que reenviar uma aula com `reposicaoId` reabre o registro original em vez de
  criar um novo.
- Seção 9.3 (modal de escolha cobrável/não cobrável): documentar a supressão da opção
  "Cobrar neste ciclo" quando o registro de origem já é `cobravel: true`.
- Seção 6 (prazo de validade): confirmar se a reabertura recalcula `validoAte` ou herda o
  valor antigo — pela leitura da seção 6.4 atual ("recancelamento não renova o prazo"),
  a leitura mais consistente é **herdar o prazo antigo**, mas isso precisa ser uma frase
  explícita na spec, não inferida.

### 5.6 Testes (rede de proteção, seção 10 das instruções do repo)

Testes novos necessários em `backend/test/` (nome de arquivo sugerido:
`reposicao-reabertura.test.js`, mas pode ser incorporado a um teste existente):

1. Reenviar aula com `reposicaoId` apontando para registro `cobravel: true` → reabre o
   mesmo `id`, não cria segundo documento; `agendamentoReposicaoId` volta a `null`;
   `historico` recebe novo evento.
2. Reenviar aula com `reposicaoId` apontando para registro `cobravel: false` → comportamento
   inalterado (pode continuar criando novo registro, já que não há risco de duplicar
   cobrança) — **confirmar com o dono se este caso também deve reabrir por consistência,
   ou se cria novo como hoje**. O texto do item 0.11 sugere que o caso comum
   (`cobravel: false`) "não duplica nada" e não precisa de aviso, mas não deixa explícito
   se ele também deve passar a reabrir por uniformidade do modelo de histórico.
3. `calcularAulasContadasDoCiclo` / `montarExtratoDoCiclo`: um registro reaberto não deve
   gerar duas linhas de cobrança — teste de regressão que comprove que o cenário do bug
   (dois registros cobráveis para a mesma aula) não é mais alcançável pelo fluxo normal
   da UI.
4. Cada teste novo precisa ser provado por mutação (regra do repositório, seção 10):
   reverter a correção e confirmar que o teste falha antes de considerar a cobertura
   válida.

Suíte de frontend (`tests-frontend/`) não cobre `modal-acao-slot.js` hoje (é tela) — a
validação da UI do modal de escolha continua manual, como já é o padrão do projeto.

### 5.7 Perguntas abertas para o dono do repositório antes de implementar

1. Reabertura via `PATCH` existente (Opção A) ou rota dedicada `POST .../reabrir`
   (Opção B)?
2. O caso `cobravel: false` também deve passar a reabrir o registro original (por
   uniformidade do histórico), ou pode continuar criando um registro novo como hoje, já
   que não duplica cobrança?
3. Ao reabrir, o `validoAte` original é mantido (leitura mais consistente com a seção 6.4
   da spec) ou deve ser recalculado a partir da nova tentativa de envio?
4. Existem hoje, em produção, registros `Reposicao` duplicados por este bug que precisam
   de correção manual de dados? (Passo 0, seções 5.1.1/5.1.2 — verificação e eventual
   correção separadas, fora deste diagnóstico.)

## 6) Resumo do plano (ordem sugerida de execução)

1. Rodar o levantamento somente leitura em produção (5.1.1) para achar cadeias de
   `Reposicao` duplicadas.
2. Se houver cadeias confirmadas, aplicar a correção manual de dados (5.1.2) — dry-run,
   backup da coleção, decisão de ajuste financeiro por ciclo pago vs. remoção segura do
   registro duplicado ainda não pago. Se não houver, pular direto para o passo 3.
3. Responder as perguntas abertas (5.7) com o dono do repo.
4. Atualizar a spec `docs/specs/reposicoes-e-competencia.md` (5.5) com as regras
   confirmadas — a spec precisa refletir a decisão **antes** do código, por ser fonte de
   verdade de regra de negócio (regra do repositório, seção 2).
5. Implementar a reabertura no backend (5.3), com testes (5.6) escritos e provados por
   mutação antes/junto da mudança.
6. Implementar a detecção de `compromisso.reposicaoId` e o ajuste do modal de escolha no
   frontend (5.4).
7. Rodar as duas suítes (`backend/`, `node --test`) antes e depois, e reportar os números
   medidos (regra do repositório, seção 10) — não usar a contagem escrita neste
   diagnóstico, que pode já estar desatualizada quando a implementação começar.
8. Validação manual da UI do modal de escolha (não há cobertura automatizada de tela).
