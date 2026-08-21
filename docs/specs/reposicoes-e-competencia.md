# Spec — Reposições e Competência de Cobrança

> **Status**: Proposta (não implementada) · **Versão**: 2 · **Atualizado**: 2026-08-21
>
> **Relação com outras specs**: complementa `docs/specs/financas-ciclo-cobranca.md` (v6).
> Esta spec **altera a regra 5.8** daquela (o que conta como aula cobrável) e introduz
> uma entidade nova. A spec de Finanças continua sendo a fonte de verdade sobre ciclo,
> snapshot, congelamento e status de pagamento.

---

## 1. Problema

Hoje o app tem uma "fila de reposição" (`aulasParaRepor`) que:

1. **Não é persistida em lugar nenhum** — é `let aulasParaRepor = []` em `state.js`.
   Não é gravada na API nem no `localStorage`. Some no primeiro reload e não existe em
   outro dispositivo.
2. **Guarda três campos** (`id`, `alunoId`, `dataCancelamento`) e nenhum vínculo com o
   compromisso de origem.
3. **Remove a ocorrência da agenda** ao enviar para reposição (splice no caso avulso,
   exceção na série no caso recorrente). Como o financeiro conta ocorrências da agenda,
   a aula **deixa de ser cobrada silenciosamente**.

Resultado atual: uma aula enviada para reposição desaparece do financeiro e a informação
de que ela existiu se perde no primeiro refresh.

Além disso, o modelo atual (cobrança **por ocorrência**) produz um caso de cobrança dupla:
uma aula do fim de um ciclo **já pago** que é reagendada para o ciclo seguinte é cobrada
duas vezes — o ciclo pago está congelado (decisão 16 da spec de Finanças) e a reposição
é contada como aula nova no ciclo seguinte.

---

## 2. Objetivo

- Persistir a fila de reposições, com rastreabilidade completa.
- Migrar o financeiro do modelo **por ocorrência** para o modelo **por competência**.
- Garantir que cada aula seja cobrada **exatamente uma vez**, e que o extrato de cada
  ciclo explique onde.
- Dar visibilidade da composição do ciclo ("extrato") em vez de só um total.
- Preparar (sem ativar tudo) prazo de validade da reposição.

---

## 3. Mudança de modelo: de ocorrência para competência

### 3.1 Os dois modelos

| | Modelo A — por ocorrência (atual) | Modelo B — por competência (esta spec) |
|---|---|---|
| Onde a aula é cobrada | no ciclo em que ela **acontece** | no ciclo em que ela estava **originalmente marcada** |
| Aula na fila de reposição | não é cobrada | pode ser cobrada, conforme escolha |
| Reposição remarcada | cobrada de novo | não é cobrada de novo se já foi |

**Decisão: adotar o Modelo B.**

### 3.2 A escolha no momento do envio para reposição

Ao enviar uma aula para reposição, a PT escolhe **uma única vez** entre dois caminhos.
A escolha é **irreversível** e é herdada por toda a corrente de reagendamentos daquela
aula (ver 6.4).

| Escolha | Ciclo de origem | Ciclo em que a reposição acontece |
|---|---|---|
| **Cobrável** | Conta e é cobrada normalmente | Aparece no extrato com **valor zero** + nota: *"já cobrada no ciclo 17/03–16/04"* |
| **Não cobrável** | Não conta. Extrato registra: *"1 reposição pendente, não cobrada"* | **Conta e é cobrada aqui** + nota: *"referente ao ciclo 17/03–16/04"* |

Propriedades garantidas por esse desenho:

- A aula é cobrada **exatamente uma vez**, nunca zero, nunca duas.
- O extrato dos **dois** ciclos explica onde ela foi parar. Nada some sem rastro.
- O caso de cobrança dupla descrito em 1 **desaparece por construção**: mesmo que o
  ciclo de origem esteja congelado, o agendamento de reposição chega marcado como
  já cobrado.

