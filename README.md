# Agenda Personal Trainer (Prô Josy)

Sistema para gestao de alunos e agenda de aulas de personal trainer, com frontend em JavaScript vanilla e API Node.js/Express para persistencia em MongoDB.

Este README foi estruturado para facilitar onboarding tecnico e navegacao rapida de agentes.

## Objetivo do Projeto

- Centralizar cadastro de alunos, agenda diaria/semanal/mensal e controle de compromissos.
- Sincronizar dados com API backend quando online.
- Manter fallback local (localStorage) em caso de indisponibilidade da API.

## Mapa Rapido para Agentes

- Ponto de entrada da interface: `index.html`
- Roteador SPA (abas Home/Calendario/Alunos): `assets/js/app.js`
- Estado global compartilhado: `assets/js/state.js`
- Sincronizacao e persistencia (API + localStorage): `assets/js/storage.js`
- API e modelos MongoDB: `backend/server.js`

Se o objetivo for:

- Ajustar navegacao/UX entre telas: comecar em `assets/js/app.js` e `index.html`
- Ajustar a agenda diaria (Home): comecar em `assets/js/view-home.js`
- Ajustar modais de criacao de agendamento: comecar em `assets/js/modal-agendamento.js`
- Ajustar edicao/cancelamento/reagendamento: comecar em `assets/js/modal-acao-slot.js`
- Ajustar regras de recorrencia ou grid mensal: comecar em `assets/js/calendario-engine.js`
- Ajustar view do calendario (semanal/mensal/KPIs): comecar em `assets/js/view-calendario.js`
- Ajustar cadastro de alunos: comecar em `assets/js/view-alunos.js`
- Ajustar calculos de KPI: comecar em `assets/js/utils-kpi.js`
- Ajustar persistencia/sincronizacao: comecar em `assets/js/storage.js` e `backend/server.js`

## Arquitetura (Visao Geral)

```text
[Frontend SPA - browser]
    |- roteamento (app.js)
    |- views: view-home.js, view-calendario.js, view-alunos.js
    |- modais: modal-agendamento.js, modal-acao-slot.js
    |- estado em memoria (state.js)
    |- persistencia/sync (storage.js)
    v
[API Express - backend/server.js]
    |- rotas /api/alunos, /api/agendamentos, /api/configuracao
    v
[MongoDB - via Mongoose]
```

Comportamento de resiliencia:

- O frontend tenta carregar e salvar via API.
- Se houver falha de conexao, usa localStorage temporariamente.

## Estrutura do Projeto

```text
personalapp/
|- index.html
|- README.md
|- assets/
|  |- css/
|  |  |- style.css
|  |- js/
|  |  |  --- [1] Core State & Data ---
|  |  |- state.js                  <- estado global (alunos, aulas, constantes)
|  |  |- storage.js                <- sync API + fallback localStorage
|  |  |  --- [2] Pure Utilities ---
|  |  |- utils-kpi.js              <- calculos de KPI, toast, exportacao
|  |  |- utils-datetime.js         <- helpers de data e hora
|  |  |  --- [3] Domain Helpers ---
|  |  |- alunos-helpers.js         <- lookup e select de alunos
|  |  |- calendario-engine.js      <- motor de recorrencia + grid mensal
|  |  |- agenda-conflitos.js       <- deteccao de conflitos de horario
|  |  |  --- [4] UI Widgets ---
|  |  |- widget-stepper-duracao.js <- widget +/- de duracao
|  |  |- widget-bloqueio.js        <- helpers de estado "dia inteiro"
|  |  |  --- [5] Modais ---
|  |  |- modal-agendamento.js      <- modais: tipo, agendamento unico, recorrente
|  |  |- modal-acao-slot.js        <- modais: edicao, cancelamento, reagendamento, reposicao
|  |  |  --- [6] Page Views ---
|  |  |- view-home.js              <- aba Home: agenda diaria + dashboard
|  |  |- view-calendario.js        <- aba Calendario: semanal/mensal + KPI dashboard
|  |  |- view-alunos.js            <- aba Alunos: CRM de cadastro/edicao
|  |  |  --- [7] SPA Router ---
|  |  |- app.js                    <- roteador de abas (DOMContentLoaded)
|  |  |  --- [8] Legado ---
|  |  |- _legado-modal.js          <- ⚠️ modal original da grade semanal (#modalAgendar)
|  |  |- _legado-agenda.js         <- ⚠️ grade semanal original (#agendaGrid)
|- backend/
|  |- package.json
|  |- server.js
|  |- vercel.json
```

