# Roadmap de Melhorias — Agenda Personal Trainer (Prô Josy)

> Documento vivo para acompanhar ideias de evolução do app, sob a ótica de um Personal Trainer PJ usando o sistema no dia a dia.
> Gerado a partir de uma análise do código-fonte atual (frontend vanilla JS + backend Node/Express/MongoDB).
> Atualize o status de cada item conforme for evoluindo (`[ ]` pendente, `[~]` em andamento, `[x]` concluído).

---

## Como usar este documento

Cada item traz:
- **O que é**: descrição da feature/regra/tela.
- **Por que importa**: a dor real do PT que ela resolve.
- **Onde mexer**: arquivos/áreas do código já existentes que servem de ponto de partida (baseado na estrutura atual do projeto).
- **Esforço estimado**: relativo, não é estimativa de horas fechada.

---

## 🟢 Grupo 1 — Coisas fáceis de fazer (baixo esforço, alto ganho percebido)

### [ ] 1.1 Controle de pagamento / inadimplência
- **O que é**: Marcar se o aluno está em dia ou atrasado no pagamento do mês, com histórico simples (data, valor, forma de pagamento).
- **Por que importa**: É a dor nº1 de personal autônomo — "quem já pagou esse mês?". Hoje isso é controlado na cabeça ou em planilha paralela.
- **Onde mexer**: O campo `historicoPagamentos: Array` já existe no schema `backend/src/models/Aluno.js`, mas não há controller, rota nem tela usando esse campo hoje. É essencialmente destravar um campo que já foi planejado e nunca implementado.
- **Sugestão de escopo mínimo (V1)**:
  - Endpoint para registrar um pagamento (`data`, `valor`, `mesReferencia`, `forma` opcional).
  - Badge visual na lista de alunos (`view-alunos.js`): verde "em dia" / vermelho "atrasado".
  - Regra simples: se não há registro de pagamento para o mês corrente, marcar como pendente.
- **Esforço**: Baixo (schema pronto; falta CRUD + UI).

---

### [ ] 1.2 Relatório de faturamento exportável (PDF/Excel)
- **O que é**: Botão "Gerar relatório do mês" com faturamento por aluno, total do mês, aulas dadas x combinadas.
- **Por que importa**: Hoje não existe nenhuma exportação de faturamento — o histórico financeiro fica apenas na tela de Finanças (`view-financas.js`), sem meio de gerar um relatório para prestar contas a um contador ou para controle pessoal.
- **Onde mexer**: Reaproveitar os dados já persistidos em `CicloFinanceiro` via `backend/src/services/financasService.js` (`listarFinancasDoOwner`, `obterHistoricoFinancasPorAluno`) e apenas adicionar uma camada de apresentação/exportação. `exportarDados()`/`utils-kpi.js` e `kpiService.js` foram removidos junto com o KPI antigo — não são mais uma base a reaproveitar.
- **Sugestão de escopo mínimo (V1)**: Exportar CSV/Excel primeiro (mais simples que PDF), com colunas: aluno, valor combinado, aulas dadas, aulas faltando, reposições, projeção do mês.
- **Esforço**: Baixo–Médio (lógica de cálculo já existe; falta camada de exportação formatada, ex. `xlsxwriter` ou `reportlab` no backend, ou lib JS no front).

---

### [ ] 1.3 Campo de observações/anotações por aula ou por aluno
- **O que é**: Um campo de texto livre para anotar coisas como "reclamou de dor no joelho", "combinar novo horário", "trouxe atestado".
- **Por que importa**: Hoje não existe nenhum campo de anotação livre nem no modelo `Aluno.js` nem no `Agendamento.js` (que usam `{ strict: false }`, mas nenhuma tela expõe esse campo).
- **Onde mexer**: Adicionar campo `observacoes` no formulário de `view-alunos.js` e/ou `modal-acao-slot.js` (edição de agendamento). O `{ strict: false }` do schema já aceita esse campo sem migração.
- **Esforço**: Baixo (é essencialmente 1 textarea + 1 exibição na ficha do aluno/aula).

---

### [ ] 1.4 Botão de contato rápido via WhatsApp
- **O que é**: Ícone/botão na ficha do aluno que abre uma conversa de WhatsApp direto com o número cadastrado.
- **Por que importa**: O campo `telefone` já é obrigatório no cadastro (`AlunoSchema` em `Aluno.js`), mas não há nenhum atalho de contato — hoje o PT precisa copiar o número manualmente.
- **Onde mexer**: `view-alunos.js`, adicionando um link `https://wa.me/<telefone>` na renderização do card do aluno.
- **Esforço**: Muito baixo (link estático, sem mudança de backend).

---