### 3.3 Diferença semântica entre "excluir" e "enviar para reposição"

Com o Modelo B, os dois botões deixam de ser quase equivalentes:

- **Excluir esta aula** → a aula deixa de existir. Ninguém cobra nada. Não gera registro.
- **Enviar para reposição** → a aula sai da agenda mas **continua existindo para efeito
  de cobrança**. Gera registro na collection.

Isso precisa estar claro na UI (ver 9).

---

## 4. Modelo de dados

### 4.1 Nova collection: `Reposicao`

Decisão: **collection separada**, não campo no `Agendamento`. Motivo: a fila tem vida
própria no modelo de negócio (prazo de validade, avisos, e futuramente tela dedicada),
e ocorrências de séries recorrentes não têm documento próprio para carregar o campo.

| Campo | Tipo | Papel |
|---|---|---|
| `ownerEmail` | String, **required**, indexado | isolamento multiusuário (ver 4.3) |
| `id` | String, required | id de aplicação, no mesmo padrão de `Agendamento` |
| `alunoId` | String | dono da reposição |
| `alunoNome` | String | desnormalizado, para exibição |
| `dataOriginal` | String **ISO** (`YYYY-MM-DD`) | **competência** — define o ciclo de origem |
| `horarioOriginal` | String `HH:MM` | informativo, para a fila e o extrato |
| `cobravel` | Boolean | escolha feita no envio (3.2). Imutável |
| `cicloCobrancaResolvido` | `{ inicio, fim }` ISO ou null | em qual janela foi efetivamente cobrada |
| `status` | String enum | `pendente` / `agendada` / `realizada` / `expirada` |
| `agendamentoOriginalId` | String | de onde veio |
| `agendamentoReposicaoId` | String ou null | para onde foi — **campo crítico**, ver 5.3 |
| `validoAte` | String ISO ou null | prazo (ver 6). Nulo enquanto não houver prazo |
| `dataEnvio` | String ISO 8601 completo | quando entrou na fila; auditoria, precisa de ordem fina |
| `historico` | Array | append-only: `{ evento, data, agendamentoId }`; `data` é timestamp ISO 8601 completo |

A collection usa `strict` padrão do Mongoose, **diferente dos demais schemas do projeto**, que usam `{ strict: false }`. O formato aqui nasce fechado e conhecido; `strict` padrão impede que um typo em nome de campo grave silenciosamente — risco relevante num modelo que alimenta cálculo financeiro.

`dataOriginal`, `validoAte`, `cicloCobrancaResolvido.inicio` e `.fim` são **datas puras** (`YYYY-MM-DD`), porque representam competência e são comparadas contra a janela do ciclo. Já `dataEnvio` e `historico[].data` são **timestamps ISO completos** (`new Date().toISOString()`), porque são auditoria: precisam de ordenação fina mesmo quando dois eventos acontecem no mesmo dia.

Índices: `{ ownerEmail: 1, id: 1 }` único, e `{ ownerEmail: 1, alunoId: 1, status: 1 }`
para a consulta da fila.

### 4.2 Ciclo de vida

```
              enviar para reposição
                       │
                       ▼
                  [ pendente ]  ◄──────────────┐
                       │                       │
              marcar reposição                 │ reposição cancelada
                       │                       │ (ganha validoAte na 1ª vez, 6.3)
                       ▼                       │
                  [ agendada ] ────────────────┘
                       │
              aula acontece / ciclo avança
                       │
                       ▼
                 [ realizada ]

     [ pendente ] ──── validoAte vencido ────► [ expirada ]
```

**Nada é deletado.** `realizada` e `expirada` são estados finais; o documento permanece
para histórico e auditoria.

### 4.3 Isolamento

Toda query à collection **deve** filtrar por `ownerEmail`, via `getOwnerEmailOrThrow`,
igual ao resto do sistema. Não há outra camada impedindo vazamento entre contas.

