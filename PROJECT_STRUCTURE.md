# 📐 Project Structure Overview

Visualização completa da estrutura do projeto criada.

## 🗂️ Árvore de Diretórios

```
personalapp/
│
├─── 📄 DOCUMENTAÇÃO
│    ├─ README.md                          ← Especificação original
│    ├─ README_IMPLEMENTATION.md           ← Novo! Visão geral implementação
│    ├─ GETTING_STARTED.md                 ← Novo! Guia de próximos passos
│    ├─ personal_trainer_app_spec.md       ← Especificação técnica
│    ├─ SPEC_API.md                        ← Contract da API
│    ├─ OPERATIONAL.md                     ← Deploy & credenciais
│    ├─ TEST_PLAN.md                       ← Plano de testes
│    ├─ SCHEMAS.json                       ← Schemas de dados
│    └─ .gitignore
│
├─── 📦 BACKEND (Google Apps Script)
│    └─ backend/
│        ├─ src/
│        │   ├─ main.gs                    ← Router principal (400 linhas)
│        │   ├─ auth.gs                    ← Autenticação login (150 linhas)
│        │   ├─ slots.gs                   ← CRUD Slots (250 linhas)
│        │   ├─ agendamentos.gs            ← CRUD Agendamentos (100 linhas)
│        │   ├─ calendar-sync.gs           ← Sync Calendar (200 linhas)
│        │   └─ sheet-utils.gs             ← Utilitários (200 linhas)
│        ├─ .clasp.json                    ← Configuração Clasp CLI
│        ├─ .gitignore
│        └─ README.md                      ← Setup backend
│
├─── 🎨 FRONTEND (React + TypeScript)
│    └─ frontend/
│        ├─ src/
│        │   ├─ components/
│        │   │   ├─ CalendarView.tsx       ← Calendário (150 linhas)
│        │   │   └─ AgendamentosList.tsx   ← Lista agendamentos (150 linhas)
│        │   │
│        │   ├─ pages/
│        │   │   ├─ LoginPage.tsx          ← Tela login (100 linhas)
│        │   │   └─ DashboardPage.tsx      ← Dashboard (200 linhas)
│        │   │
│        │   ├─ services/
│        │   │   └─ apiClient.ts           ← Cliente API (100 linhas)
│        │   │
│        │   ├─ hooks/
│        │   │   ├─ useAuth.ts             ← Hook autenticação (80 linhas)
│        │   │   └─ useSlots.ts            ← Hook slots (90 linhas)
│        │   │
│        │   ├─ types/
│        │   │   └─ index.ts               ← Types TypeScript (150 linhas)
│        │   │
│        │   ├─ utils/
│        │   │   └─ [utilitários futuros]
│        │   │
│        │   ├─ App.tsx                    ← Componente raiz
│        │   ├─ main.tsx                   ← Entry point
│        │   └─ index.css                  ← Estilos globais
│        │
│        ├─ public/
│        │   └─ [assets futuros]
│        │
│        ├─ index.html                     ← Template HTML
│        ├─ package.json                   ← Dependências
│        ├─ tsconfig.json                  ← Configuração TypeScript
│        ├─ vite.config.ts                 ← Configuração Vite
│        ├─ .env.example                   ← Variáveis de ambiente
│        ├─ .gitignore
│        ├─ README.md                      ← Setup frontend
│        └─ tailwind.config.js             ← Configuração Tailwind (gerado)
│
└─── 📚 DOCS (Documentação Adicional)
     └─ docs/
         └─ [arquivos de suporte]
```

---

## 📊 Distribuição de Código

