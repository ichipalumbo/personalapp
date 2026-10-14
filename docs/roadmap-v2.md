# Roadmap de Melhorias — Agenda Personal Trainer (Prô Josy)

> **Status**: Documento vivo · **Atualizado**: 2026-10-13
> Backlog de evolução do app sob a ótica de um Personal Trainer PJ usando o sistema no dia a dia.
> Atualize o status de cada item conforme for evoluindo (`[ ]` pendente, `[~]` em andamento, `[x]` concluído).
>
> **Contexto importante**: a feature **"Finanças — Ciclo de Cobrança por Aluno"** está em produção. Ela **entregou o item 1.1** e **substituiu** o antigo sistema de KPI financeiro (`backend/src/services/kpiService.js` e os cálculos de projeção em `assets/js/utils-ui.js`), que **não existem mais no código**. Especificação completa em [`specs/financas-ciclo-cobranca.md`](specs/financas-ciclo-cobranca.md).
>
> Regras permanentes para agentes de IA: `.github/copilot-instructions.md`.

---

## Como usar este documento

Cada item traz:

- **O que é**: descrição da feature/regra/tela.
- **Por que importa**: a dor real do PT que ela resolve.
- **Onde mexer**: arquivos/áreas do código já existentes que servem de ponto de partida.
- **Esforço estimado**: relativo, não é estimativa de horas fechada.

**Sobre a ordem**: os grupos estão em ordem numérica (0 → 1 → 2 → 3 → 4 → 5) e é essa a ordem sugerida de execução. Não há tabela de prioridades: a priorização é decidida caso a caso, e o que o documento garante é apenas **o que está feito** e **o que depende de quê**. A tabela de acompanhamento fica no fim.



## Tabela de acompanhamento

Legenda: `[x]` concluído · `[ ]` pendente · `[~]` parcial · `[→]` consolidado em outro item

