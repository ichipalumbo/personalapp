# Auditoria e Plano de Execução — UI/UX Mobile (documento consolidado)

> **Versão**: consolidação de 2026-09-24, reconciliando:
> - `2026-09-23-diag-auditoria-ui-ux-mobile.md` (diagnóstico original + revisão `anti-ui-slop`)
> - `2026-09-24-plan-etapa-1-formularios-dialogos-mobile.md` (plano e execução da Etapa 1)
>
> **Objetivo desta reescrita**: eliminar a duplicidade entre os "achados 4.1–4.17" (levantamento
> amplo) e os "achados materiais" da revisão `anti-ui-slop` (fila de prioridade), mapear cada
> achado a exatamente uma etapa dona, e endereçar os itens que estavam **órfãos** (sem etapa
> atribuída) nos documentos originais.
>
> **Premissa confirmada**: o aplicativo é usado integralmente em celulares; desktop não é alvo
> de otimização. Nenhuma regra de negócio (persistência, recorrência, cobrança, Google Calendar,
> autenticação) deve ser alterada por este plano em nenhuma etapa.

---

## Como ler este documento

1. A **seção 1** é a tabela mestra — se você só tem 30 segundos, olhe essa tabela.
2. A **seção 2** explica a ordem de execução e por que ela não é simplesmente "1, 2, 3, 4...".
3. As **seções 3 a 5** detalham, respectivamente: hotfixes pontuais (Fase 0), achados completos
   com dono definido, e cada etapa estrutural.
4. As **seções 6 a 9** são material de apoio permanente (padrões a preservar, decisões pendentes,
   matriz de validação, escopo).

Legenda de status usada em todo o documento:

| Símbolo | Significado |
| --- | --- |
| ✅ | Concluído e validado |
| 🟡 | Em andamento / parcialmente coberto |
| ⏳ | Planejado, não iniciado |
| ⚠️ | Estava órfão nos documentos originais — endereçado nesta reescrita |

---

## 1) Tabela mestra de rastreabilidade

| # | Item | Origem | Etapa dona | Status |
| --- | --- | --- | --- | --- |
| 0.1 | Toast invisível bloqueia toque no FAB | Achado material 2 (revisão `anti-ui-slop`) | **Fase 0** (hotfix isolado, recomendado **imediato**) | ⚠️ ⏳ *órfão — ver seção 3.1* |
| 0.2 | Cadastro de aluno sem saída em 320×568 | Achado material 1 = 4.1 | Fase 0 → absorvido pela **Etapa 1** | ✅ |
| 0.3 | Topo da Home consome mais da metade da viewport | Achado material 3 = 4.2 | Fase 0 → absorvido pela **Etapa 3** | ⏳ |
| 4.1 | Formulário extenso sem saída operacional | Diagnóstico §4.1 | Etapa 1 | ✅ |
| 4.2 | Topo da Home consome altura excessiva | Diagnóstico §4.2 | Etapa 3 | ⏳ |
| 4.3 | Navegação principal compete com conteúdo | Diagnóstico §4.3 | Etapa 3 | ⏳ |
| 4.4 | Tipografia auxiliar muito pequena | Diagnóstico §4.4 | Etapa 2 | ⏳ |
| 4.5 | Alvos de toque abaixo do recomendado | Diagnóstico §4.5 | Etapa 2 | ⏳ |
| 4.6 | Cards/slots sem interação equivalente por teclado | Diagnóstico §4.6 | Etapa 2 (foco/teclado básico) + Etapa 7 (semântica final) | 🟡 *dividido — ver seção 5, Etapa 2 e Etapa 7* |
| 4.7 | Gerenciamento de diálogo inconsistente | Diagnóstico §4.7 | Etapa 1 | ✅ |
| 4.8 | Erro global bloqueante sem recuperação | Diagnóstico §4.8 | Etapa 6 | ⏳ |
| 4.9 | Toasts/assíncronos: acessibilidade e contraste | Diagnóstico §4.9 | Etapa 6 | ⏳ |
| 4.10 | Filtros apertados | Diagnóstico §4.10 | Etapa 4 | ⏳ |
| 4.11 | Cards com informação excessiva | Diagnóstico §4.11 | Etapa 4 | ⏳ |
| 4.12 | Eventos simultâneos na agenda diária | Diagnóstico §4.12 | Etapa 5 | ⏳ |
| 4.13 | Amarelo sobrecarregado semanticamente | Diagnóstico §4.13 | **Etapa 7 (ampliada)** | ⚠️ ⏳ *órfão — ver seção 5, Etapa 7* |
| 4.14 | Safe areas / elementos flutuantes | Diagnóstico §4.14 | Etapa 3 | ⏳ |
| 4.15 | Movimento reduzido parcial | Diagnóstico §4.15 | Etapa 7 | ⏳ |
| 4.16 | Navegação/tabs sem ARIA completo | Diagnóstico §4.16 | Etapa 7 | ⏳ |
| 4.17 | 6 inconsistências específicas (inclui bug de seletor CSS/JS) | Diagnóstico §4.17 | **Etapa 7 (ampliada)** | ⚠️ ⏳ *órfão — ver seção 5, Etapa 7* |

