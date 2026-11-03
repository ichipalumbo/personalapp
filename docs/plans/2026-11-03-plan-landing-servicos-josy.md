# Plano — Landing Page dos Serviços de Personal Trainer da Prô Josy

> **Status**: `Em execução` — plano aprovado no grill de 2026-11-03; nenhum cartão iniciado; implementação de código aguarda rodada com branch confirmada
> **Abertura**: 2026-11-03
> **Atualizado**: 2026-11-03
> **Responsável**: Luccas (dono) + agente
> **Branch**: a ser criada a partir de `origin/main` quando a implementação começar (`feat/landing-servicos-josy`, sugerida no grill); nenhum arquivo de código foi escrito nesta rodada
> **Diagnóstico de origem**: nenhum documento autônomo — decisões tomadas no grill de 2026-11-03 com inspeção direta de `docs/apresentacao-personal-josy.html`, `docs/reference/identidade/guia-identidade-visual-v3.md`, `.vercelignore`, `index.html` e `docs/reference/google-oauth-verificacao.md` (dispensável por [`docs/README.md`](../README.md), "Ciclo de vida", item 2)
> **Contratos duráveis**: [`docs/reference/identidade/guia-identidade-visual-v3.md`](../reference/identidade/guia-identidade-visual-v3.md)
> **Válido contra**: `20a85a9` (`origin/main`)

> **Este arquivo é vivo.** Enquanto a frente estiver aberta, ele recebe decisões, execução,
> medições e desvios. Não crie um relatório separado para "o depois".
> Depois de fechado, **não é reescrito**: trabalho posterior gera documento novo.
> Instancie somente as seções pertinentes ao risco da frente. Não invente decisões,
> medições ou resultados para preencher o modelo; use `não executado` ou `não aplicável`, com motivo.

---

## 1. Objetivo

Criar, para a Prô Josy, uma landing page estática que venda seus serviços de personal trainer para **alunos finais** (leigos que chegam por Instagram/WhatsApp), servida pelo projeto Vercel existente `personal-app-webpage` na URL `https://josy-personal-app.vercel.app/landing`. Resultado observável: página publicada, mobile-first, com identidade visual da marca, única conversão por WhatsApp e conteúdo substituível sem tocar em estrutura.

Entregáveis desta rodada (conforme fechado no grill): este plano documentado **sem implementação** — nenhum arquivo de código foi criado; a execução dos cartões T01–T02 aguarda a próxima rodada com branch confirmada pelo dono.

---

## 2. Critérios de aceite

- [x] **Documental (T00)**: plano registrado em `docs/plans/` com as decisões do grill; índice atualizado em [`docs/README.md`](../README.md).
- [ ] **Página funcional (T01)**: `landing/index.html` autocontido (HTML + CSS embutidos, zero dependência de `assets/css/style.css`, zero build, zero framework), acessível em `/landing` via `node scripts/servir-local.js` e navegável sem erros no navegador.
- [ ] **Conteúdo substituível**: textos prontos em português acolhedor, com placeholders tipados e localizáveis em pontos únicos no topo do arquivo — nome/bio/CREF (`[BIO_PRA_JOSY]`), número de WhatsApp (`[WHATSAPP_PRA_JOSY]` com formato único `wa.me`), foto da seção Sobre (placeholder visível de foto) — e região real "São Paulo — Zona Norte" já citada.
- [ ] **Estrutura de seções**: Hero • Serviços • Como funciona • Sobre/credenciais • FAQ • CTA final, com as 7 modalidades organizadas em 3 cards principais (individual, dupla, grupo) + chips "Também inclui" (condomínio, academia presencial, avaliação física, plano alimentar de profissional parceiro); sem "Onde treinar" e sem depoimentos (sem material; ficam para versão futura).
- [ ] **Identidade visual**: base clara (branco/grafite) com amarelo `#FFDE17` em destaques e CTAs, Poppins via Google Fonts, logo/símbolo de `assets/images/` e ícones SVG inline; hero tipográfico, sem foto de stock.
- [ ] **Única conversão**: WhatsApp (`wa.me`) como chamada única de ação, repetida no CTA final; sem formulário, sem e-mail, sem link do app nesta versão.
- [ ] **Ligação com o rodapé do app (T02)**: o rodapé público do `index.html` é o **último** passo, executado somente quando a frente 1.4 (contato rápido WhatsApp) estiver commitada e o dono destravar; nenhum dos arquivos sujos da frente 1.4 é tocado nesta rodada.
- [ ] **Regressão**: suítes `backend/` e `tests-frontend/` não afetadas (nenhum arquivo coberto por elas é alterado); validação da página é manual, conforme matriz de validação.