| Grupo | Item                                             | Status | Depende de                                                       |
| ----- | ------------------------------------------------ | ------ | ---------------------------------------------------------------- |
| 0     | 0.1 Bug "Ver ciclos anteriores" fecha sozinho    | `[x]`  | —                                                                |
| 0     | 0.2 Consolidar módulos compartilhados            | `[x]`  | —                                                                |
| 0     | 0.3 Limpar CSS órfão da visão mensal             | `[x]`  | —                                                                |
| 0     | 0.4 Organização da documentação                  | `[x]`  | —                                                                |
| 0     | 0.5 Collection `Reposicao` + competência         | `[x]`  | —                                                                |
| 0     | 0.6 Extrato do ciclo                             | `[x]`  | —                                                                |
| 0     | 0.7 Prazo de validade + expiração lazy           | `[x]`  | —                                                                |
| 0     | 0.8 Avisos in-app de reposição a vencer          | `[x]`  | 0.7 `[x]`                                                        |
| 0     | 0.9 Expor `calcularPrazoReposicao` compartilhado | `[x]`  | 0.2                                                              |
| 0     | 0.10 Deduplicação de `calcularPrazoReposicao`    | `[x]`  | —                                                                |
| 0     | 0.11 Bug: reenviar aula já cobrada por reposição anterior duplica cobrança | `[x]`  | —                                                                |
| 0     | 0.12 Cobertura automática do render do Dia       | `[x]`  | plano 2026-10-12 encerrado; frontend 360/360                     |
| 1     | 1.1 Controle de pagamento / inadimplência        | `[x]`  | —                                                                |
| 1     | 1.2 Relatório de faturamento exportável          | `[ ]`  | —                                                                |
| 1     | 1.3 Observações por aula ou por aluno            | `[x]`  | —                                                                |
| 1     | 1.4 Contato rápido via WhatsApp                  | `[ ]`  | —                                                                |
| 1     | 1.5 Status de no-show / cancelamento             | `[ ]`  | pré-requisito da regra 5.8 (spec Finanças); recomendado após 3.1 |
| 1     | 1.6 Lembrete de aniversário do aluno             | `[ ]`  | —                                                                |
| 1     | 1.7 Filtro e busca na lista de alunos            | `[~]`  | —                                                                |
| 1     | 1.8 "Aulas a repor" no card do aluno             | `[→]`  | consolidado no 0.8                                               |
| 1     | 1.9 Pagar/ajustar ciclo anterior (do histórico)  | `[x]`  | —                                                                |
| 1     | 1.10 Histórico de reposições no card do aluno    | `[x]`  | gestão contextual; sem aba dedicada na V1                         |
| 1     | 1.11 Botão "Atualizar" em Finanças (bypass de cache) | `[x]`  | T06 + correções A1–A4/R1 validados localmente em 2026-10-13 |
| 2     | 2.1 Google Calendar (`RRULE` + `EXDATE` + canal) | `[x]`  | validação em produção concluída em 31/08/2026; ressalva registrada no boot/manual e saga de correções em `specs/gcal-sync.md` §9 |
| 2     | 2.2 Consolidação da sincronização tripla no boot | `[ ]`  | —                                                                |
| 2     | 2.3 Alargamento da janela do full sync           | `[ ]`  | —                                                                |
| 2     | 2.4 Sync de leitura no boot sobre cache (B2)     | `[x]`  | PR #70 na main; uso normal aprovado pelo dono; limites de cobertura registrados |
| 3     | 3.1 Ampliar cobertura das regras financeiras     | `[ ]`  | —                                                                |
| 3     | 3.2 Rodar o backend localmente                   | `[x]`  | —                                                                |
| 3     | 3.3 Frontend local falando com backend local     | `[x]`  | 3.2                                                              |
| 3     | 3.4 Banco de desenvolvimento separado            | `[x]`  | 3.2                                                              |
| 3     | 3.5 Suíte de testes de frontend                   | `[x]`  | —                                                                |
| 4     | 4.1 Cobrança automatizada                        | `[ ]`  | 3.1 a 3.4                                                        |
| 4     | 4.2 Notificações automáticas                     | `[ ]`  | —                                                                |
| 4     | 4.3 Portal/app do aluno                          | `[ ]`  | —                                                                |
| 4     | 4.4 Avaliação física / anamnese                  | `[ ]`  | —                                                                |
| 4     | 4.5 Multi-personal / gestão de equipe            | `[ ]`  | —                                                                |
| 4     | 4.6 Auditoria / histórico de alterações          | `[ ]`  | —                                                                |
| 4     | 4.7 Precisão financeira avançada                 | `[x]`  | —                                                                |
| 4     | 4.8 Contrato / assinatura digital                | `[ ]`  | —                                                                |
| 4     | 4.9 Sessão própria do backend (Opção 1)          | `[ ]`  | —                                                                |
| 5     | 5.1 Formulários e diálogos mobile (Etapa 1)      | `[x]`  | —                                                                |
| 5     | 5.2 Legibilidade e área de toque (Etapa 2)       | `[x]`  | 5.1                                                               |
| 5     | 5.3 Navegação e topo operacional (Etapa 3)       | `[x]`  | —                                                                |
| 5     | 5.4 Densidade de cards (Etapa 4)                 | `[x]`  | —                                                                |
| 5     | 5.5 Eventos simultâneos na agenda diária (Etapa 5) | `[x]`  | —                                                             |
| 5     | 5.6 Erros e toasts (Etapa 6)                     | `[x]`  | —                                                                |
| 5     | 5.7 Consistência e acessibilidade final (Etapa 7) | `[x]`  | 5.1 a 5.6                                                        |
| 5     | 5.8 Estados de carregamento: skeletons + cache   | `[x]`  | 5.6 (validado 2026-10-01)                                        |
| 5     | 5.9 Alvos de toque do cabeçalho/toolbar (resíduo 4.5) | `[ ]`  | —                                                                |

---

---------- | ----------- | -------------------------------------------- |
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

### [x] 0.1 Bug: bloco "Ver ciclos anteriores" fecha sozinho no re-render
- **Resolvido**. Detalhado no plano correspondente.

---

### [x] 0.2 Consolidar módulos compartilhados em `backend/shared/`
- **Concluído**. Detalhes preservados no histórico.

---

### [x] 0.3 Limpar CSS órfão da visão mensal
- **Concluído.

---

### [x] 0.4 Organização da documentação
- **Concluído.

---

