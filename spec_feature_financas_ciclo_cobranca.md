# Especificação Técnica — Feature "Finanças" (Ciclo de Cobrança por Aluno)

> Documento destinado a agente de IA (GitHub Copilot) para implementação.
> Projeto: Agenda Personal Trainer (Prô Josy) — frontend JS vanilla + backend Node/Express/MongoDB.
> Este documento é a fonte de verdade das decisões de produto para esta feature. Não infira regras de negócio além do que está descrito aqui — onde houver dúvida, ela está explicitamente resolvida na seção "Decisões e Casos de Borda". Qualquer regra não coberta aqui deve ser tratada como "Fora de Escopo" (ver seção final) e não implementada sem confirmação humana.

---

## 1. Contexto e Objetivo

Hoje o app calcula faturamento com uma aproximação genérica por mês calendário (`frequência semanal × 4 × valor`), sem relação com datas reais de vencimento de cada aluno. Isso não reflete a realidade de um Personal Trainer (PT) autônomo, que frequentemente cobra em ciclos móveis (ex.: todo dia 17 de cada mês), e não em mês civil fechado.

**Objetivo desta feature**: substituir totalmente o modelo de KPI financeiro atual por um modelo de **ciclo de cobrança configurável por aluno**, com:
- Cálculo de quantas aulas válidas ocorreram dentro da janela de datas do ciclo vigente do aluno.
- Cálculo do valor a cobrar nesse ciclo (por aula ou valor fixo, conforme configuração do aluno).
- Registro persistente de pagamento por ciclo, com status automático (pago/atrasado/em aberto).
- Uma nova aba de navegação "Finanças" dedicada a essa visão, substituindo a aba "Calendário" atual.

Esta feature **remove** o dashboard de KPI antigo (baseado em mês calendário) e a visão de calendário mensal. Não removemos nenhuma lógica de agendamento, recorrência ou conflito de horário — a agenda continua funcionando exatamente como hoje.

---

## 2. Mudanças de Navegação (Escopo desta Feature)

### 2.1 Aba "Home"
- Passa a ter duas sub-abas internas, nesta ordem fixa: **"Semana" (primeira/padrão ao abrir) → "Dia"**.
- A sub-aba "Semana" é a visão principal e deve abrir por padrão sempre que o usuário navegar para "Home". Isso é um requisito explícito do usuário final (PT) e não deve ser alterado.
- A sub-aba "Dia" mantém o comportamento atual da agenda diária.
- Nenhuma lógica de agendamento, recorrência ou conflito muda nesta feature — é puramente reorganização de navegação/UI.

### 2.2 Visão "Mês" do calendário
- **Removida por completo** (grid mensal). Motivo de produto: visão de baixo valor em mobile-first, será substituída pela aba "Finanças".
- Qualquer função relacionada exclusivamente à renderização do grid mensal (ex.: `renderizarCalendario`, `getDiasNoMes`, `getPrimeiroDiaSemana` em `assets/js/calendario-engine.js`) deve ser avaliada: se não for usada por mais nenhuma outra view após a remoção da aba Calendário, pode ser removida com segurança. **Funções de resolução de recorrência/data** (`parseDataFlex`, `resolverCompromissoRecorrenteNaData`, `checarCompromissoNaData`) **devem ser mantidas e reaproveitadas**, pois são a base do cálculo de aulas válidas por ciclo (ver seção 5).

### 2.3 Aba "Calendário" → Aba "Finanças"
- A aba atualmente chamada "Calendário" é substituída pela nova aba **"Finanças"**.
- O dashboard de KPI antigo (`assets/js/utils-kpi.js` funções `calcularKPIsAluno`, `calcularKPIsTodosAlunos`, e os equivalentes de backend em `backend/src/services/kpiService.js`: `calcularProjecaoMensalCompleta`, `calcularProjecaoRealizadaAteHoje`, `calcularProjecaoAproximada`, `calcularAulasFaltamAgendar`) **é removido e substituído** pela nova lógica de ciclo (ver seção 5). Não deixar os dois sistemas convivendo — é decisão explícita de produto substituir, não somar.

