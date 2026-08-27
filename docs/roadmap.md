# Roadmap de Melhorias — Agenda Personal Trainer (Prô Josy)

> **Status**: Documento vivo · **Atualizado**: 2026-08-26
> Backlog de evolução do app sob a ótica de um Personal Trainer PJ usando o sistema no dia a dia.
> Atualize o status de cada item conforme for evoluindo (`[ ]` pendente, `[~]` em andamento, `[x]` concluído).
>
> **Contexto importante**: a feature **"Finanças — Ciclo de Cobrança por Aluno"** está em produção. Ela **entregou o item 1.1** e **substituiu** o antigo sistema de KPI financeiro (`backend/src/services/kpiService.js` e os cálculos de projeção em `assets/js/utils-kpi.js`), que **não existem mais no código**. Especificação completa em [`specs/financas-ciclo-cobranca.md`](specs/financas-ciclo-cobranca.md).
>
> Regras permanentes para agentes de IA: `.github/copilot-instructions.md`.

---

## Como usar este documento

Cada item traz:

- **O que é**: descrição da feature/regra/tela.
- **Por que importa**: a dor real do PT que ela resolve.
- **Onde mexer**: arquivos/áreas do código já existentes que servem de ponto de partida.
- **Esforço estimado**: relativo, não é estimativa de horas fechada.

**Sobre a ordem**: os grupos estão em ordem numérica (0 → 1 → 2 → 3 → 4) e é essa a ordem sugerida de execução. Não há tabela de prioridades: a priorização é decidida caso a caso, e o que o documento garante é apenas **o que está feito** e **o que depende de quê**. A tabela de acompanhamento fica no fim.

---

## Tabela de acompanhamento

Legenda: `[x]` concluído · `[ ]` pendente · `[~]` parcial · `[→]` consolidado em outro item

| Grupo | Item                                             | Status | Depende de                                                       |
| ----- | ------------------------------------------------ | ------ | ---------------------------------------------------------------- |
| 0     | 0.1 Bug "Ver ciclos anteriores" fecha sozinho    | `[x]`  | —                                                                |
| 0     | 0.2 Consolidar módulos compartilhados            | `[ ]`  | —                                                                |
| 0     | 0.3 Limpar CSS órfão da visão mensal             | `[x]`  | —                                                                |
| 0     | 0.4 Organização da documentação                  | `[x]`  | —                                                                |
| 0     | 0.5 Collection `Reposicao` + competência         | `[x]`  | —                                                                |
| 0     | 0.6 Extrato do ciclo                             | `[x]`  | —                                                                |
| 0     | 0.7 Prazo de validade + expiração lazy           | `[x]`  | —                                                                |
| 0     | 0.8 Avisos in-app de reposição a vencer          | `[ ]`  | 0.7 `[x]` — desbloqueado                                         |
| 0     | 0.9 Expor `calcularPrazoReposicao` compartilhado | `[ ]`  | 0.2                                                              |
| 0     | 0.10 Deduplicação de `calcularPrazoReposicao`    | `[x]`  | —                                                                |
| 1     | 1.1 Controle de pagamento / inadimplência        | `[x]`  | —                                                                |
| 1     | 1.2 Relatório de faturamento exportável          | `[ ]`  | —                                                                |
| 1     | 1.3 Observações por aula ou por aluno            | `[ ]`  | —                                                                |
| 1     | 1.4 Contato rápido via WhatsApp                  | `[ ]`  | —                                                                |
| 1     | 1.5 Status de no-show / cancelamento             | `[ ]`  | pré-requisito da regra 5.8 (spec Finanças); recomendado após 3.1 |
| 1     | 1.6 Lembrete de aniversário do aluno             | `[ ]`  | —                                                                |
| 1     | 1.7 Filtro e busca na lista de alunos            | `[~]`  | —                                                                |
| 1     | 1.8 "Aulas a repor" no card do aluno             | `[→]`  | consolidado no 0.8                                               |
| 2     | 2.1 Google Calendar (`RRULE` + `EXDATE` + canal) | `[x]`  | validação em produção em 01–02/09/2026                           |
| 2     | 2.2 Consolidação da sincronização tripla no boot | `[ ]`  | —                                                                |
| 2     | 2.3 Alargamento da janela do full sync           | `[ ]`  | —                                                                |
| 3     | 3.1 Ampliar cobertura das regras financeiras     | `[ ]`  | —                                                                |
| 3     | 3.2 Rodar o backend localmente                   | `[x]`  | —                                                                |
| 3     | 3.3 Frontend local falando com backend local     | `[ ]`  | 3.2                                                              |
| 3     | 3.4 Banco de desenvolvimento separado            | `[ ]`  | 3.2                                                              |
| 4     | 4.1 Cobrança automatizada                        | `[ ]`  | 3.1 a 3.4                                                        |
| 4     | 4.2 Notificações automáticas                     | `[ ]`  | —                                                                |
| 4     | 4.3 Portal/app do aluno                          | `[ ]`  | —                                                                |
| 4     | 4.4 Avaliação física / anamnese                  | `[ ]`  | —                                                                |
| 4     | 4.5 Multi-personal / gestão de equipe            | `[ ]`  | —                                                                |
| 4     | 4.6 Auditoria / histórico de alterações          | `[ ]`  | —                                                                |
| 4     | 4.7 Precisão financeira avançada                 | `[x]`  | —                                                                |
| 4     | 4.8 Contrato / assinatura digital                | `[ ]`  | —                                                                |

