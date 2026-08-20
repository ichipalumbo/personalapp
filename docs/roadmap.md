# Roadmap de Melhorias — Agenda Personal Trainer (Prô Josy)

> **Status**: Documento vivo · **Atualizado**: 2026-08-20
> Backlog de evolução do app sob a ótica de um Personal Trainer PJ usando o sistema no dia a dia.
> Atualize o status de cada item conforme for evoluindo (`[ ]` pendente, `[~]` em andamento, `[x]` concluído).
>
> **Atualização importante**: a feature **"Finanças — Ciclo de Cobrança por Aluno"** foi implementada e está em produção. Ela **entregou o item 1.1** e **substituiu** o antigo sistema de KPI financeiro (`backend/src/services/kpiService.js` e os cálculos de projeção em `assets/js/utils-kpi.js`), que **não existem mais no código**. Os itens abaixo que dependiam desses arquivos foram corrigidos para apontar para a base atual (`financasService.js` / collection `CicloFinanceiro`). Especificação completa em [`specs/financas-ciclo-cobranca.md`](specs/financas-ciclo-cobranca.md).

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

### [ ] 0.1 Bug: bloco "Ver ciclos anteriores" fecha sozinho no re-render
- **O que é**: Em Finanças, ao expandir "Ver ciclos anteriores", o bloco volta a fechar sozinho quando a tela é re-renderizada (chegada da resposta remota, troca de filtro, marcar como pago, salvar ajuste). Chega a fechar no meio do "Carregando ciclos anteriores...".
- **Por que importa**: É o único defeito conhecido em aberto da feature. Impacto é só visual — nenhum dado é perdido e nenhuma requisição é refeita (o conteúdo já carregado é restaurado corretamente) —, mas dá a sensação de "cliquei e o app desfez".
- **Onde mexer**: `assets/js/view-financas.js`. O estado de expansão hoje vive só no DOM; precisa ir para o `STATE` (ex.: `STATE.historicoAberto`), o listener de `toggle` (já em fase de captura) passa a registrar abertura **e** fechamento, e `renderizarCard()` reaplica o atributo `open`. Não requer backend.
- **Esforço**: Muito baixo (3 pontos de alteração, arquivo único).

---

### [ ] 0.2 Mover o módulo isomórfico de recorrência para dentro de `backend/`
- **O que é**: Hoje `backend/src/services/financasService.js` importa `assets/js/shared/recurrence-helpers.js` com um `require` relativo que atravessa para fora da pasta `backend/`.
- **Por que importa**: Funciona em produção, mas depende de configuração dos projetos Vercel que **não está versionada** — a API tem *Root Directory* = `backend/`, e o app aponta para a raiz do repositório. Se essa configuração mudar, quebra em produção sem aviso.
- **Onde mexer**: Mover para `backend/src/shared/recurrence-helpers.js`, backend passando a requerer localmente, e o frontend consumindo de lá (o projeto do app publica o repositório inteiro, então alcança esse caminho — a assimetria joga a favor desta direção). Manter **um único módulo**: duplicar o arquivo reintroduz o risco de divergência entre "o que a agenda mostra" e "o que o financeiro cobra".
- **Esforço**: Baixo (mudança de caminho + ajuste de `require` e da tag `<script>`), mas exige validar o deploy dos dois projetos.

---

### [ ] 0.3 Limpar CSS órfão da visão mensal removida
- **O que é**: Regras como `.calendario-mensal`, `.calendario-grid`, `.dia-cell`, `.kpi-dashboard` e `#tela-calendario` continuam em `assets/css/style.css` mesmo após a remoção da visão "Mês".
- **Por que importa**: Só peso morto e ruído de manutenção. Não afeta o usuário.
- **Onde mexer**: `assets/css/style.css`. **Cuidado**: alguns seletores podem ser compartilhados com as visões de dia/semana — verificar cada um antes de remover.
- **Esforço**: Baixo (o trabalho é a verificação, não a remoção).

---