### 4.4 Formato de datas

Existem duas granularidades distintas na collection:

- **Datas de competência**: `dataOriginal`, `validoAte`, `cicloCobrancaResolvido.inicio` e
  `.fim` ficam em ISO puro (`YYYY-MM-DD`). O fluxo atual empilha `dataCancelamento` em
  pt-BR vindo direto do modal; na criação do registro isso **precisa** passar por
  `normalizarDataParaISO` (`backend/src/utils/time.js`). Conversão para pt-BR só na
  renderização.
- **Auditoria**: `dataEnvio` e `historico[].data` ficam em timestamp ISO completo
  (`new Date().toISOString()`), para permitir ordenação fina mesmo no mesmo dia.

> Sem a normalização das datas de competência, a comparação com a janela do ciclo falha
> silenciosamente nas bordas — é o tipo de bug que só aparece no dia 1 e no dia 31.

---

## 5. Regras de contagem

Substituem/estendem a regra 5.8 da spec de Finanças.

### 5.1 O que conta em um ciclo `[cicloInicio, cicloFim]`

Para um aluno, o total de aulas contadas é a soma de três parcelas:

**(A) Agendamentos normais** — compromissos do aluno com `tipo === 'aula'` ou
`tipo === 'reposicao'`, cuja data resolvida (via módulo isomórfico) caia na janela,
**e que não estejam vinculados a nenhum registro de reposição** (ver 5.3).

**(B) Reposições cobráveis de origem neste ciclo** — registros com `cobravel === true`
e `dataOriginal` dentro da janela, **em qualquer status** (inclusive `pendente`,
`agendada` e `expirada`). É o que garante que a aula no limbo continue sendo cobrada.

**(C) Reposições não cobráveis que aconteceram neste ciclo** — registros com
`cobravel === false` cujo `cicloCobrancaResolvido` seja esta janela.

```
aulasContadas = (A) + (B) + (C)
```

O restante do cálculo (ajuste manual, piso zero, snapshot de preço, valor fixo) segue
inalterado conforme a spec de Finanças.

### 5.2 Grafia de `tipo`

O financeiro e o serializer usam `'reposicao'` (sem acento). A grafia `'reposição'`
(com acento) **não deve mais existir** em lugar nenhum.

⚠️ **Atenção**: o fluxo atual de remarcar cria o compromisso com `tipo: 'aula'` e as
flags `isReposicao: true` / `reagendada: true`. A classificação do extrato (8) **não pode
depender só de `tipo`** — precisa olhar o vínculo com o registro de reposição.

### 5.3 Regra anti-contagem-dupla (crítica)

> **Todo agendamento originado de uma reposição carrega o id do registro de reposição
> (`reposicaoId`). Agendamento com esse vínculo NUNCA é contado pela parcela (A) — sua
> cobrança é governada exclusivamente pelo registro de reposição.**

Esse vínculo não é enfeite de rastreabilidade: é o que impede a mesma aula de ser contada
pela agenda **e** pela fila. É o campo mais importante do modelo.

Consequência: ao marcar uma reposição, o agendamento criado recebe `reposicaoId`, e o
registro recebe `agendamentoReposicaoId`. O vínculo é **bidirecional** e deve ser gravado
na mesma operação.

### 5.4 Reposição não cobrável que cai em ciclo já pago

Se uma reposição `cobravel === false` for marcada para uma data dentro de um ciclo que
**já está pago** (congelado, decisão 16 da spec de Finanças), ela **não** pode ser
adicionada àquele ciclo. Ela é cobrada no **primeiro ciclo seguinte que não esteja pago**,
e `cicloCobrancaResolvido` registra essa janela. O extrato traz a nota:
*"referente ao ciclo 17/03–16/04, cobrada aqui por ciclo anterior já pago"*.

⚠️ Confirmar esta regra antes de implementar (ver 13).