---

## Renumeração de 2026-08-26 — mapa de equivalência

Havia **dois grupos numerados como 2** (Google Calendar e Coisas complexas), o que tornava ambígua qualquer referência a "Grupo 2". Os complexos passaram a ser o **Grupo 4** e os itens de sincronização foram renumerados em sequência.

| Número antigo | Número novo | Item                                         |
| ------------- | ----------- | -------------------------------------------- |
| 2.10          | **2.2**     | Consolidação da sincronização tripla no boot |
| 2.11          | **2.3**     | Alargamento da janela do full sync           |
| 2.2           | **4.1**     | Cobrança automatizada                        |
| 2.3           | **4.2**     | Notificações automáticas                     |
| 2.4           | **4.3**     | Portal/app do aluno                          |
| 2.5           | **4.4**     | Avaliação física / anamnese                  |
| 2.6           | **4.5**     | Multi-personal / gestão de equipe            |
| 2.7           | **4.6**     | Auditoria / histórico de alterações          |
| 2.8           | **4.7**     | Precisão financeira avançada                 |
| 2.9           | **4.8**     | Contrato / assinatura digital                |

Os grupos 0, 1 e 3 **não mudaram**. O item 2.1 manteve o número.

⚠️ **Atenção ao validar specs**: nem toda referência a "2.x" é item de roadmap. As specs têm numeração própria de seções — por exemplo, "seção 2.4 da spec" (módulo isomórfico) e "regra 5.8" são seções de `specs/financas-ciclo-cobranca.md`, não itens deste documento. Só renumere referências que apontem explicitamente para itens do roadmap.

---

## 🔧 Grupo 0 — Débitos técnicos mapeados (entrar junto com a próxima feature)

> Itens herdados da entrega de Finanças. Nenhum é urgente: o app está funcionando em produção com todos eles. A ideia é resolvê-los "de carona" na próxima feature que tocar as mesmas áreas, evitando uma rodada de manutenção isolada.
> Detalhamento técnico completo na seção 12 de [`specs/financas-ciclo-cobranca.md`](specs/financas-ciclo-cobranca.md).

### [x] 0.1 Bug: bloco "Ver ciclos anteriores" fecha sozinho no re-render — **RESOLVIDO**

- **O que foi entregue**: o estado de expansão do histórico foi persistido no `STATE` e reaplicado em `renderizarCard()`, com o listener de `toggle` gravando abertura e fechamento em fase de captura. O mesmo padrão foi estendido ao extrato do ciclo.
- **Por que importa**: o defeito era visual e fazia o bloco fechar ao re-renderizar a tela, mesmo com os dados já carregados.
- **Onde mexer**: `assets/js/view-financas.js` (arquivo único). Não requer backend.
- **Esforço**: Muito baixo (arquivo único, correção focada).

---

### [ ] 0.2 Consolidar módulos compartilhados (`assets/js/shared/`) sem travessia `backend/ -> assets/`

- **O que é**: A dívida deixou de ser pontual. Hoje o backend atravessa a fronteira da pasta `backend/` para consumir **dois** módulos em `assets/js/shared/`:
  - `recurrence-helpers.js` (usado por `backend/src/services/financasService.js`);
  - `reposicao-flow-helpers.js` (usado em teste de regressão do backend).
- **Por que importa**: Funciona no setup atual, mas acopla backend à estrutura do frontend e à configuração de deploy dos dois projetos Vercel.
- **Onde mexer**: Definir um ponto único compartilhado (sem duplicação de lógica) e eliminar imports que sobem para fora de `backend/`. Preservar a ordem de carga no frontend (`index.html`) para qualquer módulo que continue via `<script>`.
- **Esforço**: Baixo–Médio (depende da estratégia de reorganização dos compartilhados) e exige validar deploy dos dois projetos.
- **Validação atual**: com o item 3.2 concluído, este item já pode ser validado localmente no backend antes de publicar em produção.

---

### [x] 0.3 Limpar CSS órfão da visão mensal removida — **CONCLUÍDO**

- **O que foi entregue**: limpeza dos blocos da visão mensal removida e do KPI mensal em `assets/css/style.css`, com **20 seletores removidos** (23 ocorrências no arquivo, incluindo sobrescritas em `@media`) e **152 linhas excluídas**.
- **Verificação crítica**: o grupo `.objetivo-*` foi verificado e **mantido** por uso dinâmico em `assets/js/agenda-card-template.js` (`classes.push(\`objetivo-\${normalizarObjetivo(objetivo)}\`)`) e `assets/js/view-alunos.js` (`class="objetivo-\${objetivoClass}"`).
- **Veredito de risco (mantidos por segurança)**: `#tela-calendario` e `#containerCalendarioDia` foram investigados e **mantidos**; sem evidência suficiente para provar que estão mortos sem validação visual de dia/semana.
- **Candidatos fora do escopo 0.3**: mantidos para rodada dedicada (não incluídos nesta limpeza).

