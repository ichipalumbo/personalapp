# Roadmap de Melhorias — Agenda Personal Trainer (Prô Josy)

> **Status**: Documento vivo · **Atualizado**: 2026-08-25
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

---

### [ ] 0.3 Limpar CSS órfão da visão mensal removida
- **O que é**: Regras como `.calendario-mensal`, `.calendario-grid`, `.dia-cell`, `.kpi-dashboard` e `#tela-calendario` continuam em `assets/css/style.css` mesmo após a remoção da visão "Mês".
- **Por que importa**: Só peso morto e ruído de manutenção. Não afeta o usuário.
- **Onde mexer**: `assets/css/style.css`. **Cuidado**: alguns seletores podem ser compartilhados com as visões de dia/semana — verificar cada um antes de remover.
- **Esforço**: Baixo (o trabalho é a verificação, não a remoção).

---

### [x] 0.4 Organização da documentação — **CONCLUÍDO**
- **O que foi feito**: Documentação reunida em `docs/` (`docs/README.md` como índice, `docs/roadmap.md`, `docs/specs/`), com os arquivos movidos via `git mv` para preservar histórico. A árvore de arquivos do `README.md` da raiz foi corrigida nos dois lados (frontend e backend). A linha `.agents/` foi removida do `.gitignore`, passando a versionar os skills de forma coerente com o que já estava rastreado. Foi criado `.github/copilot-instructions.md` com as regras permanentes para agentes.
- **Sobre `graphify-out/`**: já estava no `.gitignore` desde sempre — apareceu em varreduras anteriores apenas porque o pacote de análise foi montado por pasta, não por `git archive`. A pasta foi removida localmente por ora; a ferramenta pode voltar quando houver um uso definido. Artefato gerado nunca é fonte de verdade nem deve ser editado à mão.
- **Manutenção contínua**: quando uma feature mudar a estrutura de arquivos, atualizar a árvore do README no mesmo commit. Documentação defasada foi o que fez este roadmap começar errado uma vez.

---

### [~] 0.5 Collection `Reposicao` + modelo de competência — **IMPLEMENTADO NA BRANCH, NÃO PUBLICADO**
- **Status real**: Implementado na `new/reposicao-feature` (backend + fluxo de frontend), com validação de regressões no backend. O frontend ainda não está publicado em produção.
- **O que já existe**: collection `Reposicao`, integração no financeiro por competência, fluxo de envio/reagendamento com vínculo `reposicaoId` / `agendamentoReposicaoId`.
- **Pendências**: publicação do frontend e fechamento dos resíduos/documentação de rollout.
- **Esforço restante**: Baixo (rollout e fechamento), sem mudança conceitual de regra.

### [x] 0.6 Extrato do ciclo — **ENTREGUE**
- **O que foi entregue**: cada ciclo exibe o que foi cobrado, o que foi coberto por reposição e o que ficou pendente/expirado, com os 11 tipos de linha documentados em `docs/specs/reposicoes-e-competencia.md`.
- **Por que importa**: dá previsibilidade e auditoria para o PT, sem depender de memória nem de contagem ad hoc na agenda.
- **Onde mexer**: `backend/src/services/financasService.js`, `assets/js/view-financas.js` e a spec complementar de reposições.
- **Esforço**: Médio.

### [ ] 0.7 Prazo de validade + expiração lazy
- **O que é**: Definir prazo para reposição pendente e expirar os registros de forma automática/lazy sem bloquear a tela de cobrança.
- **Por que importa**: Evita que a fila fique viva indefinidamente e dá regra de negócio clara para o que vence.
- **Onde mexer**: `docs/specs/reposicoes-e-competencia.md`, `backend/src/controllers/reposicaoController.js`, rotina de expiração em background ou lazy check.
- **Esforço**: Médio.

### [ ] 0.8 Avisos in-app de reposição a vencer
- **O que é**: Card do aluno + painel com alerta para reposição prestes a expirar.
- **Por que importa**: Dá visibilidade útil sem exigir notificação externa; é o próximo passo de UX após a regra de negócio.
- **Onde mexer**: `view-alunos.js`, painel de aluno e endpoint de fila de reposição.
- **Esforço**: Baixo–Médio.

### [ ] 0.9 Expor `calcularPrazoReposicao` em módulo compartilhado
- **O que é**: Tornar o cálculo de prazo reutilizável sem duplicação entre backend e frontend.
- **Por que importa**: Já houve divergência real quando a regra foi reimplementada no cliente. A única fonte de cálculo precisa ser compartilhada.
- **Dependência**: item 0.2 (consolidação de compartilhados e remoção da travessia `backend/ -> assets/`).
- **Onde mexer**: módulo compartilhado de domínio (sem dependência de `window`/DOM), backend consumindo diretamente e frontend apenas exibindo resultado da API quando aplicável.
- **Esforço**: Médio.

