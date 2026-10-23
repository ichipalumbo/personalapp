# Plano vivo — Aplicação da identidade visual Personal Josy

> **Status**: Em execução · **Criado**: 2026-10-17 · **Atualizado**: 2026-10-23
> **Responsável**: GitHub Copilot · **Dono das decisões**: dono do repositório
> **Branch**: `feat/aplicacao-identidade-visual`, criada de `origin/main` em 2026-10-22 com `--no-track`, abriga **todas as etapas**; um único PR ao final leva o conjunto para a `main`. A etapa 0 ficou em `docs/auditoria-roadmap`.
> **Base**: commit `5416e9e`, medida em 2026-10-17; etapa 1 medida sobre a `main` em `ea29834`.
> **Fontes**: [spec de identidade](../specs/identidade-e-apresentacao-publica.md), [guia de identidade visual v3](../reference/identidade/guia-identidade-visual-v3.md), [kit visual v2](../reference/identidade/kit-visual-completo-v2/LEIA-ME.md), [spec de interface](../specs/interface-e-navegacao.md), [roadmap, item 5.10](../roadmap-v3.md) e [ambiente de validação](../setup-ambiente-local.md).

## 1. Objetivo

Aplicar no app e no PWA a identidade aprovada: logo no cabeçalho, nome **Personal Josy** onde o produto exibe nome, ícones de instalação, cores do guia e Poppins. Na mesma frente, ampliar os alvos de toque do topo da tela, antes registrados no item 5.9 do roadmap.

## 2. Autorização e limites

| Decisão | Origem | Efeito |
|---|---|---|
| Continuar na branch atual | Resposta do dono em 2026-10-17 | Etapa 0 em `docs/auditoria-roadmap`; commit e push continuam com o dono |
| Adotar a paleta do guia na interface | Resposta do dono em 2026-10-17 | Spec v8, seção 2.2: Amarelo Josy `#FFDE17` no lugar de `#FFD700` e Grafite `#202020` no lugar de `#0D0D0D` |
| Poppins por arquivos locais | Resposta do dono em 2026-10-17 | Spec v8, seção 2.8: sem serviço de fontes de terceiros, disponível offline |
| Nesta rodada, só a etapa 0 | Resposta do dono em 2026-10-17 | Spec, plano e roadmap; nenhum arquivo de produto alterado |
| Consolidar o item 5.9 inteiro | Resposta do dono em 2026-10-17 | Cabeçalho e barra da agenda entram na etapa 1; 5.9 passa a apontar para 5.10 |
| Botão de login Google: só área de toque | Resposta do dono em 2026-10-17 | Spec v8, seção 2.9: sem mudar variante, cores, texto ou símbolo; aviso ao dono antes de implementar |
| Ícone do app e cor de tema | Decisões registradas no guia v3, seção 8.3 | Símbolo do kit sobre Grafite com área segura; cor de tema escolhida na implementação após teste |
| Uma branch para todas as etapas, com PR único | Resposta do dono em 2026-10-22 | Substitui o "branch e PR por etapa" da seção 6; o conjunto entra na `main` de uma vez |
| Cópia do SVG em `assets/images/` | Resposta do dono em 2026-10-22 | Arquivo do mestre copiado para junto dos ícones do app |
| Manter os metadados internos do SVG | Resposta do dono em 2026-10-22 | Cópia idêntica ao mestre; nada de limpeza de `title`/`desc` |
| Alvos de toque: abordagem mista | Resposta do dono em 2026-10-22 | Hitbox de 44 px no cabeçalho (avatar e Google) e altura visual de 44 px nas tabs e na barra da agenda |
| Cor de tema e fundo de abertura em Grafite | Resposta do dono em 2026-10-22 | `theme_color` e `background_color` = `#202020`, contínuos com o cabeçalho escuro |

## 3. Escopo

**Dentro**: cabeçalho e topo da tela, nome exibido (título, manifest, título de app da Apple), favicon e ícones de instalação, cor de tema e fundo de abertura, cores da interface (CSS, estilos inline do `index.html` e cores definidas em JS) e fonte da interface.

**Fora**:

- tela de consentimento Google;
- página pública e páginas legais;
- variante, cores e apresentação do botão Google;
- nome do cache do service worker e demais identificadores técnicos (spec, seção 3.2);
- regras de negócio;
- publicação, que continua com o dono.

## 4. Invariantes aplicáveis

