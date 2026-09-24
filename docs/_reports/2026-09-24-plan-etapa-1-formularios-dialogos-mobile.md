# Plano detalhado — Etapa 1 da auditoria mobile: formulários e diálogos

> **Data**: 2026-09-24  
> **Status**: avaliação e planejamento; nenhuma implementação executada  
> **Branch avaliada**: `docs/diag-auditoria-ui-mobile`  
> **Origem**: seção 6, “Etapa 1 — formulários e diálogos mobile”, de `docs/_diags_llm/2026-09-23-diag-auditoria-ui-ux-mobile.md`  
> **Escopo desta rodada**: inventariar o estado atual, decompor a etapa, definir critérios e registrar dúvidas. Não alterar HTML, CSS, JavaScript, regras de negócio ou testes.

---

## 1. Resultado da avaliação

A Etapa 1 é necessária, mas **não deve ser tratada como uma única alteração**. O frontend possui pelo menos 14 superfícies modais identificáveis — 12 declaradas em `index.html` e 2 criadas dinamicamente por `assets/js/view-financas.js` — com contratos diferentes de abertura, fechamento, rolagem, foco e empilhamento. Migrá-las de uma vez elevaria o risco de regressão em agenda, recorrência, reposições, finanças e Google Calendar.

Também há uma ordem explícita no diagnóstico que precisa ser preservada: a segunda revisão com `anti-ui-slop` determinou que, antes das etapas amplas da seção 6, sejam executadas rodadas isoladas para:

1. toast invisível capturando toques;
2. desbloqueio mínimo do cadastro de aluno em `320 × 568`;
3. consolidação da barra operacional da Home.

Portanto, o plano desta Etapa 1 separa o **desbloqueio mínimo do cadastro** da **padronização estrutural de formulários e diálogos**. O primeiro é correção prioritária e pequena; o segundo é uma iniciativa maior, condicionada às decisões da seção 10 deste relatório.

### Conclusão principal

A direção tecnicamente mais segura é:

- corrigir primeiro o bloqueio mensurável do cadastro sem criar infraestrutura prematura;
- definir um contrato único de diálogo antes de criar um controlador comum;
- implementar o controlador com suporte explícito a pilha de diálogos;
- migrar superfícies em lotes pequenos, começando pelas não sensíveis;
- tratar os formulários longos individualmente, preservando seus contratos de negócio;
- manter confirmações nativas (`alert`/`confirm`) fora desta etapa, salvo decisão expressa em contrário.

---

## 2. Escopo interpretado da Etapa 1

A seção 6 do diagnóstico estabelece quatro resultados:

1. formulários longos passam a usar tela completa no mobile;
2. altura dinâmica, rolagem, cabeçalho e rodapé são padronizados;
3. abertura, fechamento e foco passam por um controlador comum;
4. teclado virtual e paisagem entram no critério de aceite.

O critério original é:

> Nenhum campo ou comando fica inacessível em `320 × 568`, com ou sem teclado.

Esse critério é necessário, mas insuficiente sozinho. Para evitar uma correção apenas visual, a conclusão da etapa também precisa comprovar:

- foco inicial dentro do diálogo;
- `Tab` e `Shift+Tab` contidos enquanto o diálogo estiver aberto;
- `Escape` obedecendo à política daquela superfície;
- foco restaurado ao elemento de origem;
- conteúdo de fundo indisponível para interação;
- rolagem de fundo bloqueada sem perder a posição anterior;
- empilhamento correto quando um diálogo abre sobre outro;
- ações fixas alcançáveis com teclado virtual e em paisagem;
- nenhuma alteração nas regras de persistência, recorrência, cobrança ou sincronização.

---

## 3. Inventário factual atual

### 3.1 Superfícies declaradas em `index.html`

