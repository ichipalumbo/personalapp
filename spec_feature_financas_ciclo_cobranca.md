# Especificação Técnica — Feature "Finanças" (Ciclo de Cobrança por Aluno)

> Documento destinado a agente de IA (GitHub Copilot) para implementação.
> Projeto: Agenda Personal Trainer (Prô Josy) — frontend JS vanilla + backend Node/Express/MongoDB.
> Este documento é a fonte de verdade das decisões de produto para esta feature. Não infira regras de negócio além do que está descrito aqui — onde houver dúvida, ela está explicitamente resolvida na seção "Decisões e Casos de Borda". Qualquer regra não coberta aqui deve ser tratada como "Fora de Escopo" (ver seção final) e não implementada sem confirmação humana.
>
> **Versão 3** — incorpora as decisões tomadas após a primeira implementação em produção: recontagem de aulas em ciclo não pago, ajuste manual negativo com piso zero, reorganização do bloco financeiro no formulário de aluno, substituição do KPI antigo no card do aluno e preservação isolada do indicador de consistência de agenda.

---

## 1. Contexto e Objetivo

Hoje o app calcula faturamento com uma aproximação genérica por mês calendário (`frequência semanal × 4 × valor`), sem relação com datas reais de vencimento de cada aluno. Isso não reflete a realidade de um Personal Trainer (PT) autônomo, que frequentemente cobra em ciclos móveis (ex.: todo dia 17 de cada mês), e não em mês civil fechado.

**Objetivo desta feature**: substituir totalmente o modelo de KPI financeiro atual por um modelo de **ciclo de cobrança configurável por aluno**, com:
- Cálculo de quantas aulas válidas ocorreram dentro da janela de datas do ciclo vigente do aluno.
- Cálculo do valor a cobrar nesse ciclo (por aula ou valor fixo, conforme configuração do aluno).
- Registro persistente de pagamento por ciclo, com status automático (pago/atrasado/em aberto).
- Uma nova aba de navegação "Finanças" dedicada a essa visão, substituindo a aba "Calendário" atual.

Esta feature **remove** o dashboard de KPI antigo (baseado em mês calendário) e a visão de calendário mensal. Não removemos nenhuma lógica de agendamento, recorrência ou conflito de horário — a agenda continua funcionando exatamente como hoje.

**Exceção explícita à remoção do KPI antigo**: o indicador de consistência de agenda (`calcularAulasFaltamAgendar`) é preservado e realocado — ver seção 10. Ele não é um cálculo financeiro; é um alerta operacional sobre a agenda estar coerente com o contrato do aluno.

---

## 2. Mudanças de Navegação (Escopo desta Feature)

### 2.1 Aba "Home"
- Passa a ter duas sub-abas internas, nesta ordem fixa: **"Semana" (primeira/padrão ao abrir) → "Dia"**.
- A sub-aba "Semana" é a visão principal e deve abrir por padrão sempre que o usuário navegar para "Home". Isso é um requisito explícito do usuário final (PT) e não deve ser alterado.
- A sub-aba "Dia" mantém o comportamento atual da agenda diária.
- Nenhuma lógica de agendamento, recorrência ou conflito muda nesta feature — é puramente reorganização de navegação/UI.

### 2.2 Visão "Mês" do calendário
- **Removida por completo** (grid mensal). Motivo de produto: visão de baixo valor em mobile-first, será substituída pela aba "Finanças".
- "Removida por completo" significa: remover o markup (`<main id="tela-calendario">`, botão `tabCalendarioMensal`, container `containerCalendarioMensal`), remover a entrada de rota correspondente e remover/reduzir o arquivo de view. **Não é suficiente apenas retirar o link do menu de navegação** — a tela não deve continuar existindo como código morto acessível.
- Qualquer função relacionada exclusivamente à renderização do grid mensal (ex.: `renderizarCalendario`, `getDiasNoMes`, `getPrimeiroDiaSemana`) deve ser avaliada: se não for usada por mais nenhuma outra view, pode ser removida com segurança. **Funções de resolução de recorrência/data** (`parseDataFlex`, `resolverCompromissoRecorrenteNaData`, `checarCompromissoNaData`) **devem ser mantidas**, pois são a base do cálculo de aulas válidas por ciclo — ver seção 2.4. Atenção: `getDiasNoMes` é consumida pelo backend (`ajustarDiaParaMesValido`), portanto **não** pode ser removida do módulo compartilhado.

