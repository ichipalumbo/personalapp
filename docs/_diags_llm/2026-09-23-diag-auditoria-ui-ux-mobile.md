# Diagnóstico — auditoria de UI/UX com foco exclusivamente mobile

> Origem: solicitação do dono do repositório em 2026-09-23 para avaliar responsividade e legibilidade do frontend.
> Escopo desta rodada: **somente diagnóstico e priorização**. Nenhuma alteração de interface foi aplicada.
> Premissa confirmada: o aplicativo será usado integralmente em celulares; desktop não é alvo de otimização.
> Branch de trabalho: `docs/diag-auditoria-ui-mobile`.

---

## 0) Segunda revisão — skill `anti-ui-slop`

Esta seção registra a segunda revisão solicitada pelo dono em 2026-09-23. Foi usada a skill vendorizada `.agents/skills/vendor/anti-ui-slop` (versão 1.2.13), com o playbook único `reference/audit.md`.

Conforme o playbook, esta revisão:

- considera apenas o que foi observado no código ou na interface renderizada;
- não transforma preferência estética em defeito;
- limita a priorização a três achados materiais, ordenados por impacto;
- associa cada achado à menor correção concreta capaz de resolvê-lo;
- preserva o sistema visual existente em vez de propor um redesign genérico.

Não foi usado catálogo visual ou MCP opcional da UIZZE; os três problemas materiais já estavam demonstráveis no produto.

### Achado material 1 — cadastro de aluno não pode ser concluído em 320 × 568 px

**Evidência observada**

- O formulário foi aberto na aplicação publicada em viewport de 320 × 568 px.
- Os comandos **Cancelar** e **Adicionar** ficaram abaixo da viewport.
- A tentativa automatizada de rolar e acionar **Cancelar** falhou porque o botão permaneceu fora da viewport.
- No CSS, `.modal-overlay` centraliza o conteúdo e `.modal-alunos-corpo` não possui limite de altura nem rolagem própria.

**Impacto**

O fluxo principal de cadastro pode ficar sem conclusão ou saída em um aparelho mobile suportado.

**Menor correção concreta**

Limitar `.modal-alunos-corpo` à altura dinâmica disponível e torná-lo rolável, garantindo que o rodapé de ações participe dessa rolagem. A conversão para tela completa pode ser avaliada depois, mas não é pré-condição para remover o bloqueio observado.

### Achado material 2 — toast invisível bloqueia o botão de adicionar aluno

**Evidência observada**

- Após a mensagem de autenticação, duas tentativas de tocar no FAB de adicionar aluno foram interceptadas por `#toast`.
- `utils-kpi.js` remove apenas a classe `.show` após três segundos.
- `.toast` continua `position: fixed`, ocupando a faixa inferior entre `left: 20px` e `right: 20px`, mesmo com `opacity: 0`.
- O estado oculto não define `pointer-events: none` nem `visibility: hidden`; portanto, uma notificação invisível pode continuar capturando toques.

**Impacto**

Uma mensagem transitória pode tornar uma ação primária aparentemente inerte, sem qualquer explicação visível ao usuário.

**Menor correção concreta**

Desativar eventos de ponteiro no estado oculto e ativá-los somente enquanto `.show` estiver presente. Em seguida, validar que o toast visível não se sobrepõe ao FAB nem à futura safe area inferior.

### Achado material 3 — controles superiores ocupam mais da metade da primeira viewport da Home

**Evidência observada**

- Em 320 × 568 px, o header mediu aproximadamente 118 px de altura.
- O primeiro painel da agenda começou em aproximadamente 314 px.
- Assim, cerca de 55% da primeira viewport foi consumida antes do conteúdo operacional da agenda.
- A área reúne marca/login, navegação global, Semana/Dia, setas, período, Hoje e sincronização manual.

**Impacto**

A tarefa principal — consultar e operar a agenda — recebe menos de metade da primeira tela, aumentando rolagem e reduzindo a visão do dia ou da semana.

