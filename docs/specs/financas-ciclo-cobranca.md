# Especificação Técnica — Feature "Finanças" (Ciclo de Cobrança por Aluno)

> **Status**: Em produção · **Versão**: 5 · **Atualizado**: 2026-08-20
> **Defeitos em aberto**: 1 (ver seção 12.3)
>
> Projeto: Agenda Personal Trainer (Prô Josy) — frontend JS vanilla + backend Node/Express/MongoDB.
> Este documento é a **fonte de verdade** das decisões de produto desta feature. Não infira regras de negócio além do que está descrito aqui — onde houver dúvida, ela está explicitamente resolvida na seção 7 ("Decisões e Casos de Borda"). Qualquer regra não coberta aqui deve ser tratada como "Fora de Escopo" (seção 8) e não implementada sem confirmação humana.
>
> Backlog e débitos técnicos relacionados: [`../roadmap.md`](../roadmap.md).

---

## 1. Contexto e Objetivo

O app calculava faturamento com uma aproximação genérica por mês calendário (`frequência semanal × 4 × valor`), sem relação com datas reais de vencimento de cada aluno. Isso não refletia a realidade de um Personal Trainer (PT) autônomo, que frequentemente cobra em ciclos móveis (ex.: todo dia 17 de cada mês), e não em mês civil fechado.

**Objetivo da feature**: substituir totalmente o modelo de KPI financeiro antigo por um modelo de **ciclo de cobrança configurável por aluno**, com:

- Cálculo de quantas aulas válidas ocorreram dentro da janela de datas do ciclo vigente do aluno.
- Cálculo do valor a cobrar nesse ciclo (por aula ou valor fixo, conforme configuração do aluno).
- Registro persistente de pagamento por ciclo, com status automático (pago/atrasado/em aberto).
- Uma aba de navegação "Finanças" dedicada a essa visão, substituindo a aba "Calendário".

A feature **removeu** o dashboard de KPI antigo (baseado em mês calendário) e a visão de calendário mensal. Nenhuma lógica de agendamento, recorrência ou conflito de horário foi alterada — a agenda continua funcionando como antes.

**Exceção explícita à remoção do KPI antigo**: o indicador de consistência de agenda (`calcularAulasFaltamAgendar`) é preservado e realocado — ver seção 10. Ele não é um cálculo financeiro; é um alerta operacional sobre a agenda estar coerente com o contrato do aluno.

---

## 2. Mudanças de Navegação

### 2.1 Aba "Home"

- Duas sub-abas internas, nesta ordem fixa: **"Semana" (primeira/padrão ao abrir) → "Dia"**.
- "Semana" é a visão principal e deve abrir por padrão sempre que o usuário navegar para "Home". Requisito explícito do usuário final (PT) — não alterar.
- "Dia" mantém o comportamento da agenda diária.
- Nenhuma lógica de agendamento, recorrência ou conflito muda — é reorganização de navegação/UI.

### 2.2 Visão "Mês" do calendário

- **Removida por completo** (grid mensal). Motivo de produto: baixo valor em mobile-first, substituída pela aba "Finanças".
- "Removida por completo" significa: remover o markup (`<main id="tela-calendario">`, botão `tabCalendarioMensal`, container `containerCalendarioMensal`), remover a entrada de rota correspondente e remover/reduzir o arquivo de view. **Não basta retirar o link do menu** — a tela não deve existir como código morto acessível.
- Funções exclusivas do grid mensal podem ser removidas. **Funções de resolução de recorrência/data** (`parseDataFlex`, `resolverCompromissoRecorrenteNaData`, `checarCompromissoNaData`) **devem ser mantidas** — são a base do cálculo de aulas por ciclo (seção 2.4). Atenção: `getDiasNoMes` é consumida pelo backend (`ajustarDiaParaMesValido`) e **não** pode ser removida do módulo compartilhado.
- **Efeito colateral tratado na implementação**: o botão de configuração da grade (`#btnConfigAgenda`) vivia dentro do markup removido, mas era acionado pela sub-aba "Dia" da Home. A abertura do modal foi extraída para `window.abrirModalConfigAgenda()` em `view-home.js`.

### 2.3 Aba "Calendário" → Aba "Finanças"

- A aba antes chamada "Calendário" é substituída pela aba **"Finanças"**.
- O dashboard de KPI antigo (`utils-kpi.js`: `calcularKPIsAluno`, `calcularKPIsTodosAlunos`; `kpiService.js`: `calcularProjecaoMensalCompleta`, `calcularProjecaoRealizadaAteHoje`, `calcularProjecaoAproximada`, `contarReposicoesPorAluno`) **foi removido e substituído** pela lógica de ciclo (seção 5). Não deixar os dois sistemas convivendo — decisão explícita de produto: substituir, não somar. A única função preservada é `calcularAulasFaltamAgendar` (seção 10).

### 2.4 Módulo isomórfico de recorrência (requisito obrigatório)

O cálculo de "aulas válidas dentro do ciclo" (5.3) depende da mesma lógica de recorrência usada para renderizar a agenda no frontend. Essa lógica também precisa rodar no backend para o cálculo financeiro server-side.

**Decisão obrigatória**: não implementar duas versões dessa lógica. Duplicá-la cria risco de divergência silenciosa entre "o que a agenda mostra" e "o que o financeiro cobra" — inaceitável para cálculo de dinheiro.

**Solução exigida**: um **módulo JS isomórfico** (sem dependência de `window`, DOM ou API exclusiva de browser), importável tanto pelo frontend quanto pelo backend. Ambos consomem a mesma implementação, não cópias.

**Contexto de deploy (relevante para a dívida técnica 12.1)**: existem **dois projetos Vercel distintos** — o da API com _Root Directory_ = `backend/`, e o do app apontando para a raiz do repositório. Hoje o módulo vive em `assets/js/shared/` e o backend o alcança via `require` relativo que atravessa para fora da pasta `backend/`. Funciona porque o repositório é clonado inteiro e o tracing do `@vercel/node` resolve o caminho, mas isso depende de configuração de projeto que não está versionada.