### [x] 0.5 Collection Reposicao + modelo de competência
- **Em Produção.

---

### [x] 0.6 Extrato do ciclo
- **Entregue.

---

### [x] 0.7 Prazo de validade + expiração lazy
- **Entregue.

---

### [x] 0.8 Avisos in-app de reposição a vencer
- **Entregue.

---

### [x] 0.9 Expor calcularPrazoReposicao em módulo compartilhado
- **Entregue.

---

### [x] 0.10 Deduplicação de calcularPrazoReposicao`r
- **Concluído.

---

### [x] 0.11 Bug: reenviar aula já cobrada por reposição anterior duplica a cobrança
- **Concluído.

---

### [x] 0.12 Cobertura automatizada do render do Dia
- **Entregue.

---

### ✅ Não é débito: custo da rota de consistência de agenda

`GET /api/alunos/consistencia-agenda` faz 2 consultas de custo **fixo** (alunos + agendamentos) e resolve o resto em memória — não escala por aluno. Chegou a ser levantada como possível dívida, mas foi **reclassificada como comportamento aceito** (seção 10.1 da spec). Não otimizar preventivamente. Se um dia a aba Alunos ficar lenta, o ponto a investigar é o volume de dados trafegado (filtrar `tipo`/`frequencia` já na consulta, ou unificar com a rota de Finanças), não a lógica do indicador.

---

## 🟢 Grupo 1 — Coisas fáceis de fazer (baixo esforço, alto ganho percebido)

### [x] 1.1 Controle de pagamento / inadimplência
- **Entregue. Detalhes em specs/financas-ciclo-cobranca.md

---

### [ ] 1.2 Relatório de faturamento exportável (PDF/Excel)

- **O que é**: Botão "Gerar relatório do período" com faturamento por aluno, total, aulas cobradas e status de pagamento.
- **Por que importa**: Prestar contas ao contador e ter controle pessoal do que foi efetivamente recebido no período. Hoje a informação existe na tela de Finanças, mas não sai do app.
- **Onde mexer**: ⚠️ _Base técnica revisada._ As funções que este item citava (`exportarDados()` em `utils-ui.js` e os cálculos de `kpiService.js`) **foram removidas**. A fonte correta agora é a collection `CicloFinanceiro` e o serviço `backend/src/services/financasService.js` — os valores já vêm calculados e congelados por ciclo, o que na prática **simplifica** este item: é quase só formatação e exportação, sem recalcular nada.
- **Sugestão de escopo mínimo (V1)**: Exportar CSV/Excel dos ciclos de um intervalo de datas, com colunas: aluno, período do ciclo, método de cobrança, aulas cobradas, valor, status, data de pagamento.
- **Ponto de atenção**: decidir se o relatório exporta o **ciclo vigente** também (que ainda pode mudar enquanto não estiver pago) ou apenas ciclos fechados/pagos. Evitar dependência nova: CSV se resolve sem biblioteca.
- **Esforço**: Baixo (a lógica de cálculo já está pronta e persistida; falta só a camada de exportação).

---

### [x] 1.3 Campo de observações/anotações por aula ou por aluno
- **Entregue.

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

### [x] 1.9 Pagar/ajustar ciclo anterior (do histórico)
- **Entregue.

---

### [x] 1.10 Histórico de reposições no card do aluno
- **Entregue.

---

### [x] 1.11 Botão "Atualizar" na tela de Finanças
- **Entregue.

---

## 🟡 Grupo 2 — Integração com Google Calendar e sincronização

### [x] 2.1 Google Calendar (RRULE + EXDATE + renovação ativa do canal)
- **Entregue. Documentado em specs/gcal-sync.md.

---

### [ ] 2.2 Consolidação da sincronização tripla no boot

> _Numerado como 2.10 até 2026-08-26._

- **O que é**: unificar os três disparos independentes de sincronização que hoje existem no boot (`bootstrap`, `auth-change`, `visibilitychange`).
- **Por que importa**: evita chamadas redundantes sem erro visível e deixa a sequência de sincronização previsível.
- **Onde mexer**: `assets/js/app-shell/bootstrap.js`, listeners de autenticação e auto-refresh.
- **Esforço**: Baixo–Médio.
- **Nota de sequência**: o **2.4** (B2) está publicado e concluído, com limites de cobertura
  registrados. A consolidação deste item deve incluir esse
  ponto e as fronteiras de coordenação implementadas, sem refazer sua leitura segura;
  manter o recorte de GCal conforme `specs/gcal-sync.md` §9.14.

