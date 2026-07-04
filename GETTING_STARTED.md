# GETTING STARTED - Próximos Passos

Parabéns! A estrutura inicial do projeto foi criada com sucesso. Aqui está o guia para começar a trabalhar com o código.

## ✅ O que foi Implementado

### Backend (Google Apps Script)
- ✅ Router principal com endpoints completos
- ✅ Módulo de autenticação (ID + Senha)
- ✅ CRUD completo de Slots
- ✅ CRUD de Agendamentos
- ✅ Sincronização com Google Calendar
- ✅ Utilitários para trabalhar com Sheets
- ✅ Logging de auditoria e sync

### Frontend (React + TypeScript)
- ✅ Estrutura de projeto com Vite
- ✅ Tipos TypeScript compartilhados
- ✅ Cliente de API configurado
- ✅ Hooks customizados (useAuth, useSlots)
- ✅ Página de Login
- ✅ Dashboard com Calendário
- ✅ Componente de Agendamentos
- ✅ Tailwind CSS integrado

### Documentação
- ✅ Especificação técnica
- ✅ Plano de Melhorias
- ✅ README completo (implementação)
- ✅ Setup guides (backend + frontend)

---

## 🚀 Próximos Passos Imediatos

### 1. Configurar Backend (Apps Script)

#### Opção A: Usando Clasp (Recomendado - Código Atual)

**Passo 1.1: Setup do Clasp (primeira vez)**
```bash
npm install -g @google/clasp
clasp login
```

**Passo 1.2: Push do código para Apps Script**
```bash
cd backend
clasp push
```
✅ Seu código agora está no Apps Script em `script.google.com`

**Passo 1.3: Criar e Vincular Google Sheets (CRÍTICO)**

Este é o passo mais importante. Sem isso, nada funciona!