---

### ✅ Não é débito: custo da rota de consistência de agenda
`GET /api/alunos/consistencia-agenda` faz 2 consultas de custo **fixo** (alunos + agendamentos) e resolve o resto em memória — não escala por aluno. Chegou a ser levantada como possível dívida, mas foi **reclassificada como comportamento aceito** (seção 10.1 da spec). Não otimizar preventivamente. Se um dia a aba Alunos ficar lenta, o ponto a investigar é o volume de dados trafegado (filtrar `tipo`/`frequencia` já na consulta, ou unificar com a rota de Finanças), não a lógica do indicador.

---

## 🟡 Grupo 2 — Integração com Google Calendar e sincronização

### [x] 2.1 Google Calendar (`RRULE` + `EXDATE`) — **ENTREGUE**
- **O que foi entregue**: a série recorrente passou a ser publicada no Google como um evento pai com `recurrence` + `RRULE`, e as exceções do app são convertidas em `EXDATE` sem depender de um horizonte ou de um mapa `data → eventId`.
- **Por que importa**: remove a necessidade de janela de publicação e deixa a expansão de instâncias no Google, mantendo o desenho coerente com o modelo de pais + instâncias da API.
- **Onde mexer**: `backend/src/services/gcalSyncService.js`, `assets/js/shared/recurrence-helpers.js` e a spec `docs/specs/gcal-sync.md`.
- **Esforço**: Médio. O custo que ficou aberto foi o gerenciamento de `COUNT`/`UNTIL`, e isso foi documentado como decisão de design, não como pendência de implementação.
- **Referência**: [`specs/gcal-sync.md`](specs/gcal-sync.md).

---

## 🧪 Grupo 3 — Ambiente de desenvolvimento e rede de proteção

> **Histórico**: o projeto nasceu com apoio de IA, sem que ninguém definisse ambiente local nem testes. O resultado é que **toda validação sempre foi feita em produção**. Isso funcionou por um bom tempo porque o app é de usuário único conhecido, mas já custou dois bugs financeiros que chegaram ao usuário real.
>
> **Como é hoje**: frontend servido pela extensão **Live Server** do VS Code; backend **sempre o de produção**, porque `API_BASE_URL` em `assets/js/storage.js` é constante fixa apontando para `https://personal-app-api.vercel.app/api`. Não existe `npm run dev`, watch mode, seed ou banco de desenvolvimento.
>
> **Consequência a ter clara**: rodando o Live Server, o frontend local **grava no banco de produção**. Não é só "testar em produção" no sentido de publicar antes de validar — é código não publicado escrevendo em dado real.
>
> **Por que este grupo está separado**: a intuição de que "arrumar isso mexe muito na estrutura" vale para **um** dos quatro itens abaixo. Os outros três são pequenos e independentes, e não precisam esperar pelo grande.

### [ ] 3.1 Testes automatizados das regras financeiras
> *Este item também aparecia como 2.9 nas versões anteriores deste roadmap. Consolidado aqui.*
- **O que é**: Suíte mínima cobrindo as regras de cálculo de `financasService.js`: janela do ciclo (incluindo dia 31 em mês curto e virada de ano), piso zero do ajuste negativo, congelamento de ciclo pago e uso do snapshot no recálculo (regra 5.9 da spec).
- **Por que importa**: Os dois bugs financeiros que chegaram a produção teriam sido pegos por testes triviais. É a única coisa desta lista que protege dinheiro.
- **Por que é barato**: As funções de cálculo já são **puras e exportadas** (`calcularCicloVigente`, `calcularValorTotalCiclo`, `calcularTotalAulasCobradas`). Não precisam de banco, navegador nem ambiente local. O Node traz `node:test` embutido — **zero dependência nova**, sem bundler e sem build step, respeitando a decisão de manter o projeto enxuto.
- **Onde mexer**: `backend/` — adicionar `"test": "node --test"` em `backend/package.json` e criar os arquivos de teste. Hoje não há nenhum runner configurado.
- **Ponto de atenção**: não tentar cobrir tudo. O alvo são as funções puras. Testar o que depende de Mongo é outro nível de esforço e pode ficar para depois (ou nunca).
- **Esforço**: Baixo. **Não depende de nenhum outro item deste grupo.**
- **Prioridade**: **subiu** com a nova spec de reposições e competência. A contagem do ciclo agora mexe em regras de data e valor, e o melhor momento para escrever estes testes é antes de qualquer mudança de cálculo.