---

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| Público: alunos finais (não o app para trainers; deck comercial já cobre os trainers) | 2026-11-03 | Luccas | Página institucional da professora, com bio, local e conversão por WhatsApp; textos do deck comercial não são reaproveitados |
| Morar dentro deste repo, servida pelo projeto Vercel `personal-app-webpage` | 2026-11-03 | Luccas | Arquivo estático novo sem infra nova; `.vercelignore` só exclui `tests-frontend/`, portanto nenhuma config extra é necessária |
| Arquivo único autocontido `landing/index.html` | 2026-11-03 | Luccas | Zero risco de colisão com o CSS de produção do app; simples de extrair para projeto separado no futuro |
| Publicar e linkar no rodapé do app mesmo com placeholders visíveis | 2026-11-03 | Luccas | Deploy automático na main alcança a URL pública; placeholders marcados no código esperam conteúdo real do dono |
| Seções: hero, serviços, como funciona, sobre/credenciais, FAQ, CTA final | 2026-11-03 | Luccas | "Onde treinar" e depoimentos fora até existir material (sem onde treinar, sem depoimentos com autorização) |
| 7 modalidades reais | 2026-11-03 | Luccas | 3 cards principais (individual, dupla, grupo) + chips "Também inclui" (condomínio, academia presencial, avaliação física, plano alimentar de profissional parceiro) |
| Região real citada: São Paulo — Zona Norte | 2026-11-03 | Luccas | Texto nas seções Hero e FAQ já trazem a região; sem placeholder de cidade |
| Tom acolhedor, segunda pessoa, sem jargão de academia | 2026-11-03 | Luccas | Textos prontos em português; sem termos técnicos desnecessários |
| "Prô Josy" em destaque; "Personal Josy" só como assinatura discreta no rodapé | 2026-11-03 | Luccas | Evita confundir o aluno com a marca do app; logomarcas oficiais aparecem como selo |
| CTA único: WhatsApp (`wa.me`) com número placeholder tipado | 2026-11-03 | Luccas | Sem formulário (exigiria backend), sem e-mail, sem link do app nesta versão |
| Mobile-first, referência 433×762 com DPR 2,81 | 2026-11-03 | Luccas | Desktop é adaptação; viewport de aceite da UI mobile do dono |
| Tema claro na base (branco/grafite), amarelo em destaques e CTAs | 2026-11-03 | Luccas | Cores de `guia-identidade-visual-v3.md` (Grafite `#202020`, Amarelo Josy `#FFDE17`, Poppins); hero tipográfico, sem stock photo |
| Hero tipográfico + um placeholder visível de foto apenas na seção Sobre | 2026-11-03 | Luccas | Evita stock photo genérica; um único ponto aguardando material da Prô Josy |
| Página linkada no rodapé por último, quando a frente 1.4 estiver commitada | 2026-11-03 | Luccas | Nenhum dos 8 arquivos com pendências da frente 1.4 é tocado nesta frente |
| Sem analytics, sem teste automatizado novo e sem mudanças na suíte | 2026-11-03 | Luccas | Página estática sem lógica; validação manual no viewport de referência; uma linha no `README.md` da raiz |
| Sem implementação nesta rodada — documentar plano primeiro | 2026-11-03 | Luccas | Este plano é o único entregável até autorização da próxima rodada |

---

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| 1 | Qual o número real de WhatsApp da Prô Josy para substituir `[WHATSAPP_PRA_JOSY]` antes da divulgação? | (a) informar na próxima rodada; (b) manter placeholder até conteúdo completo | não |
| 2 | Texto definitivo da bio/CREF para substituir `[BIO_PRA_JOSY]` | (a) informar; (b) manter placeholder | não |
| 3 | Foto real da Prô Josy para a seção Sobre | (a) fornecer arquivo; (b) manter placeholder | não |
| 4 | Merge na `main` (publica a URL) com placeholders visíveis | (a) merge completo da frente; (b) aguardar conteúdo real | sim, para publicar |

