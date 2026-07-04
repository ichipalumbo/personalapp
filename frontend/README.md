# Frontend - React + TypeScript

PWA (Progressive Web App) para o aplicativo Personal Trainer.

## Setup Local

### Pré-requisitos
- Node.js 16+
- npm ou yarn

### Instalação

1. **Instalar dependências**
   ```bash
   cd frontend
   npm install
   ```

2. **Configurar variáveis de ambiente**
   Criar `.env.local`:
   ```env
   VITE_API_URL=https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercontent
   ```

3. **Iniciar servidor de desenvolvimento**
   ```bash
   npm run dev
   ```
   Abrirá em http://localhost:3000

## Build para Produção

```bash
npm run build
```

Outputs em `dist/`

## Estrutura de Arquivos

```
frontend/
├── src/
│   ├── components/
│   │   ├── CalendarView.tsx        # Visualização do calendário
│   │   └── AgendamentosList.tsx    # Lista de agendamentos
│   ├── pages/
│   │   ├── LoginPage.tsx           # Tela de login
│   │   └── DashboardPage.tsx       # Dashboard principal
│   ├── services/
│   │   └── apiClient.ts            # Cliente de API
│   ├── hooks/
│   │   ├── useAuth.ts              # Hook de autenticação
│   │   └── useSlots.ts             # Hook de slots
│   ├── types/
│   │   └── index.ts                # Tipos TypeScript compartilhados
│   ├── utils/
│   │   └── ...                     # Utilitários
│   ├── App.tsx                     # Componente raiz
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Estilos globais
├── public/
│   └── ...                         # Assets estáticos
├── index.html                      # Template HTML
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Stack Tecnológico

- **Framework**: React 18
- **Linguagem**: TypeScript
- **Build**: Vite 4
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **HTTP Client**: Fetch API (nativa)

## Scripts

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview de produção local
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

### GitHub Pages

1. **Build o projeto**
   ```bash
   npm run build
   ```

2. **Push a pasta `dist/` para GitHub Pages**
   - Ou configure GitHub Actions para fazer deploy automático

### Google Drive / Firebase Hosting

- Apps Script pode servir arquivos estáticos
- Ou use Firebase Hosting com domínio customizado

## Autenticação

### Login
1. Insira ID da professora (ex: prof_sofia)
2. Insira senha
3. Backend valida credenciais na Sheet "Usuarios"
4. Token retornado é armazenado em `localStorage`

### Token Management
- Token expira em 2 horas
- Refresh token suportado em v1.1
- Logout limpa localStorage

## Características MVP

### Painel da Professora
- ✅ Calendário mês/semana/dia
- ✅ Criar/editar/deletar slots
- ✅ Visualizar agendamentos
- ✅ Marcar presença
- ✅ Sincronizar com Google Calendar
- ✅ Notificações básicas

### Roadmap v1.1+
- [ ] Histórico de aulas com notas
- [ ] Busca/filtro avançado
- [ ] Drag-and-drop reagendamento
- [ ] Dashboard de logs
- [ ] Rate limiting & refresh tokens

## Performance & Otimizações

- Lazy loading de componentes
- Memoização de hooks (useMemo, useCallback)
- Code splitting automático com Vite
- PWA com service worker (futuro)
- Offline support (futuro)

## Troubleshooting

### "API Error: 401 Unauthorized"
- Token expirado → fazer login novamente
- Backend não retornando token → verificar `/api/login`

### CORS errors
- Backend deve retornar `Content-Type: application/json`
- Verificar headers de resposta do Apps Script

### Calendário vazio
- Verificar se slots existem no Sheets
- Debug em Network tab para ver resposta `/api/slots`

## Development Tips

### Debug
- Abrir DevTools (F12)
- Network tab para ver requisições API
- Console para logs

### Environment Variables
```env
VITE_API_URL=...         # URL do backend
VITE_DEBUG=true          # Ativar logs de debug
```

## Testing (Futuro)

```bash
npm run test
npm run test:coverage
```

## Contribuindo

1. Criar branch: `git checkout -b feature/nova-feature`
2. Commit: `git commit -am 'Add nova feature'`
3. Push: `git push origin feature/nova-feature`
4. PR para `main`

## Roadmap Técnico

- **v1.0** (MVP)
  - Login básico
  - CRUD slots
  - Dashboard calendário
  - Presença manual

- **v1.1** (2-4 semanas)
  - Histórico + notas
  - Busca/filtro
  - Notificações in-app
  - Refresh tokens

- **v1.2** (4-8 semanas)
  - PWA offline
  - Service Worker
  - Relative improvements