**Menor correção concreta**

Remover **Sincronizar Dados** do fluxo superior primário e consolidar período, setas e Hoje em uma única barra. Uma navegação inferior pode ser estudada posteriormente, mas não é necessária para comprovar ou corrigir este achado.

### Resultado da segunda revisão

A skill alterou a priorização inicial de duas formas:

1. identificou o toast interceptando toques como defeito funcional material, não apenas como questão de contraste ou acessibilidade;
2. rebaixou propostas como barra inferior, bottom sheets e redesign amplo para hipóteses a validar, pois não são a menor correção demonstrada pelos problemas observados.

O inventário restante deste documento continua útil como backlog de investigação, mas não deve competir com os três achados materiais acima. A execução recomendada passa a ser: **toast bloqueando toque → modal de cadastro inacessível → altura operacional da Home**.

---

## 1) Resumo executivo

O frontend tem identidade visual consistente, estados vazios úteis e uma boa base operacional para agenda, finanças e alunos. Entretanto, a interface ainda se comporta em vários pontos como uma página desktop comprimida para celular, principalmente em formulários extensos, barras de ferramentas, filtros e cards com alta densidade.

O problema mais grave foi reproduzido em **320 × 568 px**: no formulário de cadastro de aluno, os botões finais ficaram fora da viewport e não puderam ser alcançados normalmente. Isso transforma um problema de apresentação em bloqueio funcional.

Os principais grupos de melhoria são:

1. substituir formulários longos em modais por telas mobile completas;
2. compactar a estrutura superior e considerar navegação inferior;
3. aumentar tipografia e áreas de toque;
4. reorganizar filtros e cards densos;
5. adaptar a agenda diária para eventos simultâneos;
6. melhorar feedback de erro, cache, loading e sincronização;
7. padronizar acessibilidade, safe areas e comportamento com teclado virtual.

A recomendação inicial era atacar esses grupos em etapas independentes. Após a segunda revisão com a skill `anti-ui-slop`, somente os três achados materiais da seção 0 devem abrir a execução; os demais itens permanecem como hipóteses ou backlog de validação.

---

## 2) Método e limites da avaliação

A auditoria combinou:

- inspeção estática de `index.html`, `assets/css/style.css` e scripts que renderizam as views;
- inspeção da aplicação publicada em `https://josy-personal-app.vercel.app/`;
- validação manual das telas Home, Finanças e Alunos em viewport de **320 × 568 px**;
- abertura do formulário de cadastro de aluno nessa mesma viewport;
- análise de hierarquia visual, legibilidade, densidade, alvos de toque, navegação, modais, estados assíncronos e acessibilidade.

Limites:

- a validação publicada foi feita sem login e, portanto, sem dados reais de agenda, alunos ou finanças;
- não houve teste em aparelho físico, Safari iOS, PWA instalada, teclado virtual ou leitor de tela;
- contraste de superfícies transparentes ainda precisa ser medido sobre a composição final no navegador;
- nenhuma regra de negócio foi avaliada ou alterada.

### 2.1) Ambiente recomendado para validar ajustes de UI

Para validar alterações visuais sem depender do Google Login ou escrever na API de produção,
usar o runtime mockado em `mocks/ui-runtime/`. O mock preserva o frontend real, intercepta as
rotas `/api/*`, bloqueia escritas e remove os caches locais do app ao iniciar.

URL padrão no Live Server:

```text
http://127.0.0.2:5500/index.html?mockScenario=default
```

No host `127.0.0.2`, o cenário `default` é ativado automaticamente. Os cenários disponíveis
são `default`, `agendaLotada`, `alunosEmAtraso` e `vazio`; em outros hosts, ativar com
`?mockScenario=<nome>`. O carregamento deve ocorrer pelos `<script>` do `index.html`; não usar
`fetch()` para carregar os arquivos do mock, pois `fetch()` baixa o texto e não executa JavaScript.