---

### [ ] 2.3 Alargamento da janela do full sync

> _Numerado como 2.11 até 2026-08-26._

- **O que é**: ampliar a janela de rebusca do full sync além do atual `−1 mês a +2 meses` para cobrir mais casos de bloqueios externos fora da janela ativa.
- **Por que importa**: reduz a chance de perda permanente de dados externos quando a collection foi apagada e o incremental não traz a linha de volta.
- **Onde mexer**: `backend/src/services/gcalSyncService.js` em `listCalendarEvents` / `persistSyncResults`.
- **Esforço**: Médio.

---

### [x] 2.4 Sync de leitura no boot sobre cache (B2 — stale-while-revalidate)
- **Concluído.

---

## 🧪 Grupo 3 — Ambiente de desenvolvimento e rede de proteção

> **Histórico**: o projeto nasceu com apoio de IA, sem que ninguém definisse ambiente local nem testes. O resultado é que **toda validação sempre foi feita em produção**. Isso funcionou por um bom tempo porque o app é de usuário único conhecido, mas já custou dois bugs financeiros que chegaram ao usuário real.
>
> **Estado atual**: o backend local já é executável (`npm start` em `backend/`), o frontend local já percebe o hostname e aponta para `http://localhost:5000/api` quando servido em `localhost`, e o banco de desenvolvimento já existe em `personalapp_dev` separado do banco de produção em `test`. **Atualizado em 2026-09-03**: passaram a existir duas suítes automatizadas — backend (`backend/`, 218 testes) e frontend (`tests-frontend/`, 37 testes, item 3.5). O que **continua não existindo** são watch mode, `npm run dev`, seed automático de dados, ambiente de preview e cobertura automatizada de tela.
>
> **Consequência a ter clara**: hoje o frontend local não grava em produção quando o ambiente está corretamente configurado; o risco real que sobrou é usar um `.env` local sem `GOOGLE_CLIENT_ID` ou apontar a URI errada. A dificuldade restante não é "gravar em produção", e sim acertar a configuração do ambiente local.
>
> _Havia aqui uma segunda "Consequência a ter clara" dizendo que o Live Server gravava no banco de produção. **Removida em 2026-09-03**: era anterior aos itens 3.3 e 3.4 e contradizia o parágrafo acima._
>
> **Por que este grupo está separado**: a intuição de que "arrumar isso mexe muito na estrutura" vale para **um** dos quatro itens abaixo. Os outros três são pequenos e independentes, e não precisam esperar pelo grande.

### [ ] 3.1 Ampliar cobertura das regras financeiras

- **O que é**: ampliar a suíte automatizada das regras de cálculo de `financasService.js` e do fluxo de reposição que já está em `backend/test/`.
- **O que já existe hoje**: a suíte do backend roda em `node --test` com **218 testes, 0 falhas** (medido em 2026-09-03). Os arquivos `backend/test/financas-pure.test.js` e `backend/test/financas-competencia.test.js` cobrem funções como `calcularCicloVigente`, `calcularTotalAulasCobradas`, `calcularValorTotalCiclo`, `filtrarHistoricoExcluindoCicloAtual`, `encerrarCicloSobrepostoSeNecessario`, `calcularAulasContadasDoCiclo`, `montarExtratoDoCiclo` e `calcularPrazoReposicao`. Os testes de reposição em `backend/test/reposicao-api.test.js`, `reposicao-prazo.test.js`, `reposicao-extrato-prazo.test.js` e `reposicao-c4-regressao.test.js` cobrem o fluxo de criação/expiração e o prazo de validade.
- **Lacunas verificadas**: do lado do frontend, o item 3.5 cobriu o módulo isomórfico de recorrência e a ordem de carga do `index.html`. Continuam **sem cobertura** as telas (`view-financas.js`, `view-alunos.js`, `view-home.js`), os modais e `agenda-conflitos.js`.
- **Por que importa**: a suíte já cobre as regras puras e de negócio mais sensíveis do backend, e a expansão continua sendo a forma correta de reforçar o cálculo financeiro sem inventar uma lacuna de UI que ainda não existe.
- **Esforço**: Baixo. **Não depende de nenhum outro item deste grupo.**