### 2.3 Aba "Calendário" → Aba "Finanças"
- A aba antes chamada "Calendário" é substituída pela nova aba **"Finanças"**.
- O dashboard de KPI antigo (`assets/js/utils-kpi.js`: `calcularKPIsAluno`, `calcularKPIsTodosAlunos`; `backend/src/services/kpiService.js`: `calcularProjecaoMensalCompleta`, `calcularProjecaoRealizadaAteHoje`, `calcularProjecaoAproximada`, `contarReposicoesPorAluno`) **é removido e substituído** pela nova lógica de ciclo (ver seção 5). Não deixar os dois sistemas convivendo — é decisão explícita de produto substituir, não somar. A única função preservada é `calcularAulasFaltamAgendar` (ver seção 10).

### 2.4 Extração da lógica de recorrência para módulo isomórfico (requisito obrigatório)

O cálculo de "aulas válidas dentro do ciclo" (seção 5.3) depende da mesma lógica de recorrência usada para renderizar a agenda no frontend. Essa lógica também precisa rodar no backend para o cálculo financeiro server-side.

**Decisão obrigatória**: não implementar duas versões separadas dessa lógica. Isso cria risco real de divergência silenciosa entre "o que a agenda mostra" e "o que o financeiro cobra" — inaceitável para um cálculo de dinheiro.

**Solução exigida**: um **módulo JS isomórfico** (sem dependência de `window`, DOM ou API exclusiva de browser), importável tanto pelo frontend quanto pelo backend. Ambos os lados consomem a mesma implementação, não cópias.

**Restrição de deploy (verificar)**: o backend é publicado como função serverless (`backend/vercel.json`). Se o módulo compartilhado residir fora da pasta `backend/`, é obrigatório garantir que ele seja incluído no bundle publicado. Um `require` relativo que atravessa para fora da raiz do backend (ex.: `require('../../../assets/js/shared/...')`) pode funcionar localmente e falhar em produção. Confirmar o comportamento no ambiente de deploy e, se necessário, mover o módulo para dentro de `backend/` (com o frontend consumindo-o de lá) ou incluir o caminho no processo de build.

### 2.5 Estrutura final de navegação
```
[Home]  → sub-abas: [Semana (padrão)] [Dia]
[Finanças]  (nova, substitui "Calendário")
[Alunos]
```

---

## 3. Modelo de Dados

### 3.1 Alterações no schema `Aluno`

```js
diaVencimento: { type: Number, min: 2, max: 31, default: null },
// Dia do mês em que o pagamento vence. NUNCA pode ser 1 (ver regra 3.1.1).
// Se o dia não existir no mês corrente (ex: 31 em fevereiro), usar o último dia do mês (seção 5.2).

fechamentoMesCheio: { type: Boolean, default: false },
// Se true: ignora `diaVencimento` e usa sempre o mês civil cheio (dia 1 ao último dia do mês).

metodoCobranca: { type: String, enum: ['por_aula', 'valor_fixo'], default: 'por_aula' },

valorFixoCiclo: { type: Number, default: null }
// Usado somente quando metodoCobranca === 'valor_fixo'.
```

**Campo aposentado**: `historicoPagamentos` deixa de ser utilizado. Não usar em nenhuma lógica nova. Mantido no schema apenas por retrocompatibilidade de dados antigos, marcado como `// DEPRECATED`.

