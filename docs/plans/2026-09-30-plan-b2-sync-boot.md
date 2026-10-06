# Plano vivo — 2.4: sincronização de leitura no boot sobre cache (B2)

> **Status**: Planejamento refinado; decisões de recuperação e sync manual aprovadas; implementação não iniciada
> **Criado**: 2026-09-30 · **Atualizado**: 2026-10-05
> **Item**: 2.4 do [roadmap](../roadmap.md)
> **Branch desta rodada**: `docs/planejar-sync-boot`, criada de `origin/main` com `--no-track`
> **Base revalidada**: `f3fe4f2dfc56835d140b80d0b0a917544cab5d45`
> **Rodada atual**: pesquisa, decisões e documentação. Nenhum código, teste ou mock alterado.

Este é o mesmo plano aberto de 30/09, revalidado após a Etapa 7. O B1 está fechado em
[`2026-09-30-plan-skeletons-cache.md`](2026-09-30-plan-skeletons-cache.md) e não será refeito.
**5.8 entregue**: skeletons (Parte A) e rótulo nos syncs existentes (B1). **B2 apenas desenhado**: a
revalidação principal no boot ainda não foi implementada. Este documento aberto recebe
o refinamento e, futuramente, a execução; não se cria plano paralelo nem se reabre o B1.
As decisões abaixo substituem o desenho anterior onde houver divergência. Um plano não
substitui specs: incorporar os contratos aprovados nas specs pertinentes no cartão A,
antes do código que os implementa.

## 1. Objetivo e contrato

Mostrar imediatamente o cache **identificado da conta autenticada** e revalidar os dados
principais em segundo plano. Cobrir Home, Alunos e Finanças, preservando a hash. Reutilizar
`Sincronizando dados...`, sem bloquear navegação ou sobrescrever edição.

**Somente leitura no B2** significa: nenhuma migração, reconciliação CRUD ou chamada
POST/PUT/PATCH/DELETE iniciada por esse caminho no frontend. Não significa zero escrita
no Mongo: GETs existentes de configuração, reposições e Finanças fazem criação, expiração
ou recálculo lazy no backend. Esses comportamentos permanecem inalterados. Abort no cliente
não desfaz processamento remoto.

Fontes de verdade consultadas:
- [`financas-ciclo-cobranca.md`](../specs/financas-ciclo-cobranca.md), especialmente §6.1,
  §6.2 e decisões #14, #21–25;
- [`reposicoes-e-competencia.md`](../specs/reposicoes-e-competencia.md): competência,
  prazo, expiração e histórico;
- [`gcal-sync.md`](../specs/gcal-sync.md): sincronização externa e limites do item 2.2.

## 2. Decisões do dono

### Mantidas de 30/09

1. B2-puro primeiro; esqueleto de ETag apenas como desenho, implementação em rodada separada.
2. O boot não dispara migração de backup local para banco vazio.
3. Isolamento do cache principal e financeiro por `ownerEmail` dentro do escopo.

### Confirmadas em 05/10

| Tema | Decisão |
|---|---|
| Cache antigo sem dono | **Descartar** e buscar novamente no servidor. Não atribuir à conta atual nem criar recuperação/quarentena. |
| Cache identificado sem sessão válida | **Preservar no aparelho, mas não exibir** até identificar/autenticar a conta. B2 não renova login. |
| Outra conta | Não exibir, aplicar ou migrar cache anterior; invalidar memória e respostas antigas. |
| Remoto vazio válido da mesma conta | **Aceitar como estado atual do servidor**, inclusive esvaziar tela/cache ativo. Erro ou payload inválido não equivale a vazio. |
| Falha de qualquer dataset B2 | **Preservar o batch inteiro** anterior, sem aplicar respostas parciais. |
| Escopo de arquivos | Autorizado planejar ajustes mínimos em Alunos, Finanças e modais, além de storage/bootstrap, para proteger conta, formulários e gravações. |
| Formulário ou gravação | Descartar leitura em voo; nova tentativa quando não houver formulário/gravação pendente. Não reutilizar resposta antiga. |
| Botão manual durante B2 | Mostrar progresso imediatamente e executar **seu próprio sync depois**, quando livre. Não considerar B2 equivalente ao manual. |
| Sem sessão/rede no boot | Manter tentativa pendente; retomar por evento de sessão/conexão ou leitura compatível existente, sem polling. |
| Estado local não confirmado | Suspender B2 até resolver a gravação; não substituir alterações locais não confirmadas. Não criar fila offline. |
| Troca de conta com rascunho | Fechar/descartar o rascunho anterior, limpar contexto e avisar se havia edição. Não desfazer gravações já enviadas. |
| Falha de rede/timeout/servidor | Não repetir em loop; próxima tentativa por retorno de conexão/sessão ou gatilho existente. |