| Superfície | Seletor | Natureza | Estado estrutural observado |
| --- | --- | --- | --- |
| Cadastro/edição de aluno | `#modalFormAluno` | formulário longo | Sem `role="dialog"`, altura máxima, rolagem interna, foco, Escape, restauração ou scroll lock. É o bloqueio reproduzido em `320 × 568`. |
| Histórico de reposições | `#modalHistoricoReposicoes` | lista longa | Melhor referência atual: ARIA, foco inicial, Escape, trap, restauração, corpo rolável e rodapé separado. Não bloqueia o scroll do fundo. |
| Editar cobrança da reposição | `#modalEdicaoCobrancaReposicao` | formulário curto, diálogo secundário | Tem ARIA e foco inicial no select, mas não tem trap próprio, restauração documentada nem política de pilha centralizada. |
| Escolher tipo de compromisso | `#modalEscolhaTipo` | escolha curta | Apenas alterna `display`; sem semântica, foco ou Escape. |
| Agendar reposição | `#modalReagendarAula` | formulário médio | Apenas alterna `display`; sem altura/rolagem/foco comuns. Possui retorno funcional específico ao histórico. |
| Criar agendamento | `#modalAgendamento` | formulário longo/variável | Apenas alterna `display`; não tem contrato geral de diálogo. É underlay do diálogo de recorrência. |
| Configurar recorrência | `#modalRecorrencia` | formulário longo secundário | Segunda melhor referência: `max-height`, corpo rolável, underlay bloqueado, foco inicial, trap, Escape e restauração. Sem `aria-labelledby` explícito e com lógica local não reutilizada. |
| Gerenciar compromisso | `#modalAcaoSlot` | formulário longo e sensível | Apenas alterna `display`; contém edição, reposição, exclusão e persistência com GCal. Alto risco de migração. |
| Escolher cobrança da reposição | `#modalEscolhaCobrancaReposicao` | decisão curta e sensível | Apenas alterna `display`; resolve uma `Promise`, portanto fechamento e cancelamento fazem parte do contrato funcional. |
| Escolher escopo de exclusão | `#modalEscolhaExclusao` | escolha destrutiva | Apenas alterna `display`; a confirmação final ainda usa `window.confirm()`. |
| Configurar grade da agenda | `#modalConfigAgenda` | formulário curto | Apenas alterna `display`; fechamento local em `view-home.js`. |
| Área do usuário | `#appSettingsModal` | painel médio | Possui scroll lock próprio e backdrop separado; não possui ARIA, Escape, trap ou restauração. Toca autenticação e GCal. |

### 3.2 Superfícies criadas dinamicamente

`assets/js/view-financas.js` cria, em `ensureModais()`:

- `#modalFinancasPagamento` — formulário curto de pagamento;
- `#modalFinancasAjuste` — formulário curto de ajuste manual.

Ambas apenas alternam `display`, não registram origem do foco e não têm semântica ou rolagem padronizada. Como são modais de escrita financeira, sua migração deve preservar a regra de só confirmar sucesso após resposta HTTP e não deve alterar o contrato dos endpoints.

### 3.3 Overlays que não devem ser confundidos com diálogos

`assets/js/utils-kpi.js` cria o overlay de sincronização `#overlay-sinc`. Ele é um estado bloqueante de operação, não um formulário nem um diálogo acionável. Deve continuar fora do controlador de diálogos nesta etapa. A revisão do seu comportamento pertence à Etapa 6, “estados assíncronos e recuperação”.

O toast `#toast` também não pertence ao controlador de diálogo. Sua correção é uma rodada prioritária anterior.

### 3.4 Diálogos nativos

Foram encontradas dezenas de chamadas a `alert()` e `confirm()` em `modal-agendamento.js`, `modal-acao-slot.js`, `view-alunos.js`, `view-home.js` e `settings-modal.js`. Substituí-las não é requisito explícito da Etapa 1 e ampliaria muito o escopo, inclusive em operações destrutivas e fluxos sensíveis. O plano as mantém fora de escopo até decisão específica.

---

## 4. Padrões existentes que devem ser preservados

### 4.1 Histórico de reposições

`#modalHistoricoReposicoes`, controlado em `assets/js/view-alunos.js`, já oferece:

- `role="dialog"`, `aria-modal`, `aria-labelledby` e `aria-describedby`;
- foco inicial no botão de fechar;
- fechamento por Escape;
- contenção de Tab;
- restauração do foco ao disparador;
- cabeçalho, conteúdo rolável e rodapé separados;
- estados loading, vazio e erro anunciados.

