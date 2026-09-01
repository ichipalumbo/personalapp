# Agenda Personal Trainer (Prô Josy)

Sistema para gestao de alunos e agenda de aulas de personal trainer, com frontend em JavaScript vanilla e API Node.js/Express para persistencia em MongoDB.

Este README e a porta de entrada: descreve **o que** o projeto e e **como** ele se organiza. Todo detalhe \u2014 regra de negocio, procedimento de ambiente e mapa de codigo \u2014 vive em [`docs/`](docs/README.md).

## O que o app faz

- Centraliza o cadastro de alunos e a agenda de aulas de um personal trainer autonomo.
- Calcula a cobranca por ciclo de vencimento configuravel por aluno, com fila de reposicoes.
- Publica os compromissos no Google Calendar e le eventos externos como bloqueios.
- Funciona como PWA, com fallback local de leitura quando a API esta indisponivel.

**Multiusuario**: qualquer conta Google pode usar o app, e cada conta ve apenas os proprios dados. O isolamento e feito por `ownerEmail` em toda consulta ao banco.

**Modo leitura**: sem login, o app renderiza os dados em cache local mas bloqueia qualquer escrita remota.

## Documentacao

A documentacao vive em [`docs/`](docs/README.md). Este README so descreve o projeto em alto nivel — todo detalhe esta nos arquivos abaixo.

| Procurando por | Va em |
| --- | --- |
| Indice geral, dominios e mapa de telas | [`docs/README.md`](docs/README.md) |
| Regra de negocio (fonte de verdade) | [`docs/specs/`](docs/specs/) |
| Rodar o projeto, `.env`, troubleshooting | [`docs/ambiente-local.md`](docs/ambiente-local.md) |
| Arvore de arquivos, ordem de scripts, rotas | [`docs/mapa-do-codigo.md`](docs/mapa-do-codigo.md) |
| O que falta fazer | [`docs/roadmap.md`](docs/roadmap.md) |
| Regras permanentes do agente de codigo | [`.github/copilot-instructions.md`](.github/copilot-instructions.md) |

**Hierarquia de confiabilidade**: codigo > specs > roadmap > README. Se divergir, o codigo vence.

## Dominios de negocio

As regras estao organizadas por dominio, cada um com seu proprio indice:

| Dominio | Cobre |
| --- | --- |
| [Alunos](docs/specs/alunos/README.md) | cadastro, objetivo, status, ciclo de vida |
| [Agenda](docs/specs/agenda/README.md) | compromissos, recorrencia, conflito, exclusao, grade |
| [Financeiro](docs/specs/financeiro/README.md) | ciclo de cobranca, pagamento, reposicoes, extrato |
| [Integracoes](docs/specs/integracoes/README.md) | Google Calendar, autenticacao Google |
| [Plataforma](docs/specs/plataforma/README.md) | isolamento por conta, persistencia, resiliencia, deploy |

## Arquitetura (Visao Geral)

```text
[Frontend SPA - browser]
    |- app shell: app.js, bootstrap.js, router.js, service-worker.js
    |- views e modais
    |- estado em memoria (state.js)
    |- persistencia/sync (storage.js)
    v
[API Express - backend/server.js]
    |- rotas -> controllers -> services -> models
    v
[MongoDB - via Mongoose]
```

Decisoes estruturais que valem para qualquer alteracao:

- **Frontend sem build step.** JavaScript vanilla, sem framework e sem bundler. Os scripts sao carregados por tags `<script>` em `index.html` e a **ordem importa**.
- **Backend serverless.** Node/Express/Mongoose, publicado na Vercel. Nao ha processo continuo, entao nao existe cron: estado derivado e recalculado na leitura.
- **Isolamento por `ownerEmail`.** Toda consulta ao MongoDB e filtrada pela conta dona. Nao ha nenhuma outra camada protegendo contra vazamento entre contas.
- **Regra de negocio tem implementacao unica.** Calculo feito no backend nao e reimplementado no frontend; o que precisa existir dos dois lados mora em modulo isomorfico compartilhado, sem dependencia de `window` ou DOM.
- **Resiliencia e de leitura, nao de escrita.** Em falha de API o frontend exibe o cache local, mas escrita so e considerada concluida apos resposta de sucesso.

Detalhamento em [`docs/mapa-do-codigo.md`](docs/mapa-do-codigo.md).

## Como rodar

Nao existe `npm run dev`, watch mode nem ambiente de staging. O frontend e servido por Live Server e o backend sobe com `npm start` dentro de `backend/`, apontando para o banco de desenvolvimento `personalapp_dev`.

O passo a passo completo — `.env`, portas, origens do OAuth e troubleshooting — esta em [`docs/ambiente-local.md`](docs/ambiente-local.md).

Testes do backend:

```bash
cd backend
npm test
```

## Stack Tecnica

Frontend:

- HTML5 / CSS3
- JavaScript (Vanilla, sem framework)
- localStorage (fallback offline)
- Fetch API (com AbortController para timeout)
- Google Identity Services (GIS) — autenticacao via JWT
- Google Calendar API — integracao de eventos externos

Backend:

- Node.js + Express
- Mongoose + MongoDB
- `google-auth-library` — validacao do Google ID token (JWT)
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

Modelo de seguranca em producao:

- Todas as rotas `/api/*` exigem `Authorization: Bearer <google_id_token>`, sem excecao.
- O health check fica fora do prefixo `/api` e atende em `GET /` na raiz do backend.
- O backend valida o token via `google-auth-library` e rejeita com HTTP 401 se invalido ou expirado.
- Os dados de cada usuario estao isolados por `ownerEmail` no MongoDB — nenhum usuario acessa dados de outro.
- O `CLIENT_ID` do Google OAuth esta hardcoded em `assets/js/auth/google-identity.js` (e um Client ID publico, nao e um secret).

## Observacoes de Manutencao

Este README descreve o projeto em alto nivel. Ao alterar o codigo, atualize o documento correspondente **no mesmo commit**:

- Novo modulo, mudanca na ordem de scripts ou nas rotas → [`docs/mapa-do-codigo.md`](docs/mapa-do-codigo.md)
- Mudanca em variavel de ambiente, porta ou procedimento local → [`docs/ambiente-local.md`](docs/ambiente-local.md)
- Mudanca em regra de negocio → a spec do dominio em [`docs/specs/`](docs/specs/)
- Feature entregue ou repriorizada → [`docs/roadmap.md`](docs/roadmap.md)

Documentacao defasada ja induziu a erro neste projeto: o roadmap chegou a comecar errado por causa disso. Se notar divergencia entre documento e codigo, o codigo vence — e o documento deve ser corrigido.
