# Plano vivo — Aplicação da identidade visual Personal Josy

> **Status**: Em execução · **Criado**: 2026-10-17 · **Atualizado**: 2026-10-17
> **Responsável**: GitHub Copilot · **Dono das decisões**: dono do repositório
> **Branch**: `docs/auditoria-roadmap` na etapa 0, que entrou na `main` pelo PR #73. As etapas 1 a 5 seguem na branch única `feat/rebranding-interface`, criada a partir de `origin/main` em `ea29834`, com um só PR ao final.
> **Base**: commit `5416e9e`, medida em 2026-10-17, para a etapa 0; `ea29834` para a etapa 1.
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
| Branch única para a interface | Resposta do dono em 2026-10-17 | Etapas 1 a 5 em `feat/rebranding-interface`, com um só PR para a `main`; commit e push continuam com o dono |
| Logo com 32 px de altura, fluido | Resposta do dono em 2026-10-17, etapa 1 | Encolhe proporcionalmente só quando falta espaço para os controles do topo |
| Cópia do SVG em `assets/images/`, sem metadados | Resposta do dono em 2026-10-17, etapa 1 | Nome original do kit; saem `title`, `desc`, `metadata` e os atributos que apontavam para eles |
| Área de toque invisível de 44×44 | Resposta do dono em 2026-10-17, etapa 1 | Sem mudar visual nem altura do topo, em seis grupos: cabeçalho, barra da agenda, fechar dos modais, área do usuário, cabeçalhos dos dias da semana e dias da recorrência |
| Área de toque do botão Google | Aviso dado e autorização do dono em 2026-10-17, etapa 1 | Só a área de toque, como na spec, seção 2.9 |

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

As etapas 1 a 5 seguem na branch única `feat/rebranding-interface` e entram na `main` por um só PR, porque o merge publica em produção. A etapa 4 depende da 3. As etapas 1 e 2 são independentes entre si. A 5 fica por último para medir o layout com as cores já estáveis. Com a etapa 1, a spec passou a "Em implementação".

| Etapa | Resultado | Estado |
|---|---|---|
| 0 | Contrato e plano: spec v8, este plano e item 5.10 no roadmap | Concluída; na `main` pelo PR #73 |
| 1 | Cabeçalho com logo e alvos de toque do topo | Implementada em `feat/rebranding-interface`; publicação com o PR único |
| 2 | Nome exibido e instalação do PWA | Pendente |
| 3 | Variáveis de cor, sem mudança visual | Pendente |
| 4 | Recoloração com a paleta do guia | Pendente; depende da 3 |
| 5 | Poppins na interface | Pendente |

### Etapa 1 — Cabeçalho e alvos de toque do topo

- **Logo**: `01_horizontal/escuro/personal_josy_horizontal_escuro_transparente.svg`, do kit, aplicado como arquivo, com tamanho definido por CSS, sem descritor, sombra ou animação. Sai o ícone de haltere e o texto "Prô Josy". O nome acessível é "Personal Josy".
- **Decidir antes**:
  - destino da cópia do SVG no app;
  - se os metadados internos do arquivo ("Final B") são mantidos na cópia.
- **Alvos de toque**:
  - refazer o inventário no estado renderizado: cabeçalho, barra da agenda, modais e login deslogado, nos três viewports;
  - decidir com o dono a abordagem de ampliação antes de implementar, sem aumentar demais o topo.
- **Botão Google**: só a área de toque, com aviso ao dono antes da implementação.
- **Testes**: atualizar o fixture de `header-cache-state.test.js` se o markup do cabeçalho mudar; todo teste novo precisa ser provado por mutação.
- **Aceite**:
  - logo legível em 433×762 sem empurrar os controles;
  - sem quebra em 390×844 e 320×568; se a horizontal não couber, parar e pedir aprovação (spec, seção 2.9);
  - leitor de tela anuncia "Personal Josy";
  - alvos de toque conforme a abordagem aprovada.
- **Convivência**: até a etapa 4, o amarelo do logo (`#FFDE17`) convive com o amarelo da interface (`#FFD700`).
- **Decisões tomadas**: seção 2; execução registrada na seção 10.

### Etapa 2 — Nome exibido e instalação do PWA

- **Nome**: título da página, `apple-mobile-web-app-title`, e `name` e `short_name` do manifest passam a "Personal Josy". Se o nome curto for truncado, parar e pedir aprovação.
- **Ícones**: favicon; 192 e 512 nas versões padrão e maskable (zona segura de 80%); ícone da Apple. Todos gerados do símbolo do kit sobre Grafite, conforme o guia, seção 8.3. A geração usa o Edge em modo headless, já usado no gerador do PDF do guia, sem dependência nova.
- **Cor de tema e fundo de abertura**: proposta testada nas plataformas e aprovada pelo dono antes de entrar.
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
- **Aceite**:
  - capturas do mock antes e depois idênticas nas telas principais e modais, nos três viewports;
  - suíte de frontend medida antes e depois.

### Etapa 4 — Recoloração com a paleta do guia

- Amarelo Josy e Grafite entram nas variáveis da etapa 3.
- Para as cores sem correspondente na paleta, montar uma tabela de mapeamento cor a cor, aprovada pelo dono antes da troca.
- O azul do Google e as cores de categoria e estado não mudam de significado.
- Atualizar a expectativa de `fab-adicionar.test.js`, com prova por mutação.
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