### 2.5 Estrutura final de navegação

```
[Home]  → sub-abas: [Semana (padrão)] [Dia]
[Finanças]  (substitui "Calendário")
[Alunos]
```

---

## 3. Modelo de Dados

### 3.1 Campos financeiros no schema `Aluno`

```js
diaVencimento: { type: Number, min: 2, max: 31, default: null },
// Dia do mês do vencimento. NUNCA pode ser 1 (regra 3.1.1).
// Se o dia não existir no mês (ex: 31 em fevereiro), usar o último dia do mês (5.2).

fechamentoMesCheio: { type: Boolean, default: false },
// Se true: ignora `diaVencimento` e usa o mês civil cheio (dia 1 ao último dia).

metodoCobranca: { type: String, enum: ['por_aula', 'valor_fixo'], default: 'por_aula' },

valorFixoCiclo: { type: Number, default: null }
// Usado somente quando metodoCobranca === 'valor_fixo'.
```

**Campo aposentado**: `historicoPagamentos` não é mais utilizado. Mantido no schema apenas por retrocompatibilidade, marcado como `// DEPRECATED`.

**Campo de contrato (`frequenciaSemanal` / `aulasSemanais`)**: `frequenciaSemanal` é o campo efetivamente gravado pelo formulário; `aulasSemanais` é o nome legado presente em dados antigos. Ambos declarados no schema, com leitura priorizando `frequenciaSemanal` e caindo em `aulasSemanais` como fallback. Alimenta o indicador de consistência de agenda (seção 10). **Não remover.**

#### 3.1.1 Regras de validação do formulário de Aluno (frontend + backend)

- `fechamentoMesCheio === false` e `diaVencimento === 1` → erro: `"Para vencimento no dia 1 ou mês completo, ative a opção 'Fechar por mês cheio' acima."`
- `fechamentoMesCheio === true` → `diaVencimento` oculto/desabilitado.
- `metodoCobranca === 'valor_fixo'` → `preco` (Valor Hora/Aula) **oculto/desabilitado e não obrigatório**; `valorFixoCiclo` obrigatório.
- `metodoCobranca === 'por_aula'` → `valorFixoCiclo` oculto/desabilitado; `preco` obrigatório **e validado no frontend como número finito maior que zero**, com a mesma mensagem do backend (`"Informe o valor hora/aula para salvar este aluno."`). O frontend não pode permitir submit que o backend rejeitaria.
- `objetivo === 'Consultoria Online'` → todo o bloco financeiro desabilitado (3.1.2).
- **Alunos legados**: sem `diaVencimento` e sem `fechamentoMesCheio`, com `objetivo !== 'Consultoria Online'` → "configuração pendente" (4.5).

#### 3.1.2 Card "Cobrança por ciclo" no formulário

O campo **"Valor Hora/Aula (R$)"** fica **dentro do card "Cobrança por ciclo"**, não solto na área geral do formulário. Motivo: fora do bloco financeiro ele não acompanhava a desabilitação do restante, gerando um campo editável que não participava do cálculo (inconsistência observada em produção).

Composição do card, nesta ordem:

1. Toggle **"Fecha por mês cheio"**
2. Campo **"Dia de vencimento"** (visível apenas com o toggle desligado)
3. Select **"Método de cobrança"** (Por aula / Valor fixo)
4. Campo **"Valor Hora/Aula (R$)"** — visível e obrigatório apenas quando método = `por_aula`
5. Campo **"Valor fixo do ciclo (R$)"** — visível e obrigatório apenas quando método = `valor_fixo`

Regras de estado:

- `objetivo === 'Consultoria Online'` → **o card inteiro** assume aparência desabilitada (mesmo tratamento visual de "Local de Treino"/"Aulas por Semana") e todos os campos internos ficam `disabled` e não obrigatórios.
- `objetivo === 'Personal Trainer'` → card ativo, com as regras de visibilidade de 3.1.1.
- O campo **"Aulas / Semana"** permanece **fora** do card — é dado de contrato, não financeiro (seção 10).

### 3.2 Collection `CicloFinanceiro`

```js
const CicloFinanceiroSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, index: true },
    alunoId: { type: String, required: true, index: true },
    cicloInicio: { type: String, required: true }, // ISO YYYY-MM-DD
    cicloFim: { type: String, required: true }, // ISO YYYY-MM-DD

    aulasContadas: { type: Number, default: 0 }, // derivado da agenda (5.3, 5.8)
    aulasManuaisExtras: { type: Number, default: 0 }, // pode ser negativo (5.5)
    observacaoAjuste: { type: String, default: "" },

    metodoCobranca: {
      type: String,
      enum: ["por_aula", "valor_fixo"],
      required: true,
    }, // snapshot
    precoAulaSnapshot: { type: Number, default: null }, // snapshot — fonte do recálculo (5.9)
    valorFixoSnapshot: { type: Number, default: null }, // snapshot — fonte do recálculo (5.9)
    valorTotalCiclo: { type: Number, required: true },

    status: {
      type: String,
      enum: ["em_aberto", "pago", "atrasado"],
      default: "em_aberto",
    },
    dataPagamento: { type: String, default: null },
    formaPagamento: { type: String, default: null },

    criadoEm: { type: Date, default: Date.now },
    atualizadoEm: { type: Date, default: Date.now },
  },
  { strict: false },
);

CicloFinanceiroSchema.index(
  { ownerEmail: 1, alunoId: 1, cicloInicio: 1 },
  { unique: true },
);
```