---

## 2) Ordem de execução definitiva

A ordem abaixo substitui qualquer leitura sequencial simples de "Etapa 1, 2, 3...". Ela reflete a
fila de prioridade da revisão `anti-ui-slop` **mesclada** com as etapas estruturais:

1. ~~**Fase 0.2** — cadastro bloqueado em 320×568~~ → ✅ concluída (absorvida pela Etapa 1, que
   também resolveu 4.7 de forma mais ampla que o pedido original).
2. **Fase 0.1 — toast bloqueando toque** → ⚠️ **ainda pendente e é o próximo hotfix recomendado**,
   por ser pequeno, isolado, e ter sido classificado como bug funcional (não estético) desde a
   primeira revisão. Ver seção 3.1 para o escopo exato.
3. **Etapa 2 — fundação de legibilidade e toque** → próxima etapa estrutural, independente da
   Fase 0.1/0.3.
4. **Etapa 3 — navegação e topo operacional** → absorve a Fase 0.3 (altura da Home) como seu
   primeiro objetivo dentro do escopo maior de navegação.
5. **Etapas 4, 5, 6** → seguem a ordem original do diagnóstico, sem dependência forte entre si.
6. **Etapa 7 — consistência e acessibilidade final (ampliada)** → agora inclui explicitamente
   4.13 e 4.17, que não tinham dono nos documentos originais.

**Por que a Fase 0.1 não foi feita junto com a Etapa 1?** O relatório de conclusão da Etapa 1
registra explicitamente que `#toast` ficou **fora de escopo**. Isso foi uma decisão correta de
contenção de escopo (evitar misturar infraestrutura de diálogo com bug de toast), mas teve o
efeito colateral de deixar o achado mais crítico da revisão original sem execução. Esta reescrita
resolve essa lacuna tornando a Fase 0.1 explícita e prioritária.

---

## 3) Fase 0 — hotfixes pontuais (fora da estrutura de diálogo)

### 3.1 ⚠️ Fase 0.1 — Toast invisível bloqueia o FAB de adicionar aluno *(pendente, prioridade imediata)*

**Evidência (já validada na auditoria original)**

- Após a mensagem de autenticação, tentativas de tocar no FAB de adicionar aluno foram
  interceptadas por `#toast`.
- `utils-kpi.js` remove apenas a classe `.show` após três segundos.
- `.toast` permanece `position: fixed`, ocupando a faixa inferior entre `left: 20px` e
  `right: 20px`, mesmo com `opacity: 0`.
- O estado oculto não define `pointer-events: none` nem `visibility: hidden`.

**Impacto**: uma mensagem transitória pode tornar uma ação primária aparentemente inerte, sem
explicação visível.

**Menor correção concreta**: desativar `pointer-events` no estado oculto do `.toast` e reativá-lo
somente enquanto `.show` estiver presente. Validar em seguida que o toast visível não se sobrepõe
ao FAB nem à futura safe area inferior.

