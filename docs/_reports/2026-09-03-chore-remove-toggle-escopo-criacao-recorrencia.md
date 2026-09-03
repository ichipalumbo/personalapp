# Chore: remoção do toggle "Incluir mês atual retroativamente"

Branch: `chore/remove-toggle-escopo-recorrencia`

## 1) Portão de base

Baseline, antes de qualquer edição:

```text
ℹ tests 218
ℹ suites 0
ℹ pass 218
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14419.1589
```

Depois das edições:

```text
ℹ tests 218
ℹ suites 0
ℹ pass 218
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14066.7472
```

Nenhum teste do backend exercitava o toggle — ele era exclusivamente frontend.

> Observação: as instruções do repositório (`.github/copilot-instructions.md`,
> seção 5) citam "84 testes". O número real hoje é 218. Divergência reportada,
> não corrigida nesta rodada.

## 2) O que era o toggle e por que foi removido

No modal de recorrência (`#modalRecorrencia`), a seção "1. Início" tinha um
bloco "Como aplicar no calendário?" com um único checkbox, "Incluir mês atual
retroativamente".

O comportamento real, verificado no código antes da remoção:

- Ao marcar, o listener sobrescrevia o valor de `#recorrenciaDataInicio` com o
  1º dia do mês. Ao desmarcar, restaurava a data do slot clicado.
- O campo de estado `includeCurrentMonthBackfill` **nunca era serializado**:
  `aplicarRecorrenciaLegada()` em `scheduling-serializer.js` não o consultava.
- `scope` era fixo em `'fromDate'` na leitura do formulário, e
  `ESCOPOS_RECORRENCIA = Object.freeze(['fromDate'])` em
  `scheduling-flow-state.js` normalizava qualquer outro valor de volta para
  `'fromDate'`.

Ou seja: o toggle era um atalho de UI para editar um campo de data que já é
editável pelo usuário, e nada mais. A lógica de backfill que o justificava já
tinha sido removida em rodada anterior — o próprio código registrava isso no
comentário de `confirmarConflitosRecorrenciaSeNecessario`.

**Defeito adicional encontrado durante a análise:** o cálculo usava
`new Date()`, isto é, o mês corrente real, e não o mês da data selecionada.
Ao agendar uma série para um mês futuro e marcar o toggle, o início da série
era recuado para o 1º dia do mês de *hoje*, não do mês do agendamento.

## 3) Alterações

### `index.html`

- Removido o bloco `div#recorrenciaEscopoCriacaoContainer` por inteiro:
  label "Como aplicar no calendário?", `input#recorrenciaEscopoCriacao`
  (hidden, `value="fromDate"`), o wrapper com
  `input#recorrenciaIncluirMesAtualRetroativo` e o
  `small#recorrenciaEscopoCriacaoResumo`.
- Texto de apoio de "Início da recorrência" reescrito. Antes: *"A série começa
  a partir da data selecionada no calendário."* Depois: *"A série começa nesta
  data. Vem da data selecionada no calendário e pode ser alterada aqui."* —
  agora esse campo é o único caminho para recuar o início da série.

### `assets/js/modal-agendamento.js`

- Comentário de cabeçalho: removidos os três globais da lista `Expõe:`.
- `preencherFormularioRecorrencia()`: removidas as referências a
  `#recorrenciaEscopoCriacao` e ao checkbox, e a chamada a
  `window.atualizarResumoEscopoCriacaoRecorrencia()`.
- `lerFormularioRecorrencia()`: removida a leitura do checkbox e o campo
  `includeCurrentMonthBackfill` do objeto de retorno. `const scope =
  'fromDate'` foi **mantido**.
- Removida a seção "Escopo de Criação da Recorrência" inteira, com as três
  funções globais: `obterResumoEscopoCriacaoRecorrencia`,
  `atualizarResumoEscopoCriacaoRecorrencia` e
  `configurarEscopoCriacaoRecorrencia`.
- Removida a chamada `window.configurarEscopoCriacaoRecorrencia()` do bloco
  `DOMContentLoaded`.

### `assets/js/features/modals/scheduling-flow-state.js`

- Removido o campo `includeCurrentMonthBackfill` de
  `criarEstadoRecorrenciaAgendamento()` e de
  `window.criarEstadoInicialRecorrenciaAgendamento()`.
- `ESCOPOS_RECORRENCIA` e `normalizarEscopoRecorrencia` **mantidos** — seguem
  em uso por `scope` e exportados em `window.__schedulingFlowState`.

### `assets/css/style.css`

- Removidas as três regras que ficaram sem consumidor:
  `.recorrencia-escopo-criacao-container`, `.recorrencia-escopo-toggle-wrap`
  e `.recorrencia-escopo-criacao-resumo`.