---

### [ ] 3.2 Rodar o backend localmente
- **O que é**: Conseguir subir a API na própria máquina, em vez de depender de deploy para testar qualquer mudança de backend.
- **Por que importa**: Hoje, validar uma alteração de backend exige publicar. Isso torna o ciclo de correção lento e força mudanças não testadas a entrarem em produção.
- **Por que é menor do que parece**: o script `npm start` (`node server.js`) **já existe** e o `dotenv` **já é dependência**. O que falta é um arquivo `.env` local com a string de conexão do Mongo e os client IDs do Google.
- **Onde mexer**: criar `.env` em `backend/` (garantir que está no `.gitignore`) e documentar as variáveis necessárias — hoje elas só existem no painel da Vercel. Um `.env.example` versionado, com as chaves e sem os valores, resolve o problema de "esqueci quais variáveis são".
- **Ponto de atenção**: enquanto não existir o item 3.4, esse backend local vai apontar para o **banco de produção**. Útil para ler, arriscado para escrever.
- **Esforço**: Baixo. Não altera estrutura de código.

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
- **Prioridade**: legitimamente baixa. Os itens 3.1 a 3.3 entregam a maior parte do ganho por uma fração do esforço.
- **Esforço**: Médio–Alto (mais pela manutenção contínua dos dados do que pela configuração inicial).

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
- **Onde mexer**: ⚠️ *Base técnica revisada.* As funções que este item citava (`exportarDados()` em `utils-kpi.js` e os cálculos de `kpiService.js`) **foram removidas**. A fonte correta agora é a collection `CicloFinanceiro` e o serviço `backend/src/services/financasService.js` — os valores já vêm calculados e congelados por ciclo, o que na prática **simplifica** este item: é quase só formatação e exportação, sem recalcular nada.
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
- **⚠️ Dependência crítica do financeiro**: este item é **pré-requisito** para evoluir a regra 5.8 da spec de Finanças. Quando existir, a escolha cobrável/não cobrável pode passar a ser derivada de *quem cancelou*. Hoje o financeiro conta simplesmente "o que existe na agenda" — se a aula for excluída de um ciclo não pago, ela some da cobrança. Quando existir status de presença, a contagem deve passar a considerar *realizada / falta cobrável / cancelada sem cobrança*, em vez da mera existência do compromisso. Registrado como revisão futura nas seções 5.8 e 8 da spec.
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

### [ ] 1.8 Visão de "aulas a repor" no card do aluno
- **O que é**: Uma caixinha no card do aluno mostrando quantas aulas ele tem pendentes de reposição.
- **Por que importa**: Foi explicitamente citada como a próxima feature desejada durante o desenho de Finanças, e ficou **fora de escopo** de propósito para não misturar com a mudança do modelo de cobrança.
- **Onde mexer**: `assets/js/view-alunos.js`. O layout do card (`.aluno-card-indicadores`, grid `auto-fit`) **já foi estruturado para acomodar uma terceira caixinha sem refatoração** — ver seção 11 da spec. No backend, o padrão a seguir é o de `agendaConsistencyService.js` (indicador operacional isolado, exposto por rota própria). ⚠️ A antiga `contarReposicoesPorAluno` **foi removida** e não deve ser ressuscitada — a regra precisa ser redesenhada, provavelmente junto com o item 1.5.
- **Dependência**: faz mais sentido depois (ou junto) do item 1.5, que define o que gera uma reposição. **Parcialmente atendido pela caixinha de avisos de reposição a vencer** (item 0.8), então o escopo deve ser reavaliado antes de executar.
- **Esforço**: Baixo–Médio.

---

## 🔴 Grupo 2 — Coisas complexas de fazer (exigem nova arquitetura, serviço externo ou mudança estrutural)

### [ ] 2.2 Cobrança automatizada (Pix, boleto, cartão recorrente)
- **O que é**: Gerar cobranças automáticas para os alunos e receber confirmação de pagamento sem o PT precisar fazer nada manualmente.
- **Por que importa**: Elimina de vez o trabalho manual de cobrar e reconciliar pagamentos, indo além do registro manual entregue no item 1.1.
- **Complexidade**: Exige integração com gateway de pagamento (ex.: Mercado Pago, Asaas, Stripe), webhooks de confirmação (o padrão já usado para o Google Calendar em `gcalWebhookController.js` serve de referência arquitetural) e tratamento de falha/estorno.
- **Base já pronta**: diferente de antes, **a entidade de cobrança já existe** — a collection `CicloFinanceiro` tem período, valor, status e data de pagamento. Um gateway plugaria em cima dela, sem precisar criar um modelo de "faturas" do zero.
- **Pré-requisito prático**: integrar gateway sem ambiente de teste (Grupo 3) e sem testes automatizados é pedir para errar com dinheiro real. Os itens 3.1 a 3.4 deixam de ser opcionais aqui.
- **Ponto de atenção**: estorno/reabertura de ciclo pago está hoje **fora de escopo** e sem implementação (ciclo pago é congelado permanentemente). Cobrança automatizada torna isso obrigatório.
- **Esforço**: Alto.

