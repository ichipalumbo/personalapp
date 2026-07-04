# OPERATIONAL — Deploy & Credentials

## Google Cloud & APIs
- Criar projeto no Google Cloud
- Habilitar: Google Calendar API, Google Sheets API
- OAuth consent screen: configurar para o projeto (use conta proprietária da professora)
- Criar credenciais OAuth 2.0 (Client ID) para Apps Script deployment (ou usar Apps Script built-in scopes)

## Calendar ID
- Definir `GOOGLE_CALENDAR_ID` nas `Configuracoes` da Sheets (ex: sofia@gmail.com)
- Todas as operações de calendar usam esse calendarId

## Scopes recomendados
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/spreadsheets
- https://www.googleapis.com/auth/script.external_request

## Backups & Logs
- Criar aba `Logs` no Sheets para registrar operações importantes (create/agendar/cancel)
- Export periódico (drive export) ou cópia da planilha como backup

## Quotas
- Monitorar quotas de Calendar API e Apps Script (inserções e leituras em bulk)
- Evitar sincronizações mais frequentes que 10m sem necessidade

## Deploy
- Deploy Apps Script como Web App (Executar como: Usuário do script; Quem tem acesso: Qualquer pessoa, mesmo anônimo — revisar permissões)
- Gerar URL de deployment e usar no frontend `apiClient.js`

