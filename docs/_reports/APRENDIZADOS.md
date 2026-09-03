# Aprendizados consolidados dos relatórios

> Extraído das seções "Defeitos encontrados e não corrigidos", "O que encontrei e não
> alterei" e "Riscos" de todos os relatórios em `docs/_reports/`.
>
> **Este arquivo não é fonte de verdade de regra de negócio** — as specs em `docs/specs/`
> são. O que está aqui é o inventário de riscos, limites e decisões que os relatórios
> registraram e que se perderiam numa poda futura.
>
> **Como usar**: antes de abrir uma rodada numa área sensível, procure a área aqui.
> Item marcado como **sem dono** não está no `roadmap.md` nem na seção 9 de nenhuma spec —
> ou seja, ninguém vai tropeçar nele por acaso.

---

## 1. Riscos ativos sem dono

### 1.1 Precedência divergente da data base entre os dois lados da recorrência — sem dono

`backend/src/services/gcalSyncService.js` resolve a data base como
`recorrenciaDataInicio || data || dataCriacao`. `assets/js/shared/recurrence-helpers.js`
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

### 1.5 Versões de spec divergentes entre documentos — sem dono

Estado real hoje: `gcal-sync` v11, `financas-ciclo-cobranca` v7, `reposicoes-e-competencia` v6.
`.github/copilot-instructions.md` e `docs/README.md` citam versões antigas. Um agente que
confie no número citado assume que a spec está congelada num estado que não existe mais.

Registrado em: `2026-08-31-fix-heranca-mae-vazia-split`.

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

### 3.2 CSS órfão real, já mapeado e não removido

- Seletores sem correspondência no DOM atual: `#containerCalendarioDia`,
  `#tela-calendario > .calendario-tabs-sticky`, `#containerCalendarioDia .agenda-sticky-container`.
- `--tabs-height`: mecanismo abandonado. `atualizarAlturaTabsCalendario` só faz
  `removeProperty`; o CSS que consome a variável cai sempre no fallback `0px`.
- Fallbacks divergentes de `--header-height`: `135px` em dois pontos, `78px` em outro. Só
  ativam se a variável não estiver definida, o que não ocorre depois do boot.
- Marcadores `[TAG-...]` de `style.css` com fronteiras desatualizadas —
  `TAG-STYLE-HEADER-NAV` cresceu além do que o nome descreve e
  `TAG-STYLE-FILTRO-ALUNO-CALENDARIO` guarda bloco de tela já removida.

### 3.3 Animações sem `prefers-reduced-motion`

`halterBounce`, `pulseAgora`, `homeShimmer` e `girar-sinc` não têm cobertura de
`prefers-reduced-motion`. Também: com `animation: none`, o browser pode não disparar
`animationend`, o que deixaria a classe presa — mitigado hoje porque o `classList.remove`
roda antes de cada nova chamada.

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
- **Não há teste de frontend.** Toda validação de UI é manual e roda contra a API de produção.
  Nenhuma correção de `assets/js/**` tem prova automatizada — a prova por mutação só vale
  para o que está em `backend/`.
- **Prova de mutação em guarda de frontend não fechou.** Na etapa de split, as guardas E/F/G
  não falharam no harness real. O impedimento não estava na correção, estava na prova.
- **Dublê observacional não é correção.** Um espião de `getConflitosNoDia` prova que o
  `ignorarIds` chegou, não que o motor de conflito está certo.