### Refinamento dos dois pontos — aprovado em 05/10

| Tema | Decisão que complementa/substitui o desenho anterior |
|---|---|
| Saída da pendência | Oferecer **Verificar no servidor** e **Usar dados do servidor**, preservando a intenção local até confirmar o descarte e aplicar leitura válida. Não depender de retry genérico existente. |
| Repetir escrita | Só por ação explícita e contrato específico comprovado; nunca repetir cegamente `salvarDados`, reabertura ou operação composta após timeout/falha parcial. |
| Papel do botão manual | **Sincronizar Dados passa a ser somente leitura em todos os cliques**, inclusive fora do B2. Não migra, reconcilia ou salva cache no servidor. Salvar continua nas ações de edição. |
| Manual durante B2 | Feedback imediato de espera; executar seu próprio batch novo quando livre. Enfileirar pedido de leitura, não snapshot/diff antigo. |
| Manual com pendência local | Oferecer recuperação explícita; não sobrescrever intenção local nem usar o botão como retry de escrita. |
| Backup/importação | Migração implícita retirada do botão manual. Eventual importação explícita é outra frente, fora desta rodada. |

**Consequência de rollout autorizada:** descartar caches sem identificação pode perder
dados locais que nunca chegaram ao servidor. Depois de zerar legitimamente o banco, B2
não repovoará a conta a partir do aparelho.

## 3. Revalidação contra o código atual

| Evidência | Correção necessária no desenho |
|---|---|
| `storage.js`: retorno `local-cache` com alunos/aulas locais | Confirma a ausência de revalidação principal nesse caminho. |
| `bootstrap.js`: `navigateTo(router.getTelaInicial())` | Não presumir Home nem depender de sua inicialização para hidratar cache. |
| Finanças já faz GET com cache ao inicializar | B2 não é o primeiro refresh financeiro; evitar GET extra por reinicialização. |
| Inicialização de Alunos fecha cadastro e busca complementos | `refreshCurrentView()` não é render neutro; pode fechar formulário/repetir GETs. |
| Remoto vazio/migração de objetivos chamam `salvarDados(true)` | `forcarRemoto` sozinho não é seguro; `salvarDados` recebe booleano, não opções. |
| Reposições aplicadas antes do ramo de vazio | Validar/preparar todos os datasets antes de qualquer mutação de memória. |
| Falhas de bloqueios/reposições viram `[]` | Distinguir falha de vazio; B2 não aplica batch parcial. |
| `_cachePossuiDados` só conta alunos/aulas não vazios | Distinguir snapshot válido vazio, cache ausente e cache ainda não hidratado. |
| Recovery lê `personalTrainerData` direto | Limpeza deve cobrir o backup legado, não só as cinco chaves atuais. |
| Auth-change força remoto e pode pular hidratação | Guarda de dono apenas em `carregarDadosDoLocalStorage` é insuficiente. |
| Cards/históricos de Finanças e resumos de Alunos ficam em memória | Isolar também projeções e respostas tardias, não apenas localStorage. |
| PATCHs diretos não passam por `salvarDados` | Trava apenas nessa função não cobre gravações reais. |
| `salvarDados` sobrescreve cache antes da escrita e retorna `ok:false` em falha | Cache preservado não comprova gravação; callbacks atuais não oferecem recuperação geral segura. |
| CRUD de alunos/agenda usa GET → diff da lista inteira → POST/PUT/DELETE | Snapshot antigo pode apagar registros novos; retry genérico não é aceitável como saída da pendência. |
| `Promise.all` rejeita sem esperar todas as tarefas | Outras tarefas podem continuar gravando após o catch; acompanhar término de todas antes de liberar proteção. |
| Modais de reposição executam múltiplas escritas/compensações | Timeout pode deixar efeito parcial remoto; repetir formulário pode gerar outro ID ou histórico duplicado. |
| Sync manual atual chama carga com migrações e anuncia sucesso após fallback | Seu novo contrato precisa de batch somente leitura e resultado explícito, não só fila de espera. |
| `fetchComTimeout` substitui signal externo por controller privado | Compor signals se usar abort; descarte por geração é a garantia de correção. |
| `sw.js` ignora `/api/` e cross-origin | Corrige descrição anterior de cache da API; não alterar SW neste item. |
| Mock limpa/bloqueia caches e não simula sessão/abort | Estender mock seguro: hoje não prova stale-while-revalidate. |