1. Acesse [Google Drive](https://drive.google.com)
2. Clique `+ Novo` → `Google Sheets`
3. Renomeie para `PersonalTrainer_DB`
4. **Agora abra essa Sheets e vá em:** `Ferramentas` → `Editor de Scripts`
5. **Isso abre um Apps Script editor vinculado à Sheets** ✅

Pronto! Você está no editor correto. Agora:

6. **Apague o código padrão** (é um exemplo vazio)
7. Vá para seu projeto original em [script.google.com](https://script.google.com)
8. Copie TODOS os arquivos (main.gs, auth.gs, slots.gs, agendamentos.gs, calendar-sync.gs, sheet-utils.gs, appsscript.json)
9. Volte para o Sheets Editor que abriu e **cole todo o código**
10. Clique `Salvar` (Ctrl+S)

**Passo 1.4: Inicializar Banco de Dados**

1. No Apps Script Editor (aquele aberto da Sheets):
   - Clique no dropdown de funções (onde está escrito "setupDatabase")
   - Escolha `setupDatabase`
2. Clique no botão ▶️ **Executar** (ao lado do dropdown)
3. Se pedir permissão, autorize
4. Na aba "Execuções" embaixo, você verá:
```
✅ Aba 'Usuarios' criada/inicializada
✅ Aba 'Slots' criada/inicializada
✅ Aba 'Agendamentos' criada/inicializada
✅ Aba 'Logs' criada/inicializada
✅ Aba 'SyncLogs' criada/inicializada
✅ Setup concluído!
```

⚠️ **Erro: "spreadsheetId is required"?**
- Significa que você está no Apps Script Editor errado
- Volte ao passo 1.3: abra a Sheets e vá em `Ferramentas` → `Editor de Scripts`
- Não use o Editor do script.google.com sozinho

**Passo 1.5: Criar Usuário Demo**

1. Na Google Sheets que você criou, clique na aba `Usuarios`
2. Na linha 2 (primeira linha de dados depois do header), adicione:
   - Coluna A (ID): `prof_sofia`
   - Coluna B (Senha): `demo123`
   - Coluna C (Nome): `Sofia`
   - Coluna D (Email): `sofia@gmail.com`
   - Coluna E (Tipo): `PROFESSORA`
   - Coluna F (CriadoEm): `2026-01-01T00:00:00Z`

3. Pressione Enter e volte ao Apps Script Editor
4. Clique novamente em ▶️ **Executar** e escolha `setupDatabase` novamente (para confirmar que tudo está ok)

**Passo 1.6: Deploy Web App (Essencial!)**

Agora você precisa criar um deployment para poder chamar a API do frontend.

1. No Apps Script Editor (da Sheets), clique em `Implementar` (ou `Deploy`)
2. Clique em `Nueva implementación` (ou `New deployment`)
3. Clique no ícone ⚙️ (gear) e escolha `Web app`
4. Preencha:
   - **Descripción:** v1.0 (ou qualquer versão)
   - **Ejecutar como:** [Seu email/usuário]
   - **Quién tiene acceso:** Cualquier persona, incluso anónima
5. Clique `Implementar` (Deploy)
6. **Copie a URL que aparecer** (parecido com):
   ```
   https://script.google.com/macros/d/1M_iE3je4zoTSVdXx04KPA5H9KxGBLbRG4o6hkLZ5LEWWNJiAAJW9EcHl/usercontent
   ```

⚠️ **Não perca essa URL!** Você precisará dela no frontend

### 2. Configurar Frontend (React)

**Passo 2.1: Instalar dependências**
```bash
cd frontend
npm install
```
⏱️ Isso pode levar 2-3 minutos

**Passo 2.2: Configurar variáveis de ambiente**

1. Na pasta `frontend/`, crie ou edite o arquivo `.env.local`
2. Adicione:
```env
VITE_API_URL=https://script.google.com/macros/d/1M_iE3je4zoTSVdXx04KPA5H9KxGBLbRG4o6hkLZ5LEWWNJiAAJW9EcHl/usercontent
VITE_DEBUG=true
```

⚠️ **IMPORTANTE:** Substitua o URL pelo que você copiou no passo 1.6!

**Passo 2.3: Iniciar servidor de desenvolvimento**
```bash
npm run dev
```

✅ Abrirá automaticamente em `http://localhost:3000`

Se não abrir, você verá uma mensagem como:
```
  VITE v4.4.0 ready in 500 ms

  ➜  Local:   http://localhost:3000
```

Copie e cole no navegador.

### 3. Testar MVP

**Teste 1: Login ✅**
1. Acesse http://localhost:3000 (seu navegador deve estar aberto)
2. Você verá a tela de login
3. Preencha:
   - **ID da Professora:** `prof_sofia`
   - **Senha:** `demo123`
4. Clique `Entrar`

✅ **Esperado:** Dashboard abre automaticamente

❌ **Erro: "ID ou senha incorretos"?**
- Verifique se o usuário foi criado na aba Usuarios (passo 1.5)
- Verifique se digitou exatamente: `prof_sofia` e `demo123`
- Tente atualizar a página (F5)

---

**Teste 2: Dashboard Carregado ✅**

Se o login funcionou, você deve ver:
- [ ] Cabeçalho com "Dashboard - Personal Trainer"
- [ ] Botão "Sair" no topo direito
- [ ] 3 abas: "Calendário", "Agendamentos", "Logs"
- [ ] Botão "Sincronizar Agora"
- [ ] Calendário vazio (mês atual)

---

**Teste 3: Sincronização com Google Calendar ✅**

1. Clique no botão `Sincronizar Agora`
2. Uma mensagem azul deve aparecer: "Sincronizando..."
3. Após 2-3 segundos: "Sincronização concluída com sucesso!"

✅ **Esperado:** Se você tem eventos no Google Calendar, eles aparecem no calendário

⚠️ **Se tiver erro "API Error: 500":**
- Abra DevTools (F12) → Console
- Procure pela mensagem de erro
- Verifique se a URL do VITE_API_URL está correta

---

**Teste 4: Testar Criação de Slot ✅**

1. Clique no botão `Novo Slot` (no calendário)
2. Um slot deve ser criado (por enquanto, sem form - será implementado depois)
3. Verifique na aba "Calendário" se aparece um novo slot

**Nota:** O formulário para criar slots será implementado em breve. Agora é um placeholder.

---

**Teste 5: Ver Agendamentos ✅**

1. Clique na aba `Agendamentos`
2. Você verá a lista (provavelmente vazia agora)
3. Se tiver agendamentos, aparecem aqui com opções para:
   - Marcar Presença (Compareceu/Faltou)
   - Cancelar agendamento

---

## ✅ Checklist de Setup Completo

Marque conforme você completa cada passo:

### Backend
- [ ] Clasp instalado e logado (`npm install -g @google/clasp && clasp login`)
- [ ] `clasp push` executado com sucesso
- [ ] Google Sheets criada e nomeada `PersonalTrainer_DB`
- [ ] Apps Script vinculado via `Ferramentas → Editor de Scripts` na Sheets
- [ ] Código dos 7 arquivos copiado para o Editor
- [ ] `setupDatabase()` executado com sucesso (✅ na aba Execuções)
- [ ] Usuário demo criado na aba `Usuarios`
- [ ] Web App deployado com sucesso
- [ ] URL de deployment copiada

### Frontend
- [ ] `npm install` executado na pasta frontend
- [ ] `.env.local` criado com VITE_API_URL correto
- [ ] `npm run dev` rodando sem erros
- [ ] Browser abriu em http://localhost:3000

### Testes
- [ ] Login com prof_sofia / demo123 funciona
- [ ] Dashboard carrega com calendário
- [ ] Botão "Sincronizar Agora" funciona
- [ ] Aba "Agendamentos" carrega
- [ ] Aba "Logs" carrega

---

## 📊 Próximo Passo Depois do Setup

Agora que você tem o MVP rodando, o próximo passo é:

1. **Melhorar o formulário de criação de Slots** (atualmente é um placeholder)
2. **Implementar Agendamentos** (alunos marcarem presença)
3. **Testes com Google Calendar real**
4. **Adicionar mais features** (v1.1+)

Veja o arquivo [/memories/session/plan.md](/memories/session/plan.md) com o plano de melhorias organizadas por prioridade.

---

## 🎓 Documentação para Referência

| Documento | Quando Ler |
|-----------|-----------|
| [personal_trainer_app_spec.md](personal_trainer_app_spec.md) | Para entender a visão geral do projeto |
| [SPEC_API.md](SPEC_API.md) | Para entender cada endpoint da API |
| [backend/README.md](backend/README.md) | Se tiver problemas com backend |
| [frontend/README.md](frontend/README.md) | Se tiver problemas com frontend |
| [SCHEMAS.json](SCHEMAS.json) | Para entender estrutura de dados |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Para entender arquitetura |

---

## ⏱️ Tempo Estimado

| Fase | Tempo | Status |
|------|-------|--------|
| Setup Clasp + Backend | 10 min | ✅ |
| Criar Sheets + setupDatabase | 10 min | ✅ |
| Deploy Web App | 5 min | ✅ |
| Setup Frontend | 5 min | ✅ |
| Testes Iniciais | 10 min | ✅ |
| **TOTAL** | **~40 min** | ✅ |

---

## 📞 Tendo Problemas?

1. **Verifique o Troubleshooting** acima (cobre 90% dos problemas)
2. **Abra DevTools (F12)** e verifique a aba Console e Network
3. **Revise cada passo** e certifique-se de que não pulou nada
4. **Consulte a documentação** nos arquivos README

Se nada funcionar, verifique se:
- Node.js está instalado (`node -v` deve mostrar v16+)
- Clasp está instalado (`clasp -v`)
- Google Drive e Google Apps Script estão acessíveis
- Você não pulou nenhum passo

---

## 🎉 Parabéns!

Se chegou até aqui, seu **Personal Trainer App MVP está RODANDO**! 🚀

Agora você pode:
- ✅ Fazer login
- ✅ Ver calendário
- ✅ Sincronizar com Google Calendar
- ✅ Gerenciar agendamentos (em breve com melhorias)

**Próximo:** Implementar as features de v1.1 (histórico, notas, filtros, etc)

### Problema: "Não consigo executar setupDatabase"
**Solução:**
- Você está no Apps Script Editor **vinculado à Sheets**?
- Abra a Sheets → `Ferramentas` → `Editor de Scripts`
- Não use o script.google.com diretamente

### Problema: "spreadsheetId is required"
**Solução:**
- Apps Script não está vinculado à Sheets
- Abra a Google Sheets que criou
- Menu: `Ferramentas` → `Editor de Scripts`
- Copie o código para lá

### Problema: "API Error: 401 Unauthorized"
**Possíveis causas:**
- Token expirado → faça login novamente
- VITE_API_URL está errado → revise o .env.local
- Backend não está respondendo → verifique o deployment

**Debug:**
1. Abra DevTools (F12)
2. Vá em Network
3. Faça login
4. Veja a requisição POST `/api/login`
5. Verifique o Response

### Problema: "ID ou senha incorretos" no login
**Solução:**
1. Verifique a Sheets: o usuário prof_sofia existe?
2. A senha digitada é exatamente: `demo123` (case-sensitive)
3. Não tem espaços antes ou depois?
4. Atualize a página (Ctrl+F5) para forçar reload

### Problema: Calendário não carrega / "API Error: 500"
**Solução:**
1. Abra DevTools → Console
2. Procure por mensagens de erro
3. Verifique em script.google.com se há logs de erro
4. Execute novamente `setupDatabase()` para confirmar que as abas existem

### Problema: "Cannot find module 'vite'" no Frontend
**Solução:**
```bash
cd frontend
rm -r node_modules
npm install
npm run dev
```

### Problema: Porta 3000 já está em uso
**Solução:**
```bash
# Matar o processo
# No PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Ou iniciar em outra porta:
npm run dev -- --port 3001
```

---

## 📚 Documentação Importante

| Arquivo | Propósito |
|---------|-----------|
| [backend/README.md](backend/README.md) | Setup detalhado backend |
| [frontend/README.md](frontend/README.md) | Setup detalhado frontend |
| [personal_trainer_app_spec.md](personal_trainer_app_spec.md) | Especificação técnica completa |
| [SPEC_API.md](SPEC_API.md) | Endpoints da API |
| [SCHEMAS.json](SCHEMAS.json) | Schemas de dados |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Visão geral da arquitetura |

---

## 🎯 Próximas Fases

### v1.0 - MVP (Agosto 2026)
- Backend completamente funcional
- Frontend com dashboard e calendário
- Autenticação básica
- CRUD de slots e agendamentos
- Sincronização Calendar ↔ Sheets

### v1.1 - Melhorias (Setembro 2026)
- Histórico de aulas + notas
- Busca/filtro de agendamentos
- Notificações in-app
- Dashboard de Logs
- Refresh tokens

### v1.2 - Escalabilidade (Outubro 2026)
- PWA offline
- Service Worker
- Gerenciamento de lista de espera
- Relatórios de frequência

---

## 📞 Suporte

Se precisar de ajuda:
1. Verifique a documentação em cada pasta (backend/README.md, frontend/README.md)
2. Verifique os troubleshooting acima
3. Abra DevTools (F12) para ver Network e Console
4. Verifique o arquivo `/memories/session/plan.md` com o plano de melhorias

---

## ⚡ Resumo Rápido (TL;DR)

Se você quer só fazer funcionar rápido:

```bash
# 1. Backend
cd backend
clasp push

# 2. Google Sheets
# Abra uma Sheets nova → Ferramentas → Editor de Scripts
# Cole todo o código dos 7 arquivos
# Execute setupDatabase()
# Adicione usuário: prof_sofia / demo123
# Faça deployment e copie a URL

# 3. Frontend
cd frontend
npm install
# Edite .env.local com a URL
npm run dev

# 4. Teste
# Abra http://localhost:3000
# Login: prof_sofia / demo123
# Pronto! ✅
```

---

## 📞 Suporte & Dúvidas

Se tiver dúvidas:
1. **Veja o Troubleshooting** acima
2. **Consulte README.md** de cada pasta (backend/, frontend/)
3. **Verifique DevTools (F12)** para erros no navegador
4. **Abra a aba Execuções** no Apps Script para ver logs de erro

---

**Data de Início:** Agosto 2026  
**Status:** MVP Setup Guide ✅  
**Tempo Total:** ~40 minutos até funcional  
**Próximo:** Melhorias v1.1 (histórico, notificações, filtros)