**Campo `aulasSemanais` (contrato)**: continua existindo e é relevante — é o número de aulas semanais acordadas em contrato, usado pelo indicador de consistência de agenda (seção 10). **Não remover.**

#### 3.1.1 Regras de validação do formulário de Aluno (frontend + backend)
- Se `fechamentoMesCheio === false` e `diaVencimento === 1` → erro: `"Para vencimento no dia 1 ou mês completo, ative a opção 'Fechar por mês cheio' acima."`
- Se `fechamentoMesCheio === true` → `diaVencimento` oculto/desabilitado.
- Se `metodoCobranca === 'valor_fixo'` → `preco` (Valor Hora/Aula) **oculto/desabilitado e não obrigatório**; `valorFixoCiclo` obrigatório.
- Se `metodoCobranca === 'por_aula'` → `valorFixoCiclo` oculto/desabilitado; `preco` obrigatório **e validado no frontend como número finito maior que zero**, com a mesma mensagem usada no backend (`"Informe o valor hora/aula para salvar este aluno."`). O frontend não pode permitir submit que o backend vai rejeitar.
- Alunos com `objetivo === 'Consultoria Online'`: todo o bloco financeiro fica desabilitado (ver 3.1.2).
- **Migração de alunos existentes**: alunos sem `diaVencimento` e sem `fechamentoMesCheio`, com `objetivo !== 'Consultoria Online'`, são tratados como "configuração pendente" (seção 4.5).

#### 3.1.2 Reorganização do bloco financeiro no formulário (novo nesta versão)

O campo **"Valor Hora/Aula (R$)"** deve ser **movido para dentro do card "Cobrança por ciclo"**, deixando de ficar solto na área geral do formulário. Motivo: hoje ele fica fora do bloco financeiro e, por isso, não acompanha o comportamento de desabilitação do restante — gerando um campo editável que não participa do cálculo (inconsistência real observada em produção).

Composição final do card **"Cobrança por ciclo"**, nesta ordem:
1. Toggle **"Fecha por mês cheio"**
2. Campo **"Dia de vencimento"** (visível apenas quando o toggle está desligado)
3. Select **"Método de cobrança"** (Por aula / Valor fixo)
4. Campo **"Valor Hora/Aula (R$)"** — visível e obrigatório apenas quando método = `por_aula`
5. Campo **"Valor fixo do ciclo (R$)"** — visível e obrigatório apenas quando método = `valor_fixo`

Regras de estado do card:
- Quando `objetivo === 'Consultoria Online'`, **o card inteiro** assume aparência desabilitada (mesmo tratamento visual já usado hoje em "Local de Treino"/"Aulas por Semana"), e todos os campos internos ficam `disabled` e não obrigatórios.
- Quando `objetivo === 'Personal Trainer'`, o card fica ativo e as regras de visibilidade internas da seção 3.1.1 se aplicam normalmente.
- O campo **"Aulas / Semana"** permanece **fora** deste card, na área geral do formulário — ele não é um dado financeiro, é o contrato usado pelo indicador de consistência de agenda (seção 10).

### 3.2 Collection `CicloFinanceiro`

```js
const CicloFinanceiroSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  alunoId: { type: String, required: true, index: true },
  cicloInicio: { type: String, required: true }, // ISO YYYY-MM-DD
  cicloFim: { type: String, required: true },    // ISO YYYY-MM-DD

  aulasContadas: { type: Number, default: 0 },      // derivado da agenda (ver 5.3 e 5.8)
  aulasManuaisExtras: { type: Number, default: 0 }, // pode ser negativo (ver 5.5)
  observacaoAjuste: { type: String, default: '' },

  metodoCobranca: { type: String, enum: ['por_aula', 'valor_fixo'], required: true },
  precoAulaSnapshot: { type: Number, default: null },
  valorFixoSnapshot: { type: Number, default: null },
  valorTotalCiclo: { type: Number, required: true },

  status: { type: String, enum: ['em_aberto', 'pago', 'atrasado'], default: 'em_aberto' },
  dataPagamento: { type: String, default: null },
  formaPagamento: { type: String, default: null },

  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now }
}, { strict: false });

CicloFinanceiroSchema.index({ ownerEmail: 1, alunoId: 1, cicloInicio: 1 }, { unique: true });
```