---

### [x] 0.4 Organização da documentação — **CONCLUÍDO**

- **O que foi feito**: Documentação reunida em `docs/` (`docs/README.md` como índice, `docs/roadmap.md`, `docs/specs/`), com os arquivos movidos via `git mv` para preservar histórico. A árvore de arquivos do `README.md` da raiz foi corrigida nos dois lados (frontend e backend). A linha `.agents/` foi removida do `.gitignore`, passando a versionar os skills de forma coerente com o que já estava rastreado. Foi criado `.github/copilot-instructions.md` com as regras permanentes para agentes.
- **Sobre `graphify-out/`**: já estava no `.gitignore` desde sempre — apareceu em varreduras anteriores apenas porque o pacote de análise foi montado por pasta, não por `git archive`. A pasta foi removida localmente por ora; a ferramenta pode voltar quando houver um uso definido. Artefato gerado nunca é fonte de verdade nem deve ser editado à mão.
- **Manutenção contínua**: quando uma feature mudar a estrutura de arquivos, atualizar a árvore do README no mesmo commit. Documentação defasada foi o que fez este roadmap começar errado uma vez.

---

### [x] 0.5 Collection `Reposicao` + modelo de competência — **EM PRODUÇÃO**

- **Status real**: implementação mergeada na `main` e validada em produção; backend e frontend em produção.
- **O que já existe**: collection `Reposicao`, integração no financeiro por competência, fluxo de envio/reagendamento com vínculo `reposicaoId` / `agendamentoReposicaoId`.
- **Pendências**: a seção 9.5 do card do aluno continua pendente (contador de reposições no card), e a caixinha de avisos de reposição a vencer ficou no item 0.8.
- **Esforço restante**: baixo (fechamento do card do aluno e documentação de rollout), sem mudança conceitual de regra.

---

### [x] 0.6 Extrato do ciclo — **ENTREGUE**

- **O que foi entregue**: cada ciclo exibe o que foi cobrado, o que foi coberto por reposição e o que ficou pendente/expirado, com os 11 tipos de linha documentados em `docs/specs/reposicoes-e-competencia.md`.
- **Por que importa**: dá previsibilidade e auditoria para o PT, sem depender de memória nem de contagem ad hoc na agenda.
- **Onde mexer**: `backend/src/services/financasService.js`, `assets/js/view-financas.js` e a spec complementar de reposições.
- **Esforço**: Médio.

---

### [x] 0.7 Prazo de validade + expiração lazy — **ENTREGUE**

- **O que foi entregue**: a expiração agora é aplicada de forma **lazy** na leitura, com persistência via `findOneAndUpdate` quando o status muda; não há job em background.
- **Por que importa**: evita que a fila fique viva indefinidamente e deixa a regra de validade explícita para o usuário e para o cálculo de cobrança.
- **Onde mexer**: `backend/src/services/reposicaoService.js`, `backend/src/controllers/reposicaoController.js` e a spec complementar.
- **Implementação atual**: `validoAte` é derivado no servidor por `calcularPrazoReposicao`, com piso de 7 dias (`PRAZO_MINIMO_REPOSICAO_DIAS`), e o controller rejeita qualquer valor vindo do cliente. O status passa para `expirada` quando a leitura detecta que a data já venceu.
- **Cobertura**: há testes automatizados em `backend/test/reposicao-prazo.test.js` e `backend/test/reposicao-extrato-prazo.test.js` cobrindo a regra de expiração e o comportamento de prazo.
- **Última ponta solta fechada**: a correção desta rodada também aplica a expiração lazy no `GET /api/reposicoes/:id`, deixando a mesma regra consistente entre listagem e leitura individual.
- **Esforço**: Médio.

---

### [ ] 0.8 Avisos in-app de reposição a vencer

- **O que é**: Card do aluno + painel com alerta para reposição prestes a expirar; a regra de expiração fechada do item 0.7 é a base para calcular "vence em breve".
- **Por que importa**: Dá visibilidade útil sem exigir notificação externa; com o prazo de validade definido, a UX passa a ter uma regra clara para o que vence.
- **Onde mexer**: `view-alunos.js`, card do aluno, painel de aluno e endpoint de fila de reposição. O layout do card (`.aluno-card-indicadores`, grid `auto-fit`) **já foi preparado para uma terceira caixinha sem refatoração**; a antiga `contarReposicoesPorAluno` **foi removida** e não deve ser ressuscitada.
- **Estado de implementação**: não implementado; `Reposições` não aparece em `index.html`, e `view-alunos.js` não renderiza o contador. O bloco continua como item de entrega futura.
- **Dependência**: item 0.7 (prazo de validade + expiração lazy) — **já entregue**, portanto este item está desbloqueado.
- **Nota de escopo**: primeira rodada de frontend da série. Não existe suíte automatizada de frontend no projeto; a validação será visual.
- **Esforço**: Baixo–Médio.

---

### [ ] 0.9 Expor `calcularPrazoReposicao` em módulo compartilhado