## 4) Auditoria de órfãos

Regra da rodada: nenhum símbolo pode ficar definido sem chamador, nem chamado
sem definição.

**Símbolos removidos — busca global pós-edição retorna zero ocorrência** para
`obterResumoEscopoCriacaoRecorrencia`,
`atualizarResumoEscopoCriacaoRecorrencia`,
`configurarEscopoCriacaoRecorrencia`, `includeCurrentMonthBackfill`,
`recorrenciaIncluirMesAtualRetroativo`, `recorrenciaEscopoCriacao` e
`recorrencia-escopo-`.

O ponto de risco era `preencherFormularioRecorrencia()`, único chamador de
`atualizarResumoEscopoCriacaoRecorrencia` fora do bloco removido. Se tivesse
ficado, geraria `TypeError` a cada abertura do modal de recorrência.

**Símbolos preservados — todos com chamador confirmado:**

| Símbolo | Chamadores restantes |
| --- | --- |
| `ESCOPOS_RECORRENCIA` | `normalizarEscopoRecorrencia`, export `window.__schedulingFlowState` |
| `normalizarEscopoRecorrencia` | `criarEstadoRecorrenciaAgendamento` |
| `atualizarTextoPreviewRecorrencia` | 8 call sites em `modal-agendamento.js` |
| `atualizarResumoRecorrenciaCadastro` | `atualizarTextoPreviewRecorrencia` e `widget-bloqueio.js` |
| `preencherFormularioRecorrencia` | `abrirModalRecorrencia` |
| `lerFormularioRecorrencia` | 3 call sites |
| `.full-day-toggle*` | `agendaBloqueioDiaInteiro`, `editBloqueioDiaInteiro`, `alunoObjetivoSwitch`, `alunoFechamentoMesCheio` |

**Auditor de CSS morto** (`node scripts/auditar-css-morto.js`):

```text
Classes: 217 distintas | usadas: 207 | suspeitas: 9 | SEM CONSUMIDOR: 0
IDs sem consumidor: 0/10
@keyframes orfaos: 0/4
Variaveis CSS orfas: 0/19
```

O artefato `auditoria-css-morto.md` gerado pela execução foi apagado por ser
material gerado, não fonte de verdade.

## 5) O que NÃO foi alterado

- **`monthOfDate` continua existindo e funcionando.** Ele é criado apenas pelo
  modal de edição (`#editEscopoRecorrencia` em `modal-acao-slot.js`), é lido
  por `gcalSyncService.js` para montar `UNTIL` no último dia do mês, por
  `recurrence-helpers.js` e por `agenda-conflitos.js`, e tem cobertura em
  `backend/test/gcal-sync.test.js`. Agendamentos legados com
  `recorrenciaEscopo: 'monthOfDate'` no banco seguem íntegros.
- **`payload.recorrenciaEscopo = 'fromDate'`** continua sendo enviado pelo
  serializer. Está na whitelist de campos do Google Calendar
  (`docs/specs/gcal-sync.md` §4.3) e é o default esperado pelos consumidores.
- **Nenhuma spec foi alterada.** Nenhum documento em `docs/specs/` mencionava
  o toggle; a remoção não gera divergência documental.

## 6) Achado não corrigido

`confirmarConflitosRecorrenciaSeNecessario()` em `modal-agendamento.js`
chama `obterMensagemConfirmacaoConflitosRecorrencia(...)`, que **não está
definida em nenhum arquivo do workspace**. É um `ReferenceError` latente,
hoje inalcançável porque `conflitosPendentesConfirmacao` nunca é preenchido —
resíduo da mesma remoção de backfill anterior.

Não foi tocado por decisão do dono do repositório, que optou por manter esta
rodada restrita ao toggle. Fica registrado como candidato a limpeza futura.

## 7) Validação manual pendente

Não há teste de frontend no projeto. Roteiro a executar via Live Server:

1. Modal de agendamento → "Repetições": o bloco "Como aplicar no calendário?"
   não aparece e o console fica limpo.
2. "Início da recorrência" vem preenchido com a data do slot e aceita edição;
   recuar para o dia 1 e conferir que o preview e o resumo da recorrência
   reagem à mudança.
3. Salvar a série e conferir as ocorrências no calendário a partir da data
   escolhida.
4. Reabrir o modal de recorrência de um rascunho já salvo — exercita
   `preencherFormularioRecorrencia()`, que é onde uma remoção incompleta
   apareceria.
5. Editar uma série existente e confirmar que o seletor de escopo do modal de
   edição segue intacto.