**Justificativa dos "snapshots"**: preço/valor fixo do aluno podem mudar (reajuste). Um ciclo já pago não deve ser recalculado retroativamente. Por isso `precoAulaSnapshot`/`valorFixoSnapshot`/`valorTotalCiclo` são congelados.

---

## 4. Tela "Finanças" — Especificação Funcional

### 4.1 Estrutura geral
Lista de cards, um por aluno elegível (seção 4.4), ordenados por status (atrasado → em aberto → pago → pendente de configuração), cada card mostrando o **ciclo vigente**. Cada card é expansível para mostrar o histórico de ciclos anteriores (somente leitura).

### 4.2 Mockup de referência (guia de UX, não pixel-perfect)

```
┌─────────────────────────────────────────┐
│  💰 Finanças                             │
│  [Todos] [Atrasado] [Em aberto] [Pago]  │
│                                           │
│  ┌─────────────────────────────────┐    │
│  │ João Silva              🟡 Aberto│    │
│  │ Ciclo atual: 18/07 → 17/08        │    │
│  │ 6 aulas registradas                │    │
│  │ + 5 aulas extras (ajuste manual)   │    │
│  │ = 11 aulas × R$ 80 = R$ 880        │    │
│  │ [Marcar como pago] [Editar ajuste] │    │
│  │ [▾ Ver ciclos anteriores]          │    │
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
   │ 1 aula registrada                  │
   │ − 1 aula (ajuste: "experimental")  │
   │ = 0 aulas × R$ 90 = R$ 0,00        │
```

### 4.3 Criação "sob demanda" (lazy) do documento de ciclo
O documento do ciclo vigente é criado no momento em que a tela de Finanças é consultada pela primeira vez para aquele período — não via job/cron.
- Exibir loading local no card (skeleton/spinner por card, não tela inteira) enquanto o backend calcula e persiste.
- Não exibir mensagens técnicas ("criando ciclo no banco").
- Duplicidade (`erro 11000` do índice único) deve ser tratada como "já existe, retornar o existente", nunca erro para o usuário.

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
A tela deve implementar cache local (localStorage) do último estado conhecido de cada ciclo, seguindo o padrão já usado em `assets/js/storage.js`. O objetivo é exclusivamente **resiliência de leitura contra cold start do backend serverless**, não uso financeiro offline. Regras detalhadas em 6.1.

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
- Contar ocorrências de compromissos do aluno com `tipo === 'aula'` OU `tipo === 'reposição'` cuja data resolvida (via módulo isomórfico de recorrência, seção 2.4) caia em `[cicloInicio, cicloFim]` (inclusive nas pontas).
- **Não contar**: `bloqueio`, `deslocamento`.
- Não há tratamento de falta/presença nesta versão — se o compromisso não existe mais na agenda, ele não é contado (ver 5.8).

### 5.4 Valor total do ciclo (`valorTotalCiclo`)
```
SE metodoCobranca === 'valor_fixo':
  valorTotalCiclo = aluno.valorFixoCiclo
  (aulasContadas e aulasManuaisExtras seguem calculadas e exibidas, mas apenas informativas)
SENÃO:
  totalAulas = MAX(0, aulasContadas + aulasManuaisExtras)   // ver piso zero em 5.5
  valorTotalCiclo = totalAulas * aluno.preco
```

### 5.5 Ajuste manual (`aulasManuaisExtras` + `observacaoAjuste`)