### 5.5 Aluno com `valor_fixo`

Para aluno com `metodoCobranca === 'valor_fixo'`, o valor do ciclo **não depende** da
contagem de aulas. Portanto:

- A escolha cobrável/não cobrável **é registrada normalmente** (para manter a lógica
  única e o extrato coerente), mas **não afeta valor nenhum**.
- O extrato dele é **puramente informativo**.
- O modal de escolha **continua aparecendo**, por consistência de fluxo.

---

## 6. Prazo de validade

### 6.1 Quando o prazo nasce

- Aula enviada para reposição pela primeira vez → **sem prazo** (`validoAte = null`).
  Fica na fila indefinidamente.
- Reposição que já havia sido marcada e é **cancelada** → aí sim ganha `validoAte`.

Racional: a primeira ida para a fila é o cancelamento da aula em si; o prazo existe para
evitar que a PT fique remarcando indefinidamente uma aula que nunca acontece.

### 6.2 Como o prazo é calculado

```
validoAte = último dia do ciclo vigente do aluno na data do cancelamento

SE (validoAte - hoje) < 7 dias:
    validoAte = último dia do ciclo SEGUINTE
```

**Piso mínimo de 7 dias.** Sem ele, uma reposição cancelada a um dia do fim do ciclo
nasceria praticamente morta — e no caso cobrável o aluno perderia a aula por um prazo
que nunca foi factível.

Quando o piso é aplicado, a UI **avisa explicitamente**: *"Prazo definido para o fim do
ciclo seguinte (16/05), por faltarem menos de 7 dias para o fim do ciclo atual."*

### 6.3 Aluno sem ciclo configurado

Aluno com `configuracaoPendente` não tem "fim do ciclo vigente". Nesse caso
`validoAte` fica **nulo** e o registro **não expira** até que haja configuração de ciclo.

### 6.4 Recancelamento não renova o prazo

Se a reposição for marcada e cancelada de novo (segunda, terceira vez), ela **mantém o
`validoAte` que ganhou na primeira vez**. O prazo não é recalculado.

Da mesma forma, `cobravel` **nunca é reperguntado**: a decisão tomada no primeiro envio
vale para toda a corrente. Isso elimina qualquer chance de a mesma aula ser cobrada duas
vezes por escolhas inconsistentes.

### 6.5 Constante única

`PRAZO_MINIMO_REPOSICAO_DIAS = 7`. O mesmo número é usado como janela de "vencendo em
breve" nos avisos de UI (9.5). Não criar duas constantes.

---

## 7. Expiração (lazy)

### 7.1 Não existe cron

O backend roda serverless na Vercel; não há processo contínuo. A expiração segue o
**mesmo padrão já usado no financeiro** por `calcularStatusCiclo` / `aplicarStatusCiclo`:
o estado é **derivado na leitura** e persistido se mudou.

### 7.2 Gatilhos

O recálculo roda em três pontos — basta um disparar para o estado convergir:

1. Leitura da fila de reposições.
2. Leitura de Finanças (cards e histórico).
3. Carga da Home.

### 7.3 Regra

```
SE status === 'pendente' E validoAte !== null E hoje > validoAte:
    status = 'expirada'
```

### 7.4 Expiração nunca altera dinheiro

Propriedade importante, decorrente das decisões:

- **Cobrável expirada**: já foi contada no ciclo de origem pela parcela (B). Expirar
  **não devolve nada** — o aluno pagou e a aula se perdeu.
- **Não cobrável expirada**: nunca foi contada. Expirar **não cobra nada** — foi um
  risco que a PT assumiu ao não cobrar.

Consequência prática: **a expiração nunca precisa tocar em ciclo congelado**, e some uma
classe inteira de casos de borda.

> Limite conhecido: enquanto ninguém abrir o app, nada expira. Aceitável para exibição e
> para o financeiro (que recalcula na leitura). Seria fatal para notificação push — que
> por isso está fora de escopo (12).