### [ ] 1.5 Status de "não compareceu" (no-show) / cancelamento pelo aluno
- **O que é**: Além do status `confirmado` (default atual em `Agendamento.js`), adicionar estados como `cancelado_pelo_aluno` e `faltou`, para diferenciar de cancelamento feito pelo próprio PT.
- **Por que importa**: Hoje o sistema já tem o campo `status` no schema, mas só é usado como confirmado. Sem diferenciar falta do aluno, fica difícil cobrar reposição de forma justa ou identificar alunos com muita falta.
- **Onde mexer**: `backend/src/models/Agendamento.js` (ajustar enum/valores aceitos), `modal-acao-slot.js` (ações de cancelar/faltou, painel de `aulasParaRepor` em `state.js`). Atenção: `contarReposicoesPorAluno()`/`kpiService.js` foram removidos junto com o KPI antigo — a lógica de contagem de reposição por aluno precisa ser reavaliada/reconstruída a partir do estado atual de `aulasParaRepor`, não reaproveitada de código existente.
- **Esforço**: Baixo–Médio (schema já suporta string livre; o trabalho é de UI + regra de quando permitir reposição gratuita vs. cobrada).

---

### [ ] 1.6 Lembrete de aniversário do aluno
- **O que é**: Campo de data de nascimento no cadastro + card no dashboard "aniversariantes da semana/mês".
- **Por que importa**: É um toque de relacionamento simples que ajuda na retenção do aluno, sem exigir integração externa.
- **Onde mexer**: Novo campo `dataNascimento` em `Aluno.js` (schema `{ strict: false }` aceita sem migração forçada) + widget novo em `view-home.js`.
- **Esforço**: Baixo.

---

### [ ] 1.7 Filtro e busca na lista de alunos
- **O que é**: Buscar por nome e filtrar por status (ativo/inativo) ou por dia da semana que o aluno treina.
- **Por que importa**: Conforme a base de alunos cresce, rolar a lista toda fica inviável.
- **Onde mexer**: `view-alunos.js` — os dados já estão todos carregados em memória (`window.alunos`), então é filtragem client-side, sem mudança de backend.
- **Esforço**: Muito baixo.

---

## 🔴 Grupo 2 — Coisas complexas de fazer (exigem nova arquitetura, serviço externo ou mudança estrutural)

### [ ] 2.1 Cobrança automatizada (Pix, boleto, cartão recorrente)
- **O que é**: Gerar cobranças automáticas para os alunos e receber confirmação de pagamento sem o PT precisar fazer nada manualmente.
- **Por que importa**: Elimina de vez o trabalho manual de cobrar e reconciliar pagamentos, indo além do simples registro (item 1.1).
- **Complexidade**: Exige integração com gateway de pagamento (ex.: Mercado Pago, Asaas, Stripe), nova entidade de "faturas" no banco, webhooks de confirmação de pagamento (similar ao padrão já usado para o Google Calendar em `gcalWebhookController.js`, que pode servir de referência arquitetural), e tratamento de casos de falha/estorno.
- **Esforço**: Alto.

---

### [ ] 2.2 Notificações automáticas (lembrete de aula, cobrança, etc.)
- **O que é**: Notificar o PT e/ou o aluno automaticamente (push notification ou WhatsApp) antes da aula, ou quando um pagamento está para vencer.
- **Por que importa**: Reduz faltas e esquecimentos, tanto do lado do PT quanto do aluno.
- **Complexidade**: O app já tem um Service Worker registrado (`assets/js/app/service-worker.js`, `sw.js`) e é PWA, o que ajuda como base técnica, mas hoje as notificações existentes são só "toasts" internos da própria tela (`mostrarToast`) — não há nenhum mecanismo de notificação push real nem agendamento de tarefas no backend. Seria necessário:
  - Implementar Web Push (VAPID keys, subscription por usuário) **ou**
  - Integrar com WhatsApp Business API para lembrete externo.
  - Um scheduler/cron no backend para dispará-las nos horários certos.
- **Esforço**: Alto.

---

### [ ] 2.3 Portal/app do aluno
- **O que é**: Um espaço onde o próprio aluno acessa sua agenda, seu histórico de pagamento e talvez sua evolução física.
- **Por que importa**: Hoje o sistema é 100% voltado ao personal trainer — o aluno não tem nenhuma visibilidade própria, o que gera trocas de mensagem desnecessárias ("qual meu horário de amanhã?", "já paguei esse mês?").
- **Complexidade**: O modelo de dados atual segrega tudo por `ownerEmail` (uma conta Google = uma base isolada, ver `backend/src/utils/ownerScope.js` e o middleware `requireAuth.js`). Não existe hoje o conceito de múltiplos papéis de usuário (PT vs. aluno) acessando o mesmo conjunto de dados com permissões diferentes. Seria necessário desenhar um novo modelo de autorização (RBAC) do zero.
- **Esforço**: Muito alto (mudança estrutural, não incremental).

---