- Editável pela Prof no modal "Editar ajuste", **por ciclo individual**.
- Pertence exclusivamente ao documento daquele ciclo — não se repete nem se herda para o próximo. Cada novo ciclo nasce com `aulasManuaisExtras = 0` e `observacaoAjuste = ''`.
- **Aceita valores negativos** (decisão desta versão). Casos de uso:
  - **Positivo**: aulas dadas fora do app (antes do cadastro/migração) ou combinadas informalmente e não lançadas na agenda.
  - **Negativo**: desconto acordado com o aluno, aula cortesia ou aula experimental que está lançada na agenda (para reservar o horário) mas não deve ser cobrada.
- **Piso zero obrigatório**: o total cobrado no ciclo nunca pode ser negativo. Aplicar `totalAulas = Math.max(0, aulasContadas + aulasManuaisExtras)` tanto na exibição quanto no cálculo de `valorTotalCiclo`. O PT nunca "paga para trabalhar".
- O valor bruto informado de `aulasManuaisExtras` é persistido como informado (inclusive quando negativo); o piso zero é aplicado apenas ao **total resultante**, não ao campo em si.
- A UI deve deixar claro o resultado quando o piso for aplicado (ex.: exibir `= 0 aulas` e `R$ 0,00`), sem mostrar número negativo de aulas cobradas.

### 5.6 Cálculo do `status`
```
SE dataPagamento preenchida: status = 'pago'
SENÃO SE hoje > cicloFim: status = 'atrasado'
SENÃO: status = 'em_aberto'
```
`status` pode ser persistido por conveniência, mas é recalculado a cada leitura (exceto 'pago', que é definitivo até estorno — fora de escopo).

### 5.7 Primeiro ciclo de um aluno novo
Usar `criadoEm` do `Aluno` como piso mínimo de `cicloInicio` no primeiro ciclo. Sem cálculo proporcional de valor — aulas anteriores ao cadastro entram, se necessário, via ajuste manual positivo (5.5).

### 5.8 Recontagem de aulas em ciclo ainda não pago (novo nesta versão — corrige bug de produção)

**Problema observado**: o `aulasContadas` era calculado apenas na criação do documento do ciclo e nunca mais atualizado. Consequência: ao excluir (ou adicionar/mover) uma aula na agenda dentro da janela do ciclo vigente, o financeiro continuava exibindo o número antigo.

**Regra definida**:

- **Ciclo sem `dataPagamento` (`em_aberto` ou `atrasado`)** → `aulasContadas` **deve ser recalculado a partir da agenda a cada leitura** da tela de Finanças (endpoints da seção 6), e o `valorTotalCiclo` deve ser recalculado em seguida conforme 5.4, preservando o `aulasManuaisExtras` já registrado. Se o valor recalculado divergir do persistido, atualizar o documento.
- **Ciclo com `dataPagamento` preenchida (`pago`)** → `aulasContadas`, `aulasManuaisExtras` e `valorTotalCiclo` ficam **congelados permanentemente**. Nenhuma alteração posterior na agenda pode modificá-los. Mesma filosofia dos snapshots de preço: o que já foi cobrado e recebido é histórico fechado.
- Correção em ciclo já pago exige estorno/reabertura, que permanece **fora de escopo** (tratamento manual por ora).

**Natureza temporária desta regra**: esta é a regra vigente **enquanto não existir status de presença/realização da aula**. Quando essa feature existir, a contagem deverá passar a considerar o status da aula (realizada / falta cobrável / cancelada sem cobrança) em vez de simplesmente a existência do compromisso na agenda. Registrar como ponto de revisão futura.

**Caso "quero excluir da agenda mas ainda cobrar"**: resolvido pelo ajuste manual positivo (5.5) — a Prof lança `+1` com observação. Não criar mecanismo adicional para isso nesta versão.

---

## 6. Ações da Tela de Finanças (Backend/API)