- **O que é**: Tornar o cálculo de prazo reutilizável sem duplicação entre backend e frontend.
- **Por que importa**: Já houve divergência real quando a regra foi reimplementada no cliente. A única fonte de cálculo precisa ser compartilhada.
- **Dependência**: item 0.2 (consolidação de compartilhados e remoção da travessia `backend/ -> assets/`).
- **Onde mexer**: módulo compartilhado de domínio (sem dependência de `window`/DOM), backend consumindo diretamente e frontend apenas exibindo resultado da API quando aplicável.
- **Esforço**: Médio.

---

### [x] 0.10 Deduplicação de `calcularPrazoReposicao`

- **O que foi entregue**: a primeira declaração (código morto) foi removida; a ativa foi preservada.
- **Sem mudança de comportamento**: o guard de ciclo não configurado que existia só na versão morta já era coberto por `calcularCicloVigente`, que devolve `null` para aluno sem `fechamentoMesCheio` e sem `diaVencimento`.
- **Suíte**: a suíte permaneceu em 84 testes, 0 falhas.
- **Referência**: `docs/_reports/2026-08-26-fix-dedupe-calcular-prazo-reposicao.md`.

---

### ✅ Não é débito: custo da rota de consistência de agenda

`GET /api/alunos/consistencia-agenda` faz 2 consultas de custo **fixo** (alunos + agendamentos) e resolve o resto em memória — não escala por aluno. Chegou a ser levantada como possível dívida, mas foi **reclassificada como comportamento aceito** (seção 10.1 da spec). Não otimizar preventivamente. Se um dia a aba Alunos ficar lenta, o ponto a investigar é o volume de dados trafegado (filtrar `tipo`/`frequencia` já na consulta, ou unificar com a rota de Finanças), não a lógica do indicador.

---

## 🟢 Grupo 1 — Coisas fáceis de fazer (baixo esforço, alto ganho percebido)

### [x] 1.1 Controle de pagamento / inadimplência — **ENTREGUE**

- **O que foi entregue**: Muito além do escopo mínimo previsto aqui. Em vez do controle por mês calendário, foi implementado um modelo de **ciclo de cobrança configurável por aluno** (vencimento móvel, ex.: todo dia 17), com registro de pagamento persistente, status automático (em aberto / atrasado / pago), ajuste manual por ciclo (positivo ou negativo) e histórico de ciclos anteriores.
- **Onde ficou**: Nova collection `backend/src/models/CicloFinanceiro.js`, serviço `backend/src/services/financasService.js`, aba dedicada "Finanças" (`assets/js/view-financas.js`) e badge no card do aluno em `view-alunos.js`.
- **Observação**: o campo `historicoPagamentos` do `Aluno.js` — que este item propunha destravar — foi **aposentado** (marcado como `DEPRECATED`) em favor da nova collection. Não usar em lógica nova.
- **Referência**: [`specs/financas-ciclo-cobranca.md`](specs/financas-ciclo-cobranca.md).

---

### [ ] 1.2 Relatório de faturamento exportável (PDF/Excel)

- **O que é**: Botão "Gerar relatório do período" com faturamento por aluno, total, aulas cobradas e status de pagamento.
- **Por que importa**: Prestar contas ao contador e ter controle pessoal do que foi efetivamente recebido no período. Hoje a informação existe na tela de Finanças, mas não sai do app.
- **Onde mexer**: ⚠️ _Base técnica revisada._ As funções que este item citava (`exportarDados()` em `utils-kpi.js` e os cálculos de `kpiService.js`) **foram removidas**. A fonte correta agora é a collection `CicloFinanceiro` e o serviço `backend/src/services/financasService.js` — os valores já vêm calculados e congelados por ciclo, o que na prática **simplifica** este item: é quase só formatação e exportação, sem recalcular nada.
- **Sugestão de escopo mínimo (V1)**: Exportar CSV/Excel dos ciclos de um intervalo de datas, com colunas: aluno, período do ciclo, método de cobrança, aulas cobradas, valor, status, data de pagamento.
- **Ponto de atenção**: decidir se o relatório exporta o **ciclo vigente** também (que ainda pode mudar enquanto não estiver pago) ou apenas ciclos fechados/pagos. Evitar dependência nova: CSV se resolve sem biblioteca.
- **Esforço**: Baixo (a lógica de cálculo já está pronta e persistida; falta só a camada de exportação).

---

### [ ] 1.3 Campo de observações/anotações por aula ou por aluno

- **O que é**: Um campo de texto livre para anotar coisas como "reclamou de dor no joelho", "combinar novo horário", "trouxe atestado".
- **Por que importa**: Hoje não existe nenhum campo de anotação livre nem no modelo `Aluno.js` nem no `Agendamento.js` (que usam `{ strict: false }`, mas nenhuma tela expõe esse campo).
- **Onde mexer**: Adicionar campo `observacoes` no formulário de `view-alunos.js` e/ou `modal-acao-slot.js` (edição de agendamento). O `{ strict: false }` do schema já aceita esse campo sem migração — mas atenção: por isso mesmo, um typo no nome do campo grava silenciosamente e não gera erro.
- **Nota**: não confundir com `observacaoAjuste` do `CicloFinanceiro`, que é específico do ajuste manual de um ciclo.
- **Esforço**: Baixo (é essencialmente 1 textarea + 1 exibição na ficha do aluno/aula).