## Convencao de Nomes dos Arquivos JS

Os arquivos seguem prefixos que indicam sua camada:

| Prefixo | Camada | Exemplo |
|---|---|---|
| `state` | Estado global | `state.js` |
| `storage` | Persistencia | `storage.js` |
| `utils-` | Utilitarios puros (sem DOM) | `utils-kpi.js`, `utils-datetime.js` |
| `alunos-` | Helpers de dominio (alunos) | `alunos-helpers.js` |
| `calendario-` | Motor de calendario/recorrencia | `calendario-engine.js` |
| `agenda-` | Logica de agenda | `agenda-conflitos.js` |
| `widget-` | Componentes UI reutilizaveis | `widget-stepper-duracao.js` |
| `modal-` | Controladores de modais | `modal-agendamento.js` |
| `view-` | Views de paginas (abas SPA) | `view-home.js` |
| `app` | Roteador SPA | `app.js` |
| `_legado-` | Codigo legado — revisar antes de remover | `_legado-modal.js` |

## Ordem de Carregamento dos Scripts (index.html)

A ordem importa porque os scripts usam globais `window.xxx` definidos em outros arquivos:

```
1.  state.js                   <- sem dependencias
2.  storage.js                 <- depende de state.js
3.  utils-kpi.js               <- depende de state.js
4.  utils-datetime.js          <- depende de state.js (em runtime)
5.  alunos-helpers.js          <- depende de state.js
6.  calendario-engine.js       <- depende de state.js
7.  agenda-conflitos.js        <- depende de state.js + calendario-engine.js
8.  widget-stepper-duracao.js  <- depende de state.js + widget-bloqueio.js (runtime)
9.  widget-bloqueio.js         <- depende de widget-stepper-duracao.js
10. _legado-modal.js           <- legado
11. _legado-agenda.js          <- legado
12. modal-agendamento.js       <- depende de layers 1-9
13. modal-acao-slot.js         <- depende de layers 1-9 + modal-agendamento.js
14. view-home.js               <- depende de layers 1-13
15. view-calendario.js         <- depende de layers 1-14
16. view-alunos.js             <- depende de layers 1-14
17. app.js                     <- depende de tudo (deve ser o ultimo)
```

## Papel dos Arquivos Principais

Frontend:

- `index.html`: estrutura da SPA, containers das telas e modais.
- `assets/css/style.css`: estilos globais e responsividade.
- `assets/js/app.js` [TAG-APP-ROUTER]: roteador de abas, chama inicializadores das views.
- `assets/js/state.js` [TAG-STATE]: variaveis de estado global (alunos, aulas, agendaConfig, constantes).
- `assets/js/storage.js` [TAG-STORAGE]: GET/POST na API e fallback para localStorage.
- `assets/js/utils-kpi.js` [TAG-UTILS-KPI]: calculos de KPI por aluno/mes, toast, exportacao JSON.
- `assets/js/utils-datetime.js` [TAG-UTILS-DATETIME]: formatacao, conversao e calculo de datas e horas.
- `assets/js/alunos-helpers.js` [TAG-ALUNOS-HELPERS]: lookup de aluno por ID, HTML de selects.
- `assets/js/calendario-engine.js` [TAG-CALENDARIO-ENGINE]: math de recorrencia (diaria/semanal/mensal/anual) + grid mensal.
- `assets/js/agenda-conflitos.js` [TAG-AGENDA-CONFLITOS]: detecta sobreposicao de horarios entre compromissos.
- `assets/js/widget-stepper-duracao.js` [TAG-WIDGET-STEPPER]: widget +/- de duracao com labels formatadas.
- `assets/js/widget-bloqueio.js` [TAG-WIDGET-BLOQUEIO]: constantes de bloqueio e toggle "Dia Inteiro" nos modais.
- `assets/js/modal-agendamento.js` [TAG-MODAL-AGENDAMENTO]: modais de criacao — escolha de tipo, agendamento unico e recorrente.
- `assets/js/modal-acao-slot.js` [TAG-MODAL-ACAO-SLOT]: modais de acao — edicao, cancelamento, reagendamento e fila de reposicao.
- `assets/js/view-home.js` [TAG-VIEW-HOME]: aba Home — agenda diaria, dashboard e navegacao de datas.
- `assets/js/view-calendario.js` [TAG-VIEW-CALENDARIO]: aba Calendario — alternancia semanal/mensal, filtros e KPI dashboard.
- `assets/js/view-alunos.js` [TAG-VIEW-ALUNOS]: aba Alunos — listagem com KPIs, cadastro e edicao.
- `assets/js/_legado-modal.js` [TAG-LEGADO-MODAL]: ⚠️ modal original da grade semanal — verificar uso antes de remover.
- `assets/js/_legado-agenda.js` [TAG-LEGADO-AGENDA]: ⚠️ grade semanal original (#agendaGrid) — verificar uso antes de remover.

Backend:

- `backend/server.js`: servidor Express, conexao MongoDB, schemas e rotas.
- `backend/package.json`: dependencias e script de execucao.
- `backend/vercel.json`: configuracao de deploy do backend na Vercel.

## API Resumida

Base path: `/api`

- `GET /alunos`: lista alunos
- `POST /alunos/sincronizar`: substitui colecao de alunos com payload completo
- `GET /agendamentos`: lista agendamentos
- `POST /agendamentos/sincronizar`: substitui colecao de agendamentos com payload completo
- `GET /configuracao`: retorna configuracao da grade
- `POST /configuracao`: atualiza configuracao da grade (upsert)

Observacao importante:

- O modelo de sincronizacao atual e bulk (reescreve colecao), nao CRUD granular por item.

## Como Executar Localmente

### 1) Frontend

Opcao simples:

1. Abrir `index.html` no navegador.

Opcao recomendada para desenvolvimento:

1. Usar uma extensao de servidor local (ex.: Live Server no VS Code).

### 2) Backend

Na pasta `backend`:

```bash
npm install
```

Criar arquivo `.env` com valores locais:

```env
MONGODB_URI=<sua-uri-mongodb>
PORT=5000
```

Iniciar API:

```bash
npm start
```

### 3) Ajustar URL da API no Frontend (ambiente local)

Em `assets/js/storage.js`, ajustar `API_BASE_URL` para o backend local quando necessario:

```js
const API_BASE_URL = "http://localhost:5000/api";
```

## Fluxos de Navegacao no Codigo

Fluxo: carregar a aplicacao

1. `index.html` carrega scripts.
2. `app.js` registra eventos de navegacao e inicializa Home.
3. `storage.js` realiza carga/sincronizacao de dados.

Fluxo: salvar alteracoes de negocio

1. Modulos de tela alteram estado global.
2. `storage.js` persiste localmente.
3. `storage.js` sincroniza com API quando disponivel.

## Stack Tecnica

Frontend:

- HTML5
- CSS3
- JavaScript (Vanilla)
- localStorage
- Fetch API

Backend:

- Node.js
- Express
- Mongoose
- MongoDB
- dotenv
- cors

## Seguranca e Confidencialidade

Este README nao deve conter:

- Senhas, tokens, API keys ou secrets.
- URI completas com credenciais embutidas.
- Dados pessoais de alunos (telefone, email, endereco).
- Caminhos locais da maquina do desenvolvedor.

Padrao de documentacao:

- Usar placeholders como `<sua-uri-mongodb>` para configuracoes sensiveis.

## Observacoes de Manutencao

- Se adicionar novo modulo frontend, atualizar as secoes "Estrutura do Projeto" e "Papel dos Arquivos Principais".
- Se alterar rotas backend, atualizar a secao "API Resumida".
- Se mudar estrategia de persistencia, atualizar "Arquitetura" e "Fluxos de Navegacao no Codigo".