---

### [ ] 2.3 Notificações automáticas (lembrete de aula, cobrança, etc.)
- **O que é**: Notificar o PT e/ou o aluno automaticamente (push notification ou WhatsApp) antes da aula, ou quando um pagamento está para vencer.
- **Por que importa**: Reduz faltas e esquecimentos, dos dois lados.
- **Complexidade**: O app já é PWA com Service Worker registrado (`assets/js/app/service-worker.js`, `sw.js`), o que ajuda como base, mas hoje as notificações são só "toasts" internos (`mostrarToast`). Seria necessário Web Push (VAPID + subscription por usuário) **ou** WhatsApp Business API, mais um scheduler/cron no backend.
- **Sinergia com Finanças**: o `diaVencimento` e o `cicloFim` de cada aluno já dão exatamente a data de disparo do lembrete de cobrança — a informação necessária já está modelada.
- **Esforço**: Alto.

---

### [ ] 2.4 Portal/app do aluno
- **O que é**: Um espaço onde o próprio aluno acessa sua agenda, seu histórico de pagamento e talvez sua evolução física.
- **Por que importa**: Hoje o sistema é 100% voltado ao personal trainer — o aluno não tem visibilidade própria, o que gera trocas de mensagem desnecessárias ("qual meu horário de amanhã?", "já paguei esse mês?").
- **Complexidade**: O modelo de dados segrega tudo por `ownerEmail` (uma conta Google = uma base isolada, ver `backend/src/utils/ownerScope.js` e `requireAuth.js`). Não existe o conceito de múltiplos papéis (PT vs. aluno) sobre o mesmo conjunto de dados. Exigiria desenhar um modelo de autorização (RBAC) do zero.
- **Esforço**: Muito alto (mudança estrutural, não incremental).

---

### [ ] 2.5 Avaliação física / anamnese / evolução do aluno
- **O que é**: Registro de medidas corporais, peso, fotos de progresso, PAR-Q, histórico de lesões.
- **Por que importa**: É expectativa comum de alunos de personal trainer mais estruturados, e ajuda o PT a justificar/ajustar treinos.
- **Complexidade**: Não existe entidade parecida no modelo atual. Exigiria nova collection com histórico temporal, upload/armazenamento de imagens (hoje só há ícones estáticos em `assets/images/`, sem pipeline de upload) e uma tela de linha do tempo.
- **Esforço**: Alto.

---

### [ ] 2.6 Multi-personal / gestão de equipe (para academias/estúdios)
- **O que é**: Permitir que uma academia tenha vários personal trainers cadastrados, com alunos vinculados a mais de um profissional.
- **Por que importa**: Hoje o app só atende o modelo "PT autônomo solo". Para vender a estúdios/academias, seria necessário suportar equipes.
- **Complexidade**: O isolamento por `ownerEmail` é rígido (1 conta = 1 base). Hierarquia (dono → PTs → alunos compartilhados) exige redesenhar o esquema de permissões inteiro.
- **Esforço**: Muito alto.

---

### [ ] 2.7 Auditoria / histórico de alterações
- **O que é**: Registrar quem alterou o quê e quando (ex.: mudança de valor combinado, remarcação de aula), para resolver disputas com o aluno.
- **Por que importa**: Não há rastro de mudança — se o valor combinado for editado, o valor anterior se perde.
- **Nota**: a feature de Finanças resolveu **parcialmente** esse problema no recorte financeiro, via os campos de snapshot (`precoAulaSnapshot`, `valorFixoSnapshot`) do `CicloFinanceiro`: o preço vigente na criação de cada ciclo fica congelado, então um reajuste não reescreve o passado. Mas isso é preservação de valor, **não** log de auditoria — não há registro de *quando* nem de *o que* mudou no cadastro.
- **Complexidade**: Exigiria um padrão de auditoria (coleção paralela de eventos ou versionamento) aplicado a todos os `findOneAndUpdate` espalhados pelos controllers — mudança transversal.
- **Esforço**: Médio–Alto (mais pela abrangência do que pela dificuldade isolada).

