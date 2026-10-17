# Plano vivo — Aplicação da identidade visual Personal Josy

> **Status**: Em execução · **Criado**: 2026-10-17 · **Atualizado**: 2026-10-17
> **Responsável**: GitHub Copilot · **Dono das decisões**: dono do repositório
> **Branch**: `docs/auditoria-roadmap` na etapa 0, com working tree limpo na abertura. A branch de cada etapa seguinte é definida no início da rodada.
> **Base**: commit `5416e9e`, medida em 2026-10-17.
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

Cada etapa usa branch e PR próprios, porque o merge na `main` publica em produção. A etapa 4 depende da 3. As etapas 1 e 2 são independentes entre si. A 5 fica por último para medir o layout com as cores já estáveis. Quando a etapa 1 começar, o status da spec passa a "Em implementação".

| Etapa | Resultado | Estado |
|---|---|---|
| 0 | Contrato e plano: spec v8, este plano e item 5.10 no roadmap | Concluída nesta rodada |
| 1 | Cabeçalho com logo e alvos de toque do topo | Pendente |
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