O cenário `default` contém quatro alunos, aulas recorrentes, compromissos externos simulados,
reposições pendente/agendada/realizada e ciclos financeiros em estados diferentes. Ele é a base
para validar Home, Alunos e Finanças. Trocar para `agendaLotada` para densidade, `alunosEmAtraso`
para alertas e `vazio` para estados sem dados.

Checklist mínimo por ajuste:

1. Abrir a URL mockada em janela de viewport mobile.
2. Reproduzir o fluxo na tela afetada e verificar loading, erro, vazio e conteúdo preenchido.
3. Repetir em 320 × 568 px e 390 × 844 px; testar também teclado aberto quando houver formulário.
4. Confirmar que nenhuma ação de escrita altera dados reais; o mock deve responder escritas com bloqueio.
5. Registrar cenário, viewport e resultado junto do diagnóstico ou relatório da etapa.

---

## 3) Pontos positivos a preservar

1. A identidade escura e a marca são consistentes entre as telas.
2. Ações primárias possuem destaque visual claro.
3. Formulários geralmente associam `label` e campo por `for`/`id`.
4. A agenda já trata truncamento e densidade de cards em vários cenários.
5. Há estados vazios distintos para ausência de dados e ausência de resultados por filtro.
6. O histórico de reposições já possui uma implementação mais completa de diálogo: semântica, Escape, controle e restauração de foco.
7. O modal de recorrência já limita altura e oferece rolagem interna.
8. Estados financeiros combinam texto e ícone, sem depender exclusivamente de cor.
9. O gesto de swipe protege o scroll vertical e as bordas reservadas a gestos do sistema.
10. A estrutura mobile-first do CSS oferece uma base adequada para evoluir sem introduzir framework ou build step.

Esses padrões devem servir de referência para os componentes ainda inconsistentes.

---

## 4) Achados priorizados

### 4.1 Crítico — formulário extenso fica sem saída operacional em tela pequena

**Evidência**

- O formulário de aluno em `index.html` reúne dados pessoais, objetivo, frequência e configuração financeira em um único modal.
- `.modal-overlay` e `.modal-alunos-corpo`, em `assets/css/style.css`, não possuem uma estratégia geral de `max-height`, corpo rolável e rodapé fixo.
- Em **320 × 568 px**, os botões **Cancelar** e **Adicionar** ficaram fora da viewport.
- A tentativa de acionar **Cancelar** após rolagem automática falhou porque o controle permaneceu fora da viewport.

**Impacto**

O usuário pode preencher o formulário e não conseguir concluir nem cancelar o fluxo, sobretudo em aparelhos baixos, modo paisagem ou com teclado virtual aberto.

**Direção recomendada**

- Transformar formulários longos em telas completas, não em caixas centralizadas.
- Usar cabeçalho fixo, conteúdo rolável e rodapé fixo com ação principal.
- Basear a altura em `100dvh`, considerando teclado virtual e barras do navegador.
- Manter modais centralizados somente para confirmações e escolhas curtas.

---

### 4.2 Alto — topo da Home consome altura excessiva

Antes da agenda, a Home apresenta marca/login, navegação principal, seletor Semana/Dia, navegação de período, botão Hoje e sincronização manual. A combinação de header sticky e barra operacional reduz a área útil vertical, especialmente em 568–640 px de altura.

**Direção recomendada**

- Manter no topo apenas contexto e ações de uso frequente.
- Unir período e setas em uma linha; Semana/Dia e Hoje em outra.
- Mover sincronização manual para área secundária ou configurações.
- Evitar duas camadas sticky concorrentes.
- Dar prioridade visual e espacial à agenda.

---

### 4.3 Alto — navegação principal ocupa o topo e compete com o conteúdo

Home, Finanças e Alunos são os três destinos centrais e aparecem em uma barra superior. Para um produto exclusivamente mobile, esses destinos ficam mais acessíveis na zona inferior do polegar.

**Direção recomendada**