**Função dos snapshots**: preço e valor fixo do aluno mudam ao longo do tempo (reajuste). Um ciclo já criado não deve ser reprecificado retroativamente. Os campos `metodoCobranca`, `precoAulaSnapshot` e `valorFixoSnapshot` são congelados na criação e são a **única** fonte de preço em qualquer recálculo posterior (ver 5.9).

---

## 4. Tela "Finanças" — Especificação Funcional

### 4.1 Estrutura geral

Lista de cards, um por aluno elegível (4.4), ordenados por status (atrasado → em aberto → pago → pendente de configuração), cada card mostrando o **ciclo vigente**. Cada card é expansível para exibir o histórico de ciclos anteriores (somente leitura, carregado sob demanda — ver 6.2).

### 4.2 Mockup de referência (guia de UX, não pixel-perfect)

```
┌─────────────────────────────────────────┐
│  💰 Finanças                             │
│  [Todos] [Atrasado] [Em aberto] [Pago]  │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ João Silva              🟡 Aberto│    │
│  │ Ciclo atual: 18/07 → 17/08        │    │
│  │ 11 aula(s) cobrada(s)              │    │
│  │ 6 registradas • +5 de ajuste       │    │
│  │ Valor: R$ 880                      │    │
│  │ [Marcar como pago] [Editar ajuste] │    │
│  │ [▸ Ver ciclos anteriores]          │    │
│  └─────────────────────────────────┘    │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ Maria Souza (permuta)   🟢 Pago  │    │
│  │ Ciclo atual: 05/08 → 04/09         │    │
│  │ Valor fixo do ciclo: R$ 1.000       │    │
│  │ (8 aulas registradas — informativo) │    │
│  │ Pago em 05/08 • "Serviços jurídicos"│   │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Exemplo de ajuste negativo (aula experimental / cortesia):

```
   │ Pedro Lima              🟡 Aberto│
   │ Ciclo atual: 10/08 → 09/09        │
   │ 0 aula(s) cobrada(s)               │
   │ 1 registrada • −1 de ajuste        │
   │ Valor: R$ 0,00                      │
```

Estado de carregamento do histórico (ver 6.2.2):

```
   │ [▾ Ver ciclos anteriores]          │
   │    Carregando ciclos anteriores... │
```

### 4.3 Criação "sob demanda" (lazy) do documento de ciclo

O documento do ciclo vigente é criado quando a tela é consultada pela primeira vez para aquele período — não via job/cron.

- Exibir loading local no card (skeleton por card, não tela inteira) enquanto o backend calcula e persiste.
- Não exibir mensagens técnicas ("criando ciclo no banco").
- Duplicidade (erro `11000` do índice único) é tratada como "já existe, retornar o existente", nunca erro para o usuário.

### 4.4 Alunos elegíveis

- **Incluir**: `status === 'ativo'` e `objetivo !== 'Consultoria Online'`.
- **Excluir**: alunos inativos e Consultoria Online.
- **Estado especial**: ativos e elegíveis, mas sem configuração de vencimento → card "pendente" (4.5).

### 4.5 Aluno sem configuração de vencimento

```
┌─────────────────────────────────┐
│ Carlos Mendes       ⚠️ Pendente │
│ Configure o dia de vencimento    │
│ para calcular a cobrança.        │
│ [Configurar agora]               │
└─────────────────────────────────┘
```

O botão abre o formulário do aluno diretamente no card "Cobrança por ciclo".

### 4.6 Cache local (resiliência a cold start) — leitura sim, escrita não

A tela mantém cache local (localStorage) do último estado conhecido do **ciclo vigente** de cada aluno, seguindo o padrão de `assets/js/storage.js`. Objetivo exclusivo: **resiliência de leitura contra cold start do backend serverless**. Não é modo offline. Regras em 6.1.

O **histórico de ciclos anteriores não entra nesse cache persistente** — ele é carregado sob demanda e mantido apenas em memória durante a sessão da tela (6.2.2).

### 4.7 A aba "Alunos" também dispara a criação de ciclos (comportamento intencional)

O card do aluno na aba "Alunos" (seção 11) consome o mesmo endpoint de listagem de Finanças, que cria documentos de ciclo sob demanda (4.3). Ou seja, **abrir a aba Alunos pode criar ciclos no banco**.

Isso é **intencional e desejado**, não um efeito colateral a ser corrigido. Justificativa de produto: ao ativar um aluno que estava inativo, ou ao atualizar seu cadastro, o indicador financeiro do card aparece imediatamente, sem exigir que o usuário navegue até Finanças e volte. Validado em produção. O índice único de `CicloFinanceiro` garante que não haja duplicidade.

Consequência a considerar: a aba Alunos paga o mesmo custo de performance do endpoint de Finanças — o que reforça a exigência da seção 6.2 de manter esse endpoint enxuto.

---

## 5. Regras de Cálculo (Lógica de Negócio)

### 5.1 Determinação do ciclo vigente

```
FUNÇÃO calcularCicloVigente(aluno, hoje):
  SE aluno.fechamentoMesCheio === true:
    cicloInicio = primeiro dia do mês de `hoje`
    cicloFim = último dia do mês de `hoje`
  SENÃO:
    vencimentoEsteMes = ajustarDiaParaMesValido(hoje.mes, hoje.ano, aluno.diaVencimento)
    SE hoje <= vencimentoEsteMes:
      cicloFim = vencimentoEsteMes
      cicloInicio = diaSeguinte(ajustarDiaParaMesValido(mesAnterior, anoAnterior, aluno.diaVencimento))
    SENÃO:
      cicloFim = ajustarDiaParaMesValido(mesSeguinte, anoSeguinte, aluno.diaVencimento)
      cicloInicio = diaSeguinte(vencimentoEsteMes)

  SE cicloInicio < aluno.criadoEm:
    cicloInicio = aluno.criadoEm

  RETORNA { cicloInicio, cicloFim }