### 2.4 Estrutura final de navegação
```
[Home]  → sub-abas: [Semana (padrão)] [Dia]
[Alunos]
[Finanças]  (nova, substitui "Calendário")
```

---

## 3. Modelo de Dados

### 3.1 Alterações no schema `Aluno` (`backend/src/models/Aluno.js`)

Adicionar os seguintes campos (schema é `{ strict: false }`, portanto aceita novos campos sem migração forçada, mas devem ser adicionados explicitamente ao schema para documentação e validação):

```js
diaVencimento: { type: Number, min: 2, max: 31, default: null },
// Dia do mês em que o pagamento vence. NUNCA pode ser 1 (ver regra de validação 3.1.1).
// Se o dia não existir no mês corrente (ex: 31 em fevereiro), usar o último dia do mês (ver seção 5.2).

fechamentoMesCheio: { type: Boolean, default: false },
// Se true: ignora `diaVencimento` e usa sempre o mês civil cheio (dia 1 ao último dia do mês).
// Se false: usa `diaVencimento` normalmente.

metodoCobranca: { type: String, enum: ['por_aula', 'valor_fixo'], default: 'por_aula' },
// Determina como o valor do ciclo é calculado (ver seção 5.3).

valorFixoCiclo: { type: Number, default: null }
// Usado somente quando metodoCobranca === 'valor_fixo'. Valor combinado (ex: pacote de permuta).
// Quando metodoCobranca === 'por_aula', este campo é ignorado no cálculo (mas não precisa ser apagado do banco).
```

**Campo removido/aposentado**: `historicoPagamentos` (Array) deixa de ser utilizado por completo. Não usar em nenhuma lógica nova. Não precisa ser removido do schema por questão de retrocompatibilidade de dados antigos, mas nenhuma leitura/escrita nova deve referenciá-lo. Adicionar comentário no schema indicando `// DEPRECATED: não utilizado a partir da feature de Finanças por ciclo. Ver CicloFinanceiro.`

#### 3.1.1 Regras de validação do formulário de Aluno (frontend `view-alunos.js` + backend `alunoController.js`)
- Se `fechamentoMesCheio === false` e `diaVencimento === 1` → **erro de validação**, bloquear submit com mensagem: `"Para vencimento no dia 1 ou mês completo, ative a opção 'Fechar por mês cheio' acima."`
- Se `fechamentoMesCheio === true` → o campo `diaVencimento` deve ser ocultado/desabilitado no formulário (não é usado no cálculo).
- Se `metodoCobranca === 'valor_fixo'` → o campo `preco` deve ser ocultado/desabilitado no formulário (mas o valor salvo anteriormente não deve ser apagado do banco, apenas não editável enquanto o método estiver como fixo). O campo `valorFixoCiclo` passa a ser obrigatório.
- Se `metodoCobranca === 'por_aula'` (default) → o campo `valorFixoCiclo` deve ser ocultado/desabilitado, e `preco` volta a ser obrigatório.
- Alunos com `objetivo === 'Consultoria Online'`: os campos desta seção (`diaVencimento`, `fechamentoMesCheio`, `metodoCobranca`, `valorFixoCiclo`) devem ficar ocultos/desabilitados no formulário, pois esses alunos não entram na tela de Finanças (ver seção 4.4).
- **Migração de alunos já existentes**: alunos cadastrados antes desta feature (sem `diaVencimento` preenchido e `objetivo !== 'Consultoria Online'`) devem ser tratados como "configuração pendente". Ao tentar acessar a tela de Finanças, ou ao editar o cadastro desse aluno, o sistema deve forçar o preenchimento do `diaVencimento` (ou ativação de `fechamentoMesCheio`) antes de permitir salvar/visualizar dados financeiros dele. Ver seção 4.5.