**Por que isso é Fase 0 e não parte de uma etapa estrutural**: é CSS puro, sem dependência do
`DialogController` (o toast não é um diálogo), sem infraestrutura nova, e sem necessidade de
esperar as decisões de Etapa 6. Pode e deve ser feito como correção isolada de 1 commit.

**Nota para a Etapa 6**: quando a Etapa 6 tratar o achado 4.9 (acessibilidade/contraste do toast,
`role="status"`/`role="alert"`, `aria-live`), ela deve **assumir que o bug de `pointer-events`
já foi corrigido aqui** — não deve refazer esse hotfix.

### 3.2 ✅ Fase 0.2 — Cadastro de aluno bloqueado em 320×568 *(concluída)*

Absorvida integralmente pela Etapa 1 (ver seção 5). O que era pensado como "correção mínima"
(Subetapa 1 do plano da Etapa 1) acabou sendo seguido por uma iniciativa maior — a criação do
`DialogController` — mas o achado original está resolvido e validado.

### 3.3 ⏳ Fase 0.3 — Altura operacional da Home *(pendente, absorvida pela Etapa 3)*

**Evidência (já validada na auditoria original)**

- Em 320×568 px, o header mediu aproximadamente 118 px de altura.
- O primeiro painel da agenda começou em aproximadamente 314 px — cerca de 55% da primeira
  viewport consumida antes do conteúdo operacional.

**Menor correção concreta**: remover **Sincronizar Dados** do fluxo superior primário e
consolidar período, setas e Hoje em uma única barra.

**Decisão de escopo desta reescrita**: em vez de tratar isso como uma quarta rodada isolada de
Fase 0 (o que criaria uma nova pendência solta), ela passa a ser o **primeiro objetivo dentro da
Etapa 3**, já que ambas tratam da mesma área (topo da Home) e Etapa 3 já tem esse achado (4.2)
como escopo. Isso evita duas rodadas de mudança na mesma região do layout em momentos diferentes.

---

## 4) Padrões existentes a preservar (válido para todas as etapas)

1. A identidade escura e a marca são consistentes entre as telas.
2. Ações primárias possuem destaque visual claro.
3. Formulários geralmente associam `label` e campo por `for`/`id`.
4. A agenda já trata truncamento e densidade de cards em vários cenários.
5. Há estados vazios distintos para ausência de dados e ausência de resultados por filtro.
6. O histórico de reposições já possui uma implementação mais completa de diálogo — agora
   generalizada pelo `DialogController` (Etapa 1).
7. O modal de recorrência já limita altura e oferece rolagem interna — idem.
8. Estados financeiros combinam texto e ícone, sem depender exclusivamente de cor.
9. O gesto de swipe protege o scroll vertical e as bordas reservadas a gestos do sistema.
10. A estrutura mobile-first do CSS oferece uma base adequada para evoluir sem introduzir
    framework ou build step.

---

## 5) Etapas estruturais

### Etapa 1 — Formulários e diálogos mobile ✅ CONCLUÍDA

**Achados endereçados**: 4.1, 4.7 (e a Fase 0.2 completa).

**Resultado real** (ver relatório de execução para detalhes de commits):
- 14 superfícies migradas para o `DialogController` compartilhado.
- Tela completa no mobile (≤430px) para aluno, agendamento e recorrência (decisão 10.1).
- Pilha de diálogos real, com empilhamento e retorno de foco validados.
- Validação automatizada: frontend 77/77; backend 232/232.
- Fora de escopo mantido conscientemente: diálogos nativos (`alert`/`confirm`), `#overlay-sinc`
  e `#toast` (este último é a Fase 0.1, ainda pendente).

**Decisões que ficam disponíveis como padrão para as próximas etapas** (seção 10.0 do plano
original — reaproveitar, não redecidir):