### [ ] 0.4 Manter README e artefatos de análise em dia
- **O que é**: O `README.md` da raiz precisa refletir a estrutura real de arquivos (o `kpiService.js` foi removido; `agendaConsistencyService.js` e `CicloFinanceiro.js` foram criados). Os artefatos em `graphify-out/` refletem o código anterior.
- **Por que importa**: Documentação desatualizada é o tipo de coisa que faz o próximo trabalho começar errado — foi exatamente o que aconteceu com este roadmap. Artefatos de análise defasados são piores: aparecem em buscas por código e apontam para arquivos que não existem mais.
- **Onde mexer**: `README.md` manualmente; `graphify-out/` deve ser **regenerado** pela ferramenta, nunca editado à mão. Avaliar se essa pasta deve continuar versionada.
- **Esforço**: Muito baixo.

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
- **Onde mexer**: ⚠️ *Base técnica revisada.* As funções que este item citava (`exportarDados()` em `utils-kpi.js` e os cálculos de `kpiService.js`) **foram removidas**. A fonte correta agora é a collection `CicloFinanceiro` e o serviço `backend/src/services/financasService.js` — os valores já vêm calculados e congelados por ciclo, o que na prática **simplifica** este item: é quase só formatação e exportação, sem recalcular nada.
- **Sugestão de escopo mínimo (V1)**: Exportar CSV/Excel dos ciclos de um intervalo de datas, com colunas: aluno, período do ciclo, método de cobrança, aulas cobradas, valor, status, data de pagamento.
- **Ponto de atenção**: decidir se o relatório exporta o **ciclo vigente** também (que ainda pode mudar enquanto não estiver pago) ou apenas ciclos fechados/pagos.
- **Esforço**: Baixo (a lógica de cálculo já está pronta e persistida; falta só a camada de exportação).

---

### [ ] 1.3 Campo de observações/anotações por aula ou por aluno
- **O que é**: Um campo de texto livre para anotar coisas como "reclamou de dor no joelho", "combinar novo horário", "trouxe atestado".
- **Por que importa**: Hoje não existe nenhum campo de anotação livre nem no modelo `Aluno.js` nem no `Agendamento.js` (que usam `{ strict: false }`, mas nenhuma tela expõe esse campo).
- **Onde mexer**: Adicionar campo `observacoes` no formulário de `view-alunos.js` e/ou `modal-acao-slot.js` (edição de agendamento). O `{ strict: false }` do schema já aceita esse campo sem migração.
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
- **⚠️ Dependência crítica do financeiro**: este item é **pré-requisito** para evoluir a regra 5.8 da spec de Finanças. Hoje o financeiro conta simplesmente "o que existe na agenda" — se a aula for excluída de um ciclo não pago, ela some da cobrança. Quando existir status de presença, a contagem deve passar a considerar *realizada / falta cobrável / cancelada sem cobrança*, em vez da mera existência do compromisso. Registrado como revisão futura nas seções 5.8 e 8 da spec.
- **Onde mexer**: `backend/src/models/Agendamento.js` (ajustar enum/valores aceitos), `modal-acao-slot.js` (ações de cancelar/faltou) e, em seguida, `backend/src/services/financasService.js` (regra de contagem). ⚠️ A antiga `contarReposicoesPorAluno` de `kpiService.js`, que este item citava, **não existe mais**.
- **Esforço**: Médio (a parte de UI é simples; a integração com o financeiro exige cuidado por mexer em valor cobrado).

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
- **Dependência**: faz mais sentido depois (ou junto) do item 1.5, que define o que gera uma reposição.
- **Esforço**: Baixo–Médio.

---

## 🔴 Grupo 2 — Coisas complexas de fazer (exigem nova arquitetura, serviço externo ou mudança estrutural)

### [ ] 2.1 Cobrança automatizada (Pix, boleto, cartão recorrente)
- **O que é**: Gerar cobranças automáticas para os alunos e receber confirmação de pagamento sem o PT precisar fazer nada manualmente.
- **Por que importa**: Elimina de vez o trabalho manual de cobrar e reconciliar pagamentos, indo além do registro manual entregue no item 1.1.
- **Complexidade**: Exige integração com gateway de pagamento (ex.: Mercado Pago, Asaas, Stripe), webhooks de confirmação (o padrão já usado para o Google Calendar em `gcalWebhookController.js` serve de referência arquitetural) e tratamento de falha/estorno.
- **Base já pronta**: diferente de antes, **a entidade de cobrança já existe** — a collection `CicloFinanceiro` tem período, valor, status e data de pagamento. Um gateway plugaria em cima dela, sem precisar criar um modelo de "faturas" do zero.
- **Ponto de atenção**: estorno/reabertura de ciclo pago está hoje **fora de escopo** e sem implementação (ciclo pago é congelado permanentemente). Cobrança automatizada torna isso obrigatório.
- **Esforço**: Alto.

---