Limitações antes de reutilizar o padrão:

- o trap é específico desse modal;
- o seletor de focáveis não exclui explicitamente todos os elementos ocultos;
- não existe gerenciamento central de pilha;
- a edição de cobrança abre sobre o histórico por outro mecanismo;
- não há scroll lock comum.

### 4.2 Recorrência

`#modalRecorrencia`, controlado em `assets/js/modal-agendamento.js`, já oferece:

- pilha visual por `.modal-overlay-secondary`;
- bloqueio do modal principal com `.modal-underlay-blocked` e `aria-hidden`;
- corpo rolável com rodapé fora da área de rolagem;
- foco inicial, trap, Escape e restauração;
- preservação do rascunho do formulário principal.

Limitações antes de generalizar:

- a implementação está acoplada ao fluxo de agendamento;
- o gerenciamento de underlay conhece diretamente `#modalAgendamento`;
- a semântica é adicionada em tempo de execução e não associa explicitamente o título;
- fechar por clique no backdrop ocorre apenas nesse modal e precisa virar política, não comportamento universal.

### 4.3 Área do usuário

`assets/js/settings-modal.js` é a única implementação encontrada que bloqueia a rolagem do `body`. A ideia deve ser preservada, mas não a atribuição direta e isolada de `document.body.style.overflow`, porque ela não suporta dois diálogos empilhados e pode restaurar incorretamente o estado quando apenas o diálogo superior fecha.

---

## 5. Riscos e acoplamentos

### 5.1 Áreas sensíveis do repositório

- `modal-agendamento.js` e `modal-acao-slot.js` participam de recorrência, conflito, reposição e persistência de agenda.
- `settings-modal.js` aciona autenticação e operações do Google Calendar.
- os modais financeiros realizam escrita de pagamento e ajuste.
- o formulário de aluno pode disparar `cascade-sync-aluno.js` ao alterar nome ou local.

A migração visual não autoriza mudar nenhuma dessas regras. As áreas de recorrência, GCal, autenticação e sync em cascata continuam exigindo confirmação antes de alteração funcional.

### 5.2 Empilhamento não uniforme

Há pelo menos dois casos de diálogo sobre diálogo:

1. recorrência sobre agendamento;
2. edição de cobrança sobre histórico de reposições.

Há também fluxos sequenciais em que um modal fecha antes de outro abrir:

- escolha de tipo → agendamento/reposição;
- ação de compromisso → escolha de cobrança/exclusão;
- histórico → reagendamento → retorno ao histórico.

Um controlador ingênuo com apenas “modal atual” quebrará esses fluxos. O contrato precisa usar uma pilha e distinguir **suspender underlay**, **fechar e substituir** e **fechar e retornar**.

### 5.3 Estado não salvo

Fechar por backdrop ou Escape não pode ser imposto universalmente. Formulários longos podem conter dados ainda não salvos; decisões financeiras e destrutivas podem ter contratos de cancelamento próprios. Cada registro do controlador precisa declarar sua política de fechamento.

### 5.4 CSS global atual

`.modal-overlay` centraliza todo conteúdo e `.modal`/`.modal-alunos-corpo` não possuem contrato geral de altura. Uma regra global agressiva pode alterar escolhas curtas e confirmações que devem continuar centralizadas. São necessárias variantes explícitas, por exemplo conceitualmente:

- diálogo curto centralizado;
- formulário longo em tela completa no mobile;
- diálogo com corpo rolável e cabeçalho/rodapé estáveis;
- diálogo secundário empilhado.

Os nomes finais devem seguir o padrão do arquivo e só serão definidos na implementação.

### 5.5 Viewport e teclado

`100vh` sozinho não atende barras dinâmicas e teclado virtual. A direção é usar `100dvh` com fallback compatível, mas a estratégia final precisa ser validada em Safari iOS/PWA e Android. O teclado não deve esconder o campo focado nem o rodapé de ações.

---

## 6. Contrato proposto para o controlador comum

Esta seção define o comportamento a implementar depois das decisões pendentes; não define ainda uma API final.