### 3.2 Nova Collection `CicloFinanceiro` (novo model: `backend/src/models/CicloFinanceiro.js`)

```js
const CicloFinanceiroSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  alunoId: { type: String, required: true, index: true },
  cicloInicio: { type: String, required: true }, // formato ISO YYYY-MM-DD
  cicloFim: { type: String, required: true },    // formato ISO YYYY-MM-DD

  aulasContadas: { type: Number, default: 0 },     // calculado a partir da agenda (aula + reposição)
  aulasManuaisExtras: { type: Number, default: 0 }, // ajuste manual (ver seção 5.5)
  observacaoAjuste: { type: String, default: '' },  // texto livre, referente SOMENTE a este ciclo

  metodoCobranca: { type: String, enum: ['por_aula', 'valor_fixo'], required: true }, // snapshot do método no momento da criação do ciclo
  precoAulaSnapshot: { type: Number, default: null },     // snapshot do preço por aula no momento da criação (se metodoCobranca === 'por_aula')
  valorFixoSnapshot: { type: Number, default: null },     // snapshot do valor fixo no momento da criação (se metodoCobranca === 'valor_fixo')
  valorTotalCiclo: { type: Number, required: true },      // valor final calculado (ver seção 5.4)

  status: { type: String, enum: ['em_aberto', 'pago', 'atrasado'], default: 'em_aberto' }, // recalculado dinamicamente, ver 5.6
  dataPagamento: { type: String, default: null }, // ISO YYYY-MM-DD, preenchido quando marcado como pago
  formaPagamento: { type: String, default: null }, // texto livre opcional (ex: "Pix", "Permuta")

  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now }
}, { strict: false });

CicloFinanceiroSchema.index({ ownerEmail: 1, alunoId: 1, cicloInicio: 1 }, { unique: true });
```

**Justificativa dos campos "snapshot"**: preço/valor fixo do aluno podem mudar ao longo do tempo (reajuste de valor). Um ciclo já fechado/pago não deve ser recalculado retroativamente se a Prof mudar o preço do aluno depois. Por isso, `precoAulaSnapshot`/`valorFixoSnapshot`/`valorTotalCiclo` são congelados no momento da criação do documento do ciclo.

---

## 4. Tela "Finanças" — Especificação Funcional

### 4.1 Estrutura geral
Lista de cards, um por aluno elegível (ver seção 4.4), ordenados por status (sugestão: atrasado → em aberto → pago), cada card mostrando o **ciclo vigente** daquele aluno. Cada card é expansível para mostrar o histórico de ciclos anteriores (somente leitura).

### 4.2 Mockup de referência (guia de UX, não é especificação pixel-perfect de layout/CSS)

```
┌─────────────────────────────────────────┐
│  💰 Finanças                             │
│  ┌─────────────────────────────────┐    │
│  │ [Todos ▾]   [Em aberto|Atrasado] │    │ ← filtro por status
│  └─────────────────────────────────┘    │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ João Silva              🟡 Aberto│    │
│  │ Ciclo atual: 18/07 → 17/08        │    │
│  │ 6 aulas registradas                │    │
│  │ + 5 aulas extras (ajuste manual)   │    │
│  │ = 11 aulas × R$ 80 = R$ 880        │    │
│  │                                     │    │
│  │ [Marcar como pago] [Editar ajuste] │    │
│  │ [▾ Ver ciclos anteriores]          │    │
│  └─────────────────────────────────┘    │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ Maria Souza (permuta)   🟢 Pago  │    │
│  │ Ciclo atual: 05/08 → 04/09         │    │
│  │ Valor fixo do ciclo: R$ 1.000       │    │
│  │ (8 aulas registradas — informativo) │    │
│  │                                     │    │
│  │ Pago em 05/08 • "Serviços jurídicos"│   │
│  │ [▾ Ver ciclos anteriores]           │    │
│  └─────────────────────────────────┘    │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ Ana Paula               🔴 Atrasado│  │
│  │ Ciclo atual: 10/07 → 09/08 (venceu) │  │
│  │ 4 aulas × R$ 100 = R$ 400            │    │
│  │ [Marcar como pago] [Editar ajuste]  │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Expansão de "Ver ciclos anteriores":
```
   Ciclos anteriores — João Silva
   ┌─────────────────────────────────┐
   │ 18/06 → 17/07   🟢 Pago R$ 480   │
   │ 6 aulas × R$ 80                  │
   ├─────────────────────────────────┤
   │ 18/05 → 17/06   🟢 Pago R$ 400   │
   │ 5 aulas × R$ 80                  │
   └─────────────────────────────────┘