### 7.5 Reabrir uma reposição expirada não existe

Decisão explícita: **não haverá ação de "reativar"**. Se a PT quiser honrar uma reposição
expirada, ela cria uma **aula avulsa** normalmente e decide na tela de Finanças se cobra
ou não (via ajuste manual do ciclo). Custo zero de código, resultado equivalente.

---

## 8. Extrato do ciclo

### 8.1 Objetivo

Hoje o ciclo mostra só um total. O extrato responde *"de onde vem esse valor"*:

> Luccas — ciclo 17/04 a 16/05
> • 10 aulas recorrentes ......... R$ 800,00
> • 2 aulas avulsas .............. R$ 160,00
> • 1 reposição .................. R$ 80,00
> • 1 reposição (já cobrada no ciclo 17/03–16/04) ... R$ 0,00
> • Ajuste manual ................ −R$ 80,00
> **Total ......................... R$ 960,00**

No caso comum será sempre uma linha só ("12 aulas recorrentes"). O valor aparece nos
ciclos com muita reposição ou avulsa.

### 8.2 Classificação

| Linha | Critério |
|---|---|
| **Recorrente** | `frequencia !== 'uma_vez'` e sem vínculo de reposição |
| **Avulsa** | `frequencia === 'uma_vez'` e sem vínculo de reposição |
| **Reposição** | possui vínculo com registro de `Reposicao` |
| **Reposição já cobrada** | vínculo + `cobravel === true` (valor zero + nota) |
| **Reposição pendente não cobrada** | registro `cobravel === false`, informativo, valor zero |
| **Reposição expirada** | registro `expirada` no ciclo em que expirou, valor zero + nota |
| **Ajuste manual** | `aulasManuaisExtras` do ciclo |

⚠️ A classificação **olha o vínculo, não o `tipo`** (ver 5.2). O fluxo de remarcar salva
`tipo: 'aula'`; classificar por tipo faria toda reposição aparecer como avulsa.

### 8.3 O extrato é congelado junto com o ciclo

Se o **total** do ciclo pago é congelado mas a **composição** for recalculada da agenda
atual, os dois divergem — o extrato somaria diferente do valor cobrado, o que parece bug
mesmo estando "certo".

**A composição do extrato deve ser gravada no `CicloFinanceiro` no mesmo momento do
congelamento** (registro de pagamento). Ciclos em aberto podem calcular na leitura.

O **ajuste manual precisa ser uma linha do extrato**, senão a soma não fecha.

### 8.4 Linhas de valor zero são obrigatórias

Uma reposição que não gera valor no ciclo **ainda assim aparece**, com R$ 0,00 e a nota
explicando. Sem isso, a aula some da vista e parece que o sistema esqueceu de cobrar.

---

## 9. UI

### 9.1 Renames

Os dois botões vermelhos do `modalAcaoSlot` **não fazem a mesma coisa**, e nenhum dos
dois "cancela" no sentido de dispensar o modal — o dispensar ali já se chama **"Voltar"**.
No código eles já se chamam `btnDeletarDefinitivo` e `btnDeletarInstancia`; só o rótulo
visível ficou desalinhado.

| Elemento | Rótulo hoje | Rótulo novo |
|---|---|---|
| `btnDeletarDefinitivo` (avulsa) | Cancelar | **Excluir esta aula** |
| `btnDeletarInstancia` (série) | Cancelar | **Excluir esta aula** |
| `btnDeletarSerie` | Cancelar Série Completa | **Excluir série completa** |
| `btnMandarParaReposicao` (avulsa) | Reagendar | **Enviar para reposição** |
| `btnReagendarInstancia` (série) | Reagendar | **Enviar para reposição** |
| Botão de dispensar | Voltar | **Voltar** (inalterado) |