### 6.1 Responsabilidades

O controlador deve:

- abrir e fechar uma superfície registrada;
- guardar o elemento de origem;
- aplicar semântica de diálogo;
- posicionar o foco inicial;
- conter foco com Tab/Shift+Tab;
- fechar por Escape somente quando permitido;
- fechar por backdrop somente quando permitido;
- restaurar o foco no destino correto;
- bloquear e restaurar a rolagem do fundo com contagem/pilha;
- tornar o underlay não interativo e não exposto à árvore de acessibilidade;
- manter uma pilha de diálogos;
- expor ganchos de abertura/fechamento sem conhecer regras de negócio;
- permitir impedir fechamento durante salvamento;
- limpar listeners ao fechar para não duplicar handlers.

### 6.2 O que o controlador não deve fazer

- persistir aluno, agenda, reposição ou finanças;
- calcular recorrência, conflito, ciclo ou cobrança;
- decidir se alterações não salvas podem ser descartadas;
- substituir toast, overlay de sincronização ou loading;
- inferir qual modal deve abrir em seguida;
- transformar todos os modais em tela completa automaticamente;
- depender de framework ou biblioteca nova.

### 6.3 Contrato de marcação esperado

Cada diálogo deve ter, de forma estática sempre que possível:

- `role="dialog"`;
- `aria-modal="true"` apenas quando estiver realmente ativo;
- título com `id` e `aria-labelledby`;
- descrição com `aria-describedby` quando houver texto útil;
- elemento interno que represente a superfície visual;
- regiões identificáveis de cabeçalho, corpo e rodapé;
- política de foco inicial;
- botão de fechamento com nome acessível quando a política exigir.

### 6.4 Política de pilha

Ao abrir um diálogo secundário:

- apenas o topo da pilha recebe eventos e foco;
- o underlay permanece montado e preserva seus dados;
- o underlay fica não interativo e oculto para tecnologia assistiva;
- fechar o topo reativa o diálogo anterior e devolve o foco ao disparador dentro dele;
- o scroll do documento só é liberado quando a pilha fica vazia.

A implementação deve preferir `inert` para o underlay quando suportado, com fallback controlado; `aria-hidden` isolado não impede interação por teclado.

---

## 7. Decomposição recomendada da execução

Cada subetapa abaixo deve ser uma rodada revisável. A contagem das suítes deve ser medida no momento da execução, nunca copiada de documentação.

### Subetapa 0 — decisões e baseline

**Objetivo**: fechar as decisões da seção 10 e registrar o estado inicial.

Ações futuras:

1. definir quais formulários entram na primeira onda de tela completa;
2. definir políticas de Escape, backdrop e descarte;
3. definir se diálogos nativos entram ou não no escopo;
4. escolher os dispositivos obrigatórios de aceite;
5. rodar a suíte frontend e registrar contagem real;
6. reproduzir cada superfície selecionada no runtime mockado;
7. registrar medidas: altura do diálogo, posição do rodapé, área rolável e elemento focado.

**Saída**: contrato aprovado e matriz de casos fechada. Nenhum código de UI deve ser alterado antes disso, exceto a correção prioritária independente do cadastro.

### Subetapa 1 — correção mínima do cadastro em `320 × 568`

**Objetivo**: remover o bloqueio funcional já provado, sem antecipar o redesign completo.

Arquivos prováveis:

- `assets/css/style.css`;
- teste frontend novo apenas se for possível provar o contrato estrutural sem um teste que passe no código antigo;
- relatório da execução.

Ações futuras:

1. limitar `.modal-alunos-corpo` à altura dinâmica disponível;
2. garantir rolagem vertical alcançando `.modal-alunos-acoes`;
3. preservar a centralização/visual atual fora de telas baixas;
4. validar cadastro e edição, incluindo card financeiro expandido;
5. validar botão Cancelar, Salvar e Excluir quando aplicável;
6. testar com teclado aberto e em paisagem.

**Critério de saída**:

- em `320 × 568`, todos os campos e ações são alcançáveis;
- o rodapé não fica permanentemente escondido pelo teclado;
- não há scroll duplo incontrolável;
- nenhuma regra de cadastro ou edição muda.