### Aprendizados preservados das revalidações de 30/09

- Pular migração não bastava: o código continuava sobrescrevendo memória/cache com vazio.
  Agora vazio válido é aceito por decisão explícita, **sem migração**; falha não sobrescreve.
- Comparar dono com sessão ausente apagava cache legítimo. Preservação em disco e
  autorização de exibição passam a ser regras separadas.
- Trava de leitura não protege gravação; proteger antes da mutação local e durante toda
  operação composta, não só requisição HTTP.
- Fallback/`finally` antigos não podem reidratar estado nem limpar indicador de outra operação.

## 4. Arquitetura proposta para B2-puro

As decisões de produto fechadas estão no §2. Os mecanismos deste capítulo são propostas
técnicas para concretizá-las, não regras novas já implementadas. O limite de uma aplicação
retoma a premissa de uma revalidação por sessão do desenho de 30/09; seu recorte por conta
e a coalescência dos cliques manuais devem ser conferidos na execução. O silêncio de 401
preserva o R3 do desenho anterior, sem mudar o fluxo de login.

### 4.1 Identidade e cache

- Consumir `googleIdentity.getOwnerEmail()` e token utilizável existentes; não alterar
  emissor/verificador de credencial. Capturar dono/geração **antes** da requisição.
- Inicializar política de cache antes de views consumirem dados; observar mudança de conta
  cedo o suficiente para não perder eventos durante o boot.
- Cache principal: marcador `personal_cache_dono` e validade/presença do snapshot. Chaves:
  `personal_alunos`, `personal_aulas`, `personal_reposicoes`, `personal_limitesGrade`,
  `faturamentoMeta`. Incluir `personalTrainerData` no descarte legado.
- Cache financeiro: `{ ownerEmail, atualizadoEm, dados }`, independente do marcador principal.
  Gravação financeira não reatribui dono ao cache principal.
- Resposta não recebe o dono logado ao **terminar**: deve pertencer ao contexto capturado
  na origem e ainda ser autorizada na aplicação.
- Sem sessão válida: não exibir projeções anteriores; preservar cache identificado em disco.
  Conta diferente invalida contexto anterior, sem reaproveitá-lo. Caches legados sem dono
  não passam por fallback, recovery ou confirmação automática.
- Pendência local precisa de metadado associado ao dono, inclusive persistido, para recarga
  não converter gravação falha em snapshot confirmado elegível ao B2. Isso não armazena
  fila de comandos para replay automático. Preservar intenção/snapshot e identificação da
  tentativa necessária à apresentação; recuperação explícita definida no §4.5.

### 4.2 Obter → validar → preparar → aplicar

- Reutilizar helpers existentes, separando B2 da migração/CRUD. Não duplicar recorrência,
  prazo ou cálculo financeiro; manter únicas as normalizações de UI existentes.
- Batch principal: alunos, agendamentos, grade, bloqueios externos e reposições. São **cinco
  tarefas**, não teto de cinco HTTPs: configuração admite seu fallback existente. Ping,
  GCal e leituras complementares são contabilizados separadamente.
- Validar todos os HTTPs/payloads necessários. 404 de configuração admite fallback; erro
  ou cancelamento de reposições/bloqueios não equivale a lista vazia.
- Preparar agenda com bloqueios, alunos, pendências e grade sem tocar globais/DOM/cache.
- Aplicar somente com dono/gerações atuais, sem formulário, gravação ou estado local pendente.
  Arrays vazios válidos são aplicados; falha/descarte não reidrata localStorage.
- Aplicação coordenada é garantia **do cliente**, não transação entre collections no servidor.
  Não prometer atomicidade de vários `localStorage.setItem`.
- Resultado explícito: aplicado, falha, descartado ou adiado, com motivo/contexto. Promise
  resolvida ou cache salvo não significa escrita remota confirmada.

### 4.3 Concorrência: proteger aplicação, não reformar toda a API

- Coordenador por janela: dono, gerações de conta/leitura/mutação, Promise em voo, pendência
  B2 e contagem de operações/formulários. Leitura de A não atende B; booleano não delega resultado.
- Abrir formulário ou iniciar mutação invalida B2 **antes** de alterar memória. Abortar rede
  se viável, mas sempre descartar resposta e efeitos de fallback/`finally` obsoletos.
- Proteger operações compostas até concluir: salvar, vincular reposição, compensar e refresh.
  Não liberar proteção entre PATCHs; evitar deadlock com chamadas internas de `salvarDados`.