## 5. Escopo

- **Arquivos/componentes prováveis**:
  - `landing/index.html` (novo, autocontido);
  - `README.md` da raiz (uma linha apontando a pasta e a URL);
  - `index.html` do app (uma âncora no rodapé público, marcador `[TAG-HTML-RODAPE-PUBLICO]`) — **somente como último passo**, quando a frente 1.4 estiver commitada;
  - `docs/plans/2026-11-03-plan-landing-servicos-josy.md` (este plano vivo);
  - `docs/README.md` (índice).
- **Comportamentos que podem mudar**: nenhum no app — página nova desacoplada; URL `/landing` passa a existir no domínio público; rodapé público do app ganha 1 link na cadeia existente (último passo).

## 6. Fora de escopo

- Onde treinar (unidades/academias) e depoimentos — sem material autorizado; entram em versão futura.
- Preços públicos — sem material; a conversão conversa no WhatsApp resolve.
- Formulário de contato, e-mail visível e link para o app — canais extras ficam fora da versão 1.
- Analytics (GA4 ou outro) — não fecha com a aplicação enxuta; medição indireta pelo volume no WhatsApp.
- Alterar `assets/css/style.css`, qualquer view ou lógica do app, ou quaisquer dos 8 arquivos com alterações não commitadas da frente 1.4 (`style.css`, `alunos-helpers.js`, `modal-acao-slot.js`, `view-alunos.js`, `index.html`, plan do T05/T06, `roadmap-v3.md`, spec de interface).
- Verificação Google/OAuth (item 4.9 do roadmap) e alterações na API.
- Domínio próprio, SEO avançado (sitemap, Open Graph além do mínimo) e internacionalização.

## 7. Invariantes a preservar

- Zero build step, zero framework, zero dependência nova no frontend (regra 9).
- Não depender de `window`, `document` ou DOM em módulos compartilhados — não se aplica (a landing não cria módulos compartilhados; é página estática).
- Não duplicar regra de negócio calculada no backend — não se aplica (nenhum cálculo de negócio na landing).
- Não tocar nos arquivos sujos da frente 1.4 enquanto pendentes (exceto o último passo autorizada no `index.html`, quando destravado pelo dono).
- Se um `<script>` for adicionado a `index.html` (não previsto nesta página), respeitar `DEPENDENCIAS_DE_CARGA` em `tests-frontend/index-html-ordem.test.js` — não se aplica, a landing não carrega scripts do app.
- Identidade visual conforme `guia-identidade-visual-v3.md`: Amarelo Josy `#FFDE17` como destaque, Grafite `#202020`, Poppins; logotipo apenas das versões aprovadas em `reference/identidade/` ou equivalentes em `assets/images/`.
- Placeholders sempre como strings identificáveis de substituição única, não espalhados.

## 8. Baseline

- Estado da branch e do working tree: branch `feat/confiabilidade-gcal-testes-alunos`, working tree sujo com **8 arquivos** da frente 1.4 (`assets/css/style.css`, `assets/js/alunos-helpers.js`, `assets/js/modal-acao-slot.js`, `assets/js/view-alunos.js`, `index.html`, `docs/plans/2026-10-27-plan-confiabilidade-gcal-testes-alunos.md`, `docs/roadmap-v3.md`, `docs/specs/interface-e-navegacao.md`) + 1 arquivo sem rastreio (`tests-frontend/view-alunos-busca-whatsapp.test.js`). Esta frente não toca em nenhum deles.
- Suíte afetada antes: `não aplicável` — nenhum arquivo coberto pelas suítes `backend/` ou `tests-frontend/` é alterado por esta frente (ver critério de regressão).
- Reprodução do defeito: `não aplicável` (não há defeito; é uma entrega nova).
- Condição de parada se o baseline divergir: se ao iniciar a implementação os arquivos da frente 1.4 ainda estiverem pendentes e o dono não destravar o rodapé, executar somente T01 e deixar T02 bloqueado, registrando no plano.

## 9. Cartões de tarefas

