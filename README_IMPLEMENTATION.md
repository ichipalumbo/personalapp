# README.md

> **Personal Trainer App** — Sistema de Agendamento de Aulas com Sincronização Google Calendar
>
> MVP v1.0 em desenvolvimento

## 📋 Visão Geral

Aplicativo PWA (Progressive Web App) para gerenciar agenda de aulas de personal trainer com integração automática ao Google Calendar. Desenvolvido em **React + TypeScript (frontend)** e **Google Apps Script (backend)**.

**Objetivo Principal:** Permitir que a professora de personal trainer gerencie sua agenda de alunos/aulas em conjunto com seu Google Calendar, mantendo sincronização bidirecional.

## 🎯 Status do Projeto

| Fase | Status | Data |
|------|--------|------|
| **Documentação & Especificação** | ✅ Concluído | Jun 2026 |
| **Setup & Estrutura** | ✅ Concluído | Ago 2026 |
| **Backend (Apps Script)** | 🔄 Em Progresso | Ago 2026 |
| **Frontend (React)** | 🔄 Em Progresso | Ago 2026 |
| **Testes & Deploy** | ⏳ Pendente | Set 2026 |
| **v1.1 Melhorias** | ⏳ Pendente | Out 2026 |

## 🚀 Quick Start

### Backend (Google Apps Script)

```bash
cd backend
npm install -g @google/clasp
clasp login
# Configurar .clasp.json com seu SCRIPT_ID
clasp push
```

[Ver Backend README](backend/README.md)

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
# Acesso em http://localhost:3000
```

[Ver Frontend README](frontend/README.md)

## 📁 Estrutura do Projeto

```
personalapp/
├── backend/                    # Google Apps Script
│   ├── src/
│   │   ├── main.gs            # Router de APIs
│   │   ├── auth.gs            # Autenticação
│   │   ├── slots.gs           # CRUD de slots
│   │   ├── agendamentos.gs    # CRUD de agendamentos
│   │   ├── calendar-sync.gs   # Sincronização Calendar
│   │   └── sheet-utils.gs     # Utilitários
│   ├── .clasp.json
│   └── README.md
│
├── frontend/                   # React + TypeScript
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   ├── services/          # API Client
│   │   ├── hooks/             # Custom hooks
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utilitários
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── README.md
│
├── docs/                       # Documentação adicional
│
├── personal_trainer_app_spec.md    # Especificação técnica
├── SPEC_API.md                     # Contract da API
├── OPERATIONAL.md                  # Deploy & credentials
├── TEST_PLAN.md                    # Plano de testes
├── SCHEMAS.json                    # Schemas de dados
├── README.md                       # Este arquivo
└── .gitignore
```

## 🔐 Segurança

### MVP (v1.0)
- ✅ Autenticação ID + Senha
- ✅ Validação de email (apenas Gmail)
- ✅ Token simples com expiração 2h
- ⚠️ CORS aberto (revisar antes de produção)

### v1.1
- [ ] Refresh tokens (7 dias)
- [ ] Rate limiting (login, API)
- [ ] Audit logs avançados
- [ ] CORS restrito

### v1.2
- [ ] OAuth 2.0 Google
- [ ] Hash de senhas (bcrypt)
- [ ] 2FA

## 📊 Plano de Melhorias

[Ver plano detalhado em `/memories/session/plan.md`](docs/IMPROVEMENTS.md)

**Resumo:**

### UX/Usabilidade
- Dashboard com calendário multi-view (mês/semana/dia)
- Indicador visual de sincronização
- Notificações in-app
- Busca/filtro de agendamentos

### Funcionalidades
- Histórico de aulas com notas
- Cancelamento em cascata de séries
- Blocos de horários recorrentes
- Relatório de frequência (CSV/PDF)
- Gerenciamento de lista de espera

### Confiabilidade
- Lock pessimista (evita conflitos)
- Retry automático (sync falhas)
- Checksum de integridade
- Cache local offline

## 🧪 Testing

### MVP (Manual)
- [x] Login com credenciais válidas/inválidas
- [x] CRUD slots (criar/editar/deletar)
- [x] Agendamentos e presença
- [ ] Sincronização Calendar ↔ Sheets
- [ ] Concorrência (2 agendamentos simultâneos)

### Automated Testing (v1.1)
```bash
npm run test          # Unit + integration
npm run test:e2e      # End-to-end (Playwright)
npm run test:load     # Load testing
```

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [personal_trainer_app_spec.md](personal_trainer_app_spec.md) | Especificação técnica completa |
| [SPEC_API.md](SPEC_API.md) | Contract da API (endpoints) |
| [OPERATIONAL.md](OPERATIONAL.md) | Deploy, credentials, infraestrutura |
| [TEST_PLAN.md](TEST_PLAN.md) | Plano de testes e casos críticos |
| [SCHEMAS.json](SCHEMAS.json) | Schemas JSON (Slot, Agendamento) |
| [backend/README.md](backend/README.md) | Setup e deployment backend |
| [frontend/README.md](frontend/README.md) | Setup e deployment frontend |

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** — UI library
- **TypeScript 5** — Type safety
- **Vite 4** — Build tool
- **Tailwind CSS 3** — Styling
- **Lucide React** — Icons

### Backend
- **Google Apps Script** — Serverless backend
- **Google Sheets API** — Database
- **Google Calendar API** — Calendário
- **Gmail API** — Notificações

### DevOps
- **GitHub** — Version control
- **Google Cloud** — Apps Script hosting
- **Firebase** (futuro) — Hosting frontend

## 👤 Autor

Desenvolvido para **Sofia** — Personal Trainer
Junho 2026

## 📝 Licença

Privado (para uso exclusivo)

## 🤝 Roadmap & Próximas Ações

### Imediatas (Semana 1-2)
- [ ] Completar backend (validações, sync)
- [ ] Integrar frontend com backend
- [ ] Testar MVP end-to-end
- [ ] Deploy inicial

### Curto Prazo (Semana 3-4)
- [ ] Histórico + notas/observações
- [ ] Busca/filtro de agendamentos
- [ ] Notificações in-app
- [ ] Dashboard de logs

### Médio Prazo (Semana 5-8)
- [ ] Confirmação de presença remota (aluno)
- [ ] Cache local offline
- [ ] Relatórios de frequência
- [ ] Gerenciamento lista de espera

### Longo Prazo (Futuro)
- [ ] Aplicativo mobile nativo (React Native)
- [ ] Integração WhatsApp
- [ ] Análises avançadas
- [ ] Escalabilidade para múltiplas professoras

## 📞 Suporte

Para dúvidas ou bugs, abra uma issue no GitHub ou entre em contato.

---

**Última atualização:** Agosto 2026  
**Status:** MVP em desenvolvimento 🚧