"Reagendar" era enganoso: o botão não reagenda nada, manda para a fila. O reagendamento
de verdade é outro modal (`modalReagendarAula`), aberto pelo painel de reposições.

**"Cancelar" continua sendo o rótulo de dispensar modal** nos outros cinco modais
(`modalFormAluno`, `modalEscolhaTipo`, `modalReagendarAula`, `modalAgendamento`,
`modalRecorrencia`, `modalConfigAgenda`) — esses ficam **intocados**. A distinção passa a
ser: *Cancelar = fechar sem salvar; Excluir = ação destrutiva*.

### 9.2 Um botão, duas implementações

`btnMandarParaReposicao` e `btnReagendarInstancia` **nunca aparecem juntos** — um é do
container `acoesCompromissoUnico`, o outro de `acoesCompromissoRecorrente`. Para a PT é
um botão só; no código são dois handlers que fazem a mesma coisa por caminhos diferentes
(splice do documento vs. exceção na série).

**Extrair uma função única**:

```
enviarParaReposicao(compromisso, dataAlvoISO, cobravel)
```

Os dois handlers passam a apenas chamá-la, cada um cuidando só da sua parte específica
(remover documento vs. adicionar exceção). A criação do registro na collection nasce em
**um lugar só**.

> Sem isso, toda regra nova precisa ser escrita duas vezes — é exatamente o tipo de
> simetria que se quebra sem ninguém perceber.

### 9.3 Modal de escolha cobrável / não cobrável

Segundo passo, após o clique em "Enviar para reposição". Modal pequeno, contendo:

- A data e o horário da aula em questão.
- **Duas opções explícitas, sem default pré-selecionado** — as duas são legítimas e a
  escolha é irreversível.
- Um disclaimer curto por opção, explicando a consequência.
- Quando o piso de 7 dias for aplicado (6.2), o aviso correspondente.

Rótulos e textos exatos: ver 13.

### 9.4 Painel de reposições

- Cada item mostra: aluno, data original, se é cobrável, e o prazo (se houver).
- Reposições **vencendo em breve** (≤ 7 dias) recebem destaque visual.
- Reposições **expiradas** aparecem em seção separada ou com marcação clara, e não
  oferecem ação de remarcar.

### 9.5 Aviso no card do aluno

O card do aluno já tem grid `auto-fit` preparado para uma terceira caixinha (item 1.8 do
roadmap). Cabe ali, sem refatoração:

> **Reposições** — 2 pendentes · 1 vence em 5 dias

"Em breve" = **7 dias**, mesma constante de 6.5.

---

## 10. Impacto no código existente

| Arquivo | Impacto |
|---|---|
| `backend/src/models/Reposicao.js` | **novo** |
| `backend/src/controllers/reposicaoController.js` | **novo** — CRUD + expiração lazy |
| `backend/src/services/financasService.js` | parcelas (B) e (C) em `calcularAulasContadasDoCiclo`; extrato; exclusão de vinculados na parcela (A) |
| `backend/src/models/CicloFinanceiro.js` | campo de composição do extrato congelado |
| `assets/js/modal-acao-slot.js` | função única `enviarParaReposicao`, modal de escolha, renames |
| `assets/js/state.js` | `aulasParaRepor` deixa de ser fonte de verdade |
| `assets/js/storage.js` | carregar/gravar reposições via API |
| `assets/js/view-financas.js` | renderização do extrato |
| `assets/js/view-home.js` | contador da fila vindo da API |
| `index.html` | rótulos dos botões + modal de escolha |

**Áreas sensíveis tocadas** (confirmar antes de mexer): motor de recorrência não muda,
mas o fluxo de exceção da série sim; sync com Google Calendar é acionado nos dois
handlers de envio para reposição.

---

## 11. Decisões e casos de borda