---

### [ ] 1.4 Botão de contato rápido via WhatsApp

- **O que é**: Ícone/botão na ficha do aluno que abre uma conversa de WhatsApp direto com o número cadastrado.
- **Por que importa**: O campo `telefone` já existe no cadastro (`AlunoSchema` em `Aluno.js`), mas não há nenhum atalho de contato — hoje o PT precisa copiar o número manualmente.
- **Onde mexer**: `view-alunos.js`, adicionando um link `https://wa.me/<telefone>` na renderização do card do aluno.
- **Ideia de sinergia**: combinado com o status de cobrança do card (que já existe hoje), vira um atalho natural de "cobrar aluno atrasado".
- **Esforço**: Muito baixo (link estático, sem mudança de backend).

---

### [ ] 1.5 Status de "não compareceu" (no-show) / cancelamento pelo aluno

- **O que é**: Além do status `confirmado` (default atual em `Agendamento.js`), adicionar estados como `cancelado_pelo_aluno` e `faltou`, para diferenciar de cancelamento feito pelo próprio PT.
- **Por que importa**: Sem diferenciar falta do aluno, fica difícil cobrar reposição de forma justa ou identificar alunos com muita falta.
- **⚠️ Dependência crítica do financeiro**: este item é **pré-requisito** para evoluir a regra 5.8 da spec de Finanças. Quando existir, a escolha cobrável/não cobrável pode passar a ser derivada de _quem cancelou_. Hoje o financeiro conta simplesmente "o que existe na agenda" — se a aula for excluída de um ciclo não pago, ela some da cobrança. Quando existir status de presença, a contagem deve passar a considerar _realizada / falta cobrável / cancelada sem cobrança_, em vez da mera existência do compromisso. Registrado como revisão futura nas seções 5.8 e 8 da spec.
- **Onde mexer**: `backend/src/models/Agendamento.js` (ajustar enum/valores aceitos), `modal-acao-slot.js` (ações de cancelar/faltou) e, em seguida, `backend/src/services/financasService.js` (regra de contagem). ⚠️ A antiga `contarReposicoesPorAluno` de `kpiService.js`, que este item citava, **não existe mais**.
- **Recomendação**: por mexer em valor cobrado, é o candidato natural para entrar **depois** do item 3.1 (testes). Assim a mudança na contagem entra com rede.
- **Esforço**: Médio (a parte de UI é simples; a integração com o financeiro exige cuidado).

---

### [ ] 1.6 Lembrete de aniversário do aluno

- **O que é**: Campo de data de nascimento no cadastro + card no dashboard "aniversariantes da semana/mês".
- **Por que importa**: É um toque de relacionamento simples que ajuda na retenção do aluno, sem exigir integração externa.
- **Onde mexer**: Novo campo `dataNascimento` em `Aluno.js` (schema `{ strict: false }` aceita sem migração forçada) + widget novo em `view-home.js`.
- **Esforço**: Baixo.

---

### [~] 1.7 Filtro e busca na lista de alunos — **parcialmente entregue**

- **Já existe hoje**: filtros por **status** (ativo/inativo) e por **objetivo** (Personal Trainer / Consultoria Online) em `view-alunos.js`, com dirty-check de renderização.
- **O que falta**: **busca por nome** (campo de texto) e, se fizer sentido, filtro por dia da semana em que o aluno treina.
- **Onde mexer**: `view-alunos.js` — os dados já estão todos em memória (`window.alunos`), então é filtragem client-side. Atenção: a chave de dirty-check (`_ultimaChaveRenderAlunos`) precisa incluir o novo termo de busca, senão a lista não re-renderiza ao digitar.
- **Esforço**: Muito baixo.

---

### [→] 1.8 Visão de "aulas a repor" no card do aluno

- **Consolidado no item 0.8.**

---

## 🟡 Grupo 2 — Integração com Google Calendar e sincronização

### [x] 2.1 Google Calendar (`RRULE` + `EXDATE` + renovação ativa do canal) — **ENTREGUE COM RESSALVA**

- **O que foi entregue**: a série recorrente passou a ser publicada no Google como um evento pai com `recurrence` + `RRULE`, as exceções do app são convertidas em `EXDATE`, e a renovação ativa do canal webhook foi implementada para evitar a perda silenciosa de notificações.
- **Por que importa**: remove a necessidade de janela de publicação, deixa a expansão de instâncias no Google e evita que o webhook morra silenciosamente quando o canal expira.
- **Onde mexer**: `backend/src/services/gcalSyncService.js`, `backend/src/controllers/gcalAuthController.js`, `assets/js/app/bootstrap.js` e a spec `docs/specs/gcal-sync.md`.
- **Esforço**: Médio. O custo que ficou aberto foi o gatilho automático no boot e a validação da janela de 24h em 02/09/2026, e isso foi registrado como ressalva da entrega, não como regressão funcional visível.
- **Validação pendente**: confirmar em produção, por volta de 01–02/09/2026, que a renovação do canal dispara exatamente uma vez por carregamento com `window.log.nivel = 'debug'` e mensagem "Canal renovado". A margem de 24h só dispara nas últimas 24 horas antes do vencimento do canal, que expira em 02/09/2026; fora dessa janela, não deve haver renovação.
- **Referência**: [`specs/gcal-sync.md`](specs/gcal-sync.md).