**Observação**: esta correção pode ser somente CSS. Não deve criar o controlador comum por conveniência se ele ainda não tiver contrato aprovado.

### Subetapa 2 — fundação estrutural e testes do controlador

**Objetivo**: criar infraestrutura sem regra de negócio.

Arquivos prováveis:

- novo módulo, possivelmente `assets/js/features/modals/dialog-controller.js`;
- `index.html`, para carregar o módulo antes dos consumidores;
- `assets/css/style.css`, para as variantes estruturais;
- novo teste em `tests-frontend/`, usando o `jsdom` já existente como `devDependency`;
- `tests-frontend/index-html-ordem.test.js` somente se houver dependência lida no topo de algum consumidor.

Casos automatizados mínimos:

1. abertura define foco inicial e bloqueia fundo;
2. Tab e Shift+Tab circulam dentro do topo da pilha;
3. Escape respeita política habilitada/desabilitada;
4. backdrop respeita política habilitada/desabilitada;
5. fechamento restaura foco;
6. dois diálogos empilhados não liberam o scroll ao fechar apenas o superior;
7. underlay é reativado ao fechar o topo;
8. elemento desabilitado/oculto não entra na lista de focáveis;
9. listeners não duplicam após ciclos repetidos de abrir/fechar.

Cada teste novo precisa de prova por mutação conforme as instruções do repositório.

**Critério de saída**: controlador testado isoladamente, sem migração simultânea de todos os modais.

### Subetapa 3 — piloto em diálogos não sensíveis

**Objetivo**: provar o controlador em superfícies pequenas antes de tocar fluxos críticos.

Candidatos:

- `#modalConfigAgenda`;
- `#modalEscolhaTipo`.

Ações futuras:

1. adicionar semântica e marcação estrutural;
2. substituir alternância direta de `display` pela API aprovada;
3. definir foco inicial e restauração;
4. validar Escape/backdrop conforme decisão;
5. manter handlers e dados atuais intactos.

**Critério de saída**: comportamento visual e funcional idêntico, com foco e fechamento consistentes.

### Subetapa 4 — cadastro de aluno em tela completa mobile

**Objetivo**: aplicar o padrão final ao primeiro formulário longo.

Arquivos prováveis:

- `index.html`;
- `assets/css/style.css`;
- `assets/js/view-alunos.js`;
- testes frontend focados no controlador/integração estrutural.

Ações futuras:

1. separar cabeçalho, corpo rolável e rodapé de ações;
2. aplicar tela completa somente no breakpoint mobile aprovado;
3. manter variante adequada para viewports maiores;
4. preservar status, objetivo, card financeiro, observações e exclusão;
5. restaurar foco ao FAB ou ao card que abriu a edição;
6. decidir e implementar tratamento de alterações não salvas;
7. validar submit inválido levando o usuário ao primeiro campo com erro;
8. validar abrir pela tela Finanças em “Configurar agora”.

**Critério de saída**: cadastro e edição completos em todas as viewports obrigatórias, sem alteração de payload nem do sync em cascata.

### Subetapa 5 — diálogos de leitura e formulários curtos

**Objetivo**: migrar superfícies de menor risco e consolidar a pilha.

Candidatos:

- `#modalHistoricoReposicoes`;
- `#modalEdicaoCobrancaReposicao`;
- `#modalFinancasPagamento`;
- `#modalFinancasAjuste`.

Cuidados:

- preservar retorno de foco no histórico;
- provar histórico → edição de cobrança → histórico;
- não liberar scroll entre modais empilhados;
- não alterar confirmação remota do financeiro;
- manter falha HTTP visível sem fechar indevidamente o formulário.

**Critério de saída**: pilha real provada em reposições e escritas financeiras sem regressão.

### Subetapa 6 — fluxo de criação de agenda

**Objetivo**: migrar o encadeamento escolha → agendamento → recorrência/reposição.

Arquivos prováveis:

- `index.html`;
- `assets/css/style.css`;
- `assets/js/modal-agendamento.js`;
- `assets/js/modal-acao-slot.js`, apenas no caminho de reagendamento;
- testes existentes de persistência mais testes de diálogo.

Ações futuras:

1. migrar `#modalEscolhaTipo` se não tiver sido piloto;
2. transformar `#modalAgendamento` em formulário longo mobile;
3. adaptar `#modalRecorrencia` ao controlador sem perder rascunho ou underlay;
4. adaptar `#modalReagendarAula` preservando retorno ao histórico;
5. provar cancelamento e falha de persistência com reabertura correta;
6. obter confirmação antes de qualquer mudança que toque o motor de recorrência.

**Critério de saída**: fluxos pontual, recorrente, bloqueio, deslocamento e reposição preservam estado, foco e persistência.

### Subetapa 7 — edição e ações sensíveis da agenda

**Objetivo**: migrar por último o fluxo de maior risco.

Superfícies:

- `#modalAcaoSlot`;
- `#modalEscolhaCobrancaReposicao`;
- `#modalEscolhaExclusao`.

Ações futuras:

1. transformar `#modalAcaoSlot` em formulário longo mobile;
2. preservar visualização somente leitura para aluno inativo;
3. manter contratos de `Promise` e cancelamento da cobrança;
4. preservar decisões e confirmações destrutivas;
5. validar todos os escopos de recorrência;
6. repetir testes backend afetados, porque esse arquivo possui harness de regras e persistência.

**Critério de saída**: nenhuma ação destrutiva, cobrança, reposição ou edição de série muda de significado.

### Subetapa 8 — área do usuário

**Objetivo**: migrar a superfície ligada a autenticação/GCal após estabilização do padrão.

Arquivos prováveis:

- `index.html`;
- `assets/css/style.css`;
- `assets/js/settings-modal.js`.

Ações futuras:

1. substituir backdrop e scroll lock isolados pelo controlador;
2. adicionar semântica, foco, Escape e restauração;
3. validar conteúdo longo em celular baixo;
4. não alterar login, logout, conexão, desconexão ou renovação do webhook;
5. obter confirmação prévia por tocar arquivos da integração GCal/autenticação.

**Critério de saída**: comportamento do painel é acessível sem qualquer mudança de estado remoto além das ações já existentes.

### Subetapa 9 — fechamento e auditoria cruzada

**Objetivo**: provar que não restaram contratos divergentes dentro do escopo aprovado.

Ações futuras:

1. procurar alternâncias diretas de `style.display` nos diálogos migrados;
2. verificar ARIA e IDs de títulos/descrições;
3. testar abertura/fechamento repetidos;
4. testar navegação entre telas com diálogo aberto;
5. validar PWA standalone e safe areas;
6. rodar suítes afetadas e `git diff --check`;
7. registrar o que permaneceu fora da migração.

---

## 8. Matriz de validação proposta

### 8.1 Viewports obrigatórias

| Viewport/estado | Objetivo |
| --- | --- |
| `320 × 568` | Pior caso principal e critério do diagnóstico. |
| `360 × 640` | Android compacto. |
| `360 × 800` | Android estreito e alto. |
| `390 × 844` | iPhone intermediário atual. |
| `430 × 932` | Celular grande. |
| Paisagem em largura compacta | Altura severamente reduzida. |
| Teclado aberto | Campo focado e ações finais alcançáveis. |
| PWA standalone | `dvh`, safe areas e elementos fixos. |
| Texto ampliado | Reflow sem corte ou sobreposição. |

### 8.2 Fluxos mínimos

#### Alunos

- novo aluno Personal Trainer, cobrança por aula;
- novo aluno com valor fixo;
- Consultoria Online com card financeiro desabilitado;
- edição com observação longa;
- tentativa de submit inválido;
- exclusão disponível na edição;
- abertura por “Configurar agora” em Finanças;
- Cancelar com formulário alterado, conforme decisão de descarte.

#### Agenda

- escolha de tipo;
- aula pontual;
- bloqueio e deslocamento;
- recorrência aberta e cancelada sem perder o formulário principal;
- recorrência salva e retorno ao formulário principal;
- reposição aberta pelo slot e pelo histórico;
- edição de compromisso único e recorrente;
- diálogo de cobrança;
- escolha de exclusão.