| # | Pergunta | Decisão |
|---|---|---|
| 1 | Ocorrência ou competência? | **Competência** (Modelo B) |
| 2 | Aula no limbo é cobrada? | Depende da escolha no envio (3.2) |
| 3 | A escolha pode mudar depois? | **Não.** Feita uma vez, herdada pela corrente |
| 4 | Fila persistida como quê? | **Collection separada** `Reposicao` |
| 5 | Como evitar contagem dupla? | Vínculo bidirecional; vinculado nunca entra na parcela (A) |
| 6 | Reposição nunca reposta? | Fica `pendente` até expirar (se tiver prazo) |
| 7 | Prazo nasce quando? | No **primeiro cancelamento de uma reposição já marcada** |
| 8 | Qual o prazo? | Fim do ciclo vigente, com **piso de 7 dias** |
| 9 | Recancelar renova o prazo? | **Não.** Mantém o `validoAte` original |
| 10 | Expiração mexe em valor? | **Nunca.** Nem devolve, nem cobra |
| 11 | Reabrir expirada? | **Não existe.** PT cria aula avulsa e ajusta no financeiro |
| 12 | Não cobrável cai em ciclo pago? | Vai para o primeiro ciclo seguinte não pago (⚠️ confirmar) |
| 13 | Aluno `valor_fixo`? | Escolha registrada, **não afeta valor**. Extrato informativo |
| 14 | Aluno sem ciclo configurado? | `validoAte` nulo, não expira |
| 15 | Registro é deletado? | **Nunca.** `realizada` / `expirada` são estados finais |
| 16 | Migração de dados? | **Não há.** Base de produção zerada, app não lançado |

---

## 12. Fora de escopo

- **Notificação push / WhatsApp** ("sua reposição vence em 3 dias"). Exige disparo sem
  ninguém abrir o app — Web Push com VAPID ou WhatsApp API, mais scheduler. É o item 2.2
  do roadmap. Esta spec entrega apenas **aviso in-app**.
- **Tela dedicada de reposições**, com histórico e filtros. O painel atual continua.
- **Status de presença / no-show** (item 1.5 do roadmap). Quando existir, a escolha
  cobrável/não cobrável poderá ser derivada de *quem cancelou* em vez de perguntada.
- **Cron / job de expiração.** Expiração é lazy (7).
- **Estorno e reabertura de ciclo pago.** Continua fora, como na spec de Finanças.
- **Prazo configurável por aluno.** Por ora é regra global.

---

## 13. Em aberto (decidir antes de implementar)

1. **Textos exatos do modal de escolha (9.3).** Os rótulos das duas opções e o disclaimer
   de cada uma. É a peça que a PT vai ler toda vez; não deve ser inventada no código.
2. **Confirmação da regra 5.4** — reposição não cobrável que cai em ciclo já pago.
3. **Onde a reposição expirada aparece no extrato** — no ciclo em que expirou (proposto)
   ou no ciclo de origem?
4. **Rótulo da caixinha no card do aluno** — "Reposições" ou algo mais específico, dado
   que o item 1.8 do roadmap previa outro conteúdo para o mesmo espaço.

---

## 14. Débitos técnicos criados por esta spec

- **Duas fontes no cálculo financeiro.** `financasService` passa a depender de
  `Agendamento` **e** `Reposicao` para fechar um ciclo. É o preço da collection separada.
  Mitigado pela regra 5.3, que torna as parcelas mutuamente exclusivas por construção.
- **Consulta extra por leitura de ciclo.** Custo fixo, filtrada por `ownerEmail` e janela
  de datas — mesmo padrão de `agendaConsistencyService`. Não escala por aluno.
- **`validoAte` e `status: 'expirada'` nascem no schema com regra parcialmente ativa.**
  Proposital, para evitar migração depois.
- **Testes.** Esta spec mexe em código que calcula dinheiro e introduz casos de borda de
  data. O item 3.1 do roadmap (testes das funções puras) deveria vir **antes** ou junto.
  A janela é boa: base de produção zerada e app não lançado.