- Incluir `salvarDados`, PATCHs de pagamento/ajuste/cobrança e criação, reabertura,
  reagendamento/compensação nos modais. Liberar apenas após confirmação da operação
  correspondente e término das tarefas conhecidas; falha não confirmada mantém pendência.
- Acompanhar todas as tarefas de uma operação, mesmo após a primeira rejeição. Impedir novas
  etapas não iniciadas após abandono/troca de contexto; não considerar catch/finally de
  `Promise.all` prova de que todas terminaram. Abort não desfaz requisição enviada.
- Não alterar algoritmo da cascata ou GCal. Manter a proteção no chamador até concluir
  dependências; se precisar editar área sensível, parar e confirmar.
- Operação antiga multietapas não pode continuar com credencial da conta seguinte. Conferir
  contexto antes de nova etapa mutável; resposta já enviada não altera a conta seguinte.
- Releituras disparadas pelo B2 recebem essas guardas. Integrar gatilhos existentes para
  evitar sobreposição com B2; consolidação completa deles permanece no **2.2**.
- Botão manual: feedback imediato de espera, seu próprio batch **somente leitura** quando
  livre, sem migração nem replay CRUD. Enfileirar intenção de ler, nunca arrays, payload de
  escrita, resposta B2 ou diff. Nova edição exige esperar/descartar a leitura, não usar snapshot
  anterior. Troca de conta invalida pedido antigo; pendência abre recuperação do §4.5.
- Sync manual só anuncia sucesso após resultado remoto válido, não fallback/401.

### 4.4 Boot, retomada e apresentação

- Hidratar cache autorizado independentemente da tela inicial; não navegar à Home para isso.
- Após apresentar tela inicial, disparar revalidação elegível em background. Não aguardar
  renovação GCal nem criar dependência entre ela e batch de dados.
- Sem snapshot principal válido, carga inicial já necessária pode atender leitura, sem
  duplicá-la. Finanças mantém GET próprio e recebe hidratação principal independente.
- Snapshot válido vazio também é revalidado; presença não depende só de `alunos.length`.
- No máximo **uma revalidação B2 aplicada por contexto de conta nesta carga da página**.
  Troca real de conta cria contexto novo; descarte/adiamento não contam como aplicação.
- Retomadas por sessão válida, `online`, término de formulário/operação ou gatilho compatível.
  Falha real aguarda próximo evento de conexão/sessão ou gatilho existente; fechar formulário
  não cria loop de retry de rede. Nenhum timer/polling.
- 401 silencioso no B2; não expor dados enquanto sessão não for válida.
- Renderizar **view ativa na aplicação** de modo neutro: não reinicializar genericamente
  fechamento de cadastro, hash/scroll ou fetches. Home preserva período/data/sub-aba; Alunos
  atualiza lista/complementos sem resetar interação; Finanças acompanha/reutiliza leitura
  própria compatível, sem GET extra por render. Histórico permanece sob demanda/em memória.
- Rótulo só durante remoto sobre cache autorizado em tela; oculto no adiamento/sem cache e
  no fim. Associar à operação para `finally` antigo não apagar rótulo da seguinte.

### 4.5 Pendência de gravação: saída explícita, sem retry cego

O app atual não fornece recuperação geral segura. `salvarDados` reconcilia listas inteiras;
seu callback de retry pode usar estado diferente do original. POST/reabertura, compensações
e PATCHs com efeitos derivados não são universalmente idempotentes. Preservar um snapshot
é proteção contra perda local, **não autorização para reenviar**.

#### Classificar por operação e tentativa

| Estado observado | Tratamento |
|---|---|
| Não enviada | Validação local/token ausente antes de qualquer envio; corrigir e tentar a ação específica. |
| Rejeitada com garantia do endpoint | Esta etapa não foi aceita; verificar outras etapas antes de classificar toda operação. 409 não pede repetição igual. |
| Parcial | Há etapas confirmadas e outras rejeitadas/incompletas; não repetir o fluxo inteiro nem compensar genericamente. |
| Resultado desconhecido | Timeout, perda de resposta, abort após envio ou erro sem garantia de ausência de efeito; não afirmar que nada gravou. |
| Escrita confirmada, atualização da tela falhou | Repetir apenas a leitura; não reenviar pagamento/ajuste/escrita já confirmados. |

Identificar dono, tentativa e geração da intenção local. Um sucesso antigo não limpa
pendência de uma alteração mais recente. Não interpretar status HTTP isolado como garantia
universal: considerar contrato do endpoint e etapas da operação. Falha GCal após gravação
confirmada no Mongo não equivale a perda da gravação local; segue feedback específico existente.