```

Modal de "Editar ajuste" (aberto ao clicar no botão do card):
```
┌───────────────────────────────┐
│ Ajuste manual — ciclo atual   │
│                                │
│ Aulas extras: [ 5 ]             │
│ Observação:                     │
│ [ 5 aulas dadas antes de       ]│
│ [ cadastrar no app             ]│
│                                │
│        [Cancelar]  [Salvar]     │
└───────────────────────────────┘
```

**Uso deste mockup pelo agente**: usar como guia de organização de informação e hierarquia visual (o que mostrar, em que ordem, quais ações por card). Não é obrigatório reproduzir literalmente cores/ícones/bordas — deve seguir o design system (CSS) já existente no projeto (`assets/css/style.css`) e os padrões visuais de card já usados em outras telas (ex.: `agenda-card-template.js`, cards de `view-alunos.js`).

### 4.3 Criação "sob demanda" (lazy) do documento de ciclo — requisito de UX explícito

O documento do `CicloFinanceiro` do ciclo vigente de um aluno **não existe previamente**: ele é criado no momento em que a tela de Finanças é carregada/consultada pela primeira vez para aquele ciclo (ver regra de cálculo em 5.1). Isso é uma decisão de arquitetura para evitar jobs/cron em background.

**Requisito de experiência (obrigatório)**: essa criação sob demanda deve ser **transparente e perceptível ao usuário**, para não parecer um bug ou comportamento inesperado. Especificação de UX mínima:
- Ao entrar na aba Finanças, se algum aluno ainda não possui documento de ciclo para o período vigente, exibir um estado de carregamento breve no card daquele aluno (ex.: skeleton loading ou spinner local no card, não um loading de tela inteira) enquanto o backend calcula e persiste o novo ciclo.
- Não é necessário (e não deve ser feito) exibir mensagens técnicas como "criando ciclo no banco" — o usuário só percebe o card "populando" com os dados calculados.
- Uma vez criado, recarregar a tela não deve gerar duplicidade (o índice único `{ ownerEmail, alunoId, cicloInicio }` do schema garante isso a nível de banco — o backend deve tratar erro de duplicidade como "já existe, apenas retornar o existente", nunca lançar erro para o usuário final).

### 4.4 Alunos elegíveis para aparecer na tela de Finanças
- **Incluir**: alunos com `status === 'ativo'` e `objetivo !== 'Consultoria Online'`.
- **Excluir**: alunos `inativo` e alunos `Consultoria Online`.
- **Excluir** (com aviso, ver 4.5): alunos ativos elegíveis mas sem `diaVencimento` configurado e `fechamentoMesCheio === false`.

### 4.5 Aluno sem configuração de vencimento
Se um aluno elegível (ativo, não Consultoria Online) não tiver `diaVencimento` preenchido nem `fechamentoMesCheio` ativado, ele deve aparecer na tela de Finanças em um estado especial de card, sem cálculo, com uma call-to-action:
```
┌─────────────────────────────────┐
│ Carlos Mendes       ⚠️ Pendente │
│ Configure o dia de vencimento    │
│ para calcular a cobrança.        │
│ [Configurar agora]               │
└─────────────────────────────────┘
```
O botão "Configurar agora" deve abrir o formulário de edição do aluno diretamente na seção de configuração financeira (campos da seção 3.1).

---

## 5. Regras de Cálculo (Lógica de Negócio)

### 5.1 Determinação do ciclo vigente de um aluno
Dado a data de hoje (`hoje`) e os campos do aluno (`diaVencimento`, `fechamentoMesCheio`, `criadoEm`):

```
FUNÇÃO calcularCicloVigente(aluno, hoje):
  SE aluno.fechamentoMesCheio === true:
    cicloInicio = primeiro dia do mês de `hoje`
    cicloFim = último dia do mês de `hoje`
  SENÃO:
    // diaVencimento nunca é 1 nesta branch (garantido pela validação 3.1.1)
    vencimentoEsteMes = ajustarDiaParaMesValido(hoje.mes, hoje.ano, aluno.diaVencimento)
    SE hoje <= vencimentoEsteMes:
      cicloFim = vencimentoEsteMes
      cicloInicio = diaSeguinte(ajustarDiaParaMesValido(mesAnterior, anoAnterior, aluno.diaVencimento))
    SENÃO:
      cicloFim = ajustarDiaParaMesValido(mesSeguinte, anoSeguinte, aluno.diaVencimento)
      cicloInicio = diaSeguinte(vencimentoEsteMes)

  // Regra do primeiro ciclo (aluno novo, ver seção 5.7):
  SE cicloInicio < aluno.criadoEm (data de cadastro):
    cicloInicio = aluno.criadoEm

  RETORNA { cicloInicio, cicloFim }