- **Arquivos do kit são mestres** (spec, seção 2.4): copiar sem redesenhar; ajuste de tamanho só por CSS ou na exportação.
- **Cores com significado** (spec, seção 2.2; spec de interface, seções 4 e 5): o amarelo é identidade; categorias e estados mantêm o significado; cor não é o único sinal.
- **Contraste** conforme o [guia, seção 10](../reference/identidade/guia-identidade-visual-v3.md#10-legibilidade-e-contraste): 4,5:1 para texto comum, 3:1 para texto grande e elementos não textuais.
- **Autenticação é área sensível** ([instruções, seção 7](../../.github/copilot-instructions.md)): avisar antes de mexer no botão Google. Manifest, ícones e service worker afetam instalações existentes e também têm aviso prévio.
- **Sem dependência nova**: arquivos de fonte e ícones são assets; não entra pacote npm nem build step.
- **Ordem das tags `<script>`**: um script novo que leia um global no topo do arquivo exige o par em `DEPENDENCIAS_DE_CARGA`.
- **Validação visual no mock**, no viewport de referência 433×762 (DPR 2,81), com 390×844 e 320×568 como stress test.

## 5. Base medida em 2026-10-17

| Onde | Situação |
|---|---|
| `assets/css/style.css` | 280 HEX literais. `#FFD700` 60 vezes, `rgba(255, 215, 0, …)` 43, `#0D0D0D` 16. Cinzas fora da paleta mais frequentes: `#333` (8), `#AAA` (7), `#1F1F1F` (6), `#888` (4), `#111` (4). `#4285F4` (5) é azul do Google |
| Fonte global | `"Segoe UI", Tahoma, Geneva, Verdana, sans-serif`, no seletor global do `style.css` |
| `index.html` | `#FFD700` 7 vezes inline, `rgba` amarelo 3, `#0D0D0D` 5. Título "Prô Josy - Agenda Personal Trainer". `apple-mobile-web-app-title` "AgendaPersonalTrainer". `theme-color` `#1e88e5`. Favicon e ícone da Apple em `icon-192x192.png` |
| Cabeçalho | `h1.marca-titulo` com ícone de haltere, "Prô" e "Josy" em texto |
| JS com cor fixa | `#FFD700` em `agenda-card-template.js` (1 e 1 `rgba`), `modal-agendamento.js` (2), `view-alunos.js` (4), `view-financas.js` (8, 2 `rgba` e 1 `#0D0D0D`) e `view-home.js` (1 e 1 `#0D0D0D`) |
| `manifest.json` | `name` e `short_name` "Prô Josy", `theme_color` `#1e88e5`, `background_color` `#ffffff`, ícones 192 e 512 sem `purpose` |
| Ícones atuais | `assets/images/icon-192x192.png` e `icon-512x512.png`: ilustração genérica de calendário, sem relação com a marca |
| `sw.js` | `CACHE_NAME` contém "Prô Josy". Pré-cache de `index.html`, `style.css` e `app.js`. GETs da mesma origem vão primeiro à rede e são guardados no cache, que serve de reserva offline |
| Testes de frontend | `header-cache-state.test.js` monta o cabeçalho com "Prô Josy"; `fab-adicionar.test.js` espera `rgb(255, 215, 0)` |
| Alvos de toque do topo | O último inventário ([etapa 2, 2026-09-26](../archive/plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md)) é anterior à navegação inferior; precisa ser refeito |

As contagens descrevem esta base e não são contagem viva do projeto.

## 6. Etapas

As etapas seguem em uma única branch, `feat/aplicacao-identidade-visual`, e entram na `main` por um único PR ao final (decisão do dono em 2026-10-22, registrada na seção 2). O merge continua publicando em produção de uma vez para todas as etapas. A etapa 4 depende da 3. As etapas 1 e 2 são independentes entre si. A 5 fica por último para medir o layout com as cores já estáveis.

| Etapa | Resultado | Estado |
|---|---|---|
| 0 | Contrato e plano: spec v8, este plano e item 5.10 no roadmap | Concluída em 2026-10-17 |
| 1 | Cabeçalho com logo e alvos de toque do topo | Concluída em 2026-10-22 |
| 2 | Nome exibido e instalação do PWA | Concluída em 2026-10-22 |
| 3 | Variáveis de cor, sem mudança visual | Concluída em 2026-10-22 |
| 4 | Recoloração com a paleta do guia | Concluída em 2026-10-22 |
| 5 | Poppins na interface | Pendente |

### Etapa 1 — Cabeçalho e alvos de toque do topo

- **Logo**: `01_horizontal/escuro/personal_josy_horizontal_escuro_transparente.svg`, do kit, aplicado como arquivo, com tamanho definido por CSS, sem descritor, sombra ou animação. Sai o ícone de haltere e o texto "Prô Josy". O nome acessível é "Personal Josy".
- **Decidido em 2026-10-22**: cópia em `assets/images/`, mantendo os metadados internos do mestre.
- **Alvos de toque**:
  - inventário refeito no estado renderizado em 2026-10-22 (números na seção 10);
  - abordagem aprovada: mista — hitbox de 44 px no cabeçalho e altura visual de 44 px nas tabs e na barra da agenda.
- **Botão Google**: só a área de toque, com aviso ao dono antes da implementação.
- **Testes**: atualizar o fixture de `header-cache-state.test.js` se o markup do cabeçalho mudar; todo teste novo precisa ser provado por mutação.
- **Aceite**:
  - logo legível em 433×762 sem empurrar os controles;
  - sem quebra em 390×844 e 320×568; se a horizontal não couber, parar e pedir aprovação (spec, seção 2.9);
  - leitor de tela anuncia "Personal Josy";
  - alvos de toque conforme a abordagem aprovada.
- **Convivência**: até a etapa 4, o amarelo do logo (`#FFDE17`) convive com o amarelo da interface (`#FFD700`).

### Etapa 2 — Nome exibido e instalação do PWA

- **Nome**: título da página, `apple-mobile-web-app-title`, e `name` e `short_name` do manifest passam a "Personal Josy". Se o nome curto for truncado, parar e pedir aprovação.
- **Ícones**: favicon; 192 e 512 nas versões padrão e maskable (zona segura de 80%); ícone da Apple. Todos gerados do símbolo do kit sobre Grafite, conforme o guia, seção 8.3. A geração usa o Edge em modo headless, já usado no gerador do PDF do guia, sem dependência nova.
- **Origem vetorial**: o SVG do avatar escuro com fundo do kit já é a peça da seção 8.3 — símbolo centrado sobre `#202020` opaco, sem nome, descritor ou cantos arredondados. Raio máximo do desenho medido em 411,7 de 1080 (76,2% do diâmetro), dentro do limite de 80%.
- **Cor de tema e fundo de abertura**: proposta apresentada ao dono e aprovada em 2026-10-22 — Grafite `#202020` nos dois, contínuo com o cabeçalho escuro. O teste em plataformas reais fica na conferência de instalação do dono. O plano não testa Android/iOS reais.
- **Fora**: `CACHE_NAME` do `sw.js` não muda.
- **Aviso prévio**: a etapa altera o que fica instalado nos aparelhos.
- **Aceite**:
  - manifest válido no DevTools, sem alertas de ícone;
  - prévia maskable sem corte do símbolo;
  - favicon e título corretos na aba;
  - instalação conferida no celular do dono.
- **Risco**: em app já instalado, ícone e nome atualizam com atraso, que depende da plataforma.

### Etapa 3 — Variáveis de cor, sem mudança visual

- Criar variáveis CSS para as cores em uso, inclusive as variações com transparência. Trocar os literais do `style.css`, os estilos inline do `index.html` e as cores fixas dos JS por variável ou classe.
- Os valores continuam os atuais. Os nomes das variáveis são decididos na etapa, para que a etapa 4 seja só troca de valor.
- **Decidido em 2026-10-22**: esquema híbrido — tokens semânticos onde já existiam (`--cor-estado-*`, `--objetivo-*`, `--cor-primaria`) e tabela por família + passo para o resto (`--cor-<família>-NN`, sufixo `-aNN` = alfa em centésimos). Entrega em duas passadas: `style.css` + `index.html`, depois os JS.
- **Fora da tokenização**: cores que são dado, não estilo — cor de objetivo vinda da API (`#FF887C` em `storage.js` e `view-alunos.js`), fallback de objetivo (`#6B7280`), verde do Google Calendar (`#51b749`) e azul da marca Google (`#4285F4`).
- **Aceite**:
  - capturas do mock antes e depois idênticas nas telas principais e modais, nos três viewports;
  - suíte de frontend medida antes e depois.

### Etapa 4 — Recoloração com a paleta do guia

- Amarelo Josy e Grafite entram nas variáveis da etapa 3.
- Para as cores sem correspondente na paleta, montar uma tabela de mapeamento cor a cor, aprovada pelo dono antes da troca.
- O azul do Google e as cores de categoria e estado não mudam de significado.
- Atualizar a expectativa de `fab-adicionar.test.js`, com prova por mutação.
- **Decidido em 2026-10-22**:
  - **Base = Grafite `#202020`, superfícies de camada mantidas.** Subir painel, modal e card junto com a base foi medido e reprovado: todo texto secundário vive sobre card e painel, e o card em `#3C3C3C` derrubou `#909090` de 4,50:1 para 3,46:1. Para recuperar o piso de 4,5:1 o card não poderia passar de `#292929`, e as 17 superfícies de camada não cabem em 10 degraus entre `#202020` e `#2A2A2A`. A hierarquia de camada fica garantida por borda, raio e sombra, e a página se distingue do painel pelo contraste de texto, não pelo degrau de fundo.
  - **Rampa `neutro` renumerada por luminância**: 51 bases + 2 alfas, sem lacuna (era 52 bases). A base da interface é `--cor-neutro-10`, e Névoa é `--cor-neutro-46`.
  - **Acentos convergidos para os semânticos**: 13 valores fora da paleta passaram a apontar para o token de mesmo significado (Coral, Âmbar, Verde Concluído, Informativo e Névoa). 18 tokens ficaram sem uso e foram removidos; 5 alfas de erro foram criados (`--cor-estado-erro-a10/a20/a35/a40/a80`).
  - **Cores de categoria, estado, marca Google e Calendar preservadas** no valor do guia.
- **Método de auditoria de contraste** (repetível): compor as camadas de `background-color` com alfa até achar a cor opaca, resolver o alfa de `color` sobre ela e comparar com WCAG AA, tela a tela, comparando `HEAD` × árvore de trabalho. Medir contra a *base* em vez do *card* foi o erro que gerou a primeira recomendação, porque é sobre card e painel que vive o texto secundário.
- **Aceite**:
  - contraste medido nos pares de texto, fundo e foco, conforme o guia, seção 10;
  - capturas comparativas aprovadas pelo dono.

### Etapa 5 — Poppins na interface

- Arquivos `woff2` locais em `assets/vendor/`, com a licença da família. Os pesos são o mínimo necessário, definido na etapa.
- `@font-face` com estratégia de exibição e pilha de fallback definidas na etapa.
- **Disponibilidade offline**: depende do cache por uso descrito na base. Incluir os arquivos no pré-cache altera o `sw.js` e exige aviso.
- **Aceite**:
  - sem estouro ou quebra indevida nos três viewports, inclusive nos números do financeiro;
  - nenhuma requisição de fonte a terceiros na aba de rede;
  - fonte disponível offline após o primeiro carregamento.

## 7. Validação comum

- Suíte de `tests-frontend/` antes e depois de cada etapa, com números medidos.
- Mock com `node scripts/servir-local.js` e `?mockScenario=<cenário>`, nos três viewports. A skill `web-design-reviewer` pode apoiar a revisão renderizada.
- Revisão do que for alterado em `index.html`, `manifest.json` e `sw.js` contra a ordem de carga e o comportamento offline.

## 8. Riscos e publicação

- O merge na `main` publica em produção. O app ainda não foi lançado e a base de produção está zerada, mas cada etapa precisa entrar inteira e reversível.
- Reverter o PR desfaz o código. Ícones e nome já instalados nos aparelhos podem demorar a voltar.
- Mudança de fonte é a maior fonte de regressão de layout, por isso fica por último.

## 9. Pendências conhecidas fora deste plano

- Os SVGs do kit têm metadados internos com "Final B", e a prancha `personal_josy_kit_final_prancha.png` mostra "OPÇÃO B". Isso não afeta a interface, salvo se a cópia levar os metadados (decisão da etapa 1).
- O asset para a tela de consentimento Google continua aberto na spec, seção 4.

## 10. Registro da execução

### Etapa 0 — 2026-10-17

- Spec de identidade passou da v7 para a v8:
  - cores da interface pela paleta do guia (seção 2.2);
  - Poppins local (2.8);
  - área de toque do botão Google (2.9);
  - nova seção 2.10 com nome no produto e ícones de instalação;
  - nome do cache do service worker como identificador técnico (3.2);
  - decisões abertas (4) e fora de escopo (5) atualizados.
- Plano criado.
- Roadmap:
  - item 5.10 criado no lugar do 5.9;
  - 5.9 registrado como consolidado (`[→]`).
- Nenhum arquivo de produto, teste, guia ou kit foi alterado.

### Etapa 1 — 2026-10-22

- Branch `feat/aplicacao-identidade-visual`, criada de `origin/main` (`ea29834`) com `--no-track`; working tree limpo na abertura.
- Inventário de alvos de toque medido no mock, antes da mudança (CSS px):

| Elemento | 433×762 | 390×844 | 320×568 |
|---|---|---|---|
| Cabeçalho (altura) | 70 | 62 | 62 |
| Marca (texto) | 113×26 | 105×25 | 90×22 |
| Botão avatar | 36×36 | 36×36 | 36×36 |
| Tabs Semana/Dia | 174×32 | 157×32 | 122×32 |
| Setas de semana | 33×26 | 33×26 | 33×26 |
| Botão "Hoje" | 51×30 | 51×28 | 51×28 |
| Botão Google (deslogado) | 170×32 | 145×28 | 145×28 |

- Mudanças:
  - `assets/images/personal_josy_horizontal_escuro_transparente.svg`: cópia idêntica ao mestre do kit (hash conferido).
  - `index.html`: o `h1.marca-titulo` passou a conter `img.marca-logo` com `alt="Personal Josy"`; saíram o ícone de haltere e o texto "Prô Josy".
  - `assets/css/style.css`: `.marca-logo` com altura por `clamp(22px, 6.8vw, 30px)` e `object-fit: contain`; `.btn-user-area-trigger` com 44×44; hitbox de 44 px no botão Google por sobreposição (sem alterar visual, cores, texto ou símbolo); tabs da agenda e navegação de semana/dia com `min-height: 44px` e `min-width: 44px` no escopo `.home-weekly-nav-row` — os `.btn-sm` e `.tab-btn` dos modais não mudaram.
  - `tests-frontend/header-marca-identidade.test.js` (novo): logo aplicado como arquivo, nome acessível e cópia idêntica ao mestre. `header-cache-state.test.js`: fixture do cabeçalho atualizada.
- Medido depois da mudança, em 433×762 / 390×844 / 320×568 com **DPR 2,81 e emulação mobile** (setup da seção 10 das instruções): header 78/70/70; logo 171×29, 154×27 e 128×22; avatar 44×44; tabs 174/157/122 de largura por 44 de altura; setas 44×44; "Hoje" 51×44; botão Google com hitbox de 44 de altura e visual inalterado. O topo da Home termina em 245/232/221 px; `scrollWidth` igual à largura da viewport, sem rolagem horizontal.
- O inventário "antes" acima foi medido em CSS px com DPR 1 e sem emulação mobile; alturas e alvos, que são o objeto da etapa, seguem comparáveis. Numa primeira medição com DPR 1 o rótulo do período aparecia truncado em 1 px em 390 px; com DPR 2,81 e emulação mobile ele cabe inteiro (118 px para 118 px), então nenhuma regra extra de vão foi mantida no CSS.
- Em 320 px o rótulo do período já truncava antes da etapa (77 px para 104 px necessários) e agora dispõe de 47 px; a correção definitiva nessa largura exigiria quebrar "Hoje" para a segunda linha, o que muda o layout da Home e não foi aprovado nesta rodada.
- Testes: suíte de frontend de 420 para 422, todas passando. Nenhum teste cobre medida de layout; os números acima vêm do mock.

### Etapa 2 — 2026-10-22

- Branch mantida (`feat/aplicacao-identidade-visual`); a etapa 1 foi commitada pelo dono em `5ee686a`.
- Decisão do dono nesta rodada: `theme_color` e `background_color` = Grafite `#202020`.
- Nome: `<title>`, `apple-mobile-web-app-title`, `name` e `short_name` do manifest passaram a "Personal Josy". `start_url`, `display` e `orientation` não mudaram.
- Ícones gerados de `07_avatar/escuro/personal_josy_avatar_escuro_com_fundo.svg` por `scripts/gerar-icones-app.js` (Edge headless, sem dependência nova):
  - `icon-192x192.png` e `icon-512x512.png` regenerados, mantendo os nomes que o app já referenciava;
  - `apple-touch-icon-180x180.png` e `favicon-32x32.png` criados.
  - Conferido por amostragem de pixel: cantos em `#202020`, símbolo em `#FFDE17`, dimensão exata em cada arquivo.
- O manifest declara as duas finalidades para 192 e 512 (`any` e `maskable`), reusando os mesmos arquivos: o desenho já respeita a zona segura, então não existe versão alternativa para manter.
- `sw.js` não foi tocado: `CACHE_NAME` é identificador técnico (spec, 3.2) e trocá-lo força flush do cache offline de todo aparelho — o `activate` atual apaga qualquer cache com nome diferente do atual.
- Validação no mock (433×762, DPR 2,81): `manifest.json` responde 200 com os valores novos, favicon 32×32 e apple 180×180 carregam, ícones 192/512 carregam, título da aba "Personal Josy", `theme-color` `#202020`.
- Testes: `tests-frontend/pwa-nome-icones.test.js`, 4 casos — nome e campos do manifest; existência, tipo e dimensão real dos PNG contra o `sizes` declarado; zona segura e base opaca dos maskable; título, títulos de app e links de ícone no HTML. Suíte de frontend de 422 para 426, todas passando.
- Provas por mutação: `name` revertido no manifest (1 falha); PNG trocado por um com pixel a 80,5 px do centro contra limite de 76,8 (1 falha); `sizes` 192 declarado como 384 (1 falha). Tudo restaurado e conferido por hash.
- Pendente com o dono: instalar no aparelho e conferir ícone, nome curto e cor da barra. Em app já instalado, a atualização de ícone e nome tem atraso próprio da plataforma.

### Etapa 3 — 2026-10-22

- Branch mantida (`feat/aplicacao-identidade-visual`). Nenhuma escrita em `sw.js`.
- Decisões do dono nesta rodada: esquema híbrido de nomes; entrega em duas passadas; **renumerar** a família `neutro` para manter a ordem de luminância, em vez de acrescentar passos fora de ordem.
- Inventário medido no `HEAD` antes da mudança: `style.css` com 264 literais hex (87 distintos) e 101 `rgba` (71 distintos) fora do `:root`; `index.html` com 56 literais em atributos `style` (20 distintos) e nenhum bloco `<style>`; 94 literais de cor em 6 arquivos JS.
- Resultado: 170 tokens `--cor-*` no `:root` do `style.css`, sendo a tabela por família (amarelo, azul, branco, laranja, neutro, preto, primaria, roxo, verde, vermelho) e os semânticos que já existiam reaproveitados. `neutro` ficou com 52 bases numeradas de 01 a 52 (a base 02 só existe na forma de alfa). `--cor-primaria` foi definido: era usado sem definição desde antes desta etapa.
- Referências convertidas: `style.css` sem nenhum literal fora do `:root`; `index.html` sem literal em atributo `style`; em JS, 89 literais convertidos para token e 5 preservados por serem dado (ver "Fora da tokenização" na seção 6).
- Tokens de alfa acrescentados nesta passada, por não existirem: `--cor-estado-ok-a18` e `--cor-estado-erro-a15`.
- **Método de verificação** (o mesmo vale para as próximas etapas): mapa de estilo computado por caminho estrutural, cobrindo 13 propriedades de cor por elemento, comparado entre o estado do `HEAD` e o da árvore de trabalho — com `index.html`, `style.css` e os JS do **mesmo** estado. Comparação de pixel não serve: três carregamentos idênticos geraram três hashes diferentes.
- Medido no mock (433×762, DPR 2,81, emulação mobile, service worker contornado): `home-semana` 731 elementos, `home-dia` 889, `financas` 1136, `alunos` 1352 — **zero diferenças** em todas as telas, em todas as propriedades. Os modais entram na conta porque são pré-renderizados: abrir só troca `display`.
- Armadilha registrada para não se repetir: comparar `index.html` já tokenizado contra um `style.css` antigo faz os `var()` do bloco `<style>` inline ficarem sem definição e caírem para `transparent`, produzindo 40 "diferenças" falsas. As duas peças precisam vir sempre do mesmo estado. A contagem de `var()` também denuncia isso: o `index.html` do `HEAD` tem 0 e o atual tem 53.
- Testes: `tests-frontend/tokens-cor-etapa3.test.js` (novo), 4 casos — nenhum literal fora do `:root`; todo `var(--cor-*)` usado em CSS, HTML e JS está definido; nenhum atributo `style` do `index.html` com literal; família `neutro` sem lacuna e em ordem crescente de luminância. `tests-frontend/fab-adicionar.test.js` passou a resolver os tokens antes de comparar a cor final, porque o CSSOM devolve `var(--cor-*)` cru.
- Provas por mutação: literal `#123456` fora do `:root` (1 falha); `--cor-primaria` renomeado no `:root` (1 falha); `style="color:#123456"` no `<body>` (1 falha); `--cor-neutro-01` trocado por `#f4f4f4` (1 falha); `--cor-primaria` trocado por `#00ff00` (1 falha em `fab-adicionar`). Tudo restaurado e conferido por hash.
- Suíte de frontend: 426 antes, 430 depois, todas passando. Suíte de backend não foi executada porque nenhum arquivo de `backend/` foi tocado.
- Encontrado e **não** alterado (anterior a esta etapa): `--header-height` é usada sem fallback em duas regras (o `top` resultante é inválido) e `var(--estado-aviso, …)` referencia variável inexistente, mas com fallback válido. Continua valendo a pendência do rótulo de período truncado em 320 px, registrada na etapa 1.

### Etapa 4 — 2026-10-22

- Branch mantida (`feat/aplicacao-identidade-visual`); a etapa 3 foi commitada pelo dono em `b036424`. Nenhuma escrita em `sw.js`.
- Decisões do dono nesta rodada: `rampa=aprovar` (base Grafite e camadas coerentes), `navegacao=sobe`, `acentos=convergir`; depois da auditoria de contraste, `reverter` as superfícies de camada. O dono pediu recomendação com padrão de mercado antes de decidir as duas primeiras.
- O conflito central: as cores de categoria e estado do guia **já** eram as do produto (`#FFB878`, `#5484ED`, `#81C784`, `#64B5F6`, `#FFB74D`, `#FF8A80`, `#CFCFCF`), e Carvão `#1A1A1A`, Chumbo `#2A2A2A`, Névoa `#E0E0E0` e Cinza Médio `#A0A0A0` já existiam na rampa. O trabalho real era a base (`#0D0D0D` → `#202020`), o amarelo (`#FFD700` → `#FFDE17`) e os acentos que estavam fora da paleta.
- Mudanças:
  - `assets/css/style.css`: `--cor-neutro-10` = `#202020`; família `neutro` renumerada por luminância (51 bases + 2 alfas, sem lacuna); `--cor-primaria` = `#ffde17` com 21 alfas `rgba(255, 222, 23, α)`; 18 tokens de acento removidos e 17 referências redirecionadas para o semântico de mesmo significado; 5 alfas de erro criados; fallback órfão `var(--estado-aviso, var(--cor-amarelo-02))` corrigido para `var(--cor-estado-aviso)`; família `amarelo` renumerada (04 → 02); comentários do `:root` sem citar `#ffd700`.
  - `index.html` e `assets/js/{agenda-card-template,modal-agendamento,view-alunos,view-financas,view-home}.js`: renumeração dos neutros e redirecionamento dos acentos. Nenhuma cor preservada como dado mudou.
  - `tests-frontend/fab-adicionar.test.js`: expectativas finais em `rgb(255, 222, 23)` e `rgb(32, 32, 32)`.
- Estado final medido: 157 tokens `--cor-*` (eram 170); 0 literal de cor fora do `:root`; 0 literal em `style=""`; 0 `var(--cor-*)` sem definição; 0 token sem uso.
- **Achado que mudou o rumo**: a primeira recomendação (subir as camadas) foi feita medindo os pares de texto contra a *base*. A auditoria correta — compondo fundo efetivo com alfa e usando o *card* como fundo do texto secundário — mostrou que `#909090` sobre card caía de 4,50:1 para 3,46:1 e `#888888` sobre modal de ~5,6:1 para 3,94:1. Pares abaixo de AA por tela: `home-semana` 3 → 7, `home-dia` 3 → 7, `financas` 4 → 8, `alunos` 5 → 12. Daí a decisão do dono por reverter as superfícies.
- Depois da reversão, a auditoria voltou ao `baseline`: `home-semana` e `home-dia` com 2 pares, `financas` e `alunos` com 3–5 — todos pré-existentes e nenhuma violação nova. Os pares que restam: `#ffffff` sobre `#ff9800` (2,16, badge de deslocamento), `#4285f4` sobre `#222830` (4,16, botão Google), `#909090` sobre `#2a2a2a` (4,50, no limite), `#5484ed` sobre `#2a2a2a` (4,03, Consultoria Online no card) e `#ff8a80` sobre fundo escuro (~4,4, desconectar GCal).
- Medido no mock (433×762, DPR 2,81, service worker contornado): `body` `rgb(32,32,32)`, texto `rgb(224,224,224)`, FAB `rgb(255,222,23)` sobre `rgb(32,32,32)`, `--cor-primaria` `#ffde17`, sem erro de página.
- Testes: `tests-frontend/paleta-marca-etapa4.test.js` (novo), 5 casos — Amarelo Josy e derivados com alfa; Grafite como fundo do `body` mais o cabeçalho translúcido derivado dele; convergência dos 13 acentos; e duas **guardas** que valem antes e depois (categorias e estados do guia; cores de marca Google e Calendar no valor original). Suíte de frontend: 430 antes, 435 depois, todas passando. Suíte de backend não foi executada porque nenhum arquivo de `backend/` foi tocado.
- Provas por mutação: `style.css` e `index.html` do `HEAD` repostos na árvore — 3 das 5 falham (amarelo, Grafite, convergência de acentos) e as 2 guardas continuam passando, que é o esperado delas. Restaurado e conferido por `git status`. `--cor-primaria` trocada por `#00ff00` também derruba `fab-adicionar` (1 falha).
- Dois bugs de script no caminho, registrados para não repetir: reler o `style.css` do disco no meio da execução apagou a rampa já calculada (a correção é transformar tudo em memória e escrever uma vez); e forçar todo valor a cinza puro colapsou `#222224` em `#222222`, duplicata que o teste da etapa 3 pegou.
- Encontrado e **não** alterado: superfícies escuras derivadas de Tomato (`#180f0f` em `.slot-bloqueado` e `.card-bloqueio-externo`, `#2a1717` no botão de sair do Google) ficaram mais escuras que a base nova; `#ffcbc8` (texto do botão sair) não estava na tabela de acentos aprovada; o badge de deslocamento `#FF9800` com texto branco (2,16:1) é anterior a esta etapa. Seguem valendo `--header-height` sem fallback e o truncamento do rótulo de período em 320 px.

### Ajuste — botão de conta no cabeçalho — 2026-10-23

Ajuste dentro da frente de identidade; **não é etapa nova** (a etapa 5, Poppins, continua pendente).

- Branch mantida (`feat/aplicacao-identidade-visual`); working tree limpo na abertura.
- Pedido do dono: o botão de conta do cabeçalho tinha caixa, círculo dentro de círculo e a inicial — "muito carregado".
- Decisões do dono nesta rodada: continuar na branch atual; reduzir a **uma camada** (só o círculo do avatar); pintura em **amarelo cheio com a inicial em Grafite**.
- Base medida antes (433×762, DPR 2,81): cabeçalho 78 px; `.auth-banner` 62×58 com borda `--cor-neutro-17` e gradiente `--cor-azul-02-a92`/`--cor-azul-01-a92`; `.btn-user-area-trigger` 44×44 com borda `--cor-azul-06` e fundo `--cor-azul-03`; `.header-session-avatar` 30×30 com borda `--cor-primaria-a30`, fundo `--cor-primaria-a16` e letra `--cor-primaria`.
- Mudanças em `assets/css/style.css`:
  - `.auth-banner`: saíram `padding`, `border`, `border-radius` e o gradiente; o seletor ficou só com o arranjo de layout (os filhos já desenham borda e fundo próprios, inclusive no estado deslogado). Os overrides de `padding`/`border-radius` em `min-width: 768px` e `max-width: 430px` saíram junto;
  - `.btn-user-area-trigger`: passou a ser só área de toque — sem borda, sem fundo, sem padding; 44×44 preservado (decisão da etapa 1) e transição restrita a `transform`;
  - `.header-session-avatar`: 36×36, fundo `--cor-primaria`, letra `--cor-neutro-10`, sem borda; `font-size: 1rem`, `font-weight: 800`, transição de fundo. A pintura fica em 36 px dentro do alvo de 44 px — um disco de 44 px cheios ficaria maior que a marca ao lado;
  - hover do botão passou a trocar o fundo do avatar para `--cor-amarelo-02`;
  - `prefers-reduced-motion`: `.btn-user-area-trigger` foi para o grupo 2a (só movimento) e `.header-session-avatar` para o 2b (só cor).
- Medido depois no mock, em 433×762 / 390×844 / 320×568 com **DPR 2,81 e emulação mobile**: avatar 36×36 nos três; botão 44×44; cabeçalho 65 px nos três (era 78/70/70); vão entre a marca e o botão de 164/148/104 px; `scrollWidth` igual à viewport, sem rolagem horizontal; `--header-height` publicado em 65 px. No estado deslogado (`?mockScenario=desconectado`), cabeçalho 53 px em 433 e botão Google em 170,5×32, sem estouro.
- Testes: suíte de `tests-frontend/` **435 antes, 435 depois**, 0 falhas, `EXIT=0` medido. Nenhum teste cobre medida de layout; os números vêm do mock. Suíte de backend não foi executada porque nenhum arquivo de `backend/` foi tocado.
- Encontrado e **não** alterado: `.user-profile-avatar` (42 px, no modal Área do usuário) mantém o tratamento antigo — borda dourada a 30% e fundo a 16% — e agora diverge do avatar do cabeçalho; o cabeçalho ficou 13 px mais baixo por consequência da caixa removida, o que muda `--header-height` usado nos `scroll-margin-top`.