---

### [ ] 2.2 Consolidação da sincronização tripla no boot

> _Numerado como 2.10 até 2026-08-26._

- **O que é**: unificar os três disparos independentes de sincronização que hoje existem no boot (`bootstrap`, `auth-change`, `visibilitychange`).
- **Por que importa**: evita chamadas redundantes sem erro visível e deixa a sequência de sincronização previsível.
- **Onde mexer**: `assets/js/app/bootstrap.js`, listeners de autenticação e auto-refresh.
- **Esforço**: Baixo–Médio.

---

### [ ] 2.3 Alargamento da janela do full sync

> _Numerado como 2.11 até 2026-08-26._

- **O que é**: ampliar a janela de rebusca do full sync além do atual `−1 mês a +2 meses` para cobrir mais casos de bloqueios externos fora da janela ativa.
- **Por que importa**: reduz a chance de perda permanente de dados externos quando a collection foi apagada e o incremental não traz a linha de volta.
- **Onde mexer**: `backend/src/services/gcalSyncService.js` em `listCalendarEvents` / `persistSyncResults`.
- **Esforço**: Médio.

---

## 🧪 Grupo 3 — Ambiente de desenvolvimento e rede de proteção

> **Histórico**: o projeto nasceu com apoio de IA, sem que ninguém definisse ambiente local nem testes. O resultado é que **toda validação sempre foi feita em produção**. Isso funcionou por um bom tempo porque o app é de usuário único conhecido, mas já custou dois bugs financeiros que chegaram ao usuário real.
>
> **Como é hoje**: frontend servido pela extensão **Live Server** do VS Code; backend **sempre o de produção**, porque `API_BASE_URL` em `assets/js/storage.js` é constante fixa apontando para `https://personal-app-api.vercel.app/api`. Não existe `npm run dev`, watch mode, seed ou banco de desenvolvimento.
>
> **Consequência a ter clara**: rodando o Live Server, o frontend local **grava no banco de produção**. Não é só "testar em produção" no sentido de publicar antes de validar — é código não publicado escrevendo em dado real.
>
> **Por que este grupo está separado**: a intuição de que "arrumar isso mexe muito na estrutura" vale para **um** dos quatro itens abaixo. Os outros três são pequenos e independentes, e não precisam esperar pelo grande.

### [ ] 3.1 Ampliar cobertura das regras financeiras

- **O que é**: ampliar a suíte automatizada das regras de cálculo de `financasService.js` e do fluxo de reposição que já está em `backend/test/`.
- **O que já existe hoje**: a suíte do backend roda em `node --test` com **84 testes, 0 falhas**. Os arquivos `backend/test/financas-pure.test.js` e `backend/test/financas-competencia.test.js` cobrem funções como `calcularCicloVigente`, `calcularTotalAulasCobradas`, `calcularValorTotalCiclo`, `filtrarHistoricoExcluindoCicloAtual`, `encerrarCicloSobrepostoSeNecessario`, `calcularAulasContadasDoCiclo`, `montarExtratoDoCiclo` e `calcularPrazoReposicao`. Os testes de reposição em `backend/test/reposicao-api.test.js`, `reposicao-prazo.test.js`, `reposicao-extrato-prazo.test.js` e `reposicao-c4-regressao.test.js` cobrem o fluxo de criação/expiração e o prazo de validade.
- **Lacunas verificadas**: não há teste de frontend. Não existe nenhum arquivo de teste em `assets/` e a UI não tem suíte automatizada em `backend/test/`.
- **Por que importa**: a suíte já cobre as regras puras e de negócio mais sensíveis do backend, e a expansão continua sendo a forma correta de reforçar o cálculo financeiro sem inventar uma lacuna de UI que ainda não existe.
- **Esforço**: Baixo. **Não depende de nenhum outro item deste grupo.**

---

### [x] 3.2 Rodar o backend localmente

- **O que foi entregue**: `.gitignore` da raiz passou a ignorar `.env`/`*.env` com exceção explícita para `.env.example`, e foi criado `backend/.env.example` com todas as chaves de ambiente usadas pelo backend.
- **Complemento técnico**: o `backend/server.js` inclui override de DNS local-only para execução local, preservando o resolvedor padrão da plataforma em serverless (Vercel).
- **Documentação**: o `README.md` agora descreve o fluxo completo para copiar `.env.example`, preencher credenciais pelo painel da Vercel e subir a API local com `npm start`.
- **Limite atual (até 3.4)**: com `MONGODB_URI` de produção, a validação local deve ser somente leitura (`GET`), sem testes de escrita.
- **Resultado prático**: a API pode ser iniciada localmente sem alterar código JavaScript e sem depender de deploy prévio para validar mudanças de backend.

---