```

### 5.2 Ajuste de dia inválido no mês (`ajustarDiaParaMesValido`)
Se `diaVencimento` for maior que o último dia do mês em questão (ex.: 31 em fevereiro, ou 30/31 em fevereiro), usar o **último dia daquele mês** como vencimento.

### 5.3 Aulas válidas dentro do ciclo (`aulasContadas`)
- Contar todas as ocorrências de compromissos do aluno com `tipo === 'aula'` OU `tipo === 'reposição'` cuja data (já resolvida a partir da recorrência, usando as funções existentes `checarCompromissoNaData`/`resolverCompromissoRecorrenteNaData` de `assets/js/calendario-engine.js`, ou lógica equivalente replicada no backend) caia dentro do intervalo `[cicloInicio, cicloFim]` (inclusive nas duas pontas).
- **Não contar**: `bloqueio`, `deslocamento`.
- **Não considerar status de falta/cancelamento** nesta versão — mesmo que o compromisso tenha sido cancelado via ação de "Cancelar" no app (que hoje apenas deleta o registro), não há necessidade de tratamento especial: se o registro foi deletado, ele simplesmente não existe mais para ser contado. Isso é aceitável para esta versão (ver seção "Fora de Escopo").

### 5.4 Valor total do ciclo (`valorTotalCiclo`)
```
SE aluno.metodoCobranca === 'valor_fixo':
  valorTotalCiclo = aluno.valorFixoCiclo
  (aulasContadas e aulasManuaisExtras continuam sendo calculadas e exibidas, mas são apenas informativas — não entram na conta)
SENÃO (metodoCobranca === 'por_aula'):
  totalAulas = aulasContadas + aulasManuaisExtras
  valorTotalCiclo = totalAulas * aluno.preco
```

### 5.5 Ajuste manual (`aulasManuaisExtras` + `observacaoAjuste`)
- Editável pela Prof através do modal "Editar ajuste" (ver mockup 4.2), **por ciclo individual**.
- Esses valores pertencem exclusivamente ao documento daquele ciclo específico — **não** se repetem, copiam ou herdam automaticamente para o próximo ciclo. Cada novo ciclo nasce com `aulasManuaisExtras = 0` e `observacaoAjuste = ''`.
- Uso principal: (a) contabilizar aulas dadas fora do app antes da migração/cadastro do aluno, (b) qualquer aula combinada informalmente que não foi lançada na agenda.

### 5.6 Cálculo do `status` (recalculado dinamicamente a cada leitura, não fixo em banco)
```
SE existe dataPagamento preenchida:
  status = 'pago'
