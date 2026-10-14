# Aprendizados consolidados dos relatórios

> **Finalidade**: referência de riscos, limites e armadilhas · **Atualizado**: 2026-10-14
> Consolida relatos históricos e conhecimento útil do roadmap/planos, com a fonte de cada complemento. A atualização não recertifica todos os riscos antigos.
>
> **Este arquivo não é fonte de verdade de regra de negócio** — as specs em `docs/specs/`
> são. O que está aqui é o inventário de riscos, limites e decisões que os relatórios
> registraram e que se perderiam numa poda futura.
>
> **Como usar**: antes de abrir uma rodada numa área sensível, procure a área aqui.
> **Sem dono** indica ausência de frente atribuída no registro de origem; confira o [roadmap oficial](../roadmap-v3.md) e as fontes atuais antes de propor trabalho. Não inferir prioridade nem encerrar risco sem revalidá-lo.

---

## 1. Riscos ativos sem dono

### 1.1 Precedência divergente da data base entre os dois lados da recorrência — sem dono

`backend/src/services/gcalSyncService.js` resolve a data base como
`recorrenciaDataInicio || data || dataCriacao`. `backend/shared/recurrence-helpers.js`
resolve como `dataCriacao || recorrenciaDataInicio || data`. São duas implementações da
mesma noção, com ordens diferentes.

Coincidem nos fluxos normais, e é exatamente por isso que o risco é alto: a divergência só
aparece quando um dos três campos está ausente ou vazio. Isso contraria diretamente a regra
4.3 das instruções do repositório (implementação única de cálculo de regra de negócio).

Registrado em: `2026-08-29-fix-dtstart-byday-gcal`, `2026-08-29-fix-global-e-mock-teto-gcal`.

### 1.2 `resolverDataISO` sincroniza silenciosamente para hoje — sem dono

Quando recebe data inválida, `resolverDataISO` cai em `new Date()`. O efeito é um evento
publicado no Google Calendar na data de hoje, sem erro, sem log e sem toast. Foi reportado
em duas rodadas distintas e deliberadamente não alterado nas duas, para não mexer em
comportamento já coberto por teste.

Registrado em: `2026-08-29-fix-dtstart-byday-gcal`, `2026-08-29-fix-duplicata-edicao-serie-gcal`.

### 1.3 Divergência entre `gis_session_cache` e `gis_profile_cache` — sem dono

As duas chaves são gravadas de forma independente, em momentos distintos. Se uma gravação
falhar (cota de storage, aba fechada no meio da escrita, edição manual no DevTools), o
header pode mostrar o nome da conta A enquanto as requisições vão assinadas com o token da
conta B.

Agrava o risco: a usuária tem **duas contas Google no mesmo celular**. A falha é silenciosa —
sem erro visível, sem `401`.

Registrado em: `2026-08-28-feat-login-sessao-persistente`.

### 1.4 Backend sem `'use strict'` e sem lint de variável não declarada — sem dono

Um `agendamentoAtual = await (...)` sem declaração vazou para `globalThis` e só foi pego por
leitura manual. A proposta de adotar `'use strict'` no topo dos módulos do backend, ou uma
regra de lint no CI, foi levantada e **não implementada** — exigiria auditoria separada para
não quebrar código legado sem cobertura.

Registrado em: `2026-08-29-fix-global-e-mock-teto-gcal`.

### 1.5 Versões de spec copiadas em outras fontes — controle aplicado

A divergência foi registrada quando índice e instruções repetiam números de versão que
já não acompanhavam a spec. Esse não deve ser tratado como contador atual nem nova dívida
sem verificar as fontes: a [governança vigente](../README.md) mantém versão/status da spec
somente no seu próprio cabeçalho, e as [instruções](../../.github/copilot-instructions.md)
apontam os caminhos, sem reproduzir os números.

**Lição**: consultar a spec pelo caminho e ler seu cabeçalho; não manter um segundo mapa
de versões nesta referência. Citações datadas em registros históricos não representam
o estado vigente. Os outros riscos da seção 1 não foram encerrados por esta reconciliação.

Origem do risco: `2026-08-31-fix-heranca-mae-vazia-split`; controle documental conferido em
2026-10-14, sem mudança de regra de produto.

---

## 2. Limites aceitos por decisão — não são bugs

### 2.1 `DELETE` da reposição órfã é best-effort

No rollback de envio para reposição, o `DELETE` fica em `try/catch` próprio que só registra
log. Se a rede cair entre as duas chamadas, a reposição órfã sobrevive e exige tratamento
manual. A alternativa — travar a recuperação da aula por causa de uma segunda chamada de
rede — foi julgada pior. Coberto pela spec `gcal-sync` §9.27.

### 2.2 Item em estado terminal continua provocando `PUT`

A assimetria proposital entre cópia local e remota (o frontend limpa os campos de pendência
só do lado local) é o que faz o reenvio acontecer. Consequência: um item terminal sem edição
real continua gerando `PUT`. O backend grava no Mongo mas não chama o Google. É custo de
escrita aceito em troca da garantia de nunca bloquear a persistência.

### 2.3 `montarRespostaFalhaGcal` responde `200` com `partialSuccess: true`

