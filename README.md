# Agenda Personal Trainer (Prô Josy)

Sistema para gestao de alunos e agenda de aulas de personal trainer, com frontend em JavaScript vanilla e API Node.js/Express para persistencia em MongoDB.

Este README foi estruturado para facilitar onboarding tecnico e navegacao rapida de agentes.

## Objetivo do Projeto

- Centralizar cadastro de alunos, agenda diaria/semanal/mensal e controle de compromissos.
- Sincronizar dados com API backend quando online.
- Manter fallback local (localStorage) em caso de indisponibilidade da API.

## Mapa Rapido para Agentes

- Ponto de entrada da interface: `index.html`
- Orquestracao da SPA (abas Home/Calendario/Alunos): `assets/js/app.js`
- Estado global compartilhado: `assets/js/dados.js`
- Sincronizacao e persistencia (API + localStorage): `assets/js/storage.js`
- API e modelos MongoDB: `backend/server.js`

Se o objetivo for:

- Ajustar navegacao/UX entre telas: comecar em `assets/js/app.js` e `index.html`
- Ajustar regras de agendamento: comecar em `assets/js/modal.js`, `assets/js/agenda.js`, `assets/js/calendario.js`
- Ajustar cadastro de alunos: comecar em `assets/js/pagina-cadastro.js` e `assets/js/alunos.js`
- Ajustar persistencia/sincronizacao: comecar em `assets/js/storage.js` e `backend/server.js`

## Arquitetura (Visao Geral)

```text
[Frontend SPA - browser]
	|- telas e renderizacao (app.js, home.js, agenda.js, pagina-calendario.js)
	|- estado em memoria (dados.js)
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
|  |  |- agenda.js
|  |  |- alunos.js
|  |  |- app.js
|  |  |- calendario.js
|  |  |- dados.js
|  |  |- home.js
|  |  |- modal.js
|  |  |- pagina-cadastro.js
|  |  |- pagina-calendario.js
|  |  |- storage.js
|  |  |- utils.js
|- backend/
|  |- package.json
|  |- server.js
|  |- vercel.json
```

## Papel dos Arquivos Principais

Frontend:

- `index.html`: estrutura da SPA, containers das telas e modais.
- `assets/css/style.css`: estilos globais e responsividade.
- `assets/js/app.js`: controle de abas e inicializacao das telas.
- `assets/js/dados.js`: variaveis de estado global (alunos, aulas e configuracoes).
- `assets/js/storage.js`: GET/POST na API e fallback para localStorage.
- `assets/js/home.js`: visao operacional diaria.
- `assets/js/agenda.js`: grade semanal e renderizacao de horarios.
- `assets/js/calendario.js`: regras de calendario e recorrencias.
- `assets/js/pagina-calendario.js`: alternancia entre modo semanal e mensal.
- `assets/js/pagina-cadastro.js`: cadastro/edicao/listagem de alunos.
- `assets/js/alunos.js`: funcoes auxiliares de gestao de alunos.
- `assets/js/modal.js`: fluxo de criacao/edicao de agendamentos via modal.
- `assets/js/utils.js`: utilitarios (toast, import/export etc.).

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