Seguir o padrão existente de `routes`/`controllers`, com `requireAuth` e isolamento por `ownerEmail` via `getOwnerEmailOrThrow`.

- `GET /api/financas` → para cada aluno elegível: ciclo vigente (criando sob demanda, 4.3; recalculando aulas se não pago, 5.8) + indicador de configuração pendente.
- `GET /api/financas/:alunoId/historico` → todos os `CicloFinanceiro` do aluno, ordenados por `cicloInicio` desc.
- `PATCH /api/financas/:cicloId/pagamento` → marca como pago (`dataPagamento`, `formaPagamento` opcional). A partir daqui o ciclo é congelado (5.8).
- `PATCH /api/financas/:cicloId/ajuste` → atualiza `aulasManuaisExtras` (podendo ser negativo) e `observacaoAjuste`, recalculando `valorTotalCiclo` conforme 5.4 com piso zero. Deve rejeitar (ou ignorar) alteração em ciclo já pago.

### 6.1 Cache local vs. confirmação de backend (leitura x escrita)

- **Leitura** (`GET`): pode e deve ser cacheada em localStorage, no padrão de `assets/js/storage.js`. Exibir o cache imediatamente e atualizar quando a resposta do backend chegar, mitigando cold start.
- **Escrita** (`PATCH` de pagamento e ajuste; criação de ciclo sob demanda): **nunca** considerada concluída na UI apenas com base em gravação local. Aguardar resposta HTTP de sucesso antes de:
  - marcar o card como "pago";
  - atualizar o valor após ajuste manual;
  - remover o estado de "configuração pendente".
  Durante a espera, exibir estado transitório claro (botão "Salvando...", desabilitado) e informar erro/retry em caso de falha. Nunca aplicar a mudança só no cache local como definitiva.
- **Motivo**: valor financeiro e status de pagamento não podem divergir entre dispositivos ou entre local e servidor.

---

## 7. Decisões e Casos de Borda (Resolvidos — não reabrir sem confirmação)