#### Apresentação mínima de recuperação

- Usar superfície persistente e acessível, não somente toast que pode ser substituído:
  mensagem de alteração não confirmada + ações **Verificar no servidor** e **Usar dados do
  servidor**. Reaproveitar formulário/diálogo existente quando adequado; sem nova aba.
- **Verificar no servidor**: leitura nova no contexto correto; preparar resultado separado,
  sem aplicar por cima da intenção/snapshot local. Consultar também alvos financeiros/históricos
  ou reposição por ID quando necessários à operação específica. Falha preserva pendência.
- Não deduzir conclusão de operação composta só porque um registro existe ou os arrays
  parecem iguais. Se houver comparação comprovadamente suficiente para aquela ação, exibir
  o estado observado; no caso desconhecido, informar que a gravação pode ter sido efetivada.
- **Usar dados do servidor**: confirmação explícita para abandonar a intenção local. Texto
  informa que não é rollback e que alterações já gravadas no servidor serão mantidas.
  Na mesma conta e com formulários fechados/tarefas cliente conhecidas encerradas, obter
  **nova leitura válida**, sem reutilizar resposta da verificação anterior, e aplicar.
- Só após aplicação válida abandonar snapshot/intenção local e remover sua pendência
  persistida. Leitura falha, 401, payload inválido ou troca de conta não limpam pendência.
- Essa leitura de recuperação é exceção **explícita e confirmada** à guarda de pendência;
  B2/manual ordinários continuam bloqueados. Não apagar marcador antes de buscar dados.
- Abandonar intenção local não declara a tentativa remota concluída. Timeout não informa
  quando o servidor terminou; GET fornece observação atual, não garantia de resultado final.
  Informar esse limite, invalidar callbacks antigos e permitir revalidações futuras normais;
  não manter bloqueio eterno depois do abandono explícito bem-sucedido.
- Troca/logout não descartam pendência persistida silenciosamente. Rascunho em edição fecha
  conforme decisão anterior; pendência identificada segue preservada para recuperação pela
  mesma conta, sem exposição à seguinte. Não prometer guardar várias contas simultaneamente.

#### Quando oferecer repetição de escrita

Somente se inventário/prova do fluxo específico demonstrar: alvo/ID/payload estáveis, conta
atual correta, tarefas anteriores encerradas e tratamento das etapas já confirmadas,
conflitos e efeitos de repetição. Reautenticar ou receber 500 não basta para liberar replay.

No B2-puro **não oferecer retry geral de `salvarDados` nem de operação composta parcialmente
concluída/desconhecida**. Manter leitura/verificação e abandono explícito como saída segura.
Se a recuperação exigir endpoint idempotente, controle de versão ou status remoto da tentativa,
parar e trazer dependência de backend; não implementar fila offline ou novo contrato por inferência.

### 4.6 Manual somente leitura: contrato completo

Esta é mudança de comportamento aprovada no refinamento: separar **atualizar** de **salvar**.
Aplica-se ao botão inteiro, não apenas ao clique durante B2. Reusar obtenção/validação/preparação
do batch seguro; jamais entrar nos ramos de migração por remoto vazio ou normalização de objetivos.

1. Clique registra pedido de leitura vinculado à conta, sem snapshot ou diff de escrita.
2. Se há B2/tarefa/formulário em andamento, feedback imediato **Aguardando para atualizar...**;
   durante requisição, **Sincronizando...**. Não anunciar sucesso enquanto estiver aguardando.
3. Pendência não confirmada apresenta recuperação do §4.5; simples clique não autoriza descartá-la.
4. Ao ficar livre, iniciar seu próprio batch novo. Mesmo B2 terminado não conta como atendimento
   do clique; compartilhar helpers não significa reutilizar resposta já obtida.
5. Revalidar conta/gerações na aplicação; nova edição descarta/adia leitura (sem aplicar snapshot
   antigo). Troca de conta cancela pedido de A, sem executar automaticamente para B.
6. Aplicar batch completo válido, inclusive vazio; nenhuma migração, POST/PUT/PATCH/DELETE por
   esse caminho. Falha mantém estado anterior e informa erro com retry **somente de leitura**.
7. Finanças/histórico afetados usam leituras próprias necessárias sem reenviar escrita ou
   implementar cálculo no cliente. Evitar prefetch indiscriminado dos históricos.