- Avaliar barra inferior fixa com Home, Finanças e Alunos.
- Manter o topo compacto para marca, contexto da tela e avatar.
- Posicionar o botão flutuante acima da barra inferior.
- Preservar estado ativo semanticamente com `aria-current`.

A mudança deve ser validada como decisão visual antes da implementação, pois altera a navegação global.

---

### 4.4 Alto — tipografia auxiliar chega a aproximadamente 10–12 px

`assets/css/style.css` contém diversos valores entre `0.62rem` e `0.72rem` em badges, horários, detalhes de agenda, indicadores de aluno e informações financeiras. Em telas densas, informação operacional importante passa a ocupar a menor faixa tipográfica.

**Impacto**

Baixa legibilidade em aparelhos de alta densidade, uso externo, texto ampliado e usuários com baixa visão.

**Direção recomendada**

- Texto normal: referência de 16 px.
- Informação secundária: referência de 14 px.
- Badges: piso de 12–13 px.
- Campos mobile: pelo menos 16 px, evitando zoom automático no Safari iOS.
- Preferir quebra de linha, divulgação progressiva ou remoção de redundância a reduzir fonte.

---

### 4.5 Alto — alvos de toque inferiores ao recomendado

Há controles menores que 44 × 44 px, incluindo botões pequenos, setas de período, fechar modal, stepper, tabs e seleção de dias. Em 320 px, sete dias divididos em uma única linha também ficam estreitos.

**Direção recomendada**

- Mínimo de 44 × 44 px; preferencialmente 48 × 48 px para ações frequentes.
- Espaçamento de pelo menos 8 px entre ações próximas.
- Reorganizar os sete dias em mais de uma linha ou outro formato que preserve largura de toque.
- Não depender apenas de `title` para nomear botão icon-only; usar `aria-label`.

---

### 4.6 Alto — cards e slots clicáveis não oferecem interação equivalente por teclado

Cards da agenda, slots horários e cards de alunos são montados em scripts como elementos não interativos com `onclick`, sem comportamento consistente de foco, Enter ou Espaço.

**Impacto**

Além de acessibilidade por teclado e tecnologia assistiva, elementos não nativos tendem a ter feedback e semântica inconsistentes.

**Direção recomendada**

- Preferir `<button>` para ações.
- Quando o card inteiro não puder ser botão, oferecer ação principal explícita.
- Padronizar `:focus-visible` em botões, links, tabs, cards acionáveis e campos.
- Reutilizar o padrão de gestão de foco já presente no histórico de reposições.

---

### 4.7 Alto — gerenciamento de diálogo é inconsistente

O histórico de reposições e o modal de recorrência possuem parte do comportamento esperado, mas diversos outros modais apenas alternam `display`.

**Riscos**

- foco permanece atrás do diálogo;
- Tab alcança conteúdo de fundo;
- Escape não fecha consistentemente;
- foco não volta à ação de origem;
- leitor de tela não reconhece o contexto modal;
- scroll de fundo e scroll interno variam entre fluxos.

**Direção recomendada**

Criar um controlador compartilhado de diálogo com:

- `role="dialog"` e `aria-modal="true"`;
- título e descrição associados;
- foco inicial e restauração;
- Escape e trap de foco;
- fundo inerte;
- bloqueio uniforme de rolagem;
- variante curta centralizada e variante longa em tela completa.

---

### 4.8 Alto — erro global pode bloquear o aplicativo sem recuperação clara

O overlay de erro de conexão ocupa toda a viewport e o fluxo atual não oferece, de forma consistente, ações visíveis de **Tentar novamente** e **Fechar**.

**Impacto**

Uma falha remota pode obrigar o usuário a recarregar o aplicativo, mesmo que dados locais ainda possam ser consultados.

**Direção recomendada**

- Preferir banner persistente e não bloqueante.
- Informar quando dados em cache estão sendo exibidos e quando foram atualizados.
- Oferecer retry junto ao erro.
- Reservar overlay bloqueante apenas para operações realmente impeditivas.

---