```

### 5.2 Ajuste de dia inválido no mês

Se `diaVencimento` for maior que o último dia do mês, usar o **último dia daquele mês**.

### 5.3 Aulas válidas dentro do ciclo (`aulasContadas`)

- Contar ocorrências de compromissos do aluno com `tipo === 'aula'` OU `tipo === 'reposicao'` cuja data resolvida (via módulo isomórfico, 2.4) caia em `[cicloInicio, cicloFim]` (inclusive nas pontas).
- **Não contar**: `bloqueio`, `deslocamento`.
- Não há tratamento de falta/presença nesta versão — se o compromisso não existe mais na agenda, não é contado (ver 5.8).

### 5.4 Valor total do ciclo (`valorTotalCiclo`)

```
// Fonte do preço depende do momento (ver 5.9):
//  - criação de um novo ciclo  → valores atuais do cadastro do aluno
//  - recálculo de ciclo existente → SEMPRE os snapshots do próprio ciclo

SE metodoCobranca === 'valor_fixo':
  valorTotalCiclo = valorFixo (do aluno na criação; do snapshot no recálculo)
  (aulasContadas e aulasManuaisExtras seguem calculadas e exibidas, mas são informativas)
SENÃO:
  totalAulas = MAX(0, aulasContadas + aulasManuaisExtras)   // piso zero (5.5)
  valorTotalCiclo = totalAulas * precoAula