Antes de entregar C, inventariar callbacks de retry de escrita que podem contornar essa proteção.
Sem esse inventário/teste, não considerar a saída de pendência concluída. O CRUD de salvar
continua com limites preexistentes, inclusive concorrência entre dispositivos; não é reformado
nem passa a ter atomicidade/idempotência só por separar o botão de atualização.

## 5. Cartões de execução propostos

Nenhum cartão implementado. Escopo revalidado: **Médio–Alto**, revisar após inventário do C.

| Cartão | Trabalho | Critério de saída |
|---|---|---|
| **A — Contrato e isolamento** | Specs pertinentes; caches/legado; ausência/troca de sessão; memória/respostas tardias; metadado de pendência local. | Nenhum dado de outra conta ou legado sem dono exibido, aplicado ou migrado. |
| **B — Leitura segura** | Separar obter/preparar/aplicar; batch válido; sem migração; aceitar vazio; resultado explícito; descarte sem fallback destrutivo. | Zero CRUD pelo B2; falha parcial preserva snapshot inteiro. |
| **C — Interação e recuperação** | Fronteiras/retornos das operações e retries; gerações; término de tarefas; saída explícita da pendência; manual somente leitura. | B2 não sobrescreve intenção; pendência tem saída testada sem replay cego; manual nunca reconcilia snapshot antigo. |
| **D — Boot e render** | Três hashes; hidratação; retomada por eventos; leitura compatível; render neutro; rótulo por operação. | Cache imediato/revalidado sem reset de tela, bloqueio ou duplicação criada pelo B2. |
| **E — Aceite e fechamento** | Mock seguro, integração/mutação, UI mobile, suítes medidas, atualização de plano/specs/roadmap. | Casos aprovados e limites relatados; PR/deploy/validação pelo dono. |

### Arquivos previstos (não alterados nesta rodada)

- `assets/js/storage.js`: cache, leitura, contexto das requisições, resultado e sync manual.
- `assets/js/utils-kpi.js` e markup/CSS de recuperação, **se necessários**: conectar ações e
  impedir callback genérico de retry de escrita contornar a proteção. Inventariar antes;
  não alterar feedbacks de outras operações sem necessidade.
- `assets/js/app/bootstrap.js`: hidratação, observação de conta, gatilho e retomadas.
- `assets/js/view-home.js`, `view-alunos.js`, `view-financas.js`: projeções, leitura/render,
  contexto de conta e fronteiras de interação.
- `assets/js/modal-acao-slot.js`, `modal-agendamento.js`, `settings-modal.js`: proteção de
  formulário/gravação, sem mudar regras ou integração GCal.
- `DialogController` existente: aproveitar stack/hooks reais; só editar se faltar notificação.
  Inventariar no C controles que não passam por ele.
- `mocks/ui-runtime/mock-runtime.js`, `scenarios.js`: cache sintético/respostas controladas;
  nunca liberar API ou cache real.
- `tests-frontend/`: testes separados por contrato (cache, leitura, concorrência, boot).
- Specs pertinentes, este plano e roadmap: documentação no mesmo ciclo de execução.

Sem dependências novas, bundler ou novo script por padrão. Se necessário script novo,
validar ordem de carga em `index.html` e `DEPENDENCIAS_DE_CARGA`.

## 6. Testes e aceite

### Automatizados: código real com `node:test`, `assert`, `jsdom` e `vm`

1. Três hashes: cache identificado imediato, vazio válido, sem cache, sem depender da Home.
2. Cache legado sem dono, financeiro sem dono e `personalTrainerData`: descarte, zero migração.
3. Sem sessão: cache identificado preservado em disco, nenhum dado exibido/batch enviado.
4. Conta restaurada autoriza; outra conta invalida globais, cards, históricos e DOM.
5. A→B com respostas invertidas: resultado/fallback/`finally` de A não alteram B.
6. Batch válido aplica todos os conjuntos, dono correto e rótulo durante o voo.
7. Vazio válido esvazia tela/cache; zero POST/PUT/PATCH/DELETE do caminho B2.
8. Falha individual em cada rota, JSON inválido/não-array, 401 e timeout: snapshot anterior intacto.
9. Bloqueios/reposições falhando não desaparecem como se a resposta fosse `[]`.
10. B2 não chama `salvarDados` por recovery/objetivos; recuperação explícita só usa cache
    identificado legítimo, nunca legado descartado ou dado de outra conta.
11. Abrir formulário descarta leitura e preserva campos/foco; fechar permite leitura nova.
12. Leitura aguarda escrita; escrita invalida leitura antes da mutação local.
13. PATCH direto/operação composta: nenhuma aplicação entre etapas, sem deadlock; falha mantém
    pendência, sucesso libera conforme confirmação real.