#### Finanças

- pagamento com sucesso e falha;
- ajuste positivo, negativo e falha;
- ciclo histórico e vigente;
- botão desabilitado em ciclo pago.

#### Diálogo e acessibilidade

- primeiro foco previsível;
- Tab/Shift+Tab;
- Escape permitido e bloqueado;
- backdrop permitido e bloqueado;
- restauração ao disparador;
- dois diálogos empilhados;
- leitor de tela anunciando título e descrição;
- fundo não alcançável;
- scroll do documento preservado após fechar.

### 8.3 Ambiente

A validação visual deve usar prioritariamente o runtime mockado:

`http://127.0.0.2:5500/index.html?mockScenario=default`

Cenários adicionais:

- `agendaLotada` para agenda e edição;
- `alunosEmAtraso` para acesso aos formulários financeiros;
- `vazio` para abertura sem dados e estados vazios.

O mock reduz risco de escrita real. Testes que dependam de GCal, autenticação ou persistência remota precisam de plano separado e confirmação, pois não são necessários para provar a estrutura visual básica.

---

## 9. Estratégia de testes automatizados

A suíte frontend atual tem cobertura muito limitada de tela. Foram encontrados apenas testes pontuais relacionados ao formulário de observações e à abertura de modal financeiro; não há cobertura geral de foco, teclado, pilha, scroll ou responsividade.

O uso recomendado é:

1. testar o controlador como unidade DOM com `jsdom`, sem dependência nova;
2. testar integrações estruturais críticas por superfície;
3. manter regras de negócio nos testes existentes;
4. não tentar provar layout responsivo apenas com `jsdom`;
5. complementar com inspeção real no navegador;
6. provar cada teste novo por mutação;
7. registrar contagens reais antes e depois de cada rodada.

Ao tocar `modal-acao-slot.js` ou `modal-agendamento.js`, repetir também os testes backend relevantes, pois os harnesses atuais cobrem persistência e manipulação de agenda nesses módulos, embora não cubram o layout.

---

## 10. Decisões necessárias antes da implementação ampla

As perguntas abaixo não devem ser respondidas por inferência durante o código.

### 10.1 Quais formulários viram tela completa na primeira onda?

Opções a decidir:

- somente cadastro/edição de aluno;
- aluno + criação de agendamento;
- todos os formulários longos: aluno, agendamento, recorrência e ação do slot;
- incluir também área do usuário e reagendamento.

**Proposta técnica para discussão, não decisão**: iniciar com aluno; depois agendamento/recorrência; deixar ação do slot e área do usuário por último devido ao risco.

### 10.2 O que acontece ao cancelar um formulário alterado?

Definir por superfície:

- descartar imediatamente;
- pedir confirmação;
- preservar rascunho;
- impedir fechamento por backdrop/Escape e exigir botão explícito.

### 10.3 Backdrop fecha quais diálogos?

Hoje apenas recorrência e área do usuário possuem alguma forma de fechamento externo, por mecanismos diferentes. Aplicar isso globalmente pode descartar dados ou cancelar uma `Promise` de modo inesperado.

### 10.4 O rodapé deve ser fixo ou apenas permanecer fora da rolagem interna?

Em teclado aberto, um rodapé fixo pode reduzir muito o corpo ou sobrepor o campo focado. É preciso escolher o comportamento desejado e validar em dispositivos reais.

### 10.5 O cabeçalho mobile terá botão “X”, seta voltar ou ambos?

A escolha afeta semântica de fluxo:

- “X” sugere descartar/fechar;
- “Voltar” pode sugerir preservar o estado ou retornar ao diálogo anterior.

Fluxos empilhados, como recorrência sobre agendamento, precisam de distinção clara.

### 10.6 Confirmações nativas entram nesta etapa?

A recomendação de escopo é **não**. Se entrarem, será necessário um plano separado para operações destrutivas e mensagens de validação, pois existem muitas chamadas espalhadas e algumas protegem regras sensíveis.