Quando o Mongo grava e o Google falha, a resposta é `200`. Foi reportado como defeito em
três rodadas e mantido de propósito: a regra é que a persistência mandou, e a falha de
sincronização é aviso, não erro. Há divergência documentada entre esse `200` e o `502` que
a spec chegou a descrever.

### 2.4 Detecção de edição por igualdade estrita

A comparação acontece depois da normalização já existente. Uma origem futura que envie
campos numéricos com tipos inconsistentes reabre a janela por diferença de tipo. Os payloads
atuais usam tipos consistentes; ampliar coerção não foi feito.

### 2.5 `window.confirm()` nativo na confirmação final de exclusão

Débito explícito, registrado na spec `gcal-sync` §9.19 e §9.23. Não é esquecimento.

### 2.6 Recarga após exclusão usa `sincronizar: true`

Mantém uma espera perceptível. Mantido por decisão de produto; débito de UX registrado.

---

## 3. Armadilhas de código que já custaram uma rodada

### 3.1 Classes CSS dinâmicas não são CSS morto

`scripts/auditar-css-morto.js` marca como órfãs classes que são montadas em runtime por
concatenação de string. Foram preservadas por decisão explícita e **não devem ser removidas**
numa próxima varredura:

- `.objetivo-Hipertrofia`, `.objetivo-Emagrecimento`, `.objetivo-Condicionamento`,
  `.objetivo-Funcional`, `.objetivo-PersonalTrainer`, `.objetivo-ConsultoriaOnline`,
  `.objetivo-Outro`
- `.agenda-card-density-compact`, `.agenda-card-density-tight`

### 3.2 Candidatos a CSS órfão não são autorização de remoção

O [item 0.3 do roadmap anterior](../archive/roadmaps/roadmap-v1.md) registra a limpeza da visão mensal, mas
também uma decisão de **preservar `#tela-calendario` e `#containerCalendarioDia` por segurança**:
faltava evidência suficiente para classificá-los como mortos sem validar Dia/Semana.
Essa ressalva não deve desaparecer quando o resultado da limpeza vira uma linha no roadmap.

Busca estática, inclusive por ferramenta, não demonstra ausência de uso dinâmico ou de
efeito de layout. Antes de remover outro candidato, reproduzir o estado relevante e
conferir o seletor no render; as classes dinâmicas da seção 3.1 continuam exigindo esse cuidado.

Os pontos abaixo vieram de varreduras anteriores e precisam de revalidação antes de ação;
não são uma certificação do DOM/CSS atual:

- Candidatos registrados sem correspondência estática: `#containerCalendarioDia`,
  `#tela-calendario > .calendario-tabs-sticky`, `#containerCalendarioDia .agenda-sticky-container`.
- `--tabs-height`: mecanismo abandonado. `atualizarAlturaTabsCalendario` só faz
  `removeProperty`; o CSS que consome a variável cai sempre no fallback `0px`.
- Fallbacks divergentes de `--header-height`: `135px` em dois pontos, `78px` em outro. Só
  ativam se a variável não estiver definida, o que não ocorre depois do boot.
- Marcadores `[TAG-...]` de `style.css` com fronteiras desatualizadas —
  `TAG-STYLE-HEADER-NAV` cresceu além do que o nome descreve e
  `TAG-STYLE-FILTRO-ALUNO-CALENDARIO` guarda bloco de tela já removida.

### 3.3 Movimento reduzido: não repetir o diagnóstico antigo

O alerta original nomeava `halterBounce`, `pulseAgora`, `homeShimmer` e `girar-sinc`.
O [registro da Etapa 7](../archive/plans/2026-10-01-plan-etapa-7-consistencia-acessibilidade.md),
também resumido no item 5.7 do roadmap anterior, registra a consolidação do movimento
reduzido: os três primeiros eram nomes residuais removidos, e o CSS passou a ter um bloco
final de `prefers-reduced-motion`, incluindo o spinner. A fonte atual confirma esse bloco;
não reapresentar a lista antiga como ausência de proteção vigente.

**Lição que permanece**: ao adicionar animação ou transição, conferir se a regra de redução
continua prevalecendo na cascata. Com `animation: none`, não depender de `animationend`
para liberar uma classe/estado. Conferir também o caminho JS e o comportamento sem movimento;
a presença do bloco CSS não prova sozinha toda a experiência ou animações adicionadas depois.

### 3.4 `renderizarHomeSemana()` sobrescreve o grid com `innerHTML`

Qualquer listener anexado dentro de `#calendarioSemanalHomeGrid` morre no próximo render.
É o motivo de o swipe ter sido ancorado no `.agenda-panel-semana` externo. Há sobreposição
temporal entre o `scrollIntoView` do render e a animação de 180ms da troca de período que
nunca foi validada em dispositivo real.

### 3.5 `_agendamentosSaoIguais` não detecta mudança quando o array local foi substituído

É consequência do problema de referência, não a causa. Substituir o array em vez de mutar
faz a comparação enxergar dois objetos diferentes que representam o mesmo estado.

### 3.6 Split gera avulsa com `excecoes: []`