```

### 5.5 Ajuste manual (`aulasManuaisExtras` + `observacaoAjuste`)

- Editável no modal "Editar ajuste", **por ciclo individual**.
- Pertence exclusivamente ao documento daquele ciclo — não se repete nem se herda. Cada novo ciclo nasce com `aulasManuaisExtras = 0` e `observacaoAjuste = ''`.
- **Aceita valores negativos**. Casos de uso:
  - **Positivo**: aulas dadas fora do app (antes do cadastro/migração) ou combinadas informalmente e não lançadas na agenda.
  - **Negativo**: desconto acordado, aula cortesia ou aula experimental lançada na agenda (para reservar o horário) que não deve ser cobrada.
- **Piso zero obrigatório**: o total cobrado nunca pode ser negativo. Aplicar `totalAulas = Math.max(0, aulasContadas + aulasManuaisExtras)` **tanto no backend quanto na exibição**. O PT nunca "paga para trabalhar".
- O valor informado é persistido como veio (inclusive negativo); o piso zero se aplica apenas ao **total resultante**, não ao campo.
- A UI deve deixar claro o resultado quando o piso for aplicado (`0 aula(s) cobrada(s)`, `R$ 0,00`), sem exibir número negativo de aulas cobradas.
- Ajuste manual em ciclo **pago** é rejeitado (HTTP 409) — ver 5.8.

### 5.6 Cálculo do `status`

```
SE dataPagamento preenchida: status = 'pago'
SENÃO SE hoje > cicloFim: status = 'atrasado'
SENÃO: status = 'em_aberto'
```

Pode ser persistido por conveniência, mas é recalculado a cada leitura (exceto 'pago', definitivo até estorno — fora de escopo).

### 5.7 Primeiro ciclo de um aluno novo

`criadoEm` do `Aluno` é o piso mínimo de `cicloInicio` no primeiro ciclo. Sem cálculo proporcional de valor — aulas anteriores ao cadastro entram via ajuste manual positivo (5.5), se necessário.

### 5.8 Recontagem de aulas em ciclo ainda não pago

**Problema que originou a regra**: `aulasContadas` era calculado apenas na criação do ciclo e nunca atualizado. Ao excluir (ou adicionar/mover) uma aula dentro da janela do ciclo vigente, o financeiro continuava exibindo o número antigo.

**Regra**:

- **Ciclo sem `dataPagamento` (`em_aberto` ou `atrasado`)** → `aulasContadas` é **recalculado a partir da agenda a cada leitura**, e o `valorTotalCiclo` recalculado conforme 5.4 (com preço do snapshot, ver 5.9), preservando o `aulasManuaisExtras`. Persistir apenas se houver divergência.
- **Ciclo com `dataPagamento` (`pago`)** → `aulasContadas`, `aulasManuaisExtras` e `valorTotalCiclo` ficam **congelados permanentemente**. Nenhuma alteração posterior na agenda os modifica. Tentativa de ajuste manual retorna **HTTP 409**.
- Correção em ciclo pago exige estorno/reabertura — **fora de escopo** (tratamento manual).

**Natureza temporária**: esta regra vale **enquanto não existir status de presença/realização da aula**. Quando essa feature existir (item 1.5 do roadmap), a contagem deve passar a considerar o status da aula (realizada / falta cobrável / cancelada sem cobrança) em vez da simples existência do compromisso.

**Caso "quero excluir da agenda mas ainda cobrar"**: resolvido pelo ajuste manual positivo (5.5). Não criar mecanismo adicional.

### 5.9 Fonte do preço no recálculo: sempre o snapshot

**Problema identificado em revisão**: o recálculo de 5.8 usava o preço **atual** do cadastro do aluno. Consequência: reajustar o preço de um aluno alterava retroativamente o valor de ciclos antigos ainda não pagos — o oposto da intenção dos campos snapshot (3.2).

Exemplo do defeito: ciclo de junho atrasado a R$ 80/aula; em agosto o preço do aluno é reajustado para R$ 100; na leitura seguinte, a dívida de junho passava a R$ 100/aula sozinha.

**Regra definida**:

1. **Criação de um novo ciclo** → usar os valores **atuais** do cadastro do aluno (`preco`, `valorFixoCiclo`, `metodoCobranca`) e congelá-los em `precoAulaSnapshot`, `valorFixoSnapshot` e `metodoCobranca` do ciclo.
2. **Qualquer recálculo de ciclo já existente** (sincronização por leitura ou ajuste manual) → usar **exclusivamente os snapshots do próprio ciclo**, incluindo `metodoCobranca`. Nunca o valor atual do aluno, mesmo que o aluno esteja carregado em memória.
3. **Efeito esperado do reajuste**: um novo preço passa a valer **a partir do próximo ciclo**, que já nascerá com o snapshot atualizado. O ciclo corrente permanece com o preço vigente na sua criação.
4. **Aplicar o novo preço já no ciclo corrente** é uma ação explícita e está **fora de escopo** nesta versão.
5. **Fallback para dados legados**: se o snapshot correspondente estiver ausente (`null`/`0`) em um ciclo já existente, usar o valor atual do aluno como fallback **e gravar esse valor no campo de snapshot**, para que o ciclo passe a ter snapshot válido dali em diante. Aplicar o fallback **apenas** quando o snapshot estiver ausente — nunca sobrescrever snapshot já preenchido. A condição de persistência precisa considerar esse caso: se apenas o snapshot mudou (sem mudança em `aulasContadas`/`valorTotalCiclo`), o documento ainda deve ser salvo.
6. Ciclos **pagos** não são recalculados em nenhuma hipótese (5.8), portanto esta regra não os afeta.

**Efeito único em dados de produção**: na primeira leitura após o deploy desta regra, ciclos antigos **não pagos** sem snapshot foram precificados pelo preço atual do aluno e congelados nesse valor. Se algum reajuste tiver ocorrido entre a criação desses ciclos e o deploy, o valor congelado pode não corresponder ao preço histórico real. Ciclos pagos não foram afetados.

---

## 6. API e Comportamento de Rede

Seguir o padrão existente de `routes`/`controllers`, com `requireAuth` e isolamento por `ownerEmail` via `getOwnerEmailOrThrow`.

- `GET /api/financas` → para cada aluno elegível: **ciclo vigente apenas** (criando sob demanda, 4.3; recalculando se não pago, 5.8/5.9) + indicador de configuração pendente. **Não** retorna histórico (6.2.1).
- `GET /api/financas/:alunoId/historico` → todos os `CicloFinanceiro` do aluno, ordenados por `cicloInicio` desc, com sincronização aplicada aos não pagos. Única fonte do histórico.
- `PATCH /api/financas/:cicloId/pagamento` → marca como pago (`dataPagamento`, `formaPagamento` opcional). A partir daí o ciclo é congelado (5.8).
- `PATCH /api/financas/:cicloId/ajuste` → atualiza `aulasManuaisExtras` (podendo ser negativo) e `observacaoAjuste`, recalculando `valorTotalCiclo` conforme 5.4/5.9 com piso zero. Rejeita com **409** se o ciclo estiver pago.
- `GET /api/alunos/consistencia-agenda` → indicador da seção 10. Declarar a rota **antes** de `/:id` para evitar conflito de rota.

### 6.1 Cache local vs. confirmação de backend (leitura x escrita)

- **Leitura** (`GET`): o resultado da listagem (ciclo vigente) pode e deve ser cacheado em localStorage, no padrão de `assets/js/storage.js`. Exibir o cache imediatamente e atualizar quando a resposta chegar, mitigando cold start.
- **Escrita** (`PATCH` de pagamento e ajuste; criação de ciclo sob demanda): **nunca** considerada concluída na UI apenas com base em gravação local. Aguardar resposta HTTP de sucesso antes de:
  - marcar o card como "pago";
  - atualizar o valor após ajuste manual;
  - remover o estado de "configuração pendente".
    Durante a espera, exibir estado transitório claro (botão "Salvando...", desabilitado) e informar erro/retry em caso de falha. Nunca aplicar a mudança apenas no cache local como definitiva.
- **Motivo**: valor financeiro e status de pagamento não podem divergir entre dispositivos nem entre local e servidor.

### 6.2 Histórico de ciclos sob demanda

#### 6.2.1 Backend — payload enxuto

**Problema identificado em revisão (N+1)**: `listarFinancasDoOwner` fazia, por aluno, uma consulta do histórico completo e rodava a sincronização em cada ciclo histórico não pago — cada sincronização varrendo dia a dia a janela do ciclo para cada agendamento. Com 20 alunos e ~12 ciclos cada, uma única abertura da tela disparava ~21 consultas e centenas de recálculos, para exibir dados que ficam escondidos atrás de "Ver ciclos anteriores". Além disso, o ciclo vigente era sincronizado **duas vezes** por carregamento.

**Regras**:

- `GET /api/financas` retorna **somente o ciclo vigente** por aluno. O array de histórico é removido do payload.
- `historicoDisponivel` permanece como indicador booleano, obtido via `countDocuments` (com `limit: 1`) e excluindo o ciclo vigente do filtro. **Nunca** usar `find()` para essa finalidade.
- O ciclo vigente deve ser sincronizado **uma única vez** por carregamento.
- O histórico é obtido exclusivamente via `GET /api/financas/:alunoId/historico`, sob demanda.
- **Não** implementar paginação do histórico nesta versão (fora de escopo, seção 8).

**Resultado**: de `2 + N × (1 findOne + 1 find + K saves)` para `2 + N × (1 findOne + 1 countDocuments)`.

#### 6.2.2 Frontend — requisitos de UX do carregamento (obrigatórios)

O carregamento sob demanda não pode degradar a experiência. Assumir **rede lenta (4G) como cenário normal**, não excepcional: a espera pode durar vários segundos e, nesse período, a tela precisa continuar totalmente utilizável.

- O bloco "Ver ciclos anteriores" (`<details>`) inicia **sempre fechado** na primeira renderização. Não condicionar o atributo `open` à existência de histórico (esse dado não vem na listagem).
- A **expansão é imediata** ao clique, sem aguardar a resposta da API. O usuário nunca deve clicar e "não acontecer nada".
- Enquanto a requisição está em andamento, exibir **dentro da própria área expandida** uma mensagem clara de carregamento (`"Carregando ciclos anteriores..."`), no mesmo padrão visual dos textos secundários dos cards. Nunca deixar a área vazia sem feedback.
- **A navegação não pode ser bloqueada**: sem overlay de tela inteira, sem desabilitar a barra de navegação, sem impedir troca de aba ou a expansão de outros cards. Vários cards podem carregar o histórico simultaneamente, de forma independente.
- Se o usuário sair da aba (ou fechar o card) antes da resposta chegar, a resposta tardia **não deve causar erro nem escrever no DOM** de um elemento que não está mais presente. Verificar a existência do container antes de renderizar.
- **Guard de resposta tardia**: usar um identificador incremental de requisição por aluno, descartando respostas de chamadas já substituídas por outra mais recente.
- **Cache em memória por sessão**: guardar no `STATE` do `view-financas.js` o histórico já carregado por aluno. Fechar e reabrir o mesmo card na mesma sessão **não** deve refazer a chamada. O cache em memória é descartado ao recarregar a página.
- O histórico **não** é gravado no cache de localStorage (4.6/6.1). O cache persistente cobre apenas o ciclo vigente.
- **Erro na requisição**: exibir a falha **dentro da área expandida**, com botão **"Tentar novamente"** que refaz apenas aquela chamada. Não usar toast global e não apagar o restante do card.
- **Nota de implementação**: o evento `toggle` do `<details>` não borbulha; a delegação precisa ser registrada em fase de captura no elemento raiz da tela (que sobrevive à reescrita do container de cards).

**Defeito conhecido em aberto relacionado a esta seção**: ver 12.3.

---

## 7. Decisões e Casos de Borda (Resolvidos — não reabrir sem confirmação)

| #   | Caso                                                           | Decisão                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Cobrança é por pacote mensal fixo?                             | Não. Sempre por aula, exceto `metodoCobranca === 'valor_fixo'` (permuta/acordo especial).                                                                                                                  |
| 2   | "Consultoria Online" entra no financeiro?                      | Não.                                                                                                                                                                                                       |
| 3   | Visão "Mês" será mantida?                                      | Não. Removida por completo (markup, rota e código), não apenas oculta do menu.                                                                                                                             |
| 4   | Home: qual sub-aba abre por padrão?                            | "Semana".                                                                                                                                                                                                  |
| 5   | Vencimento em "dia útil" / "semana do mês"?                    | Fora de escopo.                                                                                                                                                                                            |
| 6   | Vencimento no dia 1 / mês cheio?                               | Flag `fechamentoMesCheio`. `diaVencimento === 1` proibido com a flag desativada.                                                                                                                           |
| 7   | Falta/cancelamento entra no cálculo?                           | Não nesta versão — conta-se o que existe na agenda no momento da leitura (ver #16).                                                                                                                        |
| 8   | Onde persistir o pagamento?                                    | Collection `CicloFinanceiro`. `historicoPagamentos` aposentado.                                                                                                                                            |
| 9   | Alunos antigos sem `diaVencimento`?                            | Card "configuração pendente". KPI antigo removido, não mantido em paralelo.                                                                                                                                |
| 10  | Aulas dadas antes do cadastro?                                 | Ajuste manual positivo por ciclo.                                                                                                                                                                          |
| 11  | Ajuste manual se repete no próximo ciclo?                      | Não. Cada ciclo nasce zerado.                                                                                                                                                                              |
| 12  | Quando o ciclo é criado?                                       | Sob demanda ao consultar Finanças (ou Alunos, ver #21), com loading local por card.                                                                                                                        |
| 13  | Valor fixo esconde a contagem de aulas?                        | Não. Contagem permanece visível como referência.                                                                                                                                                           |
| 14  | Deve haver cache local?                                        | Sim, apenas leitura/resiliência a cold start, e apenas do ciclo vigente. Escrita sempre confirmada pelo backend (6.1).                                                                                     |
| 15  | Recorrência pode ser reimplementada no backend?                | Não. Módulo isomórfico único (2.4).                                                                                                                                                                        |
| 16  | Excluir aula da agenda remove do financeiro?                   | Sim, **enquanto o ciclo não estiver pago**: recontagem a cada leitura (5.8). Ciclo pago fica congelado. Regra temporária até existir status de presença.                                                   |
| 17  | `aulasManuaisExtras` pode ser negativo?                        | Sim (desconto, cortesia, experimental). Mas o total cobrado nunca fica negativo — piso zero (5.5).                                                                                                         |
| 18  | Onde fica "Valor Hora/Aula"?                                   | Dentro do card "Cobrança por ciclo" (3.1.2). Desabilita junto com o card em Consultoria Online.                                                                                                            |
| 19  | O que o card do aluno mostra no lugar do KPI antigo?           | Resumo do ciclo atual + indicador de consistência de agenda (seções 10 e 11).                                                                                                                              |
| 20  | O KPI "aulas faltam agendar" é removido?                       | Não. É o único preservado, realocado para fora do `kpiService` (seção 10). Não é cálculo financeiro.                                                                                                       |
| 21  | Abrir a aba "Alunos" pode criar ciclos no banco?               | Sim, e isso é **intencional** (4.7): o badge financeiro aparece imediatamente ao ativar/editar um aluno, sem exigir navegação até Finanças. Validado em produção.                                          |
| 22  | Qual preço usar ao recalcular um ciclo existente?              | **Sempre o snapshot do ciclo**, nunca o preço atual do aluno. Reajuste vale a partir do próximo ciclo (5.9).                                                                                               |
| 23  | Criar botão de "forçar recálculo" manual?                      | Não. O recálculo do ciclo vigente é barato e deve continuar automático a cada leitura — é justamente o que corrige a contagem após exclusão de aula (5.8). O custo estava no histórico, resolvido por 6.2. |
| 24  | A listagem de Finanças devolve o histórico?                    | Não. Somente o ciclo vigente. O histórico é carregado sob demanda ao expandir o card (6.2).                                                                                                                |
| 25  | O histórico entra no cache de localStorage?                    | Não. Apenas cache em memória durante a sessão da tela (6.2.2).                                                                                                                                             |
| 26  | A rota de consistência de agenda é um problema de performance? | Não. É **comportamento aceito** (10.1): custo fixo de 2 consultas, não escala por aluno. Não tratar como dívida técnica.                                                                                   |

---

## 8. Fora de Escopo (não implementar; não inferir solução)

- Vencimento por "dia útil" ou "semana do mês".
- Cobrança automatizada (Pix, boleto, gateway). Esta feature é registro manual.
- **Status de presença/realização da aula** (realizada / falta cobrável / cancelada sem cobrança). Quando existir, revisar 5.8.
- Notificações/lembretes automáticos de vencimento.
- Estorno ou reabertura de ciclo já pago.
- Aplicar reajuste de preço retroativamente ao ciclo corrente (5.9, item 4).
- Edição retroativa de ciclos antigos além do ajuste do ciclo vigente (histórico é somente leitura).
- Paginação ou filtro do histórico de ciclos (6.2.1).
- Edição/registro em modo totalmente offline. O cache cobre apenas leitura (6.1).
- **Visão de "aulas a repor" na tela de Alunos** — ver item 1.8 do roadmap. O card do aluno já acomoda a caixinha (seção 11), mas a feature **não** faz parte desta spec. Não reaproveitar `contarReposicoesPorAluno` (removido).
- Botão de recálculo manual (#23).
- Qualquer alteração ao motor de recorrência, detecção de conflitos ou sincronização com Google Calendar, além do previsto em 2.4.

---

## 9. Arquivos Impactados (mapa para o agente)

**Backend**

- `models/Aluno.js` — campos financeiros; `historicoPagamentos` deprecated; `frequenciaSemanal` + `aulasSemanais` (legado).
- `models/CicloFinanceiro.js` — schema 3.2.
- `services/financasService.js` — cálculo de ciclo (seção 5), incluindo 5.5, 5.8, 5.9 (`resolverSnapshotParaRecalculo`) e o payload enxuto de 6.2.1; consome o módulo isomórfico.
- `services/agendaConsistencyService.js` — indicador da seção 10.
- `controllers/financasController.js`, `routes/financasRoutes.js` — seção 6.
- `controllers/alunoController.js`, `routes/alunoRoutes.js` — validações 3.1.1 e rota de consistência (antes de `/:id`).
- `utils/studentValueExtractors.js` — leitura de `frequenciaSemanal` com fallback para `aulasSemanais`.
- `services/kpiService.js` — **removido**.

**Módulo compartilhado**

- `assets/js/shared/recurrence-helpers.js`: `parseDataFlex`, `resolverCompromissoRecorrenteNaData`, `checarCompromissoNaData`, `getDiasNoMes`. Consumido por frontend e backend. Ver dívida técnica 12.1.

**Frontend**

- `view-financas.js` — tela de Finanças, cache de leitura (4.6/6.1), ajuste negativo com piso zero, histórico sob demanda (6.2.2), cache de histórico em memória.
- `view-alunos.js` — card "Cobrança por ciclo" (3.1.2), validação de `preco` (3.1.1), indicadores do card do aluno (seção 11). Consome apenas `cicloAtual` e `configuracaoPendente` da listagem.
- `view-home.js` — sub-abas Semana/Dia; `abrirModalConfigAgenda`.
- `view-calendario.js` — reduzido às funções ainda usadas pela Home.
- `utils-kpi.js` — apenas utilidades genéricas (toast, overlays de sync).
- `router.js`, `index.html` — navegação e limpeza.

---

## 10. Indicador de Consistência de Agenda (preservado do KPI antigo)

**O que é**: `calcularAulasFaltamAgendar` compara quantas aulas **recorrentes semanais** estão lançadas na agenda do aluno (`tipo === 'aula'` e `frequencia === 'semanal'`, somando `diasSemana.length`) contra o número de aulas semanais acordadas em contrato, retornando `Math.max(0, acordado - agendado)`.

**Por que é preservado**: não é cálculo financeiro. É alerta operacional para verificar se a recorrência do aluno foi configurada conforme o contrato — útil independentemente do modelo de cobrança.

**Requisitos**:

1. Reside em módulo próprio (`services/agendaConsistencyService.js`), fora do `kpiService.js` (removido).
2. Exposto via `GET /api/alunos/consistencia-agenda`, declarada **antes** de `/:id`.
3. **Campo de contrato**: ler `frequenciaSemanal` (gravado pelo formulário) com fallback para `aulasSemanais` (legado). Não tratar `0` como ausência de valor — `0` é válido e não deve ser convertido em `1`.
4. Não reaproveitar `contarReposicoesPorAluno` (removido, ver seção 8).

### 10.1 Custo da rota — comportamento aceito, não dívida técnica

A rota executa **2 consultas de custo fixo** (alunos + agendamentos do owner) e faz o restante do trabalho em memória, com um laço simples de contagem. **Não escala por aluno** e não é comparável ao N+1 corrigido em 6.2.1 — que crescia multiplicativamente por aluno e por ciclo histórico.

Portanto, esta rota é **comportamento aceito e documentado**, no mesmo espírito de 4.7. Não tratar como problema pendente nem "otimizar" preventivamente, sob risco de quebrar o indicador sem ganho real.

**Gatilho de revisão**: se a aba Alunos passar a demorar perceptivelmente para exibir os badges, o primeiro ponto a investigar é o **volume de dados trafegado**, não a lógica do indicador:

- A consulta de agendamentos traz todos os compromissos, mas a rota só usa `tipo === 'aula'` com `frequencia === 'semanal'` — filtrar já na consulta reduziria bastante o payload.
- A aba Alunos busca os agendamentos duas vezes por carregamento (uma pela rota de Finanças, outra por esta). Unificar as duas informações em um único endpoint é a alternativa mais direta, já que ambas leem exatamente a mesma base.

Nenhuma dessas mudanças altera o que o usuário vê.

---

## 11. Card do Aluno na tela "Alunos"

**Contexto**: o card exibia caixinhas de "Projeção", "Faltam" e "Reposição" alimentadas pelo KPI antigo. Removido o KPI, o conteúdo foi substituído.

**Conteúdo do card**:

1. **Resumo do ciclo financeiro atual** — período, valor e status. Ex.: `Ciclo atual: R$ 480 · em aberto`. Reaproveita os dados já calculados pela API de Finanças (sem duplicar lógica de cálculo no frontend), consumindo **apenas** `cicloAtual` e `configuracaoPendente` — nunca o histórico.
   - Configuração pendente → `⚠️ Configurar cobrança`.
   - `objetivo === 'Consultoria Online'` → sem bloco financeiro.
2. **Consistência de agenda** (seção 10) — exibido apenas quando houver pendência. Ex.: `⚠️ Faltam agendar 1 de 2 aulas semanais`.
3. **Espaço reservado para "aulas a repor"** — não faz parte desta spec (seção 8; item 1.8 do roadmap), mas o layout (`.aluno-card-indicadores`, grid `auto-fit`) já acomoda uma terceira caixinha sem refatoração. Sem placeholder visível nem controle inerte.

**Restrições**:

- Nenhuma dessas informações pode depender de `kpiService.js` ou das funções antigas de `utils-kpi.js`.
- Falha nas chamadas complementares (Finanças ou consistência) deve degradar silenciosamente: o card continua exibindo os dados do aluno, sem as caixinhas.

---

## 12. Defeitos Conhecidos e Dívidas Técnicas Aceitas

Itens identificados, avaliados e **deliberadamente adiados**. Não implementar sem decisão explícita. Espelhados no [`../roadmap.md`](../roadmap.md) (Grupo 0) para entrarem junto com uma próxima feature.

### 12.1 Localização do módulo isomórfico de recorrência

O módulo vive em `assets/js/shared/recurrence-helpers.js` e o backend o alcança via `require` relativo que atravessa para fora de `backend/`. Funciona em produção porque o repositório é clonado inteiro e o tracing do `@vercel/node` resolve o caminho — mas depende de configuração de projeto não versionada.

Existe assimetria a favor da solução inversa: o projeto do **app** tem a raiz do repositório como root e serviria normalmente um arquivo localizado dentro de `backend/`, enquanto o projeto da **API** só garante o que está dentro de `backend/`. Portanto, **mover o módulo para `backend/src/shared/`** (com o frontend consumindo-o de lá) é a direção mais robusta.

Status: **adiado**. É melhoria de robustez, não correção de defeito — o comportamento atual está validado em produção.

### 12.2 CSS órfão da visão mensal

Regras da visão mensal removida (`.calendario-mensal`, `.calendario-grid`, `.dia-cell`, `.kpi-dashboard`, `#tela-calendario`) permanecem em `assets/css/style.css`. Não removidas para evitar risco de afetar seletores compartilhados com as visões de dia/semana. Requer verificação cuidadosa antes de limpar.