### 4.9 Alto — toasts e estados assíncronos têm acessibilidade e contraste insuficientes

O toast global não possui uma região viva consistente e algumas combinações de branco com verde, laranja ou vermelho não alcançam contraste adequado para texto pequeno. Skeletons e salvamentos também não comunicam progresso de forma uniforme.

**Direção recomendada**

- `role="status"` para sucesso e `role="alert"` para erro.
- `aria-live` e `aria-atomic` apropriados.
- Contraste mínimo de 4,5:1 para texto normal.
- Trocar “Salvar” por “Salvando…” durante a requisição.
- Aplicar `aria-busy` ao contêiner relevante.
- Evitar mensagens longas com desaparecimento fixo muito curto.

---

### 4.10 Médio — filtros ficam apertados em 320–360 px

- Alunos mantém dois selects lado a lado.
- Finanças apresenta cinco opções de filtro na mesma faixa.

**Direção recomendada**

- Alunos: empilhar campos ou abrir filtros em bottom sheet.
- Finanças: usar chips com scroll horizontal e indicação de continuidade.
- Mostrar ação **Limpar filtros** quando houver filtro ativo.
- Preservar resultados e posição de scroll ao abrir/fechar filtros.

---

### 4.11 Médio — cards tentam mostrar informação demais

Agenda e finanças usam fontes pequenas e truncamento para manter nome, local, objetivo, status, tipo e outras informações na mesma superfície.

**Direção recomendada: divulgação progressiva**

No card:

- nome;
- horário ou período;
- status principal;
- indicador operacional indispensável, como reposição.

Após toque:

- local;
- objetivo;
- recorrência;
- observações;
- ações de edição ou exclusão.

A prioridade deve ser remover redundância antes de reduzir dimensões.

---

### 4.12 Médio — eventos simultâneos ficam estreitos na agenda diária

A coluna de horas consome largura fixa e eventos sobrepostos dividem horizontalmente o restante. Em 320 px, duas ou três colisões produzem cards estreitos, com perda de nome, local e status.

**Direção recomendada**

Validar uma solução específica para mobile:

- mostrar um evento e indicador “+N”;
- empilhar com pequeno deslocamento;
- abrir lista do horário em bottom sheet;
- ou aplicar largura mínima com expansão sob demanda.

Nome, horário e status devem sobreviver no primeiro nível; detalhes podem aparecer após toque.

---

### 4.13 Médio — amarelo acumula funções visuais demais

A mesma cor representa marca, seleção, ação principal, título, foco, valor financeiro e alerta. Isso enfraquece a hierarquia semântica.

**Direção recomendada**

- Reservar o amarelo intenso para seleção e ação principal.
- Usar neutros para títulos e estruturas.
- Usar cores semânticas para informação, sucesso, atenção e erro, sempre acompanhadas de texto ou ícone.
- Reduzir quantidade de bordas simultâneas e separar superfícies por contraste e espaçamento.

---

### 4.14 Médio — safe areas e elementos flutuantes podem se sobrepor

FABs, toast e indicadores usam offsets fixos e não formam uma pilha coordenada. Em PWA instalada, podem conflitar com home indicator e recortes do dispositivo.

**Direção recomendada**

- Incorporar `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)` e laterais.
- Definir uma única zona para barra inferior, FAB, toast e indicador de sincronização.
- Testar em modo standalone no iPhone e Android.

---

### 4.15 Médio — suporte a movimento reduzido é parcial

A preferência `prefers-reduced-motion` cobre apenas uma animação de troca de período; skeletons, spinners, pulsos, hovers com deslocamento e scroll suave permanecem ativos.

**Direção recomendada**

- Remover animações não essenciais e scroll suave no modo reduzido.
- Manter indicadores estáticos de progresso quando necessário.
- Evitar movimento como único feedback de alteração de estado.

---

### 4.16 Médio — navegação e tabs comunicam seleção apenas visualmente

Classes visuais indicam tela e tab ativas, mas falta padronizar `aria-current`, `aria-selected`, `aria-pressed` e associações com painéis.

