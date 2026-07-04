# Backend - Google Apps Script

Backend do aplicativo Personal Trainer desenvolvido em Google Apps Script.

## Setup Local

### Pré-requisitos
- Node.js 14+
- Google Cloud Project (com Apps Script habilitado)
- Google Sheets API habilitada
- Google Calendar API habilitada

### Instalação

1. **Instalar Clasp (Google Apps Script CLI)**
   ```bash
   npm install -g @google/clasp
   ```

2. **Autenticar com Google**
   ```bash
   clasp login
   ```

3. **Configurar Script ID**
   - Criar um novo Google Apps Script vazio em scripts.google.com
   - Copiar o ID do script
   - Editar `.clasp.json` e substituir `YOUR_SCRIPT_ID`

4. **Fazer Push do código**
   ```bash
   cd backend
   clasp push
   ```

## Estrutura de Arquivos

```
backend/
├── src/
│   ├── main.gs                 # Router principal
│   ├── auth.gs                 # Autenticação
│   ├── slots.gs                # Gerenciamento de slots
│   ├── agendamentos.gs         # Agendamentos
│   ├── calendar-sync.gs        # Sincronização Calendar
│   ├── sheet-utils.gs          # Utilitários Sheets
│   └── config.gs               # Configuração
├── .clasp.json                 # Config Clasp
└── README.md
```

## Deployment

### 1. Criar Web App Deployment

```bash
clasp deploy --description "v1.0"
```

Este comando retorna um ID de deployment. Use-o para criar o URL de acesso.

### 2. Configurar Permissões

Apps Script → Deploy → Novo deployment → Type: Web App
- Execute como: Usuário do Script
- Quem tem acesso: Qualquer pessoa (revisar depois para produção)

### 3. Pegar URL de Acesso

```
https://script.google.com/macros/d/{SCRIPT_ID}/usercontent
```

Use este URL no frontend em `VITE_API_URL`.

## Google Sheets Setup

O aplicativo usa as seguintes abas (sheets):

1. **Usuarios** - Usuários do sistema
   - Columns: ID | Senha | Nome | Email | Tipo | CriadoEm
   - Exemplo: prof_sofia | demo123 | Sofia | sofia@gmail.com | PROFESSORA | 2026-01-01T...

2. **Slots** - Horários de aulas
   - Columns: SlotId | Tipo | Data | HoraInicio | ... (17 colunas)

3. **Agendamentos** - Aulas agendadas para alunos
   - Columns: AgendId | SlotId | AlunoId | ... (9 colunas)

4. **Logs** - Logs de auditoria
   - Columns: Timestamp | Acao | Metadata | Detalhes | UserId

5. **SyncLogs** - Histórico de sincronizações
   - Columns: Id | DataSync | Status | SlotsProcessados | ... (7 colunas)

## APIs

### Autenticação
```
POST /api/login
Body: { id, senha, tipo }
Response: { token, user, expiresAt }
```

### Slots
```
GET /api/slots?month=YYYY-MM&role=PROFESSORA
POST /api/slots
PUT /api/slots/{slotId}
DELETE /api/slots/{slotId}
POST /api/slots/bulk
```

### Agendamentos
```
GET /api/agendamentos?month=YYYY-MM
DELETE /api/agendamentos/{agendId}
PUT /api/agendamentos/{agendId}/presenca
```

### Sincronização
```
POST /api/sync
GET /api/logs/sync?limit=50
GET /api/logs/audit?limit=50
```

### Health
```
GET /api/health
```

## Variáveis de Ambiente (Properties Service)

```javascript
PropertiesService.getUserProperties().setProperty("GOOGLE_CALENDAR_ID", "your-calendar-id@gmail.com")
```

## Desenvolvimento

### Local Testing

Use `clasp logs` para ver logs em tempo real:
```bash
clasp logs -n 10
```

### Deploy de Desenvolvimento

Crie um novo deployment para teste:
```bash
clasp deploy --description "dev"
```

## Troubleshooting

### "Unauthorized" em login
- Verificar se usuário existe na aba "Usuarios"
- Verificar senha (case-sensitive)

### Erro de "Calendar not found"
- Configurar `GOOGLE_CALENDAR_ID` via Properties Service
- Ou garantir que o calendário padrão está acessível

### Erro de "Sheet not found"
- Verificar se as abas existem no Sheets
- Executar `initializeSheet()` para cada aba necessária

## Performance & Quotas

- **Apps Script executions**: 20,000/dia (quota padrão)
- **Sheets API**: 300 requisições/minuto
- **Calendar API**: 10 eventos/segundo (recomendado)
- **Sincronização**: Executar max 1x a cada 10 minutos

## Roadmap Futuro

- [ ] Implementar Refresh Tokens
- [ ] Rate Limiting por IP
- [ ] Cache local com Service Worker
- [ ] Webhook para notificações em tempo real
- [ ] Integração WhatsApp/SMS