| Tema | Decisão |
| --- | --- |
| Tela cheia no mobile | Aluno, criar agendamento, configurar recorrência e área do usuário. |
| Cancelar com alterações | Confirmação apenas em aluno e agendamento; demais descartam direto. |
| Clique fora / backdrop | Nunca fecha nenhum diálogo. |
| Rodapé com teclado | Botões no fim da rolagem, sem rodapé fixo. |
| Escape | Fecha todos os diálogos, mesmo caminho de Cancelar/Voltar. |
| Critério de aceite | DevTools (emulação). |
| Confirmações nativas | Fora de escopo. |

---

### Etapa 2 — Fundação de legibilidade e toque ⏳ PENDENTE (próxima)

**Achados endereçados**: 4.4, 4.5, 4.6 (parcial — só a parte de foco/teclado básico; a semântica
ARIA completa de tabs/navegação fica para a Etapa 7).

**Escopo**:
- Criar escala tipográfica mínima (texto normal 16px, secundário 14px, badges 12–13px, campos
  mobile ≥16px para evitar zoom automático no Safari iOS).
- Aumentar áreas de toque para no mínimo 44×44px (preferencialmente 48×48px em ações frequentes).
- Padronizar `:focus-visible` em botões, links, tabs, cards acionáveis e campos.
- Padronizar diferenciação visual de estado `disabled`.
- Garantir `aria-label` em botões icon-only que hoje dependem só de `title`.
- Corrigir contrastes prioritários identificados no diagnóstico.

**Critério de conclusão**: informações essenciais permanecem legíveis sem zoom e ações frequentes
respeitam pelo menos 44×44px.

**Nota de dependência**: não depende do `DialogController` nem toca estrutura de diálogo — pode
rodar em paralelo/antes da Fase 0.1 se for conveniente, já que são áreas de código diferentes.

---

### Etapa 3 — Navegação e topo operacional ⏳ PENDENTE

**Achados endereçados**: 4.2, 4.3, 4.14 (+ absorve Fase 0.3).

**Escopo**:
1. **Primeiro objetivo (herdado da Fase 0.3)**: remover Sincronizar Dados do fluxo superior
   primário e consolidar período/setas/Hoje em uma única barra.
2. Avaliar e decidir (não inferir) se haverá barra de navegação inferior fixa (Home, Finanças,
   Alunos) substituindo a barra superior atual — decisão de produto, ver seção 7, pergunta 1.
3. Aplicar safe areas de forma sistemática (barra inferior, FAB, toast como um sistema único).
4. Posicionar o botão flutuante acima da barra inferior, se ela for aprovada.
5. Preservar estado ativo semanticamente com `aria-current`.

**Critério de conclusão**: agenda e conteúdo principal ganham área vertical sem perder acesso às
três telas principais.

**Decisão de produto obrigatória antes de iniciar**: pergunta 1 da seção 7 — a barra inferior
substitui integralmente a navegação superior ou coexistirá em alguma tela?

---

### Etapa 4 — Filtros e densidade de cards ⏳ PENDENTE

**Achados endereçados**: 4.10, 4.11.

**Escopo**: adaptar filtros de Alunos e Finanças; aplicar divulgação progressiva; remover
redundâncias antes de truncar ou reduzir fonte (evitar reabrir o problema que a Etapa 2 acabou
de corrigir).

**Critério de conclusão**: filtros e cards continuam compreensíveis em 320–430px sem controles
comprimidos.

---

### Etapa 5 — Agenda diária e colisões ⏳ PENDENTE

**Achados endereçados**: 4.12.

**Escopo**: prototipar alternativas para eventos simultâneos; escolher solução com teste visual
em dados extremos; preservar nome, horário e status no primeiro nível.

**Critério de conclusão**: dois a quatro eventos simultâneos permanecem distinguíveis e acionáveis
em 320px.

**Decisão de produto obrigatória antes de iniciar**: pergunta 4 da seção 7.

---

### Etapa 6 — Estados assíncronos e recuperação ⏳ PENDENTE

**Achados endereçados**: 4.8, 4.9.