### [ ] 3.3 Frontend local falando com backend local

- **O que é**: Fazer o Live Server apontar para a API local quando ela estiver rodando, em vez de sempre para produção.
- **Por que importa**: É o que hoje faz o desenvolvimento local escrever em dado real. Também impede testar qualquer mudança de backend em conjunto com o frontend antes de publicar.
- **Onde mexer**: `assets/js/storage.js`, na constante `API_BASE_URL`. Basta detectar o host local (`location.hostname === 'localhost'` ou `127.0.0.1`) e apontar para `http://localhost:<porta>/api`, mantendo a URL de produção como padrão. Nenhuma outra linha do arquivo precisa mudar — todas as chamadas já usam a constante.
- **Ponto de atenção**: o backend precisa aceitar a origem do Live Server no CORS (hoje `cors()` está aberto, então provavelmente já funciona). Verificar também se o login Google funciona a partir de `localhost` com os client IDs atuais.
- **Dependência**: só faz sentido junto com o 3.2.
- **Esforço**: Muito baixo — literalmente uma condicional.

---

### [ ] 3.4 Banco de desenvolvimento separado

- **O que é**: Uma base MongoDB distinta para desenvolvimento, para que testes locais nunca toquem em dado real do usuário.
- **Por que importa**: É o que fecha de verdade o problema. Sem isso, mesmo com backend local (3.2) e frontend apontando para ele (3.3), o dado continua sendo o de produção.
- **Por que é o item grande**: exige criar a base, decidir como popular com dados de teste realistas (aluno com ciclo de vencimento, agendamentos recorrentes, ciclos pagos e em aberto) e manter esses dados úteis ao longo do tempo. É trabalho recorrente, não pontual.
- **Onde mexer**: nova connection string no `.env` local; opcionalmente um script de seed em `backend/scripts/` (já existe a pasta, com `normalize-agenda-formats.js` como precedente de script utilitário).
- **Dependência**: item 3.2 (mesma razão do 3.3 — sem backend local, não há onde apontar a base de desenvolvimento).
- **Esforço**: Médio–Alto (mais pela manutenção contínua dos dados do que pela configuração inicial).

---

## 🔴 Grupo 4 — Coisas complexas de fazer (exigem nova arquitetura, serviço externo ou mudança estrutural)

> _Este grupo era numerado como "Grupo 2" até 2026-08-26, em conflito com o Grupo 2 de Google Calendar. Ver o mapa de equivalência no início do documento._

### [ ] 4.1 Cobrança automatizada (Pix, boleto, cartão recorrente)

> _Numerado como 2.2 até 2026-08-26._

- **O que é**: Gerar cobranças automáticas para os alunos e receber confirmação de pagamento sem o PT precisar fazer nada manualmente.
- **Por que importa**: Elimina de vez o trabalho manual de cobrar e reconciliar pagamentos, indo além do registro manual entregue no item 1.1.
- **Complexidade**: Exige integração com gateway de pagamento (ex.: Mercado Pago, Asaas, Stripe), webhooks de confirmação (o padrão já usado para o Google Calendar em `gcalWebhookController.js` serve de referência arquitetural) e tratamento de falha/estorno.
- **Base já pronta**: diferente de antes, **a entidade de cobrança já existe** — a collection `CicloFinanceiro` tem período, valor, status e data de pagamento. Um gateway plugaria em cima dela, sem precisar criar um modelo de "faturas" do zero.
- **Pré-requisito prático**: integrar gateway sem ambiente de teste (Grupo 3) e sem testes automatizados é pedir para errar com dinheiro real. Os itens 3.1 a 3.4 deixam de ser opcionais aqui.
- **Ponto de atenção**: estorno/reabertura de ciclo pago está hoje **fora de escopo** e sem implementação (ciclo pago é congelado permanentemente). Cobrança automatizada torna isso obrigatório.
- **Esforço**: Alto.

---

### [ ] 4.2 Notificações automáticas (lembrete de aula, cobrança, etc.)

> _Numerado como 2.3 até 2026-08-26._

- **O que é**: Notificar o PT e/ou o aluno automaticamente (push notification ou WhatsApp) antes da aula, ou quando um pagamento está para vencer.
- **Por que importa**: Reduz faltas e esquecimentos, dos dois lados.
- **Complexidade**: O app já é PWA com Service Worker registrado (`assets/js/app/service-worker.js`, `sw.js`), o que ajuda como base, mas hoje as notificações são só "toasts" internos (`mostrarToast`). Seria necessário Web Push (VAPID + subscription por usuário) **ou** WhatsApp Business API, mais um scheduler/cron no backend.
- **Sinergia com Finanças**: o `diaVencimento` e o `cicloFim` de cada aluno já dão exatamente a data de disparo do lembrete de cobrança — a informação necessária já está modelada.
- **Esforço**: Alto.

---

### [ ] 4.3 Portal/app do aluno

> _Numerado como 2.4 até 2026-08-26._