SENÃO SE hoje > cicloFim:
  status = 'atrasado'
SENÃO:
  status = 'em_aberto'
```
Observação: `status` pode ser persistido no documento por conveniência de leitura, mas deve ser **recalculado e sobrescrito a cada acesso** à tela de Finanças (exceto quando já 'pago', que é definitivo até ação manual de estorno, se essa ação existir — ver Fora de Escopo).

### 5.7 Primeiro ciclo de um aluno novo
Usar o campo `criadoEm` do `Aluno` (já existente no schema) como piso mínimo de `cicloInicio` do primeiro ciclo, mesmo que a regra do vencimento apontasse para uma data anterior. Não fazer nenhum cálculo proporcional de valor — o valor do primeiro ciclo é calculado normalmente com base nas aulas reais que caíram dentro dessa janela menor (ou ajuste manual, se a Prof quiser lançar aulas anteriores ao cadastro, via seção 5.5).

---

## 6. Ações da Tela de Finanças (Backend/API)

Novas rotas sugeridas (seguir padrão de `backend/src/routes/` e `backend/src/controllers/` já existente no projeto, com `requireAuth` e isolamento por `ownerEmail` via `getOwnerEmailOrThrow`, igual aos controllers existentes):

- `GET /api/financas` → retorna, para cada aluno elegível (seção 4.4) do `ownerEmail` autenticado, o ciclo vigente (criando sob demanda se não existir, ver 4.3) + indicador de "configuração pendente" (seção 4.5).
- `GET /api/financas/:alunoId/historico` → retorna todos os documentos `CicloFinanceiro` daquele aluno, ordenados por `cicloInicio` decrescente (para o "Ver ciclos anteriores").
- `PATCH /api/financas/:cicloId/pagamento` → marca um ciclo como pago (`dataPagamento`, `formaPagamento` opcional).
- `PATCH /api/financas/:cicloId/ajuste` → atualiza `aulasManuaisExtras` e `observacaoAjuste` de um ciclo específico, recalculando `valorTotalCiclo` conforme seção 5.4.

---

## 7. Decisões e Casos de Borda (Resolvidos — não reabrir sem confirmação)

| # | Caso | Decisão |
|---|------|---------|
| 1 | Cobrança é por pacote mensal fixo "de verdade"? | Não. Cobrança é sempre por aula, exceto quando `metodoCobranca === 'valor_fixo'` (caso de permuta/acordo especial). |
| 2 | Alunos "Consultoria Online" entram no cálculo financeiro? | Não. Existem só para registro/gestão e eventual aula presencial avulsa. |
| 3 | Visão "Mês" do calendário será mantida? | Não, removida. Substituída pela aba Finanças. |
| 4 | Home: qual sub-aba abre por padrão? | "Semana" (obrigatoriamente a primeira/padrão). "Dia" vem depois. |
| 5 | Vencimento em "dia útil" ou "semana do mês"? | Fora de escopo nesta versão (ver seção 8). |
| 6 | Como tratar vencimento no dia 1 / mês cheio? | Flag `fechamentoMesCheio`. Não permitir `diaVencimento === 1` quando a flag estiver desativada. |
| 7 | Falta/cancelamento de aula entra no cálculo? | Não nesta versão — conta-se apenas o que existe como `aula`/`reposição` na agenda no momento do cálculo. |
| 8 | Onde persistir o pagamento? | Nova collection `CicloFinanceiro`, vinculada por `alunoId`. Campo antigo `historicoPagamentos` em `Aluno` é aposentado/não utilizado. |
| 9 | Alunos antigos sem `diaVencimento`? | Ficam com card de "configuração pendente" até a Prof preencher; KPI antigo é removido, não mantido em paralelo. |
| 10 | Aulas dadas antes de cadastrar o aluno no app? | Campo de ajuste manual (`aulasManuaisExtras` + `observacaoAjuste`) por ciclo, preenchido manualmente pela Prof. |
| 11 | Ajuste manual se repete nos próximos ciclos? | Não. É exclusivo do documento daquele ciclo. Cada novo ciclo nasce zerado. |
| 12 | Quando o documento do ciclo é criado? | Sob demanda (lazy), ao acessar a tela de Finanças — não via job/cron agendado. Deve ser perceptível ao usuário via loading local no card (seção 4.3), nunca como comportamento silencioso/confuso. |
| 13 | Valor fixo esconde a contagem de aulas? | Não. A contagem de aulas continua visível como informação de referência, mesmo quando não usada no cálculo do valor. |

---

## 8. Fora de Escopo (não implementar nesta feature; não inferir solução)

- Vencimento por "dia útil" ou "semana do mês" (ex.: "5º dia útil", "fim da 2ª semana"). Requer tabela de feriados e regras de calendário adicionais não definidas.
- Cobrança automatizada (Pix, boleto, gateway de pagamento). Esta feature é só registro manual de pagamento feito pela Prof.
- Diferenciação entre "aula cancelada mas cobrável" vs. "aula cancelada sem cobrança" — depende de um sistema futuro de status de presença/confirmação de aula (ainda não implementado no app; hoje "Cancelar" apenas deleta o registro).
- Notificações/lembretes automáticos de vencimento.
- Estorno ou reabertura de um ciclo já marcado como pago (se necessário no futuro, deve ser especificado à parte).
- Edição retroativa de ciclos antigos além do ajuste manual do ciclo vigente (histórico de ciclos passados é somente leitura nesta versão).
- Qualquer alteração ao motor de recorrência, detecção de conflitos, sincronização com Google Calendar ou cascata de sincronização de aluno — esses sistemas permanecem intocados por esta feature.

---

## 9. Resumo de Arquivos Impactados (mapa para o agente)

**Backend (novo/alterado)**
- `backend/src/models/Aluno.js` — adicionar campos da seção 3.1, comentar `historicoPagamentos` como deprecated.
- `backend/src/models/CicloFinanceiro.js` — novo model (seção 3.2).
- `backend/src/controllers/financasController.js` — novo controller (seção 6).
- `backend/src/routes/financasRoutes.js` — novas rotas (seção 6).
- `backend/src/services/financasService.js` — novo service com a lógica de cálculo de ciclo (seção 5), reaproveitando/replicando a lógica de resolução de recorrência hoje no frontend (`calendario-engine.js`) para uso no backend, se o cálculo de aulas contadas for feito server-side (recomendado, para consistência).
- `backend/src/services/kpiService.js` — remover (substituído).
- `backend/src/controllers/alunoController.js` — ajustar validações de criação/atualização para os novos campos e regra 3.1.1.

**Frontend (novo/alterado)**
- Nova view: `assets/js/view-financas.js` (substitui a responsabilidade financeira de `view-calendario.js`).
- `assets/js/view-calendario.js` — remover renderização de grid mensal e dashboard de KPI antigo; avaliar se o arquivo continua existindo para outra finalidade ou é removido.
- `assets/js/view-home.js` — adicionar sub-abas "Semana"/"Dia", com "Semana" como padrão.
- `assets/js/view-alunos.js` — adicionar campos/validações do formulário (seção 3.1.1).
- `assets/js/app/router.js` — atualizar rotas de navegação (Home com sub-abas, remover Calendário, adicionar Finanças).
- `assets/js/utils-kpi.js` — remover funções de cálculo antigo (`calcularKPIsAluno`, `calcularKPIsTodosAlunos`), manter apenas utilidades genéricas (toast, exportação) se ainda usadas.
- `index.html` — atualizar estrutura de abas/navegação e incluir novos scripts na ordem correta (seguir convenção documentada no `README.md` do projeto).