| # | Caso | Decisão |
|---|------|---------|
| 1 | Cobrança é por pacote mensal fixo? | Não. Sempre por aula, exceto quando `metodoCobranca === 'valor_fixo'` (permuta/acordo especial). |
| 2 | "Consultoria Online" entra no financeiro? | Não. |
| 3 | Visão "Mês" do calendário será mantida? | Não, removida por completo (markup, rota e código), não apenas oculta do menu. |
| 4 | Home: qual sub-aba abre por padrão? | "Semana". |
| 5 | Vencimento em "dia útil" / "semana do mês"? | Fora de escopo. |
| 6 | Vencimento no dia 1 / mês cheio? | Flag `fechamentoMesCheio`. `diaVencimento === 1` proibido com a flag desativada. |
| 7 | Falta/cancelamento entra no cálculo? | Não nesta versão — conta-se o que existe na agenda no momento da leitura (ver #16). |
| 8 | Onde persistir o pagamento? | Collection `CicloFinanceiro`. `historicoPagamentos` aposentado. |
| 9 | Alunos antigos sem `diaVencimento`? | Card "configuração pendente". KPI antigo é removido, não mantido em paralelo. |
| 10 | Aulas dadas antes do cadastro? | Ajuste manual positivo por ciclo. |
| 11 | Ajuste manual se repete no próximo ciclo? | Não. Cada ciclo nasce zerado. |
| 12 | Quando o ciclo é criado? | Sob demanda ao acessar Finanças, com loading local por card. Nunca silencioso/confuso. |
| 13 | Valor fixo esconde a contagem de aulas? | Não. Contagem permanece visível como referência. |
| 14 | Deve haver cache local? | Sim, apenas leitura/resiliência a cold start. Escrita sempre confirmada pelo backend (6.1). |
| 15 | Recorrência pode ser reimplementada no backend? | Não. Módulo isomórfico único compartilhado (2.4). |
| 16 | Excluir aula da agenda deve remover do financeiro? | Sim, **enquanto o ciclo não estiver pago**: `aulasContadas` é recalculado a cada leitura (5.8). Ciclo pago fica congelado. Regra temporária até existir status de presença da aula. |
| 17 | `aulasManuaisExtras` pode ser negativo? | Sim (desconto, cortesia, aula experimental). Mas o total cobrado nunca fica negativo — piso zero obrigatório (5.5). |
| 18 | Onde fica o campo "Valor Hora/Aula"? | Dentro do card "Cobrança por ciclo", junto com método de cobrança e valor fixo (3.1.2). Desabilita junto com o card quando Consultoria Online. |
| 19 | O que o card do aluno mostra no lugar do KPI antigo? | Resumo do ciclo financeiro atual + indicador de consistência de agenda (seções 10 e 11). |
| 20 | O KPI "aulas faltam agendar" é removido? | Não. É o único preservado, realocado para fora do `kpiService` (seção 10). Não é cálculo financeiro. |

---

## 8. Fora de Escopo (não implementar; não inferir solução)

- Vencimento por "dia útil" ou "semana do mês".
- Cobrança automatizada (Pix, boleto, gateway). Esta feature é registro manual.
- **Status de presença/realização da aula** (realizada / falta cobrável / cancelada sem cobrança). Quando existir, a regra 5.8 deve ser revista para usá-lo.
- Notificações/lembretes automáticos de vencimento.
- Estorno ou reabertura de ciclo já pago.
- Edição retroativa de ciclos antigos além do ajuste do ciclo vigente (histórico é somente leitura).
- Edição/registro em modo totalmente offline. O cache cobre apenas leitura (6.1).
- **Visão de "aulas a repor" na tela de Alunos** — reconhecida como próxima feature desejada. O card do aluno deve ser estruturado de forma a acomodá-la depois (seção 11), mas **não implementá-la agora**. Não reaproveitar `contarReposicoesPorAluno` nesta entrega.
- Qualquer alteração ao motor de recorrência, detecção de conflitos ou sincronização com Google Calendar, além da extração isomórfica da seção 2.4.

---

## 9. Ordem de Implementação e Arquivos Impactados

**Ordem obrigatória**:
1. Módulo isomórfico de recorrência (e verificação de deploy, 2.4).
2. Backend: model, service, controller, rotas, recontagem 5.8, ajuste negativo 5.5.
3. Frontend: tela de Finanças e formulário de aluno (3.1.2), mantendo a navegação atual intacta.
4. Card do aluno: substituição do KPI antigo (seções 10 e 11).
5. Troca/limpeza de navegação (`index.html`, `router.js`).
6. Remoção do código antigo (KPI financeiro, visão mensal) — **por último**.

**Backend**
- `models/Aluno.js` — campos financeiros; `historicoPagamentos` deprecated; manter `aulasSemanais`.
- `models/CicloFinanceiro.js` — schema da seção 3.2.
- `services/financasService.js` — cálculo de ciclo (seção 5), incluindo 5.5 e 5.8; consumir módulo isomórfico.
- `services/agendaConsistencyService.js` — **novo**; abriga `calcularAulasFaltamAgendar` (seção 10).
- `services/kpiService.js` — **remover** (após extrair a função preservada).
- `utils/studentValueExtractors.js` — revisar/corrigir (seção 10, item 3); remover `getAlunoPreco` se ficar órfão.
- `controllers/financasController.js`, `routes/financasRoutes.js` — seção 6.
- `controllers/alunoController.js`, `routes/alunoRoutes.js` — remover endpoints de KPI antigos; manter validações da seção 3.1.1.

**Módulo compartilhado**
- `parseDataFlex`, `resolverCompromissoRecorrenteNaData`, `checarCompromissoNaData`, `getDiasNoMes` em módulo isomórfico único, consumido por frontend e backend.

**Frontend**
- `view-financas.js` — tela de Finanças, cache de leitura (4.6/6.1), ajuste negativo com piso zero na exibição.
- `view-alunos.js` — reorganização do card "Cobrança por ciclo" (3.1.2), validação de `preco` (3.1.1), novo conteúdo do card do aluno (seção 11).
- `view-home.js` — sub-abas Semana/Dia.
- `view-calendario.js` — remover grid mensal e KPI; remover arquivo se ficar vazio.
- `utils-kpi.js` — remover funções de cálculo financeiro antigo; manter apenas utilidades genéricas ainda usadas.
- `router.js`, `index.html` — navegação e limpeza final.

---

## 10. Indicador de Consistência de Agenda (preservado do KPI antigo)

**O que é**: `calcularAulasFaltamAgendar` compara quantas aulas **recorrentes semanais** estão lançadas na agenda do aluno (`tipo === 'aula'` e `frequencia === 'semanal'`, somando `diasSemana.length`) contra o número de aulas semanais acordadas em contrato, retornando `Math.max(0, acordado - agendado)`.

**Por que é preservado**: não é cálculo financeiro. É um alerta operacional para a Prof verificar se a recorrência do aluno foi configurada de acordo com o contrato. Continua útil independentemente do modelo de cobrança.

**Requisitos**:
1. **Extrair** a função do `kpiService.js` para um módulo próprio (sugestão: `backend/src/services/agendaConsistencyService.js`), removendo todo o restante do `kpiService.js`. O objetivo é não manter vivo o serviço de projeção financeira antigo só por causa dela.
2. Expor o resultado onde for necessário para o card do aluno (seção 11) — via endpoint próprio ou anexado à listagem de alunos, o que for mais simples e consistente com o padrão do projeto.
3. **Verificar bug provável de nome de campo**: o extractor `getAlunoFrequenciaSemanal` lê `aluno.frequenciaSemanal`, mas o schema do `Aluno` define o campo como `aulasSemanais` (e o formulário usa o id `alunoFrequenciaSemanal`). Se os nomes realmente divergirem, o indicador está caindo sempre no default `1` e nunca refletiu o contrato real. Investigar qual campo é de fato persistido e padronizar, mantendo compatibilidade com dados já existentes no banco.
4. Não reaproveitar `contarReposicoesPorAluno` — ver seção 8.

---

## 11. Card do Aluno na tela "Alunos" (substituição do KPI antigo)

**Situação atual**: cada card em `renderizarListaAlunos` exibe caixinhas de "Projeção", "Faltam" e "Reposição" alimentadas pelo KPI antigo. Remover o KPI sem tratar isso quebraria a tela.

**Decisão (Opção B)**: substituir o conteúdo dessas caixinhas por informação vinda do novo modelo, mantendo a mesma estrutura visual de "caixinhas" já existente no card.

Conteúdo do card após a mudança:
1. **Resumo do ciclo financeiro atual** — período, valor e status. Ex.: `Ciclo atual: R$ 480 · em aberto`. Reaproveitar os dados que a tela de Finanças já calcula (não duplicar lógica de cálculo no frontend).
   - Aluno com configuração pendente → exibir `⚠️ Configurar cobrança` em vez de valor.
   - Aluno `Consultoria Online` → não exibir bloco financeiro.
2. **Consistência de agenda** (seção 10) — exibir apenas quando houver pendência. Ex.: `⚠️ Faltam agendar 1 de 2 aulas semanais`. Quando estiver completo, exibir indicador discreto de OK ou omitir.
3. **Espaço reservado para "aulas a repor"** — não implementar agora (seção 8), mas estruturar o layout do card de modo que uma terceira caixinha possa ser adicionada depois sem refatoração. Não deixar placeholder visível nem controle inerte na UI.

**Restrição**: nenhuma dessas informações pode voltar a depender de `kpiService.js` ou das funções antigas de `utils-kpi.js`.