- **O que é**: Um espaço onde o próprio aluno acessa sua agenda, seu histórico de pagamento e talvez sua evolução física.
- **Por que importa**: Hoje o sistema é 100% voltado ao personal trainer — o aluno não tem visibilidade própria, o que gera trocas de mensagem desnecessárias ("qual meu horário de amanhã?", "já paguei esse mês?").
- **Complexidade**: O modelo de dados segrega tudo por `ownerEmail` (uma conta Google = uma base isolada, ver `backend/src/utils/ownerScope.js` e `requireAuth.js`). Não existe o conceito de múltiplos papéis (PT vs. aluno) sobre o mesmo conjunto de dados. Exigiria desenhar um modelo de autorização (RBAC) do zero.
- **Esforço**: Muito alto (mudança estrutural, não incremental).

---

### [ ] 4.4 Avaliação física / anamnese / evolução do aluno

> _Numerado como 2.5 até 2026-08-26._

- **O que é**: Registro de medidas corporais, peso, fotos de progresso, PAR-Q, histórico de lesões.
- **Por que importa**: É expectativa comum de alunos de personal trainer mais estruturados, e ajuda o PT a justificar/ajustar treinos.
- **Complexidade**: Não existe entidade parecida no modelo atual. Exigiria nova collection com histórico temporal, upload/armazenamento de imagens (hoje só há ícones estáticos em `assets/images/`, sem pipeline de upload) e uma tela de linha do tempo.
- **Esforço**: Alto.

---

### [ ] 4.5 Multi-personal / gestão de equipe (para academias/estúdios)

> _Numerado como 2.6 até 2026-08-26._

- **O que é**: Permitir que uma academia tenha vários personal trainers cadastrados, com alunos vinculados a mais de um profissional.
- **Por que importa**: Hoje o app só atende o modelo "PT autônomo solo". Para vender a estúdios/academias, seria necessário suportar equipes.
- **Complexidade**: O isolamento por `ownerEmail` é rígido (1 conta = 1 base). Hierarquia (dono → PTs → alunos compartilhados) exige redesenhar o esquema de permissões inteiro.
- **Esforço**: Muito alto.

---

### [ ] 4.6 Auditoria / histórico de alterações

> _Numerado como 2.7 até 2026-08-26._

- **O que é**: Registrar quem alterou o quê e quando (ex.: mudança de valor combinado, remarcação de aula), para resolver disputas com o aluno.
- **Por que importa**: Não há rastro de mudança — se o valor combinado for editado, o valor anterior se perde.
- **Nota**: a feature de Finanças resolveu **parcialmente** esse problema no recorte financeiro, via os campos de snapshot (`precoAulaSnapshot`, `valorFixoSnapshot`) do `CicloFinanceiro`: o preço vigente na criação de cada ciclo fica congelado, então um reajuste não reescreve o passado. Mas isso é preservação de valor, **não** log de auditoria — não há registro de _quando_ nem de _o que_ mudou no cadastro.
- **Complexidade**: Exigiria um padrão de auditoria (coleção paralela de eventos ou versionamento) aplicado a todos os `findOneAndUpdate` espalhados pelos controllers — mudança transversal.
- **Esforço**: Médio–Alto (mais pela abrangência do que pela dificuldade isolada).

---

### [x] 4.7 Precisão financeira avançada (calendário real em vez de aproximação) — **ENTREGUE**

> _Numerado como 2.8 até 2026-08-26._

- **O que foi entregue**: A fórmula fixa `frequência semanal × 4 × valor` foi **eliminada**. O cálculo agora percorre a janela real de datas do ciclo do aluno e conta as ocorrências efetivas de aulas resolvidas pelo motor de recorrência — o mesmo usado para desenhar a agenda, garantindo que "o que a agenda mostra" e "o que o financeiro cobra" nunca divirjam (módulo isomórfico, seção 2.4 da spec).
- **O que ficou de fora**: **feriados** não são tratados (uma aula em feriado é contada normalmente, a menos que o PT a remova da agenda) e **faltas** dependem do item 1.5.
- **Risco que se concretizou**: como previsto aqui, a ausência de testes automatizados fez a validação ser toda manual em produção. Dois defeitos reais escaparam para prod e só foram pegos em revisão posterior (aula excluída continuar sendo cobrada; reajuste de preço alterando ciclos antigos retroativamente). Ambos corrigidos — mas fica o registro de que **o projeto continua sem rede de proteção automatizada** em cima de código que calcula dinheiro. Ver item 3.1.

---

### [ ] 4.8 Contrato / termo de responsabilidade / assinatura digital

> _Numerado como 2.9 até 2026-08-26._

- **O que é**: Aluno assina digitalmente um termo de responsabilidade ou atestado médico dentro do próprio app.
- **Por que importa**: Reduz risco jurídico do PT (comum em contratos de prestação de serviço de educação física).
- **Complexidade**: Exigiria upload/armazenamento seguro de documentos e possivelmente integração com serviço de assinatura eletrônica (ex.: Clicksign, D4Sign) — infraestrutura nova, sem base no projeto atual.
- **Esforço**: Alto.

---

_Documento gerado a partir de análise do código-fonte do projeto (frontend JS vanilla + backend Node/Express/MongoDB) e atualizado após a entrega da feature de Finanças e da reorganização da documentação. Atualize livremente conforme o roadmap evoluir._