### Cartão T00 — Registrar decisão e abrir o plano vivo
- **Objetivo / resultado**: formalizar as decisões do grill de 2026-11-03 em `docs/plans/` antes de especificar qualquer arquivo de código.
- **Depende de**: nenhum.
- **Arquivos / componentes prováveis**: este plano; `docs/README.md` (índice).
- **Inclui**: cabeçalho vivo; decisões fechadas; cartões T01–T02; matriz de validação; registro da execução desta rodada.
- **Não inclui**: qualquer escrito fora de `docs/`.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: links relativos válidos, `git status` sem temporários, plano listado no índice de `docs/README.md`.
- **Validação**: conferência dos links e da listagem no índice.
- **Riscos e rollback**: não aplicável (documental; reversão simples por `git`).
- **Limite de tentativas**: 2.

### Cartão T01 — Construir a landing page autocontida
- **Objetivo / resultado**: `landing/index.html` autocontido, mobile-first, com 6 seções, identidade da marca, copy acolhedora pronta, 7 modalidades (3 cards + chips), CTA único de WhatsApp e placeholders tipados nos pontos de substituição.
- **Depende de**: T00.
- **Arquivos / componentes prováveis**: `landing/index.html` (novo); `README.md` da raiz (uma linha).
- **Inclui**:
  1. HTML + CSS embutidos num único arquivo; sem build, sem framework, sem analytics, sem scripts.
  2. Seções na ordem: hero tipográfico (sem foto), serviços (3 cards principais + chips "Também inclui"), como funciona (passos simples), sobre/credenciais com placeholder de foto visível, FAQ em acordeão CSS, CTA final.
  3. Design mobile-first validado no 433×762 com DPR 2,81, com adaptação desktop simples (max-width e grid).
  4. Identidade: base clara, amarelo `#FFDE17` em destaques e CTAs, Poppins via Google Fonts, logo oficial de `assets/images/`, ícones SVG inline.
  5. Placeholders tipados e centralizados: `[BIO_PRA_JOSY]`, `[WHATSAPP_PRA_JOSY]` (formato único `wa.me`), foto da seção Sobre.
  6. Região real "São Paulo — Zona Norte" citada no hero e no FAQ.
  7. Uma linha no `README.md` da raiz apontando a pasta e a URL.
- **Não inclui**: rodapé do app (T02), formulário, analytics, depoimentos, preços, "Onde treinar".
- **Decisões pendentes / bloqueios**: número real do WhatsApp, bio e foto — não bloqueiam a construção com placeholders (decisão de 2026-11-03).
- **Critérios de aceite**: página abre em `/landing` via `node scripts/servir-local.js`; HTTP 200; navegação sem erros de console; todas as seções presentes no viewport de referência; CTA de WhatsApp presente e único no fluxo.
- **Validação**: manual no navegador integrado em `433×762`, DPR 2,81 (emulação de dispositivo) e stress test em `320×568` e `390×844`; página permanece no ar com o servidor do mock para aceite do dono.
- **Riscos e rollback**: risco baixo (arquivo novo isolado); rollback por remoção do arquivo / `git revert`.
- **Limite de tentativas**: 2; ao atingir, bloquear cartão e pedir decisão ao responsável.

### Cartão T02 — Linkar a landing no rodapé público do app
- **Objetivo / resultado**: a URL `/landing` fica alcançável a partir do rodapé público do app, na cadeia de links já existente (Privacidade • Termos • Contato).
- **Depende de**: T01 **+ destravar a frente 1.4**: `index.html` da frente 1.4 commitada e o dono autorizando tocar no `index.html` nesta frente.
- **Arquivos / componentes prováveis**: `index.html` do app (uma âncora em `.rodape-publico-apresentacao`, junto ao marcador `[TAG-HTML-RODAPE-PUBLICO]`).
- **Inclui**: inserir o link "Landing/Serviços" (rótulo a escolher na hora) na cadeia do rodapé público, preservando a estrutura e as classes existentes.
- **Não inclui**: qualquer outra alteração em `index.html` da frente 1.4 em andamento, nem reordenação ou troca de estilos do rodapé.
- **Decisões pendentes / bloqueios**: depende de decisão do dono (quando a 1.4 será commitada).
- **Critérios de aceite**: link presente no rodapé público, abre `/landing` com `target="_blank"` `rel="noopener noreferrer"` (padrão dos links existentes); nenhuma outra linha do rodapé alterada.
- **Validação**: mock `index.html?mockScenario=...` com o rodapé visível, viewport de referência `433×762`, DPR 2,81.
- **Riscos e rollback**: risco baixo (adição isolada); rollback por `git revert`.
- **Limite de tentativas**: 2.