- O merge na `main` publica em produção. O app ainda não foi lançado e a base de produção está zerada, mas o PR único precisa entrar inteiro e reversível.
- Reverter o PR desfaz o código. Ícones e nome já instalados nos aparelhos podem demorar a voltar.
- Mudança de fonte é a maior fonte de regressão de layout, por isso fica por último.

## 9. Pendências conhecidas fora deste plano

- Os SVGs do kit têm metadados internos com "Final B", e a prancha `personal_josy_kit_final_prancha.png` mostra "OPÇÃO B". A cópia usada no app foi limpa na etapa 1; os arquivos do kit não mudam.
- O asset para a tela de consentimento Google continua aberto na spec, seção 4.
- O `sw.js` não pré-cacheia o logo: ele entra no cache por uso no primeiro carregamento. Offline, antes disso, o cabeçalho mostra o texto alternativo. Incluir no pré-cache altera o `sw.js` e exige aviso.
- Em 320×568 deslogado, o rótulo do período da barra da agenda aparece truncado ("Sema…"). Já acontecia antes da etapa 1.

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

### Etapa 1 — 2026-10-17

- **Branch**: `feat/rebranding-interface`, a partir de `ea29834`.
- **Inventário dos alvos de toque**, no estado renderizado do mock, em tamanho visual:
  - em 433×762: avatar 36×36, botão Google 170×32, abas Semana e Dia 174×32, setas 33×26, "Hoje" 51×29, cabeçalho de dia da semana 404×34, fechar da área do usuário 32×32, fechar do histórico de reposições 36×36, Sincronizar e Configurar grade 328×40, Sair 328×30, dias da recorrência 43×42;
  - em 390×844: botão Google 145×28, abas 157×32, "Hoje" 51×27, dias 41×42;
  - em 320×568: abas 122×32, dias 31×42;
  - modo Dia com os mesmos tamanhos da Semana;
  - vizinhos conferidos com `elementFromPoint`: nenhum alvo sobrepõe outro.
- **Implementação**:
  - `assets/images/personal_josy_horizontal_escuro_transparente.svg`: cópia do mestre do kit sem `title`, `desc`, `metadata`, `role` e `aria-labelledby`, com desenho idêntico; 10.806 bytes, contra 12.241 do mestre;
  - `index.html`: o `h1.marca-titulo` contém só a imagem do logo, com texto alternativo "Personal Josy" e dimensões 186×32 declaradas; saem o ícone de haltere e o texto "Prô Josy";
  - `assets/css/style.css`: logo com até 186 px de largura e altura proporcional, e a marca encolhe antes dos controles; a área de toque é um pseudo-elemento `::after` transparente e centralizado, com no mínimo 44×44, nos seis grupos aprovados; nos dias da recorrência, a largura extra fica limitada à folga de 6 px do grid.
- **Medido no mock**, em Semana, Dia e deslogado:
  - altura do topo igual à de antes: cabeçalho com 70 px logado e 66 deslogado em 433, 62 e 54 em 390 e 320; barra da agenda com 121 px em 433 e 119 em 390 e 320;
  - logo com 186×32 logado nos três viewports; deslogado, 182×31,3 em 433, 186×32 em 390 e 118×20,3 em 320, com folga de 8 a 10 px até o botão Google;
  - sem rolagem horizontal;
  - área de 44×44 ou mais em todos os alvos, conferida com `elementFromPoint`, exceto a largura dos dias da recorrência em 320;
  - em 433, toques fora do desenho acionaram seta, avatar, fechar e aba Dia;
  - foco por teclado continua visível;
  - a árvore de acessibilidade do navegador expõe o título como "Personal Josy". Leitor de tela real não foi testado.
- **Limitação**: em 320×568, os dias da recorrência têm 31 px de largura e a área fica com 35,5×44, porque sete áreas de 44 px exigiriam 308 px numa linha de 255 e a área não pode invadir o dia vizinho. Em 390 e 433, 44×44.
- **Testes** em `tests-frontend/`:
  - linha de base com 420 testes e 420 passando, depois de `npm ci` sem mudança de manifesto;
  - fixture do cabeçalho em `header-cache-state.test.js` atualizado para o logo;
  - novo `marca-cabecalho.test.js`, com 7 testes: markup do logo, ausência do nome antigo e do haltere, cópia sem metadados, desenho idêntico ao mestre, regra de 44×44, limite dos dias da recorrência e existência de cada alvo no app;
  - mutações: markup antigo no cabeçalho; `title` e coordenada alterada no SVG; seletor fora da regra `::after` e limite afrouxado; seletor fora do `position: relative` e id renomeado em `view-home.js`. Cada uma derrubou os testes correspondentes, e todas foram revertidas e conferidas com `git status`;
  - resultado final com 427 testes e 427 passando.
- **Capturas** antes e depois em 433, 390 e 320, logado e deslogado, mantidas fora do repositório.
- **Documentação**: spec de identidade v9, spec de interface (seções 5 e 7) e item 5.10 do roadmap.
- **Não alterado**: `sw.js`, manifest e título da página (etapa 2) e arquivos do kit.