---

### [x] 3.2 Rodar o backend localmente
- **Concluído.

---

### [x] 3.3 Frontend local falando com backend local
- **Concluído.

---

### [x] 3.4 Banco de desenvolvimento separado
- **Concluído.

---

### [x] 3.5 Suíte de testes de frontend
- **Concluído.

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
- **Complexidade**: O app já é PWA com Service Worker registrado (`assets/js/app-shell/service-worker.js`, `sw.js`), o que ajuda como base, mas hoje as notificações são só "toasts" internos (`mostrarToast`). Seria necessário Web Push (VAPID + subscription por usuário) **ou** WhatsApp Business API, mais um scheduler/cron no backend.
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

### [x] 4.7 Precisão financeira avançada (calendário real em vez de aproximação)
- **Entregue.

---

### [ ] 4.8 Contrato / termo de responsabilidade / assinatura digital

> _Numerado como 2.9 até 2026-08-26._

- **O que é**: Aluno assina digitalmente um termo de responsabilidade ou atestado médico dentro do próprio app.
- **Por que importa**: Reduz risco jurídico do PT (comum em contratos de prestação de serviço de educação física).
- **Complexidade**: Exigiria upload/armazenamento seguro de documentos e possivelmente integração com serviço de assinatura eletrônica (ex.: Clicksign, D4Sign) — infraestrutura nova, sem base no projeto atual.
- **Esforço**: Alto.

---

### [ ] 4.9 Sessão própria do backend (token de sessão com renovação) — **Opção 1 para persistência de login**

- **O que é**: trocar, uma única vez no login, o ID token do Google por um token de sessão emitido e assinado pelo próprio backend, com validade longa e renovação. O `requireAuth` passa a aceitar os dois formatos durante a transição.
- **Por que importa**: hoje a sessão está amarrada ao ciclo de vida do Google. O ID token expira em 1 hora e não tem renovação, e o PWA instalado é descartado da memória pelo sistema operacional a cada troca de app — o que faz a usuária ver login repetido ou reautenticação automática constante. Com sessão própria, ela loga uma vez e permanece por semanas, sem piscar o One Tap e sem depender do cookie `g_state` do Google.
- **Relação com o que já foi feito**: a persistência do ID token em `localStorage` (entregue em `feat/login-sessao-persistente`) é **mitigação parcial** — resolve a troca de app dentro da hora de validade, mas não resolve a expiração nem melhora a postura de segurança do armazenamento. Este item é o caminho definitivo.
- **Onde mexer**: `backend/src/middleware/requireAuth.js` (aceitar dois formatos de token), rota nova de emissão/renovação em `backend/src/routes/`, segredo de assinatura em `backend/src/config/env.js` e `.env.example`, e `assets/js/auth/google-identity.js` no ponto em que a credencial do Google é recebida (`_handleCredentialResponse`) e no logout (`_performSignOut`).
- **Cuidados**: logout precisa invalidar a sessão no backend, não apenas apagar o cache local; a renovação não pode virar sessão eterna sem reautenticação; e a transição precisa manter o formato antigo funcionando até o frontend estar publicado.
- **Esforço**: Médio.

---

## 📱 Grupo 5 — Auditoria de UI/UX mobile

> Grupo vivo: cada rodada de UI/UX mobile entra aqui como um item novo, na ordem em que for
> executada. Fonte de verdade do escopo e do diagnóstico original:
> [`diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md`](diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md)
> (tabela mestra de rastreabilidade dos achados 4.1–4.17). Cada item abaixo corresponde a uma
> "Etapa" desse diagnóstico; a numeração de Etapa não muda, só o item de roadmap é novo.

### [x] 5.1 Formulários e diálogos mobile (Etapa 1)
- **Concluído.

---

### [x] 5.2 Legibilidade e área de toque (Etapa 2)
- **Concluído.