---

### [x] 2.8 Precisão financeira avançada (calendário real em vez de aproximação) — **ENTREGUE**
- **O que foi entregue**: A fórmula fixa `frequência semanal × 4 × valor` foi **eliminada**. O cálculo agora percorre a janela real de datas do ciclo do aluno e conta as ocorrências efetivas de aulas resolvidas pelo motor de recorrência — o mesmo usado para desenhar a agenda, garantindo que "o que a agenda mostra" e "o que o financeiro cobra" nunca divirjam (módulo isomórfico, seção 2.4 da spec).
- **O que ficou de fora**: **feriados** não são tratados (uma aula em feriado é contada normalmente, a menos que o PT a remova da agenda) e **faltas** dependem do item 1.5.
- **Risco que se concretizou**: como previsto aqui, a ausência de testes automatizados fez a validação ser toda manual em produção. Dois defeitos reais escaparam para prod e só foram pegos em revisão posterior (aula excluída continuar sendo cobrada; reajuste de preço alterando ciclos antigos retroativamente). Ambos corrigidos — mas fica o registro de que **o projeto continua sem rede de proteção automatizada** em cima de código que calcula dinheiro. Ver item 3.1.

---

### [ ] 2.9 Contrato / termo de responsabilidade / assinatura digital
- **O que é**: Aluno assina digitalmente um termo de responsabilidade ou atestado médico dentro do próprio app.
- **Por que importa**: Reduz risco jurídico do PT (comum em contratos de prestação de serviço de educação física).
- **Complexidade**: Exigiria upload/armazenamento seguro de documentos e possivelmente integração com serviço de assinatura eletrônica (ex.: Clicksign, D4Sign) — infraestrutura nova, sem base no projeto atual.
- **Esforço**: Alto.

---

## Resumo de priorização sugerida

| Prioridade | Item | Grupo | Esforço |
|---|---|---|---|
| — | ~~Controle de pagamento/inadimplência (1.1)~~ | ✅ Entregue | — |
| — | ~~Precisão financeira avançada (2.8)~~ | ✅ Entregue | — |
| — | ~~Organização da documentação (0.4)~~ | ✅ Entregue | — |
| 1 | Bug do bloco de histórico (0.1) | Débito | Muito baixo |
| 2 | Busca por nome na lista de alunos (1.7) | Fácil | Muito baixo |
| 3 | Testes das regras financeiras (3.1) | Proteção | Baixo |
| 4 | Botão WhatsApp + observações (1.3, 1.4) | Fácil | Muito baixo |
| 5 | Backend local + frontend apontando para ele (3.2, 3.3) | Ambiente | Baixo |
| 6 | Relatório exportável de faturamento (1.2) | Fácil | Baixo |
| 7 | Status de no-show/cancelamento (1.5) | Fácil–Médio | Médio |
| 8 | Aulas a repor no card do aluno (1.8) | Fácil–Médio | Baixo–Médio |
| 9 | Débitos 0.2, 0.3 e 0.9 (de carona) | Débito | Baixo–Médio |
| 10 | Aniversário do aluno (1.6) | Fácil | Baixo |
| 11 | Banco de desenvolvimento separado (3.4) | Ambiente | Médio–Alto |
| 12 | Cobrança automatizada (2.2) | Complexo | Alto |
| 13 | Notificações automáticas (2.3) | Complexo | Alto |
| 14 | Portal do aluno (2.4) | Complexo | Muito alto |
| 15 | Avaliação física/anamnese (2.5) | Complexo | Alto |
| 16 | Multi-personal/equipe (2.6) | Complexo | Muito alto |
| 17 | Auditoria (2.7) | Complexo | Médio–Alto |
| 18 | Contrato / termo de responsabilidade (2.9) | Complexo | Médio |

**Sugestão de leitura da tabela**: os itens 1 a 6 são todos de esforço baixo e fecham as pontas soltas da entrega de Finanças. O item 3.1 (testes) subiu na lista de propósito: é barato, não depende de nada e é o único que protege código que calcula dinheiro — vale entrar antes de qualquer coisa que mexa em valor cobrado. Os itens 7 e 8 andam juntos e destravam a evolução da regra 5.8 do financeiro (contagem por presença em vez de existência na agenda).

---

*Documento gerado a partir de análise do código-fonte do projeto (frontend JS vanilla + backend Node/Express/MongoDB) e atualizado após a entrega da feature de Finanças e da reorganização da documentação. Atualize livremente conforme o roadmap evoluir.*