### [ ] 2.2 Notificações automáticas (lembrete de aula, cobrança, etc.)
- **O que é**: Notificar o PT e/ou o aluno automaticamente (push notification ou WhatsApp) antes da aula, ou quando um pagamento está para vencer.
- **Por que importa**: Reduz faltas e esquecimentos, dos dois lados.
- **Complexidade**: O app já é PWA com Service Worker registrado (`assets/js/app/service-worker.js`, `sw.js`), o que ajuda como base, mas hoje as notificações são só "toasts" internos (`mostrarToast`). Seria necessário Web Push (VAPID + subscription por usuário) **ou** WhatsApp Business API, mais um scheduler/cron no backend.
- **Sinergia com Finanças**: o `diaVencimento` e o `cicloFim` de cada aluno já dão exatamente a data de disparo do lembrete de cobrança — a informação necessária já está modelada.
- **Esforço**: Alto.

---

### [ ] 2.3 Portal/app do aluno
- **O que é**: Um espaço onde o próprio aluno acessa sua agenda, seu histórico de pagamento e talvez sua evolução física.
- **Por que importa**: Hoje o sistema é 100% voltado ao personal trainer — o aluno não tem visibilidade própria, o que gera trocas de mensagem desnecessárias ("qual meu horário de amanhã?", "já paguei esse mês?").
- **Complexidade**: O modelo de dados segrega tudo por `ownerEmail` (uma conta Google = uma base isolada, ver `backend/src/utils/ownerScope.js` e `requireAuth.js`). Não existe o conceito de múltiplos papéis (PT vs. aluno) sobre o mesmo conjunto de dados. Exigiria desenhar um modelo de autorização (RBAC) do zero.
- **Esforço**: Muito alto (mudança estrutural, não incremental).

---

### [ ] 2.4 Avaliação física / anamnese / evolução do aluno
- **O que é**: Registro de medidas corporais, peso, fotos de progresso, PAR-Q, histórico de lesões.
- **Por que importa**: É expectativa comum de alunos de personal trainer mais estruturados, e ajuda o PT a justificar/ajustar treinos.
- **Complexidade**: Não existe entidade parecida no modelo atual. Exigiria nova collection com histórico temporal, upload/armazenamento de imagens (hoje só há ícones estáticos em `assets/images/`, sem pipeline de upload) e uma tela de linha do tempo.
- **Esforço**: Alto.

---

### [ ] 2.5 Multi-personal / gestão de equipe (para academias/estúdios)
- **O que é**: Permitir que uma academia tenha vários personal trainers cadastrados, com alunos vinculados a mais de um profissional.
- **Por que importa**: Hoje o app só atende o modelo "PT autônomo solo". Para vender a estúdios/academias, seria necessário suportar equipes.
- **Complexidade**: O isolamento por `ownerEmail` é rígido (1 conta = 1 base). Hierarquia (dono → PTs → alunos compartilhados) exige redesenhar o esquema de permissões inteiro.
- **Esforço**: Muito alto.

---

### [ ] 2.6 Auditoria / histórico de alterações
- **O que é**: Registrar quem alterou o quê e quando (ex.: mudança de valor combinado, remarcação de aula), para resolver disputas com o aluno.
- **Por que importa**: Não há rastro de mudança — se o valor combinado for editado, o valor anterior se perde.
- **Nota**: a feature de Finanças resolveu **parcialmente** esse problema no recorte financeiro, via os campos de snapshot (`precoAulaSnapshot`, `valorFixoSnapshot`) do `CicloFinanceiro`: o preço vigente na criação de cada ciclo fica congelado, então um reajuste não reescreve o passado. Mas isso é preservação de valor, **não** log de auditoria — não há registro de *quando* nem de *o que* mudou no cadastro.
- **Complexidade**: Exigiria um padrão de auditoria (coleção paralela de eventos ou versionamento) aplicado a todos os `findOneAndUpdate` espalhados pelos controllers — mudança transversal.
- **Esforço**: Médio–Alto (mais pela abrangência do que pela dificuldade isolada).

---