**Pré-condição**: assume que a **Fase 0.1 (bug de `pointer-events` do toast) já está corrigida**.
Esta etapa trata apenas da camada de acessibilidade/contraste/semântica sobre o toast, não do
bug funcional.

**Escopo**:
- Corrigir overlay de erro bloqueante → preferir banner persistente e não bloqueante.
- Informar quando dados em cache estão sendo exibidos e quando foram atualizados.
- Oferecer retry junto ao erro.
- `role="status"` para sucesso e `role="alert"` para erro no toast; `aria-live` consistente.
- Padronizar skeletons e indicação de progresso de salvamento.

**Critério de conclusão**: toda falha possui caminho de recuperação e nenhuma escrita é
apresentada como concluída antes da resposta da API.

---

### Etapa 7 — Consistência e acessibilidade final (ampliada) ⏳ PENDENTE

**Achados endereçados**: 4.6 (parte final — semântica de cards/tabs), 4.15, 4.16, **4.13 e 4.17
(órfãos endereçados nesta reescrita)**.

**Escopo original**:
- Completar semântica de tabs e navegação (`aria-current`, `role` apropriados).
- Completar `prefers-reduced-motion`.
- Validar teclado, leitor de tela e texto ampliado nos fluxos principais.

**⚠️ Escopo adicionado nesta reescrita — item 4.13**:
- Revisar o uso do amarelo como cor de estado. O diagnóstico aponta sobrecarga semântica (a
  mesma cor usada para significados diferentes conforme o contexto). Escopo mínimo: mapear todos
  os usos atuais de amarelo como indicador de estado, decidir um significado único por cor (ou
  introduzir uma cor adicional), e não depender exclusivamente de cor para nenhum estado
  (reforça o padrão já usado em finanças, ver seção 4, item 8).

**⚠️ Escopo adicionado nesta reescrita — item 4.17 (6 inconsistências específicas)**:
1. Mensagem de modo leitura escondida permanentemente pelo CSS mesmo com usuário desconectado
   — corrigir para exibir quando aplicável.
2. **Bug real de seletor**: JS gera `.historico-reposicao-grupo`, CSS usa
   `.historico-reposicoes-grupo` — corrigir a divergência de nome (afeta espaçamento/hierarquia
   já hoje, independente de qualquer etapa de UX).
3. Textarea financeiro não compartilha integralmente estilo/foco de inputs e selects — padronizar.
4. Diferenciação global de botões desabilitados — reaproveitar o padrão já definido na Etapa 2 em
   vez de criar um novo.
5. Botões icon-only dependentes só de `title` sem nome acessível robusto — reaproveitar padrão
   `aria-label` já definido na Etapa 2.
6. Links de navegação com `href="#"` sem representar a tela ativa no histórico — decisão de
   produto (ver seção 7, pergunta 6) antes de implementar.

**Nota de sequenciamento interno**: os itens 4 e 5 do 4.17 são apenas "aplicar o padrão da
Etapa 2 nos lugares que ela não cobriu" — não é trabalho novo de design, é auditoria de cobertura.
O item 2 (bug de seletor CSS/JS) pode ser corrigido a qualquer momento, inclusive antes desta
etapa, por ser um bug isolado de 1 linha sem dependência de decisão de produto.

**Critério de conclusão**: os fluxos principais são operáveis sem toque e permanecem
compreensíveis com zoom/texto ampliado; nenhuma das 6 inconsistências do item 4.17 permanece;
uso de cor de estado é semanticamente consistente.

---

## 6) Decisões de produto pendentes (não inferir durante implementação)

Aplicável às etapas ainda não iniciadas (a Etapa 1 já teve suas decisões fechadas na seção 5,
tabela 10.0):

1. A barra inferior (Etapa 3) substitui integralmente a navegação superior ou coexistirá em
   alguma tela?
2. Quais informações são indispensáveis no primeiro nível dos cards de agenda, aluno e finanças
   (Etapa 4)?
3. Qual comportamento desejado para eventos simultâneos na agenda diária (Etapa 5)?
4. A sincronização manual deve permanecer exposta na Home ou migrar para área secundária
   (Etapa 3 / Fase 0.3)?