### 10.7 Quais ambientes são critério obrigatório de aceite?

Definir se o aceite exige:

- apenas DevTools;
- aparelho Android físico;
- Safari iOS físico;
- PWA instalada em ambos;
- leitor de tela (TalkBack/VoiceOver).

### 10.8 O botão Salvar fica sempre visível com teclado aberto?

Alternativas:

- rodapé acima do teclado;
- rodapé dentro da rolagem, sempre alcançável;
- ação no cabeçalho;
- comportamento distinto por formulário.

### 10.9 Como tratar navegação de rota com diálogo aberto?

Definir se trocar Home/Finanças/Alunos:

- fecha e descarta;
- bloqueia a navegação;
- preserva rascunho;
- não é possível enquanto houver diálogo ativo.

---

## 11. Arquivos prováveis da implementação futura

| Arquivo | Papel esperado |
| --- | --- |
| `index.html` | Semântica, regiões de cabeçalho/corpo/rodapé e carga do controlador. |
| `assets/css/style.css` | Variantes curta, longa/fullscreen, altura dinâmica, rolagem, teclado e safe areas. |
| `assets/js/features/modals/dialog-controller.js` (novo, nome a confirmar) | Pilha, foco, Escape, backdrop, underlay e scroll lock. |
| `assets/js/view-alunos.js` | Cadastro/edição, histórico e edição de cobrança. |
| `assets/js/modal-agendamento.js` | Criação e recorrência. |
| `assets/js/modal-acao-slot.js` | Edição, reposição, cobrança e exclusão. |
| `assets/js/view-financas.js` | Pagamento e ajuste criados dinamicamente. |
| `assets/js/view-home.js` | Configuração da grade. |
| `assets/js/settings-modal.js` | Área do usuário, em rodada sensível posterior. |
| `tests-frontend/` | Unidade do controlador e integrações DOM selecionadas. |
| `tests-frontend/index-html-ordem.test.js` | Ordem de carga, se o módulo novo introduzir dependência de avaliação. |
| `docs/_reports/` | Relatório por rodada com evidências e resultados medidos. |

Não há necessidade identificada de dependência externa, framework ou build step.

---

## 12. Fora de escopo deste plano

- implementar qualquer subetapa;
- corrigir o toast;
- compactar o topo da Home;
- alterar regras de cadastro, agenda, recorrência, conflito, reposição ou finanças;
- alterar autenticação ou estado remoto do Google Calendar;
- substituir todos os `alert()`/`confirm()` sem decisão explícita;
- revisar overlays de sincronização e recuperação de erro;
- implementar navegação inferior;
- otimizar desktop/tablet;
- adicionar dependência ou framework.

---

## 13. O que foi inspecionado e não alterado

Foram inspecionados, sem edição:

- `docs/_diags_llm/2026-09-23-diag-auditoria-ui-ux-mobile.md`;
- `.agents/skills/vendor/anti-ui-slop/SKILL.md` e `reference/audit.md`;
- `index.html`;
- `assets/css/style.css`;
- `assets/js/view-alunos.js`;
- `assets/js/modal-agendamento.js`;
- `assets/js/modal-acao-slot.js`;
- `assets/js/view-financas.js`;
- `assets/js/view-home.js`;
- `assets/js/settings-modal.js`;
- testes frontend e backend relacionados;
- specs financeira, de reposições e referências de GCal;
- documentação do runtime mockado e setup local.

Nenhum teste foi executado, nenhuma alteração de interface foi aplicada e nenhuma operação modificadora de Git foi realizada nesta rodada. O único arquivo criado é este relatório de planejamento.

---

## 14. Próximo ponto de discussão

Antes de transformar este plano em execução, as quatro decisões mais importantes são:

1. quais formulários entram na primeira onda de tela completa;
2. como tratar cancelamento com alterações não salvas;
3. quais diálogos podem fechar por Escape/backdrop;
4. quais dispositivos/ambientes constituem aceite obrigatório.

Com essas respostas, a Etapa 1 pode ser convertida em rodadas fechadas, começando pela correção mínima do cadastro e sem misturar infraestrutura, redesign e regras de negócio.