### [x] 2.7 Precisão financeira avançada (calendário real em vez de aproximação) — **ENTREGUE**
- **O que foi entregue**: A fórmula fixa `frequência semanal × 4 × valor` foi **eliminada**. O cálculo agora percorre a janela real de datas do ciclo do aluno e conta as ocorrências efetivas de aulas resolvidas pelo motor de recorrência — o mesmo usado para desenhar a agenda, garantindo que "o que a agenda mostra" e "o que o financeiro cobra" nunca divirjam (módulo isomórfico, seção 2.4 da spec).
- **O que ficou de fora**: **feriados** não são tratados (uma aula em feriado é contada normalmente, a menos que o PT a remova da agenda) e **faltas** dependem do item 1.5.
- **Risco que se concretizou**: como previsto aqui, a ausência de testes automatizados fez a validação ser toda manual em produção. Dois defeitos reais escaparam para prod e só foram pegos em revisão posterior (aula excluída continuar sendo cobrada; reajuste de preço alterando ciclos antigos retroativamente). Ambos corrigidos — mas fica o registro de que **o projeto continua sem rede de proteção automatizada** em cima de código que calcula dinheiro. Ver item 2.9.

---

### [ ] 2.8 Contrato / termo de responsabilidade / assinatura digital
- **O que é**: Aluno assina digitalmente um termo de responsabilidade ou atestado médico dentro do próprio app.
- **Por que importa**: Reduz risco jurídico do PT (comum em contratos de prestação de serviço de educação física).
- **Complexidade**: Exigiria upload/armazenamento seguro de documentos e possivelmente integração com serviço de assinatura eletrônica (ex.: Clicksign, D4Sign) — infraestrutura nova, sem base no projeto atual.
- **Esforço**: Alto.

---

### [ ] 2.9 Testes automatizados para as regras financeiras
- **O que é**: Uma suíte mínima cobrindo as regras de cálculo de `financasService.js`: janela do ciclo (incluindo dia 31 em mês curto e virada de ano), piso zero do ajuste negativo, congelamento de ciclo pago e uso do snapshot no recálculo.
- **Por que importa**: Os dois bugs financeiros que chegaram a produção teriam sido pegos por testes triviais. As funções de cálculo já são **puras e exportadas** (`calcularCicloVigente`, `calcularValorTotalCiclo`, `calcularTotalAulasCobradas`), então dá para testar sem subir banco nem navegador.
- **Onde mexer**: `backend/` — hoje não há nenhum runner de teste configurado. Começar pelo mais barato possível (o `node:test` nativo já resolve, sem dependência nova).
- **Ponto de atenção**: não tentar cobrir tudo. O alvo são as funções puras de cálculo; testar o que depende de Mongo é outro nível de esforço e pode ficar para depois.
- **Esforço**: Baixo (se limitado às funções puras).

---

## Resumo de priorização sugerida

| Prioridade | Item | Grupo | Esforço |
|---|---|---|---|
| — | ~~Controle de pagamento/inadimplência (1.1)~~ | ✅ Entregue | — |
| — | ~~Precisão financeira avançada (2.7)~~ | ✅ Entregue | — |
| 1 | Bug do bloco de histórico (0.1) | Débito | Muito baixo |
| 2 | Busca por nome na lista de alunos (1.7) | Fácil | Muito baixo |
| 3 | Botão WhatsApp + observações (1.3, 1.4) | Fácil | Muito baixo |
| 4 | Relatório exportável de faturamento (1.2) | Fácil | Baixo |
| 5 | Testes das regras financeiras (2.9) | Proteção | Baixo |
| 6 | Status de no-show/cancelamento (1.5) | Fácil–Médio | Médio |
| 7 | Aulas a repor no card do aluno (1.8) | Fácil–Médio | Baixo–Médio |
| 8 | Débitos 0.2, 0.3, 0.4 (de carona) | Débito | Baixo |
| 9 | Aniversário do aluno (1.6) | Fácil | Baixo |
| 10 | Cobrança automatizada (2.1) | Complexo | Alto |
| 11 | Notificações automáticas (2.2) | Complexo | Alto |
| 12 | Avaliação física/anamnese (2.4) | Complexo | Alto |
| 13 | Auditoria (2.6) | Complexo | Médio–Alto |
| 14 | Portal do aluno (2.3) | Complexo | Muito alto |
| 15 | Multi-personal/equipe (2.5) | Complexo | Muito alto |

**Sugestão de leitura da tabela**: os itens 1 a 5 são todos de esforço baixo e fecham as pontas soltas da entrega de Finanças. Os itens 6 e 7 andam juntos e destravam a evolução da regra 5.8 do financeiro (contagem por presença em vez de existência na agenda) — provavelmente o "próximo bloco" natural de trabalho.

---

*Documento gerado a partir de análise do código-fonte do projeto (frontend JS vanilla + backend Node/Express/MongoDB) e atualizado após a entrega da feature de Finanças. Atualize livremente conforme o roadmap evoluir.*