## 10. Matriz de validação

| Tipo | O que cobre | Onde | Observação |
|---|---|---|---|
| Automatizada | `não aplicável` — nenhuma suíte cobre a pasta `landing/` (estática, sem lógica) | — | decisão de 2026-11-03: sem teste novo |
| Manual (navegador) | Navegação, seções, contraste, responsividade | `http://127.0.0.2:5500/landing/` com `servir-local.js`; viewport `433×762`, DPR 2,81; stress `320×568`, `390×844` | necessário |
| Manual (deploy) | URL pública respondendo após o merge | `https://josy-personal-app.vercel.app/landing` | necessário após merge |

**Não coberto por esta validação**: apresentação visual completa (contraste fino, desempenho em 4G real), análise de SEO além do mínimo aceitável e comportamento em navegadores não testados (a verificação local usa o Chromium do VS Code).

## 11. Prova por mutação

`não aplicável` — sem teste automatizado novo nesta frente (decisão de 2026-11-03: página estática sem lógica; a suíte de frontend cobre recortes de lógica/DOM, não apresentação visual, e o custo de um teste de presença seria alto para o benefício nesta página desacoplada do app).

## 12. Registro da execução

### 2026-11-03 — T00 (Abertura documental do plano, sem implementação)
- **Arquivos alterados**: `docs/plans/2026-11-03-plan-landing-servicos-josy.md` (criado); `docs/README.md` (índice: linha do plano desta frente).
- **Resultado**: decisões do grill formalizadas em plano vivo; cartões T01–T02 não iniciados; nenhum arquivo de código escrito.
- **Suíte antes/depois**: `não executado` (alteração estritamente documental).
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: pelo dono, a implementação foi deliberada e adiada para a próxima rodada — o dono pediu somente "documente o plano para a execução" após confirmar o entendimento do grill.

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| URL pública da landing usará placeholders visíveis até o conteúdo real chegar (número de WhatsApp, bio, foto) | O dono optou por publicar cedo e substituir depois (decisão de 2026-11-03) | Substituição em rodada futura (decisões pendentes 1–3) | Luccas |
| O rodapé do app não pode ser tocado enquanto o `index.html` da frente 1.4 estiver sujo | Conflito de frentes no mesmo arquivo; risco de mistura de escopos | Ação aguardada no cartão T02 | Luccas |
| Reuso potencial do grid/tipografia da landing pelo próprio app | A landing é autocontida por decisão; não vira dependência do CSS do app | `não aplicável` — pode ser revisitada se a landing evoluir | Luccas |

## 14. Deploy e rollback

- **Efeito externo**: merge na `main` dispara redeploy automático do projeto `personal-app-webpage`; a URL `https://josy-personal-app.vercel.app/landing` fica publicamente acessível (sem `noindex`, sem link na v1 — o link só vem com o T02, quando a 1.4 destravar). **Não há staging.**
- **Ordem de publicação**: (1) T01 pronto e validado; (2) decisão do dono sobre merge/publicação (decisão pendente 4); (3) T02 somente após destravar a frente 1.4.
- **Verificação pós-deploy**: abrir a URL pública pós-merge e conferir as seções no celular do dono (referência 433×762).
- **Limite do rollback**: `git revert` desfaz o arquivo e a URL deixa de responder (404); nada de estado externo é criado pela landing — sem banco, sem webhook, sem credencial; não há diferença entre rollback de código e de estado.

## 15. Fechamento

- **Critérios atendidos**: pendente — T00 concluído; T01 e T02 não iniciados.
- **Implementação / validação / aceite / publicação**: implementação pendente (aguarda próxima rodada com branch confirmada); validação e aceite pendentes; publicação pendente (decisão do dono).
- **Pendências**: decisões pendentes 1–4; destravamento da frente 1.4 para o T02.
- **Riscos aceitos**: URL pública com placeholders visíveis até o conteúdo real; rodapé sem link até a 1.4 destravar.
- **Data de fechamento**: — (aberto)
