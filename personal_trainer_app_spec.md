# 📅 Sistema de Agendamento de Aulas - Personal Trainer

**Versão:** 1.0  
**Status:** Especificação Técnica  
**Data:** Junho 2026  
**Objetivo:** Criar um sistema web (PWA) para gerenciar aulas de personal trainer com sincronização Google Calendar

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura & Tecnologia](#arquitetura--tecnologia)
3. [Fluxos de Usabilidade](#fluxos-de-usabilidade)
4. [Features Detalhadas](#features-detalhadas)
5. [Especificações Técnicas](#especificações-técnicas)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [Roadmap de Implementação](#roadmap-de-implementação)
8. [Próximos Passos](#próximos-passos)

---

## Visão Geral

### Objetivo
Criar uma plataforma web mobile-first que permita:
- **Professora (Personal Trainer):** Gerenciar horários, alunos e presença
- **Alunos:** Visualizar disponibilidades e agendar aulas

### Principais Features
✅ Calendário interativo (mês/semana)  
✅ Agendamento de aulas com sincronização Google Calendar  
✅ Notificações de convite via email Gmail  
✅ Controle de presença  
✅ Gerenciamento de alunos e slots  
✅ Criação em massa de slots (bulk)  
✅ Autenticação simples (usuário/senha)  
✅ Autenticação simples (ID único — MVP)

### Usuários
- **1 Professora (Admin)** - gerencia tudo
- **5-7 Alunos** - agendamento apenas

---

## Decisões do MVP

- Autenticação: **Login por ID apenas (sem senha)** — fluxo simples para o MVP. O Apps Script valida o `ID` na aba `Usuarios` e retorna um token de sessão curto (TTL configurável). (Decisão tomada pelo cliente.)
- Sincronização Calendar → Sheets: **Trigger automático a cada 2 horas** + botão manual "🔄 Sincronizar" no painel da professora. (Latência aceitável para MVP.)
- DiasFixos: padronizar para valores `[1..7]` onde `1=Segunda` e `7=Domingo`.
- Convenção de nomes: usar `camelCase` para JSON e objetos (ex.: `slotId`, `agendId`, `dataAgendamento`). Nas abas do Sheets usar cabeçalhos Title Case (ex.: `SlotId`).

## Glossário

- **Slot**: horário criado pela professora. `tipo` ∈ {`AULA`,`PESSOAL`}.
- **Aula**: slot que alunos podem agendar (visível aos alunos).
- **Pessoal**: bloqueio da professora — invisível para alunos.
- **Agendamento**: objeto que liga um `Slot` a um `Aluno`.
- **Alocado**: slot reservado para um aluno recorrente (aula fixa).
- **DiasFixos**: array de inteiros `[1..7]` representando dias da semana (1=Segunda).
- **GoogleEventId**: ID do evento no Google Calendar.


## Arquitetura & Tecnologia

### Stack Tecnológico

```
┌─────────────────────────────────────────────┐
│           FRONTEND (PWA - React)            │
│  - Calendário interativo                    │
│  - Interface Professora & Aluno             │
│  - Mobile-first design                      │
└──────────────────┬──────────────────────────┘
                   │ HTTPS API Calls
┌──────────────────▼──────────────────────────┐
│      BACKEND (Google Apps Script)           │
│  - Autenticação (usuário/senha)             │
│  - CRUD de slots, alunos, presença         │
│  - Sincronização Google Calendar           │
│  - Sincronização Google Sheets             │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
    ┌────▼─────┐        ┌────▼─────┐
    │ Google    │        │ Google   │
    │ Sheets    │        │ Calendar │
    │ (Dados)   │        │(Sincron.)│
    └───────────┘        └──────────┘
```

### Tecnologias Escolhidas

| Componente | Tecnologia | Justificativa |
|---|---|---|
| Frontend | React (HTML/CSS/JS) | PWA, mobile-first, reutilizável |
| Backend | Google Apps Script | Integração nativa Google, zero custo |
| Database | Google Sheets | Simples, você já conhece, acesso fácil |
| Autenticação | Apps Script nativa | Sem complexidade extra |
| Calendário API | Google Calendar API | Sincronização automática |
| Notificações | Google Calendar (email) | Alunos recebem convites via Gmail |
| Hosting | GitHub Pages / Google Drive | Grátis, simples |

---

## Fluxos de Usabilidade

### Fluxo 1: Autenticação

```
┌──────────────────────────────┐
│  Usuário acessa a URL PWA    │
└────────────┬─────────────────┘
             │
┌────────────▼──────────────┐
│ TELA DE LOGIN             │
│                           │
│ [Professora]  [Aluno]     │
│       (botões)            │
│                           │
│ ID: _________________     │
│                           │
│ [Entrar]                  │
└────────────┬──────────────┘
             │
  [Digita ID + clica Entrar]
             │
    ┌────────▼────────────────┐
    │ Apps Script valida ID   │
    │ contra Google Sheets    │
    └────────┬────────────────┘
             │
         ┌───┴───┐
         │       │
    ✅EXISTE  ❌NÃO EXISTE
         │       │
    ┌────▼──┐   │
    │Token  │   │
    │retorna│   └──→ ❌Mensagem
    │session│        "ID não
    │em     │        encontrado"
    │local  │
    │Store  │
    └────┬──┘
         │
    ✅LOGADO
      (redirecionado
       para dashboard
       apropriado)
```

**Detalhes:**
- Botões de tipo (Professora/Aluno) deixam óbvio qual é qual
- Campo ID único e simples
- Validação no Apps Script contra aba "Usuarios"
- Tipo (PROFESSORA/ALUNO) armazenado na sessão
- localStorage mantém token pra suportar offline

---

### Fluxo 2: Agendamento de Aula (Perspectiva Aluno)

```
┌──────────────────────────────┐
│  Aluno acessa a PWA logado   │
└────────────┬─────────────────┘
             │
      ┌──────▼──────┐
      │Visualiza     │
      │Calendário    │
      │do mês atual  │
      └──────┬───────┘
             │
     [Clica em slot vazio]
             │
      ┌──────▼──────────────────┐
      │ Modal: Agendar Aula     │
      │ - Confirmar horário     │
      │ - Insira email (Gmail)  │
      │ - Botão "Confirmar"     │
      └──────┬──────────────────┘
             │
        [Clica Confirmar]
             │
      ┌──────▼─────────────────────────┐
      │ Apps Script:                    │
      │ 1. Valida email                │
      │ 2. Cria evento no Calendar     │
      │ 3. Adiciona aluno como attendee│
      │ 4. Atualiza Google Sheets      │
      │ 5. Marca slot como ocupado     │
      └──────┬──────────────────────────┘
             │
      ┌──────▼──────────────────┐
      │✅ Agendamento Confirmado│
      │   Email enviado ao aluno│
      │   (Convite Google       │
      │    Calendar)            │
      └──────────────────────────┘
```

**Detalhes:**
- Aluno vê apenas mês atual + próximo mês (se última semana do mês)
- Só pode agendar com **pelo menos 1 dia de antecedência**
- Deve informar email Gmail para receber convite
- Slot fica **imediatamente indisponível** para outros alunos
- Aluno recebe email de convite do Google Calendar

---

### Fluxo 3: Cancelamento de Aula (Perspectiva Aluno)

```
┌────────────────────────────┐
│ Aluno vê aula agendada     │
│ e clica "Cancelar"         │
└────────────┬───────────────┘
             │
    ┌────────▼────────┐
    │ Verifica:       │
    │ Falta 1 dia?    │
    └────────┬────────┘
             │
         ┌───┴───┐
         │       │
      ✅SIM    ❌NÃO
         │       │
    ┌────▼──┐   │
    │Modal: │   │
    │Contato│   │
    │com a  │   │
    │Prof   │   │
    │para   │   └──→ ❌Bloqueado
    │avisar │      (Falta menos
    │       │       de 1 dia)
    └────┬──┘
         │
   [Aluno clica OK]
         │
    ┌────▼──────────────────────┐
    │ Apps Script:              │
    │ 1. Deleta evento Calendar │
    │ 2. Envia email cancelado  │
    │    ao aluno               │
    │ 3. Marca slot como livre  │
    │ 4. Atualiza Sheets        │
    └────┬──────────────────────┘
         │
    ✅Cancelado
      (Precisa notificar
       professora manualmente)
```

**Detalhes:**
- Aluno SÓ pode cancelar com **pelo menos 1 dia de antecedência**
- Se não puder cancelar, orientação: "Entre em contato com a professora"
- Cancelamento deleta evento Google Calendar
- Email é enviado ao aluno confirmando cancelamento

---

### Fluxo 4: Gerenciamento de Slots (Perspectiva Professora)

```
┌──────────────────────────────┐
│ Professora logada            │
│ Acessa painel admin          │
└────────────┬─────────────────┘
             │
    ┌────────▼────────┐
    │ 4 Opções:       │
    └────────┬────────┘
             │
    ┌────────┼────────┬──────────┬──────────┐
    │        │        │          │          │
 ┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌────▼────┐
 │View │ │Add  │ │Bulk │ │Add  │ │Alocar   │
 │Cal  │ │Aula │ │Aulas│ │Slot │ │Aulas    │
 │     │ │     │ │     │ │Pess.│ │Fixas    │
 └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └────┬────┘
    │       │       │       │         │
    
[Exemplo: Add Aula]
    │
    ├─ Data/Hora
    ├─ Duração (45/60/90/120 min)
    ├─ Endereço (local)
    └─ Botão "Criar Aula"
        │
    ┌───▼──────────────┐
    │ Apps Script cria │
    │ slot em Sheets   │
    │ e Calendar       │
    └───┬──────────────┘
        │
    ✅ Aula disponível para alunos agendarem

[Exemplo: Add Slot Pessoal]
    │
    ├─ Data/Hora
    ├─ Duração (livre, sem restrição)
    ├─ Descrição (ex: "Dentista", "Reunião")
    └─ Botão "Criar Bloqueio"
        │
    ┌───▼──────────────┐
    │ Apps Script cria │
    │ slot em Sheets   │
    │ e Calendar       │
    └───┬──────────────┘
        │
    ✅ Horário bloqueado (alunos não veem)
```

**Detalhes:**
- Professora escolhe entre **Aula** (disponível pro aluno agendar) ou **Pessoal** (bloqueio próprio)
- **Aula**: Data, Hora, Duração (45/60/90/120), Tag, Endereço
- **Pessoal**: Data, Hora, Duração (livre), Descrição (opcional)
- **Bulk Add**: apenas para Aulas (múltiplas aulas num período)
- Ambos os tipos sincronizam com Google Calendar automaticamente
- Professora vê **2 meses completos** (atual + próximo)
- Pode **alocar aulas fixas** para alunos (aulas já agendadas)

---

### Fluxo 5: Sincronização Google Calendar ↔ App ↔ Sheets

```
ARQUITETURA DE SINCRONIZAÇÃO:

Google Calendar (eventos manuais)
         ↑↓
    Apps Script Trigger
    (1-2h, background)
         ↓
   Google Sheets
   (source of truth)
    ↑↓   ↑↓
 PWA     PWA
Professor Aluno

```

---

## **Estratégia:**

### **Trigger (Background - 1 a 2h):**
```
Apps Script Trigger (rodando automaticamente)
  ↓
Lê Google Calendar (últimos 2 meses)
  ↓
Compara com Google Sheets
  ↓
Sincroniza eventos que faltam em Sheets
  ↓
Mantém tudo consistente
```

### **PWA Professora:**
```
AUTOMÁTICO (após ações):
- Cria Aula → Apps Script cria no Calendar + Sheets
- Cria Pessoal → Apps Script cria no Calendar + Sheets
- Marca Presença → Apps Script atualiza Sheets
  ↓
Interface atualiza IMEDIATAMENTE

MANUAL (botão de sincronização):
[🔄 Sincronizar com Calendário]
  ↓
Força leitura do Calendar agora (não espera trigger)
  ↓
Atualiza Sheets com eventos manuais do Calendar
  ↓
Interface recarrega com dados sincronizados
```

### **PWA Aluno:**
```
AUTOMÁTICO (após ações):
- Agenda Aula → Apps Script cria no Calendar + Sheets
- Cancela Aula → Apps Script deleta no Calendar + Sheets
  ↓
Interface atualiza IMEDIATAMENTE

AO ABRIR A APP:
- Recarrega dados do Sheets
- Exibe slots disponíveis
  ↓
(Não precisa botão de sync com Calendar,
 pois aluno não cria eventos lá)
```

---

## **Detalhes Técnicos:**

**Google Sheets é o "Source of Truth":**
- Tudo que entra no Calendar é sincronizado para Sheets
- PWA lê dados apenas do Sheets
- Sheets é o ponto de controle (criações, deleções, etc)

**Fluxo Completo:**

```
CENÁRIO A: Professora cria AULA na APP

Professora clica "Novo Slot AULA" (app)
  ↓
Apps Script:
  1. Cria evento no Calendar com colorId = 8 (🔵 Azul)
  2. Atualiza Sheets com tipo="AULA"
  ↓
PWA Professora: mostra evento AULA (🔵 Azul)
PWA Aluno: recarrega, FILTRA tipo="AULA", mostra como disponível
  ↓
✅ Alunos veem slot disponível para agendar

CENÁRIO B: Professora cria PESSOAL na APP

Professora clica "Novo Slot PESSOAL" (app)
  ↓
Apps Script:
  1. Cria evento no Calendar com colorId = 1 (🔴 Vermelho)
  2. Atualiza Sheets com tipo="PESSOAL"
  ↓
PWA Professora: mostra evento PESSOAL (🔴 Vermelho)
PWA Aluno: recarrega, FILTRA tipo="PESSOAL", NÃO mostra
  ↓
✅ Horário bloqueado invisível para aluno (parece "vazio")

---
Apps Script:
  1. Cria evento no Calendar com colorId = 1 (🔴 Vermelho)
  2. Atualiza Sheets com tipo="PESSOAL"
  ↓
PWA Professora: mostra evento PESSOAL (🔴 Vermelho)
PWA Aluno: recarrega, FILTRA tipo="PESSOAL", NÃO mostra
  ↓
✅ Horário bloqueado invisível para aluno (parece "vazio")

---
Apps Script:
  1. Cria evento no Calendar com colorId = 1 (🔴 Vermelho)
  2. Atualiza Sheets com tipo="PESSOAL"
  ↓
PWA Professora: mostra evento PESSOAL (🔴 Vermelho)
PWA Aluno: recarrega, FILTRA tipo="PESSOAL", NÃO mostra
  ↓
✅ Horário bloqueado invisível para aluno (parece "vazio")

---
Apps Script:
  1. Cria evento no Calendar com colorId = 1 (🔴 Vermelho)
  2. Atualiza Sheets com tipo="PESSOAL"
  ↓
PWA Professora: mostra evento PESSOAL (🔴 Vermelho)
PWA Aluno: recarrega, FILTRA tipo="PESSOAL", NÃO mostra
  ↓
✅ Horário bloqueado invisível para aluno (parece "vazio")

---
Apps Script:
  1. Cria evento no Calendar com colorId = 1 (🔴 Vermelho)
  2. Atualiza Sheets com tipo="PESSOAL"
  ↓
PWA Professora: mostra evento PESSOAL (🔴 Vermelho)
PWA Aluno: recarrega, FILTRA tipo="PESSOAL", NÃO mostra
  ↓
✅ Horário bloqueado invisível para aluno (parece "vazio")

---

Professora clica [🔄 Sincronizar com Calendário]
  ↓
Apps Script executa sincronização AGORA (não espera trigger)
  ↓
Atualiza Sheets
  ↓
PWA recarrega interface
  ↓
✅ Dados atualizados em segundos
```

---

### Fluxo 6: Presença (Perspectiva Professora)

```
┌─────────────────────────────┐
│ Professora acessa histórico │
│ de aulas do mês             │
└────────────┬────────────────┘
             │
    ┌────────▼────────────┐
    │ Lista aulas         │
    │ (passadas e futuras)│
    └────────┬────────────┘
             │
   [Clica em aula]
             │
    ┌────────▼────────────────────┐
    │ Modal: Registrar Presença   │
    │ ☐ Compareceu               │
    │ ☐ Reagendado               │
    │ ☐ Cancelado                │
    └────────┬────────────────────┘
             │
   [Marca opção]
             │
        ┌────┴──────┐
        │           │
   ┌────▼──┐   ┌───▼─────┐   ┌─────▼──┐
   │Compare│   │Reagendado│  │Cancelado│
   │ceu    │   └───┬─────┘   └────┬────┘
   └────┬──┘       │              │
        │    [MODAL OBRIGATÓRIA]   │
        │          │              │
        │    Selecione:           │
        │    Data e Hora          │
        │    da REPOSIÇÃO         │
        │          │              │
        │    [Confirma]           │
        │          │              │
        ↓          ↓              ↓
    ┌────────────────────────────────┐
    │ Apps Script:                    │
    │ 1. Atualiza status no Sheets    │
    │ 2. Se Reagendado:               │
    │    - Cria novo slot de reposição
    │    - Registra data pagamento    │
    │ 3. Se Cancelado:                │
    │    - Marca como "sem reposição" │
    │    - DataPagamento = NULL       │
    └────────┬─────────────────────────┘
             │
    ✅ Registrado + Cobrança atualizada
```

**Detalhes:**
- Presença só é **visível** após a aula acontecer
- **Compareceu:** Aluno paga na data original (agora)
- **Reagendado:** Modal OBRIGATÓRIA para selecionar nova data
  - Cria novo slot de reposição automaticamente
  - Aluno pagará quando aula for realizada (data nova)
- **Cancelado:** Sem reposição, aluno não paga
- Histórico fica apenas das aulas com presença marcada como "Compareceu"
- Futura integração com Google Sheets para relatórios de cobrança

---

### Fluxo 7: Alocação de Aulas Fixas (Perspectiva Professora)

```
┌──────────────────────────────┐
│ Professora criou BULK slots  │
│ (ex: Terça/Quinta, 14h)      │
└────────────┬─────────────────┘
             │
    ┌────────▼────────────────┐
    │ Clica "Alocar Aluno"    │
    │ na tela de Slots        │
    └────────┬────────────────┘
             │
    ┌────────▼──────────────────────┐
    │ Modal: Alocar Aula Fixa       │
    │                               │
    │ [Selecionar Aluno]            │
    │ [Selecionar Dias da Semana]   │
    │ ☐ Segunda ☐ Terça            │
    │ ☐ Quarta ☐ Quinta            │
    │ ☐ Sexta   ☐ Sábado           │
    │                               │
    │ [Horário: 14:00]              │
    │ [Duração: 60 min]             │
    │                               │
    │ [Período]                     │
    │ De: 2024-01-01                │
    │ Até: 2024-02-29               │
    │                               │
    │ [Confirma]                    │
    └────────┬──────────────────────┘
             │
  [Professora confirma]
             │
    ┌────────▼────────────────────┐
    │ Apps Script:                │
    │ 1. Marca slots como         │
    │    "alocado_ALUNO_001"      │
    │ 2. Marca alunoAlocado no    │
    │    campo de cada slot       │
    │ 3. Atualiza Sheets          │
    │ 4. Cria eventos no Calendar │
    └────────┬────────────────────┘
             │
    ✅ Aulas fixas alocadas
      Aluno possui terça e quinta
      Professor sabe que está reservado
```

**Detalhes:**
- Professora aloca após criar BULK slots
- Seleciona quais dias da semana (terça, quinta, etc)
- Define período de validade
- Slots fica marcado como "alocado" pra aquele aluno
- Aluno sempre terá aquele horário (em FASE 2 ele vê)
- **Reagendamento:** Se aluno não pode na terça, marca presença como "Reagendado" + nova data (quarta)
- Novo slot de reposição é criado automaticamente

---

## Features Detalhadas

### Feature 1: Autenticação & Login

**Requisitos:**
- Sistema de login simples com 2 botões: "Professora" e "Aluno"
- Ambos fazem login apenas com **ID único**
- Sem senhas, sem emails
- Armazenamento: Google Sheets (aba "Usuarios")
- Sessão com localStorage (suporta offline)

**Fluxo Técnico:**
1. Usuário seleciona o tipo (Professora ou Aluno)
2. Digita seu ID
3. Frontend envia ID + tipo para Apps Script
4. Apps Script valida contra Google Sheets
5. Se existe: retorna token/sessionId e tipo de usuário
6. Se não existe: mensagem "ID não encontrado"
7. Frontend armazena token em localStorage
8. Todas as requisições usam token para validação

**Interface de Login:**
```
┌─────────────────────────┐
│   SELECIONE SEU TIPO    │
│                         │
│ [Professora]  [Aluno]   │
│                         │
│ ID: _________________   │
│                         │
│      [Entrar]           │
└─────────────────────────┘
```

**Dados Armazenados:**

Aba **Usuarios** (Google Sheets):
```
| ID | Nome | Tipo | DataCadastro | Status |
|----|------|------|--------------|--------|
| prof_sofia | Sofia | PROFESSORA | 2024-01-01 | ativo |
| aluno_001 | João | ALUNO | 2024-02-15 | ativo |
| aluno_002 | Maria | ALUNO | 2024-02-15 | ativo |
```

**Validações:**
- ID obrigatório
- ID deve existir na planilha
- Tipo (PROFESSORA/ALUNO) deve bater com a linha da planilha
- Status deve ser "ativo"

---

### Feature 2: Calendário (Aluno)

**Requisitos:**
- Visualização mensal interativa
- Slots com cores diferenciadas (disponível, ocupado, próprio agendamento)
- Mês atual sempre visível
- Mês seguinte visível se estiver na última semana do mês atual
- Mobile-first design
- **Sincronização com Sheets (source of truth) - não sincroniza direto com Calendar**
- **IMPORTANTE: Aluno VÊ APENAS slots do tipo AULA (slots PESSOAL são filtrados/invisíveis)**

**O que Aluno vê:**
```
Apenas AULAS criadas pela professora
- Aulas disponíveis (pode agendar)
- Aulas ocupadas (outros alunos)
- Suas aulas agendadas

O que Aluno NÃO vê:
- Slots Pessoais (bloqueios da professora)
- Aquele horário aparece simplesmente "vazio"
- É como se não houvesse nada ali
```

**Interações:**
- Click em slot vazio (AULA) → abre modal agendamento
- Click em slot próprio (AULA) → opções (cancelar)
- Swipe para mudar mês (mobile)
- **Ao abrir app:** recarrega dados do Sheets (filtrando apenas AULAS)

**Sincronização (Aluno):**
```
✅ AUTO: Após agendar/cancelar
   → Apps Script atualiza Sheets
   → PWA recarrega interface (filtra AULAS)

✅ AUTO: Ao abrir a app
   → Recarrega dados do Sheets
   → Filtra e exibe APENAS slots tipo AULA
   → Slots PESSOAL são excluídos da visualização

❌ SEM botão "Sincronizar"
   → Aluno não cria eventos no Calendar manualmente
   → Só sincroniza com Sheets
```

**Estados de Slot (visíveis para aluno):**
```
🟢 Verde: Aula disponível (pode agendar)
🔴 Vermelho: Aula ocupada (outro aluno agendado)
🔵 Azul: Sua aula (pode cancelar)
⚪ VAZIO: Nada (hora com slot pessoal da prof, mas não aparece)
```

**O que é filtrado (ALUNO NÃO VÊ):**
```
⚫ Preto/Cinza: Slots Pessoal (bloqueios da professora)
   → Estes horários parecem "vazios" pro aluno
   → Tecnicamente bloqueados, mas invisíveis
```

---

### Feature 3: Calendário (Professora)

**Requisitos:**
- Visualização mensal interativa (2 meses simultâneos)
- Criação de 2 tipos de slots: **Aula** e **Pessoal**
- Slots de Aula podem ter "endereço/local"
- Criação de slots individuais ou em **bulk** (apenas Aula)
- Possibilidade de **alocar aula fixa** para aluno
- Sincronização automática com Google Calendar (eventos pessoais importados)
- **Botão para forçar sincronização com Calendar (sob demanda)**
- **Cores diferenciadas no Google Calendar (Aula ≠ Pessoal)**

**O que Professora vê:**
```
TODAS as aulas + TODOS os bloqueios pessoais
- Tem controle total da agenda
- Vê o que alunos podem agendar (AULAS)
- Vê o que está bloqueado (PESSOAL)
```

**Interações:**
- Click em slot → detalhes/editar
- Click em "+Novo Slot" → abre modal com escolha de tipo (Aula ou Pessoal)
- Click em "Bulk Add" → modal para múltiplos slots (apenas Aula)
- Click em "Alocar Aluno" → seleciona aluno + horário fixo
- **Click em "🔄 Sincronizar com Calendário"** → força leitura do Calendar agora
- Badge de aviso: "⚠️ X eventos pessoais no Calendar" (topo da tela)

**Tipos de Slot:**

**Slot AULA:**
```
- Data/Hora/Duração (45, 60, 90, 120 minutos)
- Endereço/Local
- Disponível para alunos agendarem
- Cor no Calendar: AZUL (profissional)
```

**Slot PESSOAL:**
```
- Data/Hora/Duração (livre, sem restrição)
- Descrição opcional (ex: "Dentista", "Reunião", "Ginástica")
- Bloqueado (alunos NÃO veem como disponível)
- Pode ser criado na app OU sincronizado automaticamente do Google Calendar
- Cor no Calendar: VERMELHO (pessoal)
```

**Estados de Slot:**
```
🟢 Verde: Disponível (slot Aula vazio, nenhum aluno agendado)
🔴 Vermelho: Ocupado (slot Aula com aluno agendado)
🟡 Amarelo: Alocado fixo (aula fixa do aluno no slot Aula)
⚫ Preto/Cinza: Pessoal bloqueado (slot Pessoal criado na app OU evento importado do Google Calendar)
```

**Cores no Google Calendar:**
```
AULA: 🔵 Azul (Blueberry)
      → Visível para professora
      → Visível para alunos (como horários disponíveis)

PESSOAL: 🔴 Vermelho (Tomato)
         → Visível apenas para professora
         → Invisible para alunos (não aparece na PWA)
```

---

### Feature 4: Alocação de Aulas Fixas (FASE 1)

**Objetivo:** Professora aloca slots recorrentes a alunos específicos (aulas fixas)

**Requisitos:**
- Criar bulk de slots (ex: Terça/Quinta, 14h-15h, próximas 4 semanas)
- Alocar esses slots a um aluno específico
- Slots alocados aparecem "reservados" no calendário
- Aluno pode reagendar uma aula fixa específica (one-off, não afeta padrão)
- Se aluno mudar permanentemente (era terça, agora segunda), criar novo bulk

**Fluxo de Alocação Fixa:**

```
Professora quer alocar aulas fixas do João
  ↓
1. Clica "Bulk Add"
   - Seleciona: Terça + Quinta
   - Horário: 14:00-15:00
   - Duração: 60 min
   - Próximas 4 semanas
   ↓
2. Sistema cria 8 slots (4 terças + 4 quintas)
   ↓
3. Professora clica "Alocar Aluno"
   - Seleciona: João
   - Aplica para: Estes 8 slots de terça/quinta
   ↓
4. Sistema:
   - Marca 8 slots como "alocados pro João"
   - Estes slots não ficam disponíveis para outros alunos
   - Alunos não veem na FASE 2 (agenda privada do João)
   ↓
✅ João tem aulas fixas terça/quinta
```

**Reagendamento One-Off (não afeta padrão):**

```
João não pode ESTA terça, reagenda para quarta
  ↓
Professora marca presença: "Reagendado"
  ↓
Modal OBRIGATÓRIA: seleciona quarta (mesma semana)
  ↓
Sistema:
  - Cria novo agendamento pra quarta
  - Terça fica "livre" (pois foi reagendada)
  - Próxima terça (semana que vem) permanece alocada pro João
  ↓
✅ Reagendamento one-off, padrão continua
```

**Mudança Permanente de Padrão:**

```
João quer mudar: era terça/quinta, agora segunda/quarta
  ↓
Professora:
  1. Desativa alocação anterior (terça/quinta)
  2. Cria novo bulk (segunda/quarta)
  3. Aloca novo bulk pro João
  ↓
✅ Novo padrão estabelecido
```

**Campos Necessários:**
```
- AlunoAlocado: "ALUNO_001" (qual aluno está alocado)
- PadraoRecorrente: "TER,QUI" (qual padrão)
- DataInicioAlocacao: "2024-01-01"
- DataFimAlocacao: null (se ongoing) | "2024-02-28" (se terminar)
```

---

### Feature 4B: Agendamento (FASE 2 - Aluno)

**Requisitos (Aluno - FASE 2):**
- Modal simples: data/hora + email Gmail
- Validação: mínimo 1 dia de antecedência
- Após confirmar: slot fica indisponível imediatamente
- Email de confirmação via Google Calendar
- NÃO pode agendar slots alocados (já ocupados)

**Validações:**
- Não permitir agendamento < 1 dia
- Não permitir slots sobrepostos
- Sincronizar com eventos Google Calendar existentes

---

### Feature 5: Cancelamento

**Requisitos:**
- Aluno clica "Cancelar" em aula agendada
- Sistema valida: falta 1 dia?
- ✅ SIM: Abre modal pedindo para contatar professora manualmente
- ❌ NÃO: Bloqueia cancelamento
- Se aluno confirma: deleta evento Calendar + atualiza Sheets

**Fluxo:**
1. Aluno clica "Cancelar"
2. Sistema verifica data/hora atual vs data agendada
3. Se < 1 dia: "Entre em contato com a professora"
4. Se ≥ 1 dia: Pede confirmação
5. Apps Script deleta evento Calendar
6. Email enviado ao aluno (confirmação)
7. Professora notificada (via integração futura)

---

### Feature 6: Notificações

**Requisitos:**
- ✅ Convite Google Calendar (automático quando aluno agenda)
- ✅ Email de confirmação agendamento (via Gmail)
- ✅ Email de cancelamento (via Gmail)
- ✅ Lembrete 1h antes (Google Calendar nativo)
- ❌ Push notification (Phase 2, quando migrar pra Expo)

**Implementação:**
- Aproveitar notificações nativas do Google Calendar
- Aluno recebe email + notificação no Calendar automaticamente
- Lembrete é configurável no Calendar do aluno (padrão: 1h)

---

### Feature 7: Controle de Presença

**Requisitos:**
- Após aula acontecer, professora marca presença
- Opções: "Compareceu", "Reagendado", "Cancelado"
- **Se "Reagendado":** Modal obrigatória para selecionar nova data da aula
- Interface simples (radio buttons ou abas)
- Histórico só mostra aulas com "Compareceu"

**Fluxo de Presença:**

```
┌─────────────────────────────┐
│ Aula foi realizada          │
│ Professora marca presença   │
└────────────┬────────────────┘
             │
    ┌────────▼────────────────┐
    │ 3 Opções:              │
    │ ☐ Compareceu           │
    │ ☐ Reagendado           │
    │ ☐ Cancelado            │
    └────────┬────────────────┘
             │
    ┌────────┴────────┬────────────┐
    │                 │            │
┌───▼────┐      ┌────▼─────┐ ┌───▼────┐
│Compareceu│   │Reagendado │ │Cancelado│
└────┬────┘     └────┬─────┘ └───┬────┘
     │              │            │
     │         [MODAL OBRIGATÓRIA]
     │              │
     │         Selecione a 
     │         nova data/hora
     │              │
     │         [Confirma]
     │              │
     ↓              ↓              ↓
COBRANÇA:    COBRANÇA:      COBRANÇA:
Data orig.   Data nova      NÃO COBRA
Aluno        Aluno          (Cancelado
paga agora   paga quando    sem reposição)
             aula for
             realizada
```

**Campos de Presença:**
```
- ID Aula
- Aluno
- Data/Hora Original
- Status (Compareceu / Reagendado / Cancelado)
- Data Reagendamento (preenchido se Reagendado)
- Data Registro
```

**Lógica de Cobrança (CRÍTICO):**
```
COMPARECEU:
  → Aula realizada na data original
  → Aluno paga AGORA (data original)
  → Sem reposição
  
REAGENDADO:
  → Aula será realizada em NOVA DATA (selecionada obrigatoriamente)
  → Aluno paga quando a aula for realizada (data nova)
  → Com reposição (nova data está agendada)
  → Cria novo slot automático com a data reagendada
  
CANCELADO:
  → Aula não é reposta
  → Aluno NÃO paga
  → Sem reposição
```

**Relatórios (Phase 2):**
- Google Sheets servira para análise manual
- Futuramente: dashboard de cobrança com data de pagamento baseada em status

---

### Feature 8: Gerenciamento de Alunos (Professora)

**Requisitos:**
- Cadastrar novo aluno (nome, email, ID único)
- Listar alunos ativos
- Ativar/Desativar aluno
- Ver histórico de agendamentos do aluno

**Campos:**
```
- ID único
- Nome
- Email (Gmail)
- Data cadastro
- Status (ativo/inativo)
- Total aulas agendadas
- Total comparecimentos
```

---

### Feature 9: Locais (FASE 1) & Tags (FASE 3)

**Requisitos (Locais - FASE 1):**
- Professora informa local/endereço no slot do tipo **AULA**
- Exemplos: "Studio Downtown", "Parque Central", "Online"
- Facilita logística profissional (professora sabe pra onde ir)
- Quando Phase 2, alunos veem local ao agendar (informação importante)

**Requisitos (Tags - FASE 3):**
- ❌ NÃO implementar na FASE 1
- Será adicionado na FASE 3 para organização avançada
- Professora poderá criar tags (Força, Funcional, Cardio, etc)
- Tags aplicadas apenas em slots tipo AULA
- Servem para filtros e relatórios avançados

**Slots Pessoais:**
- NÃO usam Endereço (apenas descrição opcional: "Dentista", "Reunião", etc)
- NÃO usam Tags

---

### Feature 10: Alocação de Aulas Fixas (FASE 1)

**Requisitos:**
- Professora aloca slots de Aula para alunos específicos
- Cria recorrência (ex: Terça e Quinta, 14h-15h)
- Define período de validade (de/até)
- Aluno fica com essas aulas "reservadas" 
- Permite reagendamento one-off (terça → quarta, mas mantém a recorrência)

**Workflow:**
1. Professora cria BULK slots (ex: Terça/Quinta, todas as 4 semanas)
2. Clica "Alocar Aluno" → Modal
3. Seleciona:
   - Qual aluno
   - Quais dias da semana (Terça, Quinta)
   - Período de validade
4. Confirma → Slots ficam marcados como "alocado"

**Fluxo de Reagendamento:**
```
Aluno tem aula fixa TERÇA
Terça 14h chega, aluno não pode
Professora marca presença: "Reagendado"
Seleciona nova data: QUARTA
  ↓
Apps Script cria novo slot QUARTA (reposição)
Aluno paga pela QUARTA
MAS a aula fixa TERÇA continua sendo dele nas próximas semanas
```

**Dados:**
- Campo `alunoAlocado` em cada slot (ex: "ALUNO_001")
- Campo `diasFixos` (array de dias: [2, 4] para Terça/Quinta)
- Campo `periodoAlocacaoInicio` e `periodoAlocacaoFim`
- Quando reagendado: novo slot é criado, mas alocação original se mantém

**Visualização:**
- Dashboard mostra: "João: Terça e Quinta (14h-15h) - até 29/02"
- Calendário destaca slots alocados com cor diferente (ex: amarelo)
- Quando aluno não pode: fácil marcar como "Reagendado"

---

## Especificações Técnicas

### Frontend (React PWA)

**Estrutura de Pastas:**
```
/src
  /components
    /Auth
      - LoginProfessora.jsx
      - LoginAluno.jsx
    /Calendar
      - CalendarAluno.jsx
      - CalendarProfessora.jsx
    /Modals
      - ModalAgendarAula.jsx
      - ModalCancelamento.jsx
      - ModalNovoSlot.jsx
      - ModalBulkSlots.jsx
    /Dashboard
      - DashProfessora.jsx
      - DashAluno.jsx
    /Common
      - Header.jsx
      - Footer.jsx
      - LoadingSpinner.jsx
  /utils
    - apiClient.js (chamadas Apps Script)
    - dateHelpers.js
    - validators.js
  /styles
    - globals.css
    - responsive.css (mobile-first)
  App.jsx
  index.jsx
```

**Dependências sugeridas:**
```json
{
  "react": "^18.0",
  "react-dom": "^18.0",
  "react-calendar": "^4.0" // ou simple custom calendar
  "axios": "^1.4" // ou fetch API
}
```

**PWA Setup:**
- manifest.json (app metadata)
- service-worker.js (offline support)
- Icons (favicon, 192px, 512px)

---

### Backend (Google Apps Script)

**Estrutura do Código:**
```javascript
// deployedUrl = https://script.google.com/macros/d/{SCRIPT_ID}/usercontent

// ===== AUTENTICAÇÃO =====
function validarLogin(id, tipo) {
  // Procura ID na aba "Usuarios"
  // Verifica se tipo (PROFESSORA/ALUNO) bate
  // Verifica se status é "ativo"
  // Retorna token se válido, null se inválido
}

function validarSessao(token) {
  // Verifica se token ainda é válido
}

// ===== SLOTS =====
function criarSlot(data, hora, duracao, tag, endereco) {
  // Cria slot em Sheets
  // Retorna ID do slot
}

function criarSlotsBulk(dataInicio, dataFim, horarios, duracao) {
  // Cria múltiplos slots
}

function listarSlots(mes, ano) {
  // Retorna slots do mês para frontend
}

function getSlotsProfessora(mes, ano) {
  // Retorna 2 meses para professora
}

// ===== AGENDAMENTO =====
function agendarAula(slotId, alunoId, emailAluno) {
  // 1. Valida slot (disponível?)
  // 2. Cria evento Google Calendar
  // 3. Atualiza Sheets
  // 4. Retorna confirmação
}

function cancelarAula(agendamentoId, alunoId) {
  // 1. Valida (pode cancelar?)
  // 2. Deleta evento Calendar
  // 3. Atualiza Sheets
  // 4. Envia email cancelamento
}

// ===== PRESENÇA =====
function marcarPresenca(alunoId, agendamentoId, status) {
  // status: "Compareceu" | "Reagendado" | "Cancelado"
  // Atualiza Sheets
}

// ===== SINCRONIZAÇÃO CALENDAR → SHEETS =====
function sincronizarCalendarComSheets() {
  // Trigger automático (1-2h)
  // Roda em background, sem ação do usuário
  // Lê eventos do Google Calendar
  // Atualiza Sheets com eventos novos/deletados
  // Mantém tudo consistente
}

function sincronizarCalendarComSheetsNow() {
  // Função auxiliar para sincronização sob demanda
  // Chamada pelo botão "Sincronizar" da professora
  // Força sync AGORA (não espera trigger)
}

// ===== UTILITÁRIOS =====
function doPost(e) {
  // Endpoint único para requisições
  // Roteia para funções acima
}
```

**Triggers (Automação):**
- **Sincronização Calendar → Sheets:** A cada **1-2 horas** (background, automático)
- **Sincronização PWA → Sheets:** **Sob demanda** (após ações ou ao abrir app)
- **Botão Professora:** "🔄 Sincronizar com Calendário" (força sync imediata)
- **Botão Aluno:** Nenhum (sincroniza apenas ao abrir/interagir)

---

### Google Sheets (Banco de Dados)

**Abas Necessárias:**

#### 1. `Usuarios`
```
| ID | Nome | Tipo | DataCadastro | Status |
|----|------|------|--------------|--------|
| prof_sofia | Sofia | PROFESSORA | 2024-01-01 | ativo |
| aluno_001 | João | ALUNO | 2024-02-15 | ativo |
| aluno_002 | Maria | ALUNO | 2024-02-20 | ativo |
| aluno_003 | Pedro | ALUNO | 2024-02-20 | inativo |
```

#### 2. `Slots`
```
| SlotId | Tipo | Data | HoraInicio | Duracao | Endereco | Descricao | Status | AlunoAlocado | DiasFixos | PeriodoAlocacaoIni | PeriodoAlocacaoFim | GoogleEventId | SincronizadoDe | CriadoEm |
|--------|------|------|-----------|---------|----------|-----------|--------|---|---|---|---|---|---|---|
| SLOT_001 | AULA | 2024-01-15 | 10:00 | 60 | Studio Downtown | - | disponivel | NULL | [] | NULL | NULL | evt_abc123 | APP | 2024-01-01 |
| SLOT_002 | AULA | 2024-01-15 | 14:00 | 45 | Parque | - | ocupado | NULL | [] | NULL | NULL | evt_def456 | APP | 2024-01-01 |
| SLOT_003 | PESSOAL | 2024-01-15 | 15:00 | 60 | - | Dentista | bloqueado | NULL | [] | NULL | NULL | evt_ghi789 | CALENDAR | 2024-01-14 |
| SLOT_004 | AULA | 2024-01-20 | 18:00 | 90 | Studio Downtown | - | alocado | ALUNO_001 | [2,4] | 2024-01-01 | 2024-02-29 | evt_jkl012 | APP | 2024-01-01 |
```

**Legenda:**
- **Status "alocado":** Slot reservado para um aluno específico (aula fixa)
- **DiasFixos:** Array JSON [1=seg, 2=ter, 3=qua, 4=qui, 5=sex, 6=sab, 0=dom] (ex: [2,4] = Terça e Quinta)
- **PeriodoAlocacao:** Validade da alocação (ex: de 01/01 até 29/02)

---
```
| AgendId | SlotId | AlunoId | DataAgendamento | StatusPresenca | DataReagendamento | SlotReagendId | DataCancelamento | DataPagamento | EventoGoogleId |
|---------|--------|---------|-----------------|----------------|-------------------|---|---|---|---|
| AGEND_001 | SLOT_001 | ALUNO_001 | 2024-01-10 | Compareceu | NULL | NULL | NULL | 2024-01-10 | evt_abc123 |
| AGEND_002 | SLOT_002 | ALUNO_002 | 2024-01-15 | Reagendado | 2024-01-22 | SLOT_003 | NULL | 2024-01-22 | evt_def456 |
| AGEND_003 | SLOT_004 | ALUNO_003 | 2024-01-16 | Cancelado | NULL | NULL | 2024-01-16 | NULL | evt_ghi789 |
```

**Legenda COBRANÇA:**
- **Compareceu:** DataPagamento = DataAgendamento (paga agora)
- **Reagendado:** DataPagamento = DataReagendamento (paga quando aula for realizada)
- **Cancelado:** DataPagamento = NULL (não cobra, sem reposição)

---

#### 4. `Presenca`
```
| PresencaId | AgendId | AlunoId | Status | DataRegistro | DataReagendamento | Notas |
|----------|--------|---------|--------|--------------|-------------------|-------|
| PRES_001 | AGEND_001 | ALUNO_001 | Compareceu | 2024-01-10 | NULL | - |
| PRES_002 | AGEND_002 | ALUNO_002 | Reagendado | 2024-01-15 | 2024-01-22 | Aluno pediu para reagendar |
| PRES_003 | AGEND_003 | ALUNO_003 | Cancelado | 2024-01-16 | NULL | Cliente cancelou |
```

#### 5. `Configuracoes` (opcional)
```
| Chave | Valor |
|-------|-------|
| EMAIL_PROFESSORA | sofia@gmail.com |
| GOOGLE_CALENDAR_ID | sofia@gmail.com |
| TIMEZONE | America/Sao_Paulo |
| DIAS_MINIMOS_ANTECEDENCIA | 1 |
```

**Nota:** Aba `Tags` será criada na FASE 3 para organização avançada

---

### Google Calendar API

**Integrações:**

1. **Criar Evento:**
```javascript
const event = {
  summary: `Aula - ${nomeAluno}`,
  description: `Personal Training ${tag}`,
  location: endereco,
  start: { dateTime: `${data}T${hora}:00` },
  end: { dateTime: `${data}T${horaFim}:00` },
  attendees: [{ email: emailAluno }],
  reminders: { useDefault: true }
};
calendar.events.insert({ calendarId: 'professora@gmail.com', resource: event });
```

2. **Sincronizar Eventos:**
```javascript
const events = calendar.events.list({
  calendarId: 'professora@gmail.com',
  timeMin: dataInicio,
  timeMax: dataFim
});
// Depois atualizar Sheets com horários ocupados
```

3. **Deletar Evento:**
```javascript
calendar.events.delete({
  calendarId: 'professora@gmail.com',
  eventId: googleEventId
});
```

---

## Estrutura de Dados

### Tipos de Objetos

#### Slot
```javascript
{
  slotId: "SLOT_001",
  tipo: "AULA" | "PESSOAL",
  data: "2024-01-15",
  horaInicio: "10:00",
  duracao: 60, // minutos (45, 60, 90, 120 para AULA, livre para PESSOAL)
  
  // Campos específicos de AULA
  endereco: "Studio Downtown", // apenas AULA
  
  // Campos específicos de PESSOAL
  descricao: "Dentista", // apenas PESSOAL (opcional)
  
  // Campos de ALOCAÇÃO (aulas fixas)
  alunoAlocado: null | "ALUNO_001", // se for aula fixa alocada
  diasFixos: [], // array de dias da semana [1=seg, 2=ter, 3=qua, 4=qui, 5=sex]
  periodoAlocacaoInicio: null | "2024-01-01",
  periodoAlocacaoFim: null | "2024-02-29",
  
  // Campos comuns
  status: "disponivel" | "ocupado" | "bloqueado" | "alocado",
  criadoEm: "2024-01-01T10:00:00Z",
  googleEventId: "evt_abc123", // ID do evento no Google Calendar
  sincronizadoDe: "APP" | "CALENDAR" // origem (criado na app ou importado do Calendar)
}
```

#### Agendamento
```javascript
{
  agendId: "AGEND_001",
  slotId: "SLOT_001",
  alunoId: "ALUNO_001",
  nomeAluno: "João Silva",
  emailAluno: "joao@gmail.com",
  dataAgendamento: "2024-01-10T14:30:00Z", // data original da aula
  googleEventId: "evt_abc123",
  statusPresenca: null | "Compareceu" | "Reagendado" | "Cancelado",
  
  // Campos de COBRANÇA e REPOSIÇÃO
  dataReagendamento: null | "2024-01-17T14:30:00Z", // nova data se reagendado
  slotReagendamentoId: null | "SLOT_002", // slot criado para reposição
  dataCancelamento: null | "2024-01-14T10:00:00Z", // quando foi cancelado
  
  // Lógica de COBRANÇA
  dataPagamento: null | "2024-01-10" | "2024-01-17",
  // Se Compareceu: dataPagamento = dataAgendamento
  // Se Reagendado: dataPagamento = dataReagendamento (quando aula for realizada)
  // Se Cancelado: dataPagamento = null (não cobra)
}
```

**Notas sobre cobrança:**
- **Compareceu:** Aluno paga na data original (dataAgendamento)
- **Reagendado:** Aluno paga quando a aula for realizada (dataReagendamento)
- **Cancelado:** Aluno NÃO paga (sem reposição)

#### Usuario
```javascript
{
  id: "ALUNO_001" | "PROFESSORA",
  nome: "João Silva",
  email: "joao@gmail.com",
  tipo: "ALUNO" | "PROFESSORA",
  senhaHash: "hash...", // apenas professora
  dataCadastro: "2024-01-01T10:00:00Z",
  status: "ativo" | "inativo"
}
```

---

## Roadmap de Implementação

### FASE 1: MVP Professora (Recursos 100% voltados à Professora)
**Objetivo:** Professora tem controle total da agenda, alunos, aulas recorrentes/fixas e presença

**O que faz:**
- ✅ Login Professora (ID único)
- ✅ **Gerenciamento de Alunos (CRUD)**
  - Cadastrar novo aluno (nome, ID único, email)
  - Listar alunos ativos/inativos
  - Editar aluno
  - Ativar/Desativar aluno
- ✅ Calendário Professora (criar aulas e bloqueios pessoais)
- ✅ Criação de Slots (individual ou BULK)
  - BULK: Criar múltiplos slots (ex: Terça/Quinta, 14h, próximas 4 semanas)
- ✅ **Alocação de Aulas Fixas para Alunos**
  - Alocar slots recorrentes a alunos específicos
  - Ex: "Slots de terça 14h alocados pro João"
  - Permite reagendamentos one-off (terça específica → quarta)
  - Mantém controle de recorrência + flexibilidade
- ✅ Locais/Endereços para gerenciar deslocamento
- ✅ Controle de Presença (Compareceu, Reagendado com nova data, Cancelado)
- ✅ **Dashboard com Estatísticas:**
  - Total de aulas criadas
  - Total de presenças
  - Total de reagendamentos (com data de reposição)
  - Total de cancelamentos
  - Horários mais utilizados
  - Aulas fixas por aluno
- ✅ Sincronização Google Sheets (dados persistem)
- ✅ Auto-refresh ao abrir app

**O que NÃO faz:**
- ❌ Login Aluno
- ❌ Visualização de slots por Aluno
- ❌ Agendamento de aulas (por aluno)
- ❌ Cancelamento de aulas (por aluno)
- ❌ Notificações/Emails Calendar
- ❌ Tags (para Phase 3)

**Duração:** ~3-4 semanas

**Deliverables:**
- PWA funcional (Professora + Gerenciamento Alunos + Aulas Fixas)
- Apps Script backend completo
- Google Sheets estruturada
- Dashboard com stats de presença, reagendamentos e aulas fixas por aluno

---

### FASE 2: Alunos + Agendamento
**Objetivo:** Alunos agendam suas aulas e recebem notificações

**O que adiciona:**
- ✅ Login Aluno (ID único)
- ✅ Calendário Aluno (visualizar slots disponíveis + aulas fixas alocadas)
- ✅ Agendamento de Aulas Esporádicas (aulas além das fixas)
- ✅ Cancelamento de Aulas (com validações)
- ✅ Sincronização Google Calendar + Email (convites)
- ✅ Notificações via Google Calendar (1h antes)
- ✅ Refinamentos UI/UX

**Duração:** ~2-3 semanas

**Dependência:** FASE 1 completa

---

### FASE 3: Inteligência & Relatórios (Future)
**Objetivo:** Dados para cobrança e análise

**O que adiciona:**
- ✅ Dashboard avançado (gráficos, tendências)
- ✅ Relatório mensal de cobrança (integração Sheets)
- ✅ Filtros e buscas avançadas
- ✅ Export de relatórios (PDF/CSV)
- ✅ Tags para organização (adicionado aqui)

**Duração:** ~2 semanas

---

### FASE 4: App Nativo (Future)
**Objetivo:** Migrar pra Expo + Firebase com notificações push

**Quando considerar:** 20+ alunos ou notificações push críticas

---

## Próximos Passos

### Antes de começar desenvolvimento:

1. **Configuração Google Cloud**
   - Criar projeto Google Cloud
   - Ativar APIs: Google Calendar API, Google Sheets API
   - Gerar credenciais (OAuth 2.0)

2. **Preparar Google Sheets**
   - Criar nova planilha
   - Estruturar abas (Usuarios, Slots, Agendamentos, Presenca, Tags, Configuracoes)
   - Adicionar dados iniciais (usuário professora, alguns alunos teste)

3. **Setup Google Apps Script**
   - Criar novo projeto Apps Script
   - Conectar com Google Sheets
   - Implementar funções backend (conforme spec)
   - Gerar URL de deployment

4. **Setup Frontend**
   - Criar projeto React (Vite ou Create React App)
   - Instalar dependências (react-calendar, axios, etc)
   - Implementar componentes (Auth, Calendar, Modals)
   - Testar com Apps Script deployment URL

5. **Testes**
   - Teste E2E (aluno agenda, evento aparece no Calendar, email chega)
   - Teste validações (não permitir agendamento < 1 dia, etc)
   - Teste mobile (responsividade em diferentes tamanhos)

6. **Deploy**
   - Frontend: GitHub Pages ou Google Drive (Hosting)
   - Backend: Google Apps Script (automático)
   - Documentação de acesso (URLs, credenciais)

---

## Notas Importantes

### Segurança
- **Senhas:** Salvar hasheadas (mesmo que simples)
- **Emails:** Validar formato e confirmar
- **Acesso:** Separar permissões (Professor ≠ Aluno)
- **Dados:** Google Sheets é suficiente para MVP (depois migrar se needed)

### Performance
- Sincronização Calendar: ~10 minutos (não é time-real, mas é ok para esse uso)
- Carregamento PWA: Otimizar com service workers
- Queries Sheets: Indexar por data/aluno para velocidade

### Manutenção
- Documentar todas as funções Apps Script
- Versionamento de código (GitHub)
- Backup automático Google Sheets
- Logs de operações (criar aba `Logs` se precisar debug)

---

## Perguntas Frequentes (FAQ)

**P: E se aluno agendar via app e depois deletar direto do Google Calendar?**
R: Será detectado na próxima sincronização (~10 min) e Sheets será atualizado. Slot volta a ficar disponível.

**P: Posso ter múltiplas professoras no futuro?**
R: MVP é pra 1 professora. Migração pra multi-tenant seria na FASE 4+ (Firebase).

**P: Alunos conseguem trocar de horário sem cancelar e reagendar?**
R: MVP não. Seria "cancelar + agendar novo". FASE 2 pode adicionar "remarcar" direto.

**P: Quanto custa isso?**
R: **Grátis.** Google Apps Script, Sheets, Calendar, Gmail = zero custo (seus planos Google já cobrem). Firebase na FASE 4 seria pago (mas tem free tier generoso).

**P: Aluno consegue ver histórico de aulas?**
R: Apenas aulas com presença "Compareceu" (conforme spec). FASE 3 pode expandir.

---

## Autores & Histórico

| Versão | Data | Autor | Notas |
|--------|------|-------|-------|
| 1.0 | Junho 2026 | Luccas + Claude | Especificação inicial |
| - | - | - | - |

---

**Documento finalizado. Pronto para carregar em conversa futura e começar desenvolvimento! 🚀**