```
BACKEND (Google Apps Script)      ≈ 1,100 linhas
├─ main.gs ........................... 400
├─ auth.gs ........................... 150
├─ slots.gs .......................... 250
├─ agendamentos.gs ................... 100
├─ calendar-sync.gs .................. 200
└─ sheet-utils.gs .................... 200

FRONTEND (React + TypeScript)      ≈ 1,200 linhas
├─ Components (CalendarView, AgendamentosList)  ≈ 300
├─ Pages (LoginPage, DashboardPage) ............  ≈ 300
├─ Services (apiClient) .......................... ≈ 100
├─ Hooks (useAuth, useSlots) .................... ≈ 170
├─ Types (index.ts) ............................ ≈ 150
├─ Config (index.html, main.tsx, App.tsx) ...... ≈ 150
└─ Styling (index.css) ......................... ≈ 30

DOCUMENTAÇÃO                       ≈ 2,000 linhas
├─ README_IMPLEMENTATION.md
├─ GETTING_STARTED.md
├─ backend/README.md
├─ frontend/README.md
└─ Plano de melhorias + notas

TOTAL APROXIMADO: ≈ 4,300 linhas
```

---

## 🔌 Integração Backend ↔ Frontend

```
┌──────────────────────────────────────────────────────┐
│              FRONTEND (React + Vite)                 │
│  ┌────────────────────────────────────────────────┐  │
│  │  Pages & Components                            │  │
│  │  ├─ LoginPage (inputs, form validation)        │  │
│  │  ├─ DashboardPage (abas, estado global)        │  │
│  │  ├─ CalendarView (calendário mês/semana/dia)  │  │
│  │  └─ AgendamentosList (presença, cancelamento) │  │
│  └──────────────────┬───────────────────────────┬┘  │
│                     │                           │    │
│  ┌────────────────┴───────────┬─────────────────┴──┐ │
│  │   Services & Hooks         │                   │ │
│  │  ┌──────────────────────┐  │                   │ │
│  │  │ apiClient.ts         │  │  useAuth()        │ │
│  │  │ - login()            │  │  useSlots()       │ │
│  │  │ - getSlots()         │  │                   │ │
│  │  │ - createSlot()       │  │                   │ │
│  │  │ - getAgendamentos()  │  │                   │ │
│  │  │ - updatePresenca()   │  │                   │ │
│  │  │ - syncCalendar()     │  │                   │ │
│  │  └──────────────────────┘  │                   │ │
│  └──────────────────┬──────────┴─────────────────┬┘ │
│                     │                           │   │
│     HTTPS/REST API  │ Bearer Token              │   │
└─────────────────────┼───────────────────────────┼───┘
                      │                           │
                      ▼                           ▼
┌──────────────────────────────────────────────────────┐
│        BACKEND (Google Apps Script)                  │
│  ┌────────────────────────────────────────────────┐  │
│  │ main.gs - Router                              │  │
│  │  ├─ doPost(e) → routeRequest()                │  │
│  │  └─ doGet(e)  → routeRequest()                │  │
│  └──────────────────┬───────────────────────────┬┘  │
│                     │                           │    │
│  ┌────────────────┴─────────────┬───────────────┴──┐ │
│  │ Handlers (Endpoints)         │ Validação       │ │
│  │ ├─ handleLogin()             │ ├─ isValidEmail │ │
│  │ ├─ handleGetSlots()          │ ├─ isValidDate  │ │
│  │ ├─ handleCreateSlot()        │ ├─ isValidTime  │ │
│  │ ├─ handleUpdatePresenca()    │ └─ validateToken│ │
│  │ ├─ handleSync()              │                │ │
│  │ └─ handleGetLogs()           │                │ │
│  └──────────────────┬──────────┬──────────────────┬┘ │
│                     │          │                 │   │
│  ┌────────────────┴──────────┴─────┐             │   │
│  │ Modules                          │             │   │
│  │ ├─ auth.gs (token, credentials) │             │   │
│  │ ├─ slots.gs (CRUD slots)        │             │   │
│  │ ├─ agendamentos.gs (CRUD agend) │             │   │
│  │ ├─ calendar-sync.gs (sync)      │             │   │
│  │ └─ sheet-utils.gs (helpers)     │             │   │
│  └──────────────────┬───────────────┘             │   │
│                     │                             │   │
└─────────────────────┼─────────────────────────────┼───┘
                      │                             │
           ┌──────────┴─────────────┬────────────────┘
           │                        │
           ▼                        ▼
    ┌────────────────┐      ┌───────────────┐
    │ Google Sheets  │      │ Google        │
    │ (Database)     │      │ Calendar API  │
    │                │      │               │
    │ ├─ Usuarios    │      │ (Events Sync) │
    │ ├─ Slots       │      │               │
    │ ├─ Agendamentos│      │               │
    │ └─ Logs        │      │               │
    └────────────────┘      └───────────────┘
```