14. Falha de gravação + recarga: metadado pendente impede B2 de substituir estado não confirmado.
15. Troca com rascunho fecha/descarta/avisa; etapas seguintes não usam credencial nova.
16. Botão manual: feedback imediato, sync próprio depois; fallback/401 sem sucesso falso.
17. Retomadas por evento, sem polling/loop; uma aplicação por contexto.
18. Navegação durante voo: render atual preserva hash/período, sem fechar formulário, GET financeiro
    extra por reinicialização ou prefetch de histórico.
19. localStorage indisponível/snapshot vazio: sem sucesso falso nem perda de pendência local.
20. Se usar signal externo: abort diferente de timeout; cancelamento sem fallback destrutivo;
    `finally` antigo não apaga indicador novo.
21. Falha parcial com tarefas ainda ativas: catch não libera proteção; nenhuma nova etapa
  após abandono e nenhuma resposta velha limpa pendência mais recente.
22. Timeout após servidor gravar: classificar desconhecido, sem replay automático ou mensagem
  de rollback. Verificação não substitui snapshot/intenção local.
23. Usar servidor: cancelamento da confirmação mantém tudo; confirmação + GET novo válido
  abandona intenção sem CRUD; GET falho/401/inválido mantém marcador/snapshot.
24. Escrita confirmada + falha no GET posterior: retry só da leitura, sem segundo PATCH/POST.
25. Replay de reposição/reabertura/reagendamento não gera novo ID ou histórico por callback
  automático. Se repetição não for comprovada, ação de retry de escrita não é oferecida.
26. Cache divergente após rollback local e recarga: pendência continua detectável; sync manual
  não migra esse snapshot nem apaga remoto por ausência local.
27. Manual enfileira só pedido: registro criado remotamente durante espera não é apagado;
  remoto vazio não dispara migração; normalização não causa PUT; todos os cliques são leitura.
28. Mudança de conta, edição durante espera, cliques repetidos e recuperação pendente: não
  reutilizar contexto/diff, não duplicar escrita; feedback distingue espera de execução.
29. Abandono local após timeout não é prova de conclusão remota: avisar limite e permitir
  próxima revalidação sem callbacks antigos, sem manter bloqueio eterno.

Provar novos testes por mutação: neutralizar guardas de dono/geração/pendência, restaurar
`[]` em falha parcial, religar migração B2 ou reinicializar view deve produzir falha.
Restaurar **por edição**, sem operações git proibidas; conferir ausência de mutação residual.
Não exigir working tree limpo durante implementação.

Medir frontend antes/depois; backend como controle final (e antes/depois se código backend
for autorizado futuramente). Não usar números históricos como baseline. Conferir Node e
dependências antes: requisito do jsdom atual difere do mínimo genérico do setup. Não
instalar/atualizar dependência por inferência. **Nenhuma suíte executada nesta rodada.**

### UI: exclusivamente mock local seguro

Mock atual não conserva cache: estender com cache **sintético separado**, sessão/conta
controlável, latência/falha/401/abort e contador de rotas/métodos. APIs reais permanecem bloqueadas.
Não usar a aba de produção nem URL sem `mockScenario` para aceite.

Validar `http://127.0.0.2:5500/index.html?mockScenario=<cenário>` nas três hashes:
- **433×762, DPR 2.81, mobile/touch/UA/pointer completos**; stress 390×844 e 320×568;
- cache sintético aparece antes da resposta e atualiza sem flash vazio;
- erro mantém conteúdo, vazio válido remove conteúdo antigo;
- rótulo acompanha operação atual; navegação livre; foco, campos e período preservados;
- sem sessão/conta diferente não vê dados anteriores; troca com rascunho fecha/informa;
- salvar e sync manual durante B2 respeitam decisões; nenhuma escrita real nem confirmação
  financeira baseada apenas no cache.
- recuperação permanece acessível após toast sumir e após recarga; verificar não perde
  intenção; usar servidor confirma descarte, mantém pendência em falha e não faz rollback remoto;
- manual diferencia espera/execução e não salva/importa, inclusive com servidor vazio.

Teclado/leitor de tela: aceite manual do dono se automação não entregar eventos; não reportar
como observado sem evidência. Mock não comprova efeitos lazy do Mongo nem I/O real GCal.

## 7. ETag/304 — rodada separada, não pré-requisito

O desenho anterior propunha `count:maxUpdatedAt` por collection e afirmava que 304 evitaria
todo recálculo. Revalidado: isso não basta para respostas derivadas de Finanças.