5. A tela ativa deve sobreviver à recarga e participar do histórico Voltar/Avançar (Etapa 7,
   item 4.17.6)?
6. Amarelo como cor de estado: manter um único significado ou introduzir cor adicional
   (Etapa 7, item 4.13)?

Estas são decisões de experiência; não devem ser inferidas durante a implementação nem pelo
modelo executor (Qwen) nem pelo planejador.

---

## 7) Matriz mínima de validação mobile (válida para todas as etapas)

### 7.1 Viewports e estados obrigatórios

| Cenário | Objetivo |
| --- | --- |
| 320×568 | Pior caso de largura e altura suportadas |
| 360×640 e 360×800 | Android compacto e alongado |
| 390×844 | iPhone atual de tamanho intermediário |
| 430×932 | Celular grande |
| Paisagem | Altura reduzida e barras do navegador |
| Teclado aberto | Campos e ações finais acessíveis |
| PWA standalone | Safe areas e elementos fixos |
| Texto do sistema ampliado | Reflow sem corte ou sobreposição |
| `prefers-reduced-motion` | Ausência de movimento não essencial |
| Offline/rede lenta | Cache, erro, retry e loading |

### 7.2 Dados de teste necessários

Nomes e locais longos; muitos alunos; valores financeiros grandes; observações extensas; dois a
quatro eventos simultâneos; cards de 30 minutos; listas vazias e listas filtradas sem resultado;
erro remoto com cache disponível e sem cache.

### 7.3 Ambiente recomendado

Usar o runtime mockado em `mocks/ui-runtime/` (preserva o frontend real, intercepta `/api/*`,
bloqueia escritas, remove caches locais):

```text
http://127.0.0.2:5500/index.html?mockScenario=default
```

Cenários disponíveis: `default`, `agendaLotada`, `alunosEmAtraso`, `vazio`.

Checklist mínimo por ajuste:
1. Abrir a URL mockada em janela de viewport mobile.
2. Reproduzir o fluxo na tela afetada e verificar loading, erro, vazio e conteúdo preenchido.
3. Repetir em 320×568 e 390×844; testar também teclado aberto quando houver formulário.
4. Confirmar que nenhuma ação de escrita altera dados reais.
5. Registrar cenário, viewport e resultado junto do relatório da etapa.

---

## 8) Fora de escopo (válido para todo este plano, todas as etapas)

- Introdução de framework, dependência ou build step.
- Otimização específica para desktop ou tablet.
- Redesign da identidade da marca.
- Alteração de recorrência, conflitos, autenticação, Google Calendar ou sincronização em cascata,
  salvo confirmação explícita e isolada para essa mudança específica.
- Substituição de `alert()`/`confirm()` nativos sem decisão expressa em contrário.
- Definição unilateral de qualquer decisão listada na seção 6 por parte do modelo executor.

---

## 9) Anexo — template de cartão de tarefa para execução assistida por modelo on-premises

Ao converter qualquer etapa/subetapa deste documento em execução, use o formato abaixo por
tarefa (1 cartão ≈ 1 commit), preenchido por um passo de extração separado do passo de execução:

```markdown
# Tarefa: <nome curto>

## Objetivo (1 frase)
...

## Referência da decisão
<seção/decisão deste documento que autoriza a tarefa, ex.: "Etapa 2", "achado 4.17.2">

## Arquivos a tocar
- ...

## Passos
1. ...

## Fora de escopo (não fazer)
- ...

## Validação obrigatória (Playwright)
- Viewport 320x568: <ação> → <resultado esperado>
- Viewport 390x844: <ação> → <resultado esperado>
- Comando de teste: `...`

## Critério de aceite (checklist binário)
- [ ] ...
- [ ] Testes automatizados passam (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
<tipo>(<escopo>): <mensagem>
```

**Regra de uso**: o modelo que gera os cartões só recebe a etapa/achado relevante deste
documento, nunca o documento inteiro. O modelo que executa só recebe o cartão da vez.