**Direção recomendada**

- Navegação: `aria-current="page"`.
- Tabs: `role="tablist"`, `role="tab"`, `aria-selected` e `aria-controls`.
- Seletores binários simples: `aria-pressed` quando semanticamente apropriado.
- Preservar ou restaurar a tela ativa após recarga, se isso for desejado para o fluxo mobile.

---

### 4.17 Baixo/Médio — inconsistências específicas encontradas

1. A mensagem de modo leitura existe no HTML, mas fica permanentemente escondida pelo CSS; o usuário desconectado perde a explicação contextual.
2. O JS gera `.historico-reposicao-grupo`, enquanto o CSS usa `.historico-reposicoes-grupo`; parte do espaçamento e da hierarquia não é aplicada.
3. O textarea financeiro não compartilha integralmente o estilo e foco dos inputs e selects.
4. Botões desabilitados não possuem diferenciação global suficientemente clara.
5. Alguns botões icon-only dependem de `title` e não têm nome acessível robusto.
6. Links da navegação usam `href="#"`, sem representar a tela ativa no histórico do navegador.

Esses itens são adequados para uma etapa de consistência após os bloqueios funcionais e a estrutura mobile principal.

---

## 5) Direção de produto visual mobile

A interface deve ser tratada como uma aplicação móvel instalada, com as seguintes regras orientadoras:

1. **Uma ação primária por tela ou rodapé.**
2. **Formulário longo é tela, não modal.**
3. **Conteúdo principal ocupa a maior parte da altura.**
4. **Informação essencial aparece primeiro; detalhe aparece sob demanda.**
5. **Nenhuma ação frequente fica abaixo de 44 × 44 px.**
6. **Nenhum texto operacional depende de fonte extremamente pequena para caber.**
7. **Erro de rede não bloqueia leitura de dados disponíveis.**
8. **Barra inferior, FAB, toast e safe area formam um sistema único.**
9. **Teclado virtual e orientação paisagem fazem parte do layout, não são casos excepcionais.**
10. **Semântica, foco e anúncio de estado acompanham toda mudança visual.**

---

## 6) Etapas propostas para implementação futura

Esta auditoria não implementa nenhuma etapa. A divisão abaixo permite trabalhar e validar uma área por rodada.

> **Ordem após a revisão `anti-ui-slop`:** antes destas etapas amplas, corrigir isoladamente o toast invisível que captura toques; depois remover o bloqueio do cadastro em 320 × 568 px; por fim consolidar a barra operacional da Home. Só então reavaliar se as etapas abaixo continuam necessárias no formato originalmente proposto.

### Etapa 1 — formulários e diálogos mobile

- Transformar formulários longos em telas completas.
- Padronizar altura dinâmica, rolagem, cabeçalho e rodapé fixos.
- Criar controlador comum de diálogo e foco.
- Validar teclado virtual e modo paisagem.

**Critério de conclusão:** nenhum campo ou comando fica inacessível em 320 × 568 px, com ou sem teclado.

### Etapa 2 — fundação de legibilidade e toque

- Criar escala tipográfica mínima.
- Aumentar áreas de toque.
- Padronizar foco, disabled e botões icon-only.
- Corrigir contrastes prioritários.

**Critério de conclusão:** informações essenciais permanecem legíveis sem zoom e ações frequentes respeitam pelo menos 44 × 44 px.

### Etapa 3 — navegação e topo operacional

- Decidir e implementar barra inferior ou alternativa equivalente.
- Compactar o topo da Home.
- Reposicionar sincronização e elementos flutuantes.
- Aplicar safe areas.

**Critério de conclusão:** agenda e conteúdo principal ganham área vertical sem perder acesso às três telas principais.

### Etapa 4 — filtros e densidade de cards

- Adaptar filtros de Alunos e Finanças.
- Aplicar divulgação progressiva.
- Remover redundâncias antes de truncar ou reduzir fonte.