---

### [x] 5.3 Navegação e topo operacional (Etapa 3)
- **Concluído.

---

### [x] 5.4 Densidade de cards (Etapa 4)
- **Concluído.

---

### [x] 5.5 Eventos simultâneos na agenda diária (Etapa 5)
- **Concluído.

---

### [x] 5.6 Erros e toasts (Etapa 6)
- **Concluído.

---

### [x] 5.7 Consistência e acessibilidade final (Etapa 7)
- **Concluído.

---

### [x] 5.8 Estados de carregamento: skeletons + cache
- **Concluído.

---

### [ ] 5.9 Alvos de toque do cabeçalho/toolbar — resíduo do achado 4.5

- **O que é**: o resíduo deliberado do achado 4.5. Na Etapa 2, os grupos 1 (ações de Finanças →
  48px) e 2 (grade de horários → 48px) foram corrigidos; o grupo 3 (cabeçalho/toolbar) ficou
  <44px **por decisão do dono** — forçar 44px esticaria o header. Inventário completo no report
  [`plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md`](plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md).
- **Validação no código (2026-10-09)**: o resíduo **segue pendente** — a varredura de
  `min-height`/`height` ≥44px no `style.css` não encontrou nenhum acréscimo aplicado a estes
  elementos nas rodadas posteriores (Etapas 3–7). Um item do inventário original saiu da lista: a
  antiga navegação superior `.nav-link` **não existe mais** — a Etapa 3 a substituiu pela barra
  inferior `.nav-link-inferior` (`min-height: 44px`; alvos 134×52 medidos no report da Etapa 3).
- **Elementos ainda abaixo de 44px** (altura pela regra CSS atual de 2026-10-09; reconfirmar por
  medição de runtime na execução):
  - `.tab-btn` (~30px) — abas Semana/Dia da Home (`#tabHomeSemana`/`#tabHomeDia`) e abas do modal
    de agendamento (Aula/Deslocamento/Bloquear); regra única `.tab-tipo-agendamento .tab-btn`,
    sem `min-height`.
  - `#btnSemanaHomeAnterior` / `#btnSemanaHomeProxima` (~26px) — setas da topbar da Home.
  - `#btnSemanaHomeHoje` (~24–26px) — botão "Hoje" (override mobile `padding: 5px 12px`).
  - `#custom-google-login` (`.btn-google-custom`: 30px; ~26px no mobile com `padding: 7px 10px` e
    fonte de 12px).
  - `#btnSyncBanco` (~37px) — hoje no modal Área do usuário como `.btn` base (a Etapa 3 o tirou do
    topo); o "Configurar Grade Horária" ao lado segue o mesmo padrão.
  - `.semana-dia-header` (~34px de altura) — cabeçalho clicável de cada dia na visão Semana.
  - `.btn-dia-pill` (42px, valor explícito no CSS) — pills de dia da semana no formulário de
    recorrência.
- **Onde mexer**: `assets/css/style.css` (regras base + overrides mobile; atenção ao breakpoint de
  430px) e `index.html` se a estrutura precisar mudar. Sem mudança de lógica/JS.
- **Cuidado de layout**: não esticar o header de volta (reduzido de 122px para 68px em 433px na
  Etapa 3) e não quebrar 320×568; abordagem alternativa ao `min-height` puro (área de toque
  ampliada sem redesenhar) fica à decisão do dono na rodada.
- **Como validar**: medição no mock em 433×762 DPR 2.81 (referência; seção 7 do documento-mãe da
  auditoria), com 320×568 e 390×844 de stress. Os alvos dentro de modais (`btn-dia-pill`,
  `#btnSyncBanco`) e o login deslogado exigem abrir o estado certo no mock.
- **Esforço**: Baixo (CSS, arquivo único) — com atenção ao layout do topo.
- **Referência cruzada**: é o único 🟡 restante da tabela mestra de
  [`diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md`](diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md) (linha 4.5).

_Documento gerado a partir de análise do código-fonte do projeto (frontend JS vanilla + backend Node/Express/MongoDB) e atualizado após a entrega da feature de Finanças e da reorganização da documentação. Atualize livremente conforme o roadmap evoluir._