### 12.3 Defeito em aberto — o bloco "Ver ciclos anteriores" fecha sozinho no re-render

**Sintoma**: em `view-financas.js`, `renderizarCards()` reescreve a lista inteira via `innerHTML` e `renderizarCard()` monta o `<details>` sem nunca aplicar `open`. Como `carregarFinancas()` renderiza o cache primeiro e chama `renderizarCards()` novamente quando a resposta remota chega, um `<details>` recém-expandido volta a fechar sozinho — inclusive no meio do `"Carregando ciclos anteriores..."`. O mesmo ocorre ao trocar de filtro, marcar como pago e salvar ajuste.

**Impacto**: apenas visual/de estado. Não há perda de dados nem chamada de rede duplicada — o conteúdo já carregado é restaurado corretamente por `montarHtmlHistorico()` na remontagem, e o estado de erro (com o botão "Tentar novamente") também sobrevive. O bloco apenas aparece fechado.

**Contradição com a spec**: viola o espírito de 6.2.2 (expansão imediata e feedback visível durante o carregamento), por uma via diferente da prevista.

**Correção prevista** (não implementada): persistir o estado de expansão no `STATE` em vez de no DOM —

1. registrar os alunos expandidos no `STATE` (ex.: `STATE.historicoAberto`);
2. o listener de `toggle` (já em fase de captura) passa a registrar abertura **e** fechamento;
3. `renderizarCard()` aplica `open` quando o aluno estiver marcado como expandido;
4. garantir que o `toggle` disparado por um `<details>` já renderizado com `open` não cause chamada redundante (o retorno antecipado de `carregarHistoricoAluno` para os estados `pronto`/`carregando` já cobre isso, mas precisa ser verificado).

Alterações contidas em `view-financas.js`. Não requer mudança de backend.

### 12.4 Documentação de apoio desatualizada

- `README.md` da raiz: a árvore de arquivos ainda lista `backend/src/services/kpiService.js` (removido) e não menciona `agendaConsistencyService.js` nem `CicloFinanceiro.js`.
- Os artefatos em `graphify-out/` refletem o estado anterior do código (referenciam `kpiService.js`, `exportarDados()`, `assets/js/recurrence-helpers.js`). Presumidamente gerados automaticamente — devem ser regenerados, não editados à mão. Quando desatualizados, poluem buscas por código com referências a arquivos inexistentes.
- O roadmap foi atualizado junto com esta versão da spec e **não** faz parte desta dívida.