**Critério de conclusão:** filtros e cards continuam compreensíveis em 320–430 px sem controles comprimidos.

### Etapa 5 — agenda diária e colisões

- Prototipar alternativas para eventos simultâneos.
- Escolher a solução com teste visual em dados extremos.
- Preservar nome, horário e status no primeiro nível.

**Critério de conclusão:** dois a quatro eventos simultâneos permanecem distinguíveis e acionáveis em 320 px.

### Etapa 6 — estados assíncronos e recuperação

- Corrigir overlay bloqueante.
- Informar cache e última atualização.
- Padronizar retry, loading, salvamento e toast.
- Completar anúncios acessíveis.

**Critério de conclusão:** toda falha possui caminho de recuperação e nenhuma escrita é apresentada como concluída antes da resposta da API.

### Etapa 7 — consistência e acessibilidade final

- Completar semântica de tabs e navegação.
- Corrigir seletores inconsistentes.
- Completar movimento reduzido.
- Validar teclado, leitor de tela e texto ampliado.

**Critério de conclusão:** os fluxos principais são operáveis sem toque e permanecem compreensíveis com zoom/texto ampliado.

---

## 7) Dependências e decisões que devem ser confirmadas antes de cada etapa

1. A barra inferior substitui integralmente a navegação superior ou coexistirá em alguma tela?
2. Quais formulários serão telas completas na primeira rodada: aluno, agendamento, edição, finanças ou todos?
3. Quais informações são indispensáveis no primeiro nível dos cards de agenda, aluno e finanças?
4. Qual comportamento desejado para eventos simultâneos na agenda diária?
5. A sincronização manual deve permanecer exposta na Home ou migrar para área secundária?
6. A tela ativa deve sobreviver à recarga e participar do histórico Voltar/Avançar?

Essas são decisões de experiência; não devem ser inferidas durante a implementação.

---

## 8) Matriz mínima de validação mobile

Cada etapa visual deve ser verificada em:

| Cenário | Objetivo |
| --- | --- |
| 320 × 568 | pior caso de largura e altura suportadas |
| 360 × 640 e 360 × 800 | Android compacto e alongado |
| 390 × 844 | iPhone atual de tamanho intermediário |
| 430 × 932 | celular grande |
| Paisagem | altura reduzida e barras do navegador |
| Teclado aberto | campos e ações finais acessíveis |
| PWA standalone | safe areas e elementos fixos |
| Texto do sistema ampliado | reflow sem corte ou sobreposição |
| `prefers-reduced-motion` | ausência de movimento não essencial |
| Offline/rede lenta | cache, erro, retry e loading |

Dados de teste necessários:

- nomes e locais longos;
- muitos alunos;
- valores financeiros grandes;
- observações extensas;
- dois a quatro eventos simultâneos;
- cards de 30 minutos;
- listas vazias e listas filtradas sem resultado;
- erro remoto com cache disponível e sem cache.

---

## 9) Fora do escopo deste diagnóstico

- Implementação de CSS, HTML ou JavaScript.
- Mudança em regras de negócio.
- Introdução de framework, dependência ou build step.
- Otimização específica para desktop ou tablet.
- Redesign da identidade da marca.
- Alteração de recorrência, conflitos, autenticação, Google Calendar ou sincronização em cascata.
- Definição unilateral das decisões listadas na seção 7.

---

## 10) Conclusão

Após a revisão com `anti-ui-slop`, o primeiro investimento deve ser a correção mínima do **toast invisível que captura toques**, por ser pequena, isolada e diretamente reproduzida. Em seguida, deve ser removido o bloqueio funcional do cadastro em 320 × 568 px. A terceira rodada deve reduzir a altura operacional da Home antes de considerar mudanças estruturais, como navegação inferior.

A recomendação é criar um plano separado para cada um desses três achados, com escopo fechado e validação manual na matriz mobile deste documento. As demais propostas permanecem registradas, mas precisam ser novamente confrontadas com evidência observável antes de virarem implementação.