### [ ] 2.4 Avaliação física / anamnese / evolução do aluno
- **O que é**: Registro de medidas corporais, peso, fotos de progresso, PAR-Q (questionário de prontidão para atividade física), histórico de lesões.
- **Por que importa**: É uma expectativa comum de alunos de personal trainer mais estruturados, e ajuda o PT a justificar/ajustar treinos.
- **Complexidade**: Não existe hoje nenhuma entidade parecida no modelo de dados. Seria necessário:
  - Nova coleção no MongoDB (ex.: `Avaliacao`), com histórico temporal por aluno.
  - Upload e armazenamento de imagens (hoje o projeto só tem ícones estáticos em `assets/images/`, nenhum pipeline de upload de arquivo de usuário).
  - Tela nova de "linha do tempo" de evolução.
- **Esforço**: Alto.

---

### [ ] 2.5 Multi-personal / gestão de equipe (para academias/estúdios)
- **O que é**: Permitir que uma academia tenha vários personal trainers cadastrados, com alunos podendo ser compartilhados ou vinculados a mais de um profissional.
- **Por que importa**: Hoje o app só atende o modelo "PT autônomo solo". Para vender a estúdios/academias, seria necessário suportar equipes.
- **Complexidade**: O isolamento de dados hoje é rígido por `ownerEmail` (1 conta = 1 base). Suportar hierarquia (dono da academia → PTs → alunos compartilhados) exige redesenhar o esquema de permissões inteiro, não é uma extensão simples do modelo atual.
- **Esforço**: Muito alto.

---

### [ ] 2.6 Auditoria / histórico de alterações
- **O que é**: Registrar quem alterou o quê e quando (ex.: mudança de valor combinado, remarcação de aula), para resolver disputas com o aluno.
- **Por que importa**: Hoje não há nenhum rastro de mudança — se o valor combinado for editado, o valor anterior se perde.
- **Complexidade**: Exigiria um padrão de auditoria (ex.: coleção paralela de "log de eventos" ou campo de histórico versionado) aplicado a todos os `findOneAndUpdate` espalhados pelos controllers (`alunoController.js`, `agendamentoController.js`), o que é uma mudança transversal ao sistema, não pontual.
- **Esforço**: Médio–Alto (mais trabalhoso pela abrangência do que pela dificuldade técnica isolada).

---

### [ ] 2.7 Precisão financeira avançada (calendário real em vez de aproximação)
- **O que é**: Corrigir a contagem de aulas do ciclo para considerar feriados e faltas descontadas automaticamente, em vez de depender do ajuste manual por ciclo.
- **Por que importa**: O modelo de faturamento por ciclo já existe (`backend/src/services/financasService.js`, coleção `CicloFinanceiro`), mas ele conta aulas dentro da janela do ciclo sem considerar feriados ou faltas descontadas de forma automática — hoje esse ajuste fino depende do ajuste manual por ciclo (`aulasManuaisExtras`).
- **Complexidade**: Não é reescrever o serviço do zero, mas é uma mudança sensível porque toca diretamente o número que o PT usa para planejar a vida financeira — qualquer ajuste exige testes extensivos (o projeto hoje não tem nenhum teste automatizado), então o risco de quebrar algo silenciosamente é real.
- **Esforço**: Médio (tecnicamente contido, mas de alto risco/sensibilidade).

---

### [ ] 2.8 Contrato / termo de responsabilidade / assinatura digital
- **O que é**: Aluno assina digitalmente um termo de responsabilidade ou atestado médico dentro do próprio app.
- **Por que importa**: Reduz risco jurídico do PT (comum em contratos de prestação de serviço de educação física).
- **Complexidade**: Exigiria upload/armazenamento seguro de documentos e possivelmente integração com serviço de assinatura eletrônica (ex.: Clicksign, D4Sign) — infraestrutura completamente nova, sem nenhuma base no projeto atual.
- **Esforço**: Alto.

---

## Resumo de priorização sugerida

| Prioridade | Item | Grupo | Esforço |
|---|---|---|---|
| 1 | Controle de pagamento/inadimplência (1.1) | Fácil | Baixo |
| 2 | Relatório exportável de faturamento (1.2) | Fácil | Baixo–Médio |
| 3 | Botão WhatsApp + observações (1.3, 1.4) | Fácil | Muito baixo |
| 4 | Status de no-show/cancelamento (1.5) | Fácil | Baixo–Médio |
| 5 | Filtro de alunos + aniversário (1.6, 1.7) | Fácil | Baixo |
| 6 | Cobrança automatizada (2.1) | Complexo | Alto |
| 7 | Notificações automáticas (2.2) | Complexo | Alto |
| 8 | Avaliação física/anamnese (2.4) | Complexo | Alto |
| 9 | Portal do aluno (2.3) | Complexo | Muito alto |
| 10 | Multi-personal/equipe (2.5) | Complexo | Muito alto |

---

*Documento gerado a partir de análise do código-fonte do projeto `personalapp-main` (frontend JS vanilla + backend Node/Express/MongoDB). Atualize livremente conforme o roadmap evoluir.*