No bloco `fromDate`, a avulsa criada nasce com `excecoes: []` e `excecoesDetalhadas: []`.
Isso é **intencional** e foi confundido com defeito em pelo menos duas rodadas.

---

## 4. Pendências operacionais no banco — nunca executadas

Nenhuma limpeza retroativa foi executada em produção. Ficaram registradas e não feitas:

- Séries antigas gravadas com `DTSTART` defeituoso, ainda publicadas no Google Calendar.
- Dados legados com campos de recorrência em agendamentos avulsos.
- Registros com `recorrenciaFimCondicao: "untilDate"` e
  `recorrenciaDataInicio == recorrenciaDataFim` (série de início = fim).

A base de produção está zerada hoje, então essas pendências podem já ter deixado de existir
na prática — mas o código que as gerou pode não ter mudado.

---

## 5. Lições de processo

- **Busca case-sensitive queimou duas rodadas.** Um agente procurou `Fora de Escopo` com `E`
  maiúsculo, não achou a seção `## 8. Fora de escopo` que já existia, e reportou como
  ausente. As duas rodadas seguintes trabalharam em cima da premissa errada. Buscar cabeçalho
  sempre case-insensitive.
- **`git checkout -b <nome> origin/main` manda o push direto para a `main`.** Em 2026-09-03,
  a branch `chore/remove-toggle-escopo-recorrencia` foi criada assim. O comando configura o
  upstream da branch nova como `origin/main` (`branch.<nome>.merge = refs/heads/main`), então
  o "Sync Changes" do VS Code empurrou dois commits direto para a `main`, em fast-forward, sem
  PR e sem merge commit — disparando deploy em produção nos dois projetos Vercel. A branch
  nunca chegou a existir em `origin`, então não havia o que revisar. Diagnóstico:
  `git config --get-regexp "branch\..*\.merge"` — se o upstream for `refs/heads/main` e o nome
  local for outro, a armadilha está armada. Correções, da mais fraca para a mais forte:
  `git branch --unset-upstream` na branch afetada; criar branch com `--no-track`;
  `git config --global branch.autoSetupMerge false`; e regra de branch protegida na `main` no
  GitHub exigindo PR — a única que não depende de disciplina. A seção 11 de
  `.github/copilot-instructions.md` prescrevia o comando armadilhado e foi corrigida na mesma
  data.
- **Cobertura de frontend existe, mas é parcial.** Desde 2026-09-03 há uma suíte em
  `tests-frontend/`. O item 0.12 do roadmap e o [plano de cobertura](../archive/plans/2026-10-12-plan-cobertura-render-conflitos-modais.md)
  registram proteção de render do Dia no jsdom, bandas e bordas, conflitos e fluxos principais
  de criação/edição avulsa dos modais; os arquivos atuais executam os scripts reais.
  Isso substitui a afirmação genérica de que views, conflitos e modais não têm teste.
  **Lógica/DOM não é cobertura visual completa**: pixels, CSS/layout real, animações,
  gestos físicos, modo Semana, integrações reais e variantes não exercitadas continuam
  exigindo validação específica. Não usar o nome de um arquivo testado como prova de todos
  os seus fluxos, nem contagem histórica como total atual. Recortes e execução das suítes
  ficam no [manual de ambiente](../setup-ambiente-local.md); provas de execução/mutação
  permanecem nos planos, sem serem apresentadas como medição nova aqui.
- **Prova de mutação em guarda de frontend não fechou.** Na etapa de split, as guardas E/F/G
  não falharam no harness real. O impedimento não estava na correção, estava na prova.
- **Dublê observacional não é correção.** Um espião de `getConflitosNoDia` prova que o
  `ignorarIds` chegou, não que o motor de conflito está certo.
- **Remoção de bloco em arquivo grande via edição em massa arrastou ~250 linhas não
  relacionadas sem quebrar a sintaxe.** Em 2026-09-18, a remoção do painel de reposições
  pendentes (`docs/archive/reports/2026-09-18-chore-remove-painel-pendentes.md`) apagou por engano um
  bloco de funções auxiliares de `assets/js/modal-acao-slot.js` (`obterCompromissoSelecionado`,
  `enviarParaReposicao`, `capturarValoresFormularioEdicao`, `reabrirModalEdicaoComValores`,
  `avisarFalhaPersistencia`, entre outras) e uma função inteira (`executarExclusaoAulaAvulsa`),
  sem gerar nenhum erro de sintaxe. O defeito só apareceu em uso manual, como `ReferenceError`
  ao abrir o modal — a suíte `backend/test/gcal-duplicata-fix.test.js`, que carrega o arquivo
  via harness de `vm`, teria pego na hora, mas não foi rodada de ponta a ponta logo após o
  commit da remoção. Causa raiz e correção completa em
  `docs/archive/reports/2026-09-18-fix-restaurar-funcoes-modal-acao-slot.md`. **Regra a aplicar**:
  depois de qualquer remoção de bloco de código (não só edição pontual), rodar a suíte que
  carrega o arquivo afetado antes de prosseguir para a próxima tarefa — ausência de erro de
  sintaxe não é prova de que nada quebrou.