---

## 🔄 Fluxo de Dados (Exemplo: Login)

```
1. USUARIO DIGITA CREDENCIAIS
   ↓
2. LoginPage.tsx captura ID + Senha
   ↓
3. apiClient.login(id, senha) enviado
   ↓
4. HTTPS POST → Backend
   ├─ URL: https://script.google.com/macros/d/.../usercontent
   ├─ Body: { id, senha, tipo: "PROFESSORA" }
   └─ Headers: { Content-Type: application/json }
   ↓
5. Backend: doPost(e) → routeRequest()
   ├─ path = "/api/login"
   └─ method = "POST"
   ↓
6. handleLogin(payload)
   ├─ Validar id + senha
   ├─ Consultar Sheet "Usuarios"
   ├─ Gerar token JWT (base64)
   └─ Retornar { token, user, expiresAt }
   ↓
7. Frontend recebe response
   ├─ Salvar token em localStorage
   ├─ Salvar user em localStorage
   └─ Redirecionar para Dashboard
   ↓
8. USUARIO LOGADO ✅
```

---

## 📝 Configuração Necessária

### Backend (Apps Script)
```javascript
// Após fazer push via Clasp:
// 1. Deploy como Web App
// 2. Pega URL: https://script.google.com/macros/d/{SCRIPT_ID}/usercontent
// 3. Configurar GOOGLE_CALENDAR_ID (opcional para MVP)
```

### Frontend (React)
```env
# .env.local
VITE_API_URL=https://script.google.com/macros/d/{SCRIPT_ID}/usercontent
VITE_DEBUG=true
```

### Google Sheets
```
Abas necessárias:
1. Usuarios (ID | Senha | Nome | Email | Tipo | CriadoEm)
2. Slots (SlotId | Tipo | Data | HoraInicio | ... 17 colunas)
3. Agendamentos (AgendId | SlotId | AlunoId | ... 9 colunas)
4. Logs (Timestamp | Acao | Metadata | Detalhes | UserId)
5. SyncLogs (Id | DataSync | Status | ... 7 colunas)
```

---

## ✅ Checklist de Setup

- [ ] Backend deployado no Apps Script
  - [ ] Push via Clasp
  - [ ] Deployment criado
  - [ ] URL gerada

- [ ] Google Sheets criada
  - [ ] 5 abas inicializadas
  - [ ] Usuário demo criado (prof_sofia)

- [ ] Frontend configurado
  - [ ] npm install
  - [ ] .env.local com VITE_API_URL
  - [ ] npm run dev

- [ ] Testes iniciais
  - [ ] Login funciona
  - [ ] GET /api/slots retorna []
  - [ ] POST /api/slots cria slot
  - [ ] Dashboard mostra calendário

---

## 🎯 Status Atual

```
├─ ✅ Estrutura criada (100%)
├─ ✅ Backend codificado (90%)
│  └─ ⏳ Deploy + testes (0%)
├─ ✅ Frontend codificado (85%)
│  └─ ⏳ Integração + testes (10%)
└─ ✅ Documentação (100%)
   └─ ⏳ Atualizar conforme avança
```

---

**Estrutura pronta para começar!** 🚀