- Express pode gerar ETag **depois** de executar controller; economiza payload, não cálculos
  ou escritas lazy já realizados.
- Aluno/Agendamento não têm timestamps automáticos; CicloFinanceiro usa `atualizadoEm`.
- Finanças depende de várias collections **e da passagem do dia**. Weak ETag não permite
  ignorar mudanças semânticas; count/máxima data de uma collection não captura tudo.
- Rodada futura deve definir dependências/versões/relógio, autorizar antes do 304 e garantir
  atualização de ciclos abertos/expiração. Não prometer economia antes de medir.
- Cliente só aceita 304 sem JSON com cache autorizado correspondente; validar exposição de
  header via CORS cross-origin e interação com HTTP/SW/browser reais se necessário.

Nenhum ETag/backend/CORS no B2-puro. Depois, dono decide a ordem entre ETag e **2.2**;
2.2 depende do B2 para incluir seu gatilho, **não depende de ETag**.

## 8. Fora de escopo e achados não alterados

- Reorganizar GCal/webhook, renovar login: 2.2/4.9 ou rodada própria.
- Motor, conflitos, algoritmo da cascata, cálculo financeiro, competência/prazo e ciclo pago.
- Fila de escrita offline, conciliação entre abas/dispositivos ou transação entre collections.
- Refazer todo manual/auto-refresh/recovery: apenas fronteiras necessárias ao B2 e isolamento;
  outras políticas preexistentes requerem decisão separada.
- **Exceção aprovada no refinamento:** botão manual inteiro passa a somente leitura e a
  recuperação explícita mínima do §4.5 entra no escopo; não é uma fila offline nem reforma do CRUD.
- Retry geral seguro, atomicidade multietapas, conclusão de requisição remota perdida e
  concorrência entre dispositivos não podem ser garantidos com os contratos frontend atuais.
  Requerimentos futuros de idempotência/versionamento/status remoto pertencem a rodada própria.
- `gcal_connection_cache` não possui dono explícito, contrariando a classificação anterior
  como intrinsecamente isolado. Registro apenas; alteração auth/GCal exige confirmação.
- Configuração pode responder padrão após falha interna: 200 assim não informa degradação;
  validação frontend não distingue de padrão legítimo. Backend não alterado.
- Divergência de requisito Node entre setup/jsdom: conferir ambiente na execução, sem
  acrescentar dependência nem declarar suíte verde nesta rodada.

## 9. Registro do planejamento — 05/10

- Branch autorizada `docs/planejar-sync-boot`, sem upstream; base `f3fe4f2`.
- Revalidados plano, storage, bootstrap/router, views, fluxos diretos, specs, mocks e testes.
- Registradas onze decisões; substituídas premissas de Home obrigatória, preservação de vazio,
  exibição sem sessão, legado aproveitável e delegação do manual ao B2.
- Ampliação do planejamento autorizada pelo dono; nenhum código implementado.
- Roadmap atualizado apenas no 2.4/dependência/data, sem implementar outra feature.
- Sem testes, validação UI, commit ou push nesta rodada; números antigos não reusados.

### Refinamento posterior na mesma branch — 05/10

- Dono confirmou continuar em `docs/planejar-sync-boot`, preservando mudanças documentais anteriores.
- Conferidos retries, CRUD por diff, operação parcial/timeout, compensações e confirmação financeira.
- Aprovadas recuperação explícita conservadora e mudança de **todo botão manual** para leitura.
- Detalhados estados de pendência, término das tarefas, verificação sem sobrescrita e abandono
  confirmado com nova leitura; retirada afirmação de que fluxos existentes já resolvem a pendência.
- Preservada distinção: plano aberto B2 será reaproveitado; entrega B1 não será reaberta.
- Sem implementação, suíte, validação UI, commit ou push. Desenho não equivale a garantia de
  execução: contratos dos fluxos específicos ainda devem ser provados no cartão C.

## 10. Próxima rodada

Começar pelo **cartão A**: confirmar branch e fronteiras concretas, incorporar contratos
nas specs pertinentes, conferir ambiente e medir baseline frontend antes do código.
B–D dependem dessas garantias; E fecha aceite. Se inventário exigir alterar autenticação,
GCal ou cascata, confirmar antes. Registrar execução/medições **neste mesmo arquivo**,
sem relatório paralelo por cartão.

O refinamento fecha a experiência dos dois pontos discutidos, mas não declara o plano
"100% garantido": inventário de C e testes podem revelar dependência de backend. Trazer
essa dependência antes de seguir, sem substituir silenciosamente as decisões aprovadas.