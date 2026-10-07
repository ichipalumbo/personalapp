# Plano vivo — 2.4: sincronização de leitura no boot sobre cache (B2)

> **Status**: Aberto — A–D3 e E1 validados localmente; B2 ligado; E2/E3/publicação pendentes
> **Criado**: 2026-09-30 · **Atualizado**: 2026-10-06
> **Item**: 2.4 do [roadmap](../roadmap.md)
> **Branch desta rodada**: `docs/planejar-sync-boot`, criada de `origin/main` com `--no-track`
> **Base revalidada**: `f3fe4f2dfc56835d140b80d0b0a917544cab5d45`
> **Rodada atual**: somente E1, base `a42cb54`, mesma branch limpa explicitamente autorizada; preparar mock sem alterar regras/app.

Este é o mesmo plano aberto de 30/09, revalidado após a Etapa 7. O B1 está fechado em
[`2026-09-30-plan-skeletons-cache.md`](2026-09-30-plan-skeletons-cache.md) e não será refeito.
**5.8 entregue**: skeletons (Parte A) e rótulo nos syncs existentes (B1). **B2 agora ligado e
validado localmente até D3**, com aceite ampliado E e publicação pendentes. Este documento
aberto recebe o refinamento e a execução; não se cria plano paralelo nem se reabre o B1.
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

Cartões A–C concluídos nos recortes abaixo, ainda sem publicação; D dividido em D1→D2→D3.
Escopo revalidado: **Médio–Alto**, revisar após inventário do C.
Concluir, validar e registrar cada cartão antes de avançar; não agrupar A–E numa alteração única.

| Cartão | Trabalho | Critério de saída |
|---|---|---|
| **A — Contrato e isolamento** | Specs pertinentes; caches/legado; ausência/troca de sessão; memória/respostas tardias; metadado de pendência local. | Nenhum dado de outra conta ou legado sem dono exibido, aplicado ou migrado. |
| **B — Leitura segura** | Separar obter/preparar/aplicar; batch válido; sem migração; aceitar vazio; resultado explícito; descarte sem fallback destrutivo. | Zero CRUD pelo B2; falha parcial preserva snapshot inteiro. |
| **C — Interação e recuperação** | Fronteiras/retornos das operações e retries; gerações; término de tarefas; saída explícita da pendência; manual somente leitura. | B2 não sobrescreve intenção; pendência tem saída testada sem replay cego; manual nunca reconcilia snapshot antigo. |
| **D — Boot e render** | Três hashes; hidratação; retomada por eventos; leitura compatível; render neutro; rótulo por operação. | Cache imediato/revalidado sem reset de tela, bloqueio ou duplicação criada pelo B2. |
| **E — Aceite e fechamento** | Mock seguro, integração/mutação, UI mobile, suítes medidas, atualização de plano/specs/roadmap. | Casos aprovados e limites relatados; PR/deploy/validação pelo dono. |

### Cartão T01 (A) — Isolar cache, projeções e contexto por conta

- **Objetivo / resultado**: cache legado não identificado é descartado; dados identificados
  só são exibidos/aplicados para sessão utilizável do mesmo dono e geração.
- **Depende de**: decisões do §2; nenhuma entrega de B–E.
- **Arquivos / componentes prováveis**: contexto central de cache, storage, bootstrap,
  views e invalidação de modais; specs de Finanças/Reposições, testes e ordem de carga.
- **Inclui**: contrato nas specs; cache principal/financeiro; geração de conta; ocultação
  sem sessão; descarte legado; invalidar projeções e rascunhos; guardas de aplicação tardia;
  metadado mínimo em `salvarDados` e snapshot pendente separado por dono.
- **Não inclui**: batch seguro B, recuperação UI/coordenação completa C, boot B2 D ou
  extensão de mock E; auth, GCal, cascata, motor, cálculo financeiro e backend.
- **Decisões pendentes / bloqueios**: dono aprovou snapshot pendente separado por conta e
  limites das áreas sensíveis. Expiração conferida em acessos e foco/visibilidade, não
  ocultação cronometrada em repouso. Fluxos internos sensíveis permanecem fora do aceite.
- **Critérios de aceite**: legado nunca hidratado/migrado; sem sessão não exibe; A→B→A
  descarta resposta antiga; cache financeiro não altera dono principal; pendência de A
  sobrevive cache ativo de B; limpeza não grava vazio por cima do snapshot identificado.
- **Resultado**: implementado e validado em 06/10; ver registro da execução abaixo.
- **Validação**: baseline frontend medida 92/92, 0 falhas; suítes final, regressões de
  isolamento com código real e mutações individuais; UI visual integral não coberta.
- **Riscos e rollback**: descarte de legado é irreversível por reversão de código; snapshot
  pendente não prova conclusão remota. Não executar escrita/API real nem deploy nesta rodada.
- **Limite de tentativas**: no máximo 2 por falha de validação; na segunda, registrar e
  parar esse incremento para decisão do dono, sem avançar a dependentes.

### Cartão T02 (B) — Aplicar somente leitura remota completa e válida

- **Objetivo / resultado**: obter/validar/preparar o batch sem mutar estado; aplicar tudo
  somente após sucesso e autorização, sem migrações ou fallback destrutivo.
- **Depende de**: T01 (A), commit `7f7d140`.
- **Arquivos / componentes prováveis**: `assets/js/storage.js`, testes frontend de leitura,
  spec Finanças §6.1.2, registro neste plano e item 2.4 do roadmap.
- **Inclui**: leitura das cinco tarefas com fallback de rota da grade somente por 404;
  validação estrutural, retorno explícito, aplicação separada, vazio válido, normalização
  única sem CRUD, descarte de leitura substituída/conta antiga e bloqueio por pendência.
- **Não inclui**: fila manual, recuperação UI, fronteiras completas de gravação/formulário
  C; gatilho de boot D; mocks E; auth/GCal/cascata/backend/cálculo financeiro.
- **Decisões pendentes / bloqueios**: nenhum para o batch. Formatos incompatíveis são falha,
  sem inventar padrões; ausência de sinal do fallback interno 200 da grade é limite backend.
- **Critérios de aceite**: zero POST/PUT/PATCH/DELETE causados por `carregarDados`; falha de
  qualquer tarefa/JSON preserva memória/cache; vazio válido remove dados antigos; resposta
  obsoleta ou pendência surgida durante leitura não é aplicada.
- **Resultado**: implementado e validado localmente em 06/10; registro abaixo. B2 permanece desligado.
- **Validação**: baseline real frontend 109/109 e backend 232/232; testes determinísticos
  usando storage/contexto reais; mutações e suites finais; nenhuma API real.
- **Riscos e rollback**: vazio remoto confirmado esvazia cache ativo; reversão de código
  não restaura dados locais. GETs lazy do backend permanecem; testes não cobrem Mongo/GCal real.
- **Limite de tentativas**: no máximo 2 por falha de validação; na segunda, registrar e parar
  o incremento para decisão do dono, sem seguir a dependentes.

### Cartão D1 — Hidratar cache e atualizar sem reinicializar a tela

- **Objetivo / resultado**: cache principal autorizado em memória antes de abrir qualquer
  hash; atualização da tela ativa sem fechamento/reset de formulário, período ou URL.
- **Depende de**: A–C, base `14fc0e2`.
- **Arquivos / componentes prováveis**: storage, bootstrap, views Alunos/Finanças,
  testes frontend e documentação neste plano/roadmap.
- **Inclui**: hidratação síncrona idempotente sem rede; vazio válido; despacho neutro;
  reaproveitamento de leituras complementares compatíveis em voo; aplicação em memória
  separada de render da tela ativa; preservação de foco e detalhes ainda existentes.
- **Não inclui**: coordenador, gatilho B2, retomadas novas, rótulo por operação, mudança
  em auth/GCal/cascata/backend/cálculo, dependências ou consolidação do item 2.2.
- **Decisões pendentes / bloqueios**: nenhum. Finanças conserva seu GET existente;
  hidratar cache principal não cria carga remota principal nessa tela neste cartão.
- **Critérios de aceite**: três hashes recebem cache antes do inicializador; sessão inválida
  ou outra conta não recebem cache; hidratação repetida não restaura disco sobre memória;
  refresh não reinicializa/navega; GET financeiro compatível em voo não é duplicado;
  resposta complementar não renderiza tela abandonada; edição/foco/período preservados.
- **Resultado**: implementado e validado localmente em 06/10; registro §13 abaixo.
- **Validação**: frontend antes 197/197, zero falhas; testes focados com código real,
  mutações restauradas, suíte final e smoke local mock. Backend não afetado/não executado.
- **Riscos e rollback**: GETs lazy continuam existentes; reversão de código não desfaz
  efeito externo. Nenhum acesso a produção, commit, push ou deploy pelo agente.
- **Limite de tentativas**: no máximo 2 por falha; segunda falha bloqueia dependentes.

### Cartão D2 — Preparar coordenador B2 sem ligar ao boot

- **Objetivo / resultado**: estado pendente/em voo/aplicado por contexto com retomada
  por eventos e rótulo pertencente à operação, sem disparo de bootstrap.
- **Depende de**: D1 validado.
- **Arquivos / componentes prováveis**: `assets/js/storage.js`, novo
  `assets/js/app/coordenador-sync-boot.js`, ordem em `index.html`, testes frontend,
  plano e roadmap; bootstrap não chama o coordenador antes de D3.
- **Inclui**: coordenação, limite de uma aplicação por contexto, adiamentos e retomadas
  conforme §4.4; testes focados desses contratos.
- **Não inclui**: ativação no boot, consolidação GCal/2.2 ou aceite integrado E.
- **Decisões pendentes / bloqueios**: nenhum neste recorte. Contratos técnicos refinados:
  módulo carrega inerte; `iniciar` só será chamado no D3. Depois de iniciado, contexto,
  sessão, `online`, interação e término de leitura são eventos; falha real só libera nova
  tentativa por sessão/conexão/retomada explícita ou leitura compatível já aplicada.
- **Inclui adicionalmente**: recibo interno de aplicação principal compatível (mesmo
  contexto/interação, sem raiz de escrita/adoção); reserva de leitura até finalizar
  render/complementos para o manual aguardar, sem transformar B2 em raiz de gravação.
  Cache vazio também é cache. Aplicação conta mesmo se render complementar falhar;
  não repetir batch principal para corrigir complemento.
- **Rótulo**: cada voo guarda seu próprio identificador/contexto; cancelar/adiar/invalidar
  oculta somente seu aviso. Um finally antigo não apaga aviso da leitura seguinte.
- **Critérios de aceite**: uma aplicação B2 por contexto; perda/troca de sessão cancela
  efeitos; edição descarta e só refaz leitura nova quando livre; pendência bloqueia;
  falha/401 não repetem por fechar formulário; manual espera e faz batch próprio;
  recibo compatível evita duplicação; rótulo correto sobre cache; nenhum início no boot.
- **Resultado**: implementado e validado localmente em 06/10; registro §14 abaixo.
- **Validação**: baseline frontend medida **226/226**, zero falhas; testes determinísticos
  do coordenador com storage/contexto reais, provas por mutação, suíte final e ordem de
  carga. Backend não alterado/não executado. UI/ativação integrada permanece D3/E.
- **Riscos e rollback**: cancelamento não desfaz GET lazy; reserva acompanha tarefas do
  cliente, não prova término remoto. Não acessar produção/alterar auth/GCal/backend.
- **Limite de tentativas**: máximo 2 por falha; segunda falha bloqueia dependentes.

### Cartão D3 — Ligar e ativar B2 nas três telas iniciais

- **Objetivo / resultado**: ligar coordenador após apresentação inicial e integrar os
  gatilhos existentes estritamente necessários, sem duplicar leitura compatível.
- **Depende de**: D2 validado.
- **Arquivos / componentes prováveis**: bootstrap, storage/coordenador, testes frontend,
  specs pertinentes e registro de ativação no plano/roadmap.
- **Inclui**: ligação ao bootstrap e testes das três hashes com/sem cache.
- **Não inclui**: consolidação geral GCal/2.2 ou fechamento antecipado de E.
- **Decisões pendentes / bloqueios**: revalidar integração com cargas iniciais e triggers
  atuais após D2; qualquer área sensível exige autorização própria antes de edição.
- **Critérios de aceite**: cache imediato e revalidação elegível sem reset/duplicação.
- **Resultado**: ligado e validado localmente em 06/10; registro §15 abaixo; E não executado.
- **Refinamento técnico**: manter barreira da navegação inicial, dar oportunidade de
  apresentação por animation frame e iniciar B2 sem aguardar sua Promise. Listener de
  sessão antes do init, sem leitura concorrente durante a barreira. Login/retorno à aba
  usam B2 pendente; após cota aplicada conservam refresh remoto existente serializado.
  Somente B2 pode reaproveitar financeiro concluído nesta geração/interação (inclusive
  vazio), nunca cache de disco, falha ou leitura anterior à edição. Manual mantém GET novo.
- **Validação**: baseline frontend **256/256**; integração das três hashes com cache
  presente/vazio/ausente, leitura financeira já concluída/em voo, login em boot, falhas,
  edição/navegação/manual e retorno à aba; mutações, suíte final, smoke mock mobile.
  Backend/Google/Mongo reais não executados; aceite ampliado continua E.
- **Riscos / rollback**: GETs lazy continuam existentes. Nenhuma mudança no motor,
  cálculo, auth, GCal ou cascata; não publicar nem acessar dados reais. Reversão de código
  não desfaz estado remoto. Máximo 2 tentativas por falha; segunda bloqueia dependentes.

### Cartão E1 — Preparar mock isolado para aceite integrado

- **Objetivo / resultado**: simular cache antigo/vazio/pendente e reload, sessão/conta,
  latência/falha/401/JSON/abort, com contadores e liberação de respostas sem dados reais.
- **Depende de**: A–D3; dono aprovou divisão E1→E2→E3 e mesma branch nesta rodada.
- **Arquivos / componentes**: `mocks/ui-runtime/`, ordem antecipada do sandbox em
  `index.html`, testes do mock e documentação; não editar auth/backend/views.
- **Inclui**: facade de localStorage antes dos consumidores, namespace nativo reservado
  exclusivamente sintético para cenários B2 e reload; cache ausente distinto de vazio;
  sementes/persistência de pendência usando formatos reais; sessão A/B mockada, listeners;
  interceptação antecipada API/ping, Request+init normalizados; métodos/rotas contados;
  controles de rede em runtime, respostas retidas liberáveis e abort observável.
- **Não inclui**: E2/aceite completo, novas regras, refatoração de auth/Google/CRUD,
  dependências, real Mongo/Google ou publicação. Escrita default opt-in permanece só simulada.
- **Invariantes**: nunca ler/copiar/apagar chaves normais; nunca delegar API para rede;
  bloquear auth/GCal mesmo com opt-in; não persistir token/credencial nem payload externo;
  mock inerte fora do host/parâmetro; cenário default mantém cache efêmero.
- **Critérios de aceite**: reload conserva apenas envelope sintético; conta errada não
  autoriza cache; pending aparece após reload; sessões disparam eventos; falhas/latência/
  retenção/abort e contadores corretos; rede real/storage normal intactos; seeds não
  voltam após adoção/aplicação; cenários antigos e modo de escrita default não quebram.
- **Resultado**: infraestrutura implementada/validada localmente; registro §16 abaixo.
- **Validação**: baseline frontend **288/288**, testes VM/JSDOM do mock+formatos reais,
  mutações restauradas, suíte final e smoke de infraestrutura no mobile de referência.
  Não reauditar A–D3; backend controle final permanece E3.
- **Riscos / rollback**: envelope mock pode ficar na origem dedicada até reset explícito;
  não é backup real. Alteração de ordem exige teste. Falha ao isolar deve bloquear
  instalação, não continuar com rede/storage normais.
- **Limite de tentativas**: máximo 2 por falha, segunda bloqueia avanço para E2.

### Cartão E2 — Validar experiência completa no mock

- **Objetivo / resultado**: observar os contratos juntos nas três hashes, viewport de
  referência e stress, com cache/reload/erro/vazio/edição/manual/recuperação.
- **Depende de**: E1 validado; branch e matriz confirmadas antes da rodada.
- **Inclui**: aceite visual/funcional e correções pontuais evidenciadas; registrar lacunas.
- **Não inclui**: ampliar features/Google/backend ou considerar mock prova de produção.
- **Validação / riscos / limite**: detalhar antes de executar; máximo 2 por falha.

### Cartão E3 — Consolidar verificações e fechar entrega local

- **Objetivo / resultado**: suites finais medidas (backend como controle), registro único
  no plano/roadmap e separação de aceite local x validação manual/produção pelo dono.
- **Depende de**: E2 validado; sem commit/push/deploy pelo agente.
- **Não inclui**: nova auditoria geral, reimplementar A–D3 ou assumir TalkBack observado.
- **Validação / riscos / limite**: detalhar antes de executar; máximo 2 por falha.

### Arquivos previstos da frente completa

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
instalar/atualizar dependência por inferência. Medições da implementação no registro abaixo;
as rodadas de planejamento de 05/10 não executaram suítes.

### UI: exclusivamente mock local seguro

E1 entrega cache **sintético separado** persistente nos cenários B2, sessão/conta
controlável, latência/falha/401/JSON/abort, retenção/liberação e contador de rotas/métodos.
Dados nativos normais intocados e API/ping/Google bloqueados desde o sandbox antecipado.
Matriz visual integrada abaixo permanece para E2; E1 não é seu aceite.
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

### Execução do cartão A — 06/10

- **Branch/base**: dono confirmou continuar em `docs/planejar-sync-boot`; árvore inicialmente
  limpa, commit `36db6fa`, upstream na própria branch, nunca na `main`.
- **Confirmações adicionais**: implementar A (não apenas detalhá-lo); preservar snapshot
  pendente separado por dono; manter auth/GCal/cascata intactos e declarar seus limites.
- **Implementação**:
  - `assets/js/app/contexto-dados.js` (novo): contexto consumidor de dono/geração, descarte
    legado, cache principal/financeiro separado, snapshot pendente por conta, confirmação
    por tentativa, campos de vínculo Google confirmados preservados em falha parcial.
  - `storage.js`: hidratação/fallback/recovery autorizados, snapshot copiado na gravação,
    pendência mínima em `salvarDados`, guarda em cada etapa CRUD de sua conta, render/feedback
    obsoletos descartados. Não transforma o botão manual em somente leitura ainda (C).
  - Bootstrap: iniciar observação de contexto antes de views; não adiciona revalidação B2.
  - Views Home/Semana/Alunos/Finanças: invalidar projeções e controlar aplicações tardias,
    incluindo históricos; manter hash/período e handlers; limpar campos/controles antigos.
  - Modais e settings: limpar rascunhos/seleção, não reabrir após conta mudar; proteger
    retornos/rollback/DOM dos chamadores. Não alterar implementação interna GCal ou cascata.
  - `index.html` e teste de carga: novo script antes dos consumidores; fixtures frontend e
    dois arquivos backend que já executavam storage/modais carregam contexto real sintético.
  - Specs Finanças/Reposições: contratos aprovados antes do código; nenhuma regra de dinheiro,
    prazo ou competência alterada; backend de produção intacto.
- **Medições reais**: frontend **92/92 antes → 109/109 depois**, 0 falhas; backend **232/232**
  no controle final. Baseline backend antes da mudança não foi medida; não apresentar número
  histórico como medição. Suítes rodadas com Node real 22.20.0, sem instalação de dependências.
- **Correções durante validação**: fixture do rótulo disparava migração de objetivos e
  pendência inesperada; dados de fixture alinhados sem neutralizar proteção. Controle backend
  encontrou harnesses de storage/modais sem contexto/getOwnerEmail; fixtures atualizadas,
  regras backend preservadas. Antes de fechar, ambas as suítes completas voltaram verdes.
- **Provas por mutação**, restauradas por edição:

  | Mutação | Resultado medido | Restaurada |
  |---|---|---|
  | `atual` aceita todo contexto | 15 testes: 10 passaram, 5 falharam | sim |
  | Não descartar `personalTrainerData`/legado | 15 testes: 14 passaram, 1 falhou | sim |
  | Confirmação ignora tentativaId | 15 testes: 14 passaram, 1 falhou | sim |
  | Não invalidar projeções de memória | 17 testes: 11 passaram, 6 falharam | sim |

  Após última restauração, isolamento **17/17**, sem falhas. Busca e `git status` confirmaram
  ausência de mutação residual. Diff sem erro de whitespace; diagnósticos dos arquivos limpos.
- **Conferência no browser**, somente mock local `default`, 433×762, DPR aproximado 2.81,
  touch e pointer coarse verificados: lista com 4 alunos e abertura do cadastro de Maria;
  simulação de perda de sessão limpa lista, cards e campos, fecha diálogo e esvazia stack;
  aviso de edição encerrada observado. Clique teve timeout na automação, mas abertura foi
  observada no snapshot; teclado/TalkBack não testados nesta rodada.
- **Limite do mock**: bloqueia escrita e persistência; migração de objetivos existente e
  verificação GCal causam erros/avisos de escrita bloqueada. Nenhuma API de produção usada;
  ping local teve conexão recusada porque backend local não está em execução. Mock não prova
  cache persistente/alternância de contas em fluxo real; regressões determinísticas fazem isso.
- **Sem commit, push ou deploy do agente.** Descarte legado, quando publicado e executado,
  não é recuperável por revert. Publicação só pelo dono, via PR, conforme política.

#### Achados/limites que não foram alterados no A

- Ponte `salvarEventoComGCal` e cascata podem atravessar awaits internos e iniciar ações
  com contexto então vigente; guardas externas não corrigem seu interior. Dono aprovou
  manter áreas sensíveis intactas; confirmação específica necessária no C antes de editar.
- `gcal_connection_cache` não ganha dono neste cartão; autenticação permanece intacta.
- Pendência mínima instrumenta `salvarDados`, não todos os PATCHs/operações compostas.
  Término de todas as tarefas paralelas, classificação/retry e UI de recuperação pertencem
  ao C; não declarar gravação parcialmente concluída restaurada pela infraestrutura de A.
- Batch parcial, tratamento de remoto vazio sem migration e leitura manual segura ainda
  não implementados (B/C). A não é, isoladamente, o aceite completo da 2.4.
- Expiração não é cronometrada em repouso: revalidação acontece em acessos, navegação,
  aplicação de resposta ou retorno de foco/visibilidade. Sem polling/alteração do login.
- Node/jsdom: versões instaladas executaram testes; divergência do requisito genérico do
  setup continua registrada, sem atualizar ambiente ou lock nesta rodada.

## 10. Próxima rodada

Próximo **cartão E2 — aceite integrado**: confirmar branch, conferir A–D3/E1
entregues e definir matriz de mock/aceite antes de editar. E3 consolida fechamento/suites.
B2 está ligado no código local;
publicação/PR/deploy são do dono e não foram executados pelo agente.
Se inventário exigir alterar autenticação,
GCal ou cascata, confirmar antes. Registrar execução/medições **neste mesmo arquivo**,
sem relatório paralelo por cartão.

O refinamento fecha a experiência dos dois pontos discutidos, mas não declara o plano
"100% garantido": inventário de C e testes podem revelar dependência de backend. Trazer
essa dependência antes de seguir, sem substituir silenciosamente as decisões aprovadas.

## 11. Registro da execução do cartão B — 06/10

- **Branch/base**: `docs/planejar-sync-boot`, A commitado pelo dono em `7f7d140`;
  árvore inicialmente limpa e upstream próprio. Continuidade confirmada antes das escritas.
- **Escopo realizado**:
  - `assets/js/storage.js`: `obterLeituraDados` busca/valida/prepara sem mutação e
    `aplicarLeituraDados` aplica somente leitura preparada autorizada. Batch principal
    completo; snapshot público separado do interno; sequência descarta leitura substituída.
  - `carregarDados` reutiliza essas etapas; retirados os ramos de recovery/migração e
    persistência de normalização de objetivos. Vazio válido é aplicado sem CRUD; falha
    preserva memória/cache anterior sem reidratação destrutiva. Resultados explícitos
    conservam `origem` para consumidores existentes.
  - Grade só usa segunda rota após 404, com JSON/horários textuais válidos. Listas precisam
    de estrutura válida, identificadores e status pertinentes; bloqueio com ID objeto não
    passa por coerção. Meta preservada de cache autorizado na leitura anterior à hidratação.
  - Timeout/cancelamento cobrem headers **e corpo JSON**, inclusive resposta que não termina;
    abort externo retorna descarte, não timeout/fallback. Nenhum sinal cancela efeito remoto lazy.
  - `tests-frontend/storage-leitura-segura.test.js`: 25 regressões reais do batch, falhas por
    rota/payload, vazio/normalização sem CRUD, aplicação separada, pendência, sequência,
    cancelamento/timeout e meta. Harness backend ganhou apenas `AbortController` nativo;
    backend de produção, auth/GCal/cascata e motor não foram alterados.
  - Spec Finanças §6.1.2: contrato de leitura antes do código. Plano/roadmap registram a
    entrega, sem relatório paralelo e sem tratar o item 2.4 inteiro como concluído.
- **Suítes medidas**: frontend **109/109 antes → 134/134 depois**; backend **232/232 antes
  → 232/232 depois**, zero falhas finais. Na primeira validação final do corpo JSON, um
  harness sem AbortController falhou; ambiente sintético corrigido e backend completo verde.
- **Mutação**, sempre restaurada por edição:

  | Mutação | Medição | Restaurada |
  |---|---|---|
  | HTTP 500 vira array vazio | 22 testes: 18 passam, 4 falham | sim |
  | Aplicação ignora pendência | 22 testes: 21 passam, 1 falha | sim |
  | Obtenção ignora sequência substituída | 22 testes: 21 passam, 1 falha | sim |
  | ID externo por coerção | 25 testes: 24 passam, 1 falha | sim |
  | Retirar interrupção do corpo JSON | 25 testes: 22 passam, 3 falham | sim |

  Última restauração seguida de frontend completo **134/134**; busca e status conferidos
  sem mutação residual; diagnósticos limpos e diff sem erro de whitespace.
- **Mock local**: em 433×762 DPR ~2.81, touch/pointer coarse confirmados, cenário `default`
  carregou 4 alunos e leitura forçada retornou `estado: aplicado`. Inicialmente o browser
  estava executando JS antigo em cache; após limpar cache estático/recarregar, preparador
  novo confirmado. Persistência do cache e falhas do batch são provadas no harness, não
  pelo mock que bloqueia gravação. GCal permanece com aviso de escrita simulada bloqueada.
- **Não realizado**: ativação B2 no boot, fila/feedback/manual de recuperação, trava geral
  de formulários/gravações ou atualização neutra de view (C/D); extensão de mock e aceite
  ponta a ponta (E). Nenhum commit, push, deploy ou API de produção pelo agente.
- **Limites para o C**: botão manual já usa o leitor sem CRUD, mas ainda ignora seu resultado
  e pode anunciar sucesso após falha/adiamento. C deve consumir estados explícitos e conectar
  recuperação/fila. Leituras têm sequência e pendência, não proteção completa contra edição
  transitória sem marcador nem conclusão de operação composta. Não declarar essa concorrência
  resolvida. `cachePersistido: false` não é confirmação local; persistência multi-chave não
  é atômica, conforme contrato do A. GET 200 de grade com fallback interno continua não
  distinguível de padrão legítimo sem mudança backend, fora desta rodada.

## 12. Registro da execução do cartão C — 06/10

- **Branch/base**: `docs/planejar-sync-boot`, B commitado pelo dono em `612aba7`.
  Continuidade confirmada; recorte sensível da ponte GCal, conexão OAuth e cascata autorizado
  explicitamente antes das escritas. Sem commit/push/deploy pelo agente.
- **Escopo executado por arquivo**:
  - `assets/js/app/contexto-dados.js`: raiz por conta/tentativa, persistência antes do envio,
    etapas/tarefas, geração de interação e término sem bloquear/invalidar a conta seguinte.
  - `assets/js/storage.js`: propagação de contexto/raiz, status esperados, prazo total de
    headers/corpo/clones, voos por contexto e término das leituras; manual enfileirado somente
    GET, batch novo e resultado efetivo com complementos. Erro de lista CRUD não vira vazio.
  - `assets/js/app/recuperacao-dados.js` (novo), `index.html` e `assets/css/style.css`:
    painel persistente com verificar/adotar, confirmação e leitura nova, alvos por ID,
    fechamento de formulários e invalidação de callbacks anteriores na adoção. Complementos
    falhos deixam aviso de releitura sem repetir batch/escrita.
  - `assets/js/features/modals/dialog-controller.js`: registra abertura/fechamento dos
    formulários para proteger leituras. Diálogo de cobrança sem form usa registro explícito.
  - `assets/js/modal-agendamento.js`, `assets/js/modal-acao-slot.js`: raiz em criação,
    exclusões, edição/split, reagendamento e envio/reabertura de reposição; alvos registrados
    antes do envio, refresh/histórico aguardados. Retiradas compensações remotas genéricas;
    falha conserva intenção/pendência em vez de reenviar/desfazer o servidor.
  - `assets/js/view-alunos.js`: raiz em cadastro/edição/status/exclusão/cobrança, cascata
    aguardada, histórico contextual com resultado explícito e complementos validados.
  - `assets/js/view-financas.js`: raiz em pagamento/ajuste; escrita confirmada separada de
    refresh, trava dos ciclos aguardando leitura coberta, invalidação de históricos afetados
    (inclusive fechados/em voo), sem cálculo duplicado ou prefetch indiscriminado.
  - `assets/js/view-home.js`: raiz da grade, contexto das leituras e indicador de carga
    por proprietário; falha sai do skeleton sem aplicar snapshot antigo.
  - `assets/js/google-calendar.js`, `assets/js/cascade-sync-aluno.js`,
    `assets/js/auth/google-identity.js`: propagam a mesma raiz/contexto nas fronteiras;
    ponte distingue escrita confirmada de refresh falho; exchange OAuth não reenvia código
    após falha desconhecida/500, permite fallback só por 404, sem persistir código/token.
  - Testes novos: `tests-frontend/c-operacao-manual.test.js`, `c-prazo-corpo.test.js`,
    `c-oauth-operacao.test.js`, `c-financas-recuperacao.test.js`, `c-ponte-home.test.js`,
    `c-alunos-complementos.test.js`, `recuperacao-dados.test.js` e seu helper
    `setup/recuperacao-dados.js`. Guard de ordem inclui recuperação após contexto.
    Três harnesses GCal em `backend/test/` ajustados à raiz real e ausência de compensação.
- **Suítes medidas**: frontend **134/134 antes → 197/197 depois** (63 testes novos);
  backend **232/232 antes → 232/232 depois**. Primeira integração backend teve 14 falhas
  de harness/expectativas de compensação antiga; corrigidas, sem alterar backend de produção.
  Frontend intermediário **196/196**; revisão final encontrou callback complementar antigo
  ainda aplicável sem formulário, corrigido e coberto pelo T13. Zero falhas finais.
- **Provas por mutação**, restauradas imediatamente por edição:

  | Mutação | Teste focado | Passam / falham | Restaurada |
  |---|---|---|---|
  | Omitir persistência da raiz | manual M01 | 0 / 1 | sim |
  | Ignorar 404 esperado | manual M05 | 0 / 1 | sim |
  | Término de A alterar geração de B | manual M06 | 0 / 1 | sim |
  | Manual ignorar batch em voo | manual M08 | 0 / 1 | sim |
  | Verificar tentar aplicar leitura | recuperação T02 | 0 / 1 | sim |
  | Não invalidar históricos fechados | finanças, 2 testes | 0 / 2 | sim |
  | POST OAuth sem raiz | OAuth O03 | 0 / 1 | sim |
  | Renovar deadline vencido do corpo | prazo P02 | 0 / 1 | sim |
  | Toast apesar de histórico falho | manual M16 | 0 / 1 | sim |
  | Ignorar refresh false da Home | ponte, refresh false | 0 / 1 | sim |
  | Não invalidar callback na adoção sem form | recuperação T13 | 0 / 1 | sim |

  Todas provas contabilizadas falharam por assert; O02 preliminar com TypeError não foi
  contado. Na última mutação T12 passou (não prova isoladamente esta guarda); T13 falhou.
  Após restaurações: frontend completo **197/197**; status/busca sem mutação residual.
- **Inventário de retries (§4.6)**:
  - Zero callbacks ativos de retry de escrita: `salvarDados`/operações compostas não
    oferecem `onRetry` geral; o toast apenas despacha callback fornecido.
  - Retries restantes: leitura principal/manual em `storage.js`, histórico de reposições
    em `view-alunos.js` e histórico financeiro em `view-financas.js`; não reenviam PATCH.
  - Reabertura visual de formulário retorna às guardas da raiz, não dispara replay automático.
  - PUT→POST da cascata somente após 404 sob mesma raiz; exchange OAuth só muda endpoint
    após 404 esperado. Demais falhas interrompem a tentativa, sem reaproveitar autorização.
  - Renovação/catch-up GCal e desconexão de calendário não foram reformados: ver limites abaixo.
- **Mock mobile**: `default` em **433×762, DPR 2.81**, touch e pointer coarse confirmados,
  após limpeza de cache estático. Painel visível e sem overflow horizontal; botões medidos
  **48px** de altura. Falha/pendência simulada exclusivamente em armazenamento efêmero
  em memória no browser (mock bloqueia localStorage); nenhuma escrita em API real.
  Verificar retornou `verificado` preservando intenção; adoção confirmada retornou `aplicado`,
  limpou pendência e aviso; manual aguardou formulário e aplicou batch próprio após liberar.
  Backend local ausente gerou aviso do ping; renovação GCal permaneceu bloqueada pelo mock.
  Persistência/reload/falhas são comprovados no harness, não neste armazenamento efêmero.
  Teclado/leitor de tela não validados neste ambiente; aceite ampliado segue cartão E.
- **Encontrado, não alterado**: CRUD sem atomicidade/idempotência entre dispositivos;
  GET lazy não garante término de escrita cuja resposta se perdeu; renovação tripla GCal
  permanece no 2.2 e desconexão de calendário exige recorte específico. Spec Finanças §2.4
  ainda descreve caminho histórico anterior à mudança dos módulos compartilhados — fora
  deste cartão. Nenhuma dependência nova, cálculo/motor/conflitos ou backend de produção.
- **Não realizado**: D/E, ativação B2 no boot, publicação ou alteração de dados reais.

## 13. Registro da execução do cartão D1 — 06/10

- **Branch/base**: `docs/planejar-sync-boot`, C commitado em `14fc0e2`, árvore inicialmente
  limpa e upstream próprio. Continuidade confirmada pelo dono antes de qualquer escrita.
- **Arquivos alterados**:
  - `assets/js/storage.js`: `hidratarCacheDados` idempotente por contexto, sem rede,
    normalização/migração/CRUD; reutilizada na carga existente. Despacho público
    `atualizarViewAtualAposSync` consulta tela ativa, protege edição/operação e mantém
    caminho de leitura nova para manual/recuperação. Vazio válido continua sendo snapshot.
  - `assets/js/app/bootstrap.js`: hidrata antes do inicializador de qualquer hash;
    refresh usa despacho neutro, não `router.refreshCurrentView`. Auto-refresh não renderiza
    leitura falha/descartada; login conserva leitura própria de Finanças mesmo se batch
    principal falhar. Nenhum novo gatilho, coordenador ou ativação B2.
  - `assets/js/view-financas.js`: voo compatível por contexto/interação/raiz/prazo
    compartilhado **somente no refresh passivo D1**. Manual/recuperação continuam exigindo
    GET novo. Atualização não reconstrói cabeçalho; monta apenas estrutura ausente após
    inicialização adiada. Cards/históricos/extrato/foco preservados; resultado fora da tela
    atualiza memória/cache autorizado sem renderizar cards/indicadores antigos.
  - `assets/js/view-alunos.js`: refresh sem inicializar/fechar cadastro; reuso do complemento
    compatível já em voo apenas no caminho passivo. Render preserva detalhes/foco dos
    alunos ainda existentes; complemento terminado após navegação não renderiza a lista.
  - `tests-frontend/d1-hidratacao-render.test.js`: 29 regressões com bootstrap, storage,
    contexto, router e views reais, rede totalmente sintética. Matriz das três hashes ×
    cache presente/vazio/ausente/outra conta/sem sessão/legado; idempotência, fluxo passivo,
    edição/período/hash, navegação em voo, histórico sob demanda e manual exige leitura nova.
  - Este plano e `docs/roadmap.md`: corrigido cabeçalho antigo do B sem apagar registro C;
    divisão D1→D2→D3 e entrega parcial documentadas. Sem relatório paralelo/spec de regra nova.
- **Suítes medidas**: frontend **197/197 antes → 226/226 depois**, zero falhas. Foco
  existente 53/53; D1 final 29/29. **Backend não executado nesta rodada**: nenhum arquivo
  backend/shared ou harness backend alterado; não reapresentar 232 como medição nova.
- **Revisão focada**: uma revisão read-only; corrigidos reuso indevido possível pelo manual
  e montagem de estrutura ausente. Acrescentadas regressões específicas e mantida leitura
  financeira independente no login. Sem nova auditoria geral C/GCal/recorrência.
- **Provas por mutação**, dois grupos controlados e restaurados por edição:

  | Mutação | Assert que falhou | Resultado do grupo | Restaurada |
  |---|---|---|---|
  | Retirar hidratação antes do init | 6 casos presente/vazio nas três hashes | 21 passam / 8 falham | sim |
  | Voltar ao refresh genérico do router | modo/período e inicializador da Home | mesmo grupo acima | sim |
  | Reconstruir cabeçalho no render financeiro | identidade de `financasConteudo` | mesmo grupo acima | sim |
  | Desativar reuso passivo financeiro | um GET compatível em voo | 27 passam / 2 falham | sim |
  | Retirar guarda de cards fora da tela | DOM antigo não pode mudar | mesmo grupo acima | sim |

  Cada mutação tem assert próprio falhando. Após restaurar todos os trechos, diff/status
  conferidos e suíte completa **226/226**; diagnósticos dos arquivos alterados limpos.
  Primeiro teste da fixture teve evento nativo `toggle` após fechar JSDOM; drenagem no
  teardown corrigida, sem afrouxar guardas de produção. Não contado como prova de mutação.
- **Smoke local mock**: `default`, **433×762, DPR ~2.81**, touch/pointer coarse confirmados;
  caches estáticos limpos antes de ler arquivos atualizados. Finanças: conteúdo raiz, extrato
  aberto, foco/hash/scroll preservados após refresh; Alunos: edição preenchida permanece
  aberta/focada e refresh retorna adiamento; Home: modo Dia/data/semana/hash preservados.
  Sem overflow horizontal nos três casos. Cliques reportaram timeout apesar de ação
  observável no snapshot; demais verificações via DOM. Sem alegar teste de TalkBack.
  Mock bloqueia caches/escritas: persistência e reload com caches são prova do harness,
  não desse smoke. Ping localhost:5000 recusado e renovação GCal bloqueada permanecem esperados.
- **Encontrado, não alterado**: integração/retomadas e dono do rótulo aguardam D2/D3;
  consolidação GCal permanece 2.2; validade/efeito lazy dos GETs e limites CRUD do C intactos.
  Foco só pode permanecer no controle correspondente se registro/ciclo continuar existindo;
  não se cria alvo artificial para registro removido. Teclado/TalkBack e aceite ponta a ponta E
  ainda não validados. `router.refreshCurrentView` genérico mantido, sem consumidor no bootstrap.
- **Não realizado**: D2/D3/E, novas dependências, auth/GCal/cascata/motor/conflitos/backend,
  commit, push, merge, deploy ou API/dados de produção. **B2 continua desligado.**

## 14. Registro da execução do cartão D2 — 06/10

- **Branch/base**: `docs/planejar-sync-boot`, D1 commitado em `2a795fd`, árvore inicialmente
  limpa/upstream próprio. Continuidade confirmada pelo dono antes das escritas.
- **Arquivos alterados**:
  - `assets/js/app/coordenador-sync-boot.js` (novo): módulo inerte; início explícito
    instala observação de contexto/sessão/interação, conexão e leituras. Estados
    pendente/em-voo/aplicado por contexto, uma aplicação por geração de conta, abort/descarte
    durante edição, pendência local bloqueia. Falha/401/timeout preservam cache e esperam
    evento pertinente, sem retry por fechamento de form. Recibo compatível atende cota;
    resultado de escrita/adoção ou anterior à interação não atende. Complemento falho não
    repete batch aplicado. Manual aguarda reserva completa e faz leitura própria.
  - `assets/js/storage.js`: contrato de observação/recibo/reserva, sem rede ao registrar;
    reserva da carga existente abrange obtenção **e aplicação**. Registro/encerramento do
    pedido manual também notifica observadores. Rótulo por identificador/contexto de voo;
    término antigo só remove seu aviso, sem apagar outra leitura. Sem alterar cálculo,
    migração/CRUD, autenticação ou significado do botão manual entregue no C.
  - `index.html`: carrega coordenador após storage/contexto/mock; **não chama `iniciar`**.
    `tests-frontend/index-html-ordem.test.js`: pares de dependência storage/contexto→coordenador.
  - `tests-frontend/d2-coordenador-sync-boot.test.js` (novo): 30 testes com storage/contexto
    reais, rede/sessão/DOM sintéticos; eventos controlados sem polling. Cobrem inércia,
    cota por contexto, cache presente/vazio/ausente, edição/raízes/pendência, falhas/401/timeout,
    offline/login, A→B→A, recibos, complemento, prioridade/manual próprio e aviso por voo.
  - Plano vivo e `docs/roadmap.md`: recorte D2 detalhado e entrega parcial registrada.
- **Suítes medidas**: frontend **226/226 antes → 256/256 depois**, zero falhas. Foco
  coordenador+manual+rótulo **48/48** (30 D2 + 18 existentes). **Backend não executado**:
  nenhum arquivo backend/shared ou harness backend alterado. Diagnósticos limpos e diff
  sem erro de whitespace; aviso CRLF do plano é preexistente, sem renormalização extra.
- **Revisão focada**: uma revisão read-only, sem auditoria ampla C/D1. Corrigido evento
  `online`/sessão recebido durante voo falho que ainda aguarda tarefa: versão da retomada
  conserva autorização para uma tentativa após o término. Complemento interrompido por
  nova edição registra `complementoPendente` no contexto atual, sem reabrir cota.
  Primeiro teste identificou intervalo entre obter/aplicar da carga existente: reserva
  estendida até a aplicação, testada pelo D2-13. Encerramento manual sem recibo ganha
  notificação própria, testada pelo D2-24. Sem dependência nova ou alteração sensível.
- **Provas por mutação**, seis alterações em dois grupos controlados:

  | Mutação | Assert próprio que falhou | Resultado do grupo | Restaurada |
  |---|---|---|---|
  | Retirar trava de cota aplicada | D2-02, D2-15 e D2-22 | 19 passam / 11 falham | sim |
  | Interação liberar falha real | D2-08 (HTTP/JSON/rede/401), D2-23 | mesmo grupo | sim |
  | Ignorar leitura principal em voo | D2-13 | mesmo grupo | sim |
  | Finally limpar todos os avisos | D2-18 e D2-20 | mesmo grupo | sim |
  | Retirar reserva B2 durante complementos | D2-16 | 27 passam / 3 falham | sim |
  | Falha sobrescrever evento recebido em voo | D2-21 online/sessão | mesmo grupo | sim |

  Todas as provas contabilizadas tiveram falha de assert. Restauração integral por edição,
  status/diff conferidos e suíte completa **256/256** após restaurar. Nenhuma mutação residual.
- **Smoke local de inércia**: mock `default` em **433×762, DPR ~2.81**, touch/pointer coarse
  confirmados; caches estáticos limpos antes do reload. App manteve `#tela-home`, sem
  overflow; coordenador presente com **ativo=false, estado=inativo**, nenhuma ligação
  ao boot. Aviso GCal de escrita bloqueada é do mock existente. Não iniciar coordenador
  no browser nesta rodada: execução/concorrência provadas no harness, ligação visual D3/E.
- **Encontrado, não alterado**: gatilhos existentes de login/retorno à aba/GCal ainda não
  foram integrados ao coordenador; D3 precisa verificar prioridade/recibo e custo financeiro
  nas três hashes. Recibo principal não certifica complementos nem término de GET lazy
  remoto. Rótulo depende de cache principal autorizado hidratado; aceite sobre diferentes
  combinações de cache financeiro/principal fica no D3/E. Não prometer cache multi-chave
  transacional ou proteção de conflito entre dispositivos. Teclado/TalkBack segue E.
- **Não realizado**: D3/E, ligação/ativação automática no boot, consolidar GCal/2.2,
  auth/cascata/motor/conflitos/backend, dependências, commit/push/merge/deploy ou dados/API
  de produção. **B2 permanece desligado no app.**

## 15. Registro da execução do cartão D3 — 06/10

- **Branch/base**: `docs/planejar-sync-boot`, D2 commitado em `60c46c7`, working tree limpo
  e upstream próprio. Dono autorizou explicitamente continuar na mesma branch no pedido.
- **Arquivos alterados**:
  - `assets/js/app/bootstrap.js`: listener de sessão registrado antes de initialize/whenReady
    e navegação; eventos durante abertura não iniciam leitura concorrente. B2 inicia após
    navegação inicial e oportunidade de apresentação por animation frame, sem await do batch
    ou da renovação GCal. Login aciona contexto novo pelo coordenador; financeiro permanece
    independente da falha principal. Retorno à aba usa B2 pendente ou pedido de refresh
    serializado quando a cota já aplicou; aguarda leitura/manual/edição, conserva pedido
    descartado por nova edição e refaz leitura nova ao liberar. Throttle/90s preexistentes
    mantidos; não há polling ou consolidação de GCal.
  - `assets/js/view-financas.js`: recibo de leitura bem-sucedida por contexto/interação/
    requestId, descartado ao iniciar nova leitura e invalidar conta. Só opção B2 reutiliza
    resultado concluído (inclusive vazio); cache de disco, falha, operação ou resposta
    anterior à edição não servem. Reuso de leitura em voo existente continua.
  - `assets/js/view-alunos.js` e `assets/js/storage.js`: propagam opção B2 ao financeiro
    complementar, preservando GET novo do manual/recuperação. Storage registra falha da carga
    inicial para B2 não repetir imediatamente 500/401 sem evento; sucesso/invalidação limpam
    registro. Nenhuma mudança em cálculos financeiros ou escrita/normalização de negócio.
  - `assets/js/app/coordenador-sync-boot.js`: render B2 identificado com `boot:true`;
    início pode herdar espera por evento após carga inicial falha. Mantém cota D2.
  - `tests-frontend/d3-boot-integracao.test.js` (novo): **32 testes** com bootstrap/router/
    contexto/storage/coordenador/inicializadores reais, rede fake; render complexo da grade
    é fronteira da fixture. Matriz 3 hashes × cache presente/vazio/ausente, financeiro
    concluído/em voo/falho/vazio, login cedo/troca/sem sessão, remoto vazio, offline/falha,
    edição/navegação/manual, retorno à aba antes/depois da cota e durante complemento.
  - `tests-frontend/d1-hidratacao-render.test.js`: coordenador fake explícito para continuar
    isolando D1; integração real testada no D3. `d2-coordenador-sync-boot.test.js`: removida
    expectativa histórica de ausência de ligação no bootstrap; módulo isolado continua inerte.
  - Spec Finanças §6.1.4, plano e roadmap: contrato aprovado e entrega parcial até D3.
    Sem relatório paralelo ou alteração de specs de cálculo/prazo.
- **Suítes medidas**: frontend **256/256 antes → 288/288 depois**, zero falhas. Integração
  D3 final 32/32; foco D1+D2+D3 **91/91**. **Backend não executado** nesta rodada:
  nenhum backend/shared/harness backend alterado. Diagnósticos e diff-check limpos;
  avisos CRLF dos arquivos preexistentes registrados sem renormalização fora do escopo.
- **Revisão focada**: uma exploração curta e uma revisão read-only. Revisão apontou
  retry imediatamente após falha inicial e retorno perdido quando principal já aplicado
  aguardava complementos; ambos corrigidos e testados. Acrescentado pedido novo após
  retorno descartado por edição (D3-19). Não reiniciar auditoria C/GCal.
- **Provas por mutação**, cinco alterações em dois grupos, restauradas por edição:

  | Mutação | Assert próprio que falhou | Resultado do grupo | Restaurada |
  |---|---|---|---|
  | Desativar reuso financeiro concluído | D3-01 Alunos/Finanças, D3-03/04/14 | 14 passam / 18 falham | sim |
  | Ignorar falha inicial no início B2 | D3-17 quatro casos 500/401 | mesmo grupo | sim |
  | Descartar retorno durante complemento B2 | D3-18 | mesmo grupo | sim |
  | Não conservar pedido descartado por edição | D3-19 | mesmo grupo | sim |
  | Iniciar B2 imediatamente sem frame | D3-01 nove casos de apresentação | 22 passam / 10 falham | sim |

  Todas provas contadas por assert, não timeout. Patch de restauração inicialmente fora
  de ordem recusado sem mudanças; corrigido na ordem do arquivo. Após restauração integral,
  status/diff conferidos e suíte completa **288/288**. Nenhuma mutação residual.
- **Smoke mobile somente mock**: `default`, **433×762, DPR ~2.81**, touch/pointer coarse
  confirmados, cache estático limpo. Reload real de Home/Alunos/Finanças preservou hash e
  apresentou coordenador **ativo=true, estado=aplicado, emVoo=false**, quatro alunos/cards
  pertinentes, sem overflow horizontal. Home/Alunos aproveitaram recibo da carga inicial;
  Finanças recebeu batch principal remoto. Mock bloqueia persistência normal: cache stale/
  reload/contagem GET são provados no harness, não nesse smoke. Ping localhost:5000 recusado
  e aviso GCal bloqueado são preexistentes/esperados; nenhuma API ou escrita de produção.
- **Encontrado, não alterado**: barreira de navegação inicial ainda espera GET próprio de
  Finanças; cache é apresentado durante essa espera e o batch principal começa depois,
  sem acrescentar GET financeiro. Consolidação GCal/2.2, ETag, CRUD entre dispositivos e
  atomicidade de localStorage não resolvidos. Matriz visual ampliada/com cache sintético,
  TalkBack/teclado e aceite E ainda pendentes. Não considerar smoke prova de Google/Mongo real.
- **Não realizado**: E/fechamento integral da 2.4, mudança auth/GCal/cascata/motor/conflitos/
  backend, dependências, commit/push/merge/deploy. **B2 ligado no código local; publicação pendente.**

## 16. Registro da execução do cartão E1 — 06/10

- **Branch/base**: `docs/planejar-sync-boot`, D3 commitado em `a42cb54`, árvore inicialmente
  limpa/upstream próprio. Dono autorizou mesma branch e somente E1; pode testar mock local
  enquanto se prepara infraestrutura, não produção.
- **Arquivos alterados**:
  - `mocks/ui-runtime/sandbox.js` (novo): instala facade `localStorage` antes dos consumidores
    e barreira de `fetch` antes de acessar disco. Não lê/apaga/copía cache real; backing nativo
    apenas no namespace `ui_mock_runtime_v1:<cenário>`, com whitelist de dados sintéticos.
    Cenários B2 persistem envelope/dono/pendência e sessão A/B; cenários antigos por padrão
    só memória. Não persistir token/código/credencial, não mudar Storage.prototype/sessionStorage.
    API/ping/Google nunca delegam; somente recursos não-API externos seguem fetch normal.
  - `mocks/ui-runtime/mock-runtime.js`: substituído patch/limpeza nativos pelo sandbox;
    seeds uma única vez, reload respeita aplicação/adoção/clear. Sessão mutável A/B e listeners
    com unsubscribe/header/logout; falha ao persistir sessão não deixa UI incoerente em memória.
    Normaliza Request/method/body, captura store antes de await e respeita abort antes de
    mutação; escrita opt-in continua somente default/store memória. Auth/GCal sempre 409.
    Offline/online, HTTP 400–599, JSON inválido, latência, retenção/liberação e abort com
    contagem `{id, rota, method, estado, status}`, sem headers/query/corpo. Alteração de cenário
    preserva hash; retirado desvio artificial à Home quando runtime instalado com shell existente.
  - `mocks/ui-runtime/scenarios.js`: seis cenários B2 com cache `CACHE — …` distinto de
    resposta `ATUAL — …`; cache vazio, servidor vazio, sem sessão, outra conta e pendência
    não confirmada sintética. Fixtures default não alteradas nem lógica financeira reescrita.
  - `index.html`: sandbox antes do logger e dos consumidores de storage/identidade.
    `tests-frontend/index-html-ordem.test.js`: pares explícitos sandbox→logger/contexto/storage/runtime.
  - `tests-frontend/e1-mock-runtime.test.js` (novo): 30 regressões com sandbox/runtime reais,
    backing fake de JSDOM e fetch nativo stub; nenhuma rede real. Formatos de cache/pendência
    consumidos por contexto/storage reais. Abrange isolamento/inércia, reload/seed/sessão,
    Request/conta/abort, controles de rede, store opt-in e contadores sem credenciais.
  - `mocks/ui-runtime/README.md`: URLs, flags, cenários, controles/runtime e limites. Plano
    e roadmap recebem a divisão E1→E2→E3 e este registro; sem relatório paralelo.
- **Suítes medidas**: frontend **288/288 antes → 318/318 depois**, zero falhas. Foco mock
  inicial 28/28 (23 novos+5 carga), revisão 33/33; final inclui 30 novos. **Backend não
  executado**: nenhuma regra/backend/shared/harness mudou, controle final previsto E3.
  Diagnósticos e diff-check limpos. Duas comparações iniciais entre arrays de realms VM
  falharam por identidade de protótipo; normalizadas somente no harness, sem afrouxar produção.
- **Revisão**: uma exploração curta e uma revisão read-only, sem reauditar A–D3. Corrigidos
  Request assíncrono escrevendo store da conta seguinte, conta persistida restaurando default
  incorreto e transição de sessão interrompida por QuotaExceededError. Acrescentados testes
  específicos; abort também encerra stream de corpo Request ainda pendente.
- **Provas por mutação**, seis mudanças contadas por asserts e restauradas:

  | Mutação | Assert que falhou | Resultado do grupo | Restaurada |
  |---|---|---|---|
  | Fallback de facade ler storage normal | E1-02 | 22 passam / 7 falham | sim |
  | Whitelist permitir gis_session_cache | E1-03/E1-23 | mesmo grupo | sim |
  | Reseed ignorar envelope já semeado | E1-05/E1-07/E1-10 | mesmo grupo | sim |
  | Request perder store capturado após troca | E1-24 | 0 passam / 1 falha | sim |
  | Barreira API/Google delegar fetch nativo | E1-11 | 0 passam / 2 falham | sim |
  | Retirar listener abort durante latência | E1-30 | mesmo grupo | sim |

  Mutações de rede executadas exclusivamente no harness com fetch nativo stubado; browser
  aberto somente após restauração integral. Busca/status/diff conferidos e suíte final
  **318/318**, sem mutações residuais. Listener abort retirado preliminarmente também foi
  restaurado sem contá-lo como prova antes do E1-30 (evitar teste retido sem término).
- **Smoke de infraestrutura mock**: página própria (sem navegar a página que o dono testava),
  `b2CacheAntigo&mockReter=1#tela-alunos`, **433×762, DPR ~2.81**, touch/coarse confirmados.
  Cache sintético apresentado; contador mostrou ping bloqueado e GETs retidos; liberar
  respostas avançou para `ATUAL — …`, estado aplicado/sem pendentes. Reload conservou dados
  atualizados e hash, sem reseed/overflow. GCal 409 permanece simulado; nenhum ping backend
  real enviado nesta abertura. Não declarar matriz E2 ou teclado/TalkBack completos.
- **Encontrado, não alterado**: mock usa payloads financeiros demonstrativos, não regra real;
  store remoto de escrita default não persiste no reload e abort pós-mudança simulada não
  desfaz gravação. Controles de rede runtime não persistem (query flags reaplicam no reload).
  Envelope por cenário precisa reset explícito para repetir seed; não é backup de dados reais.
  E2 deve medir contagem/campos/foco/viewport nas três hashes e E3 medir controle backend.
- **Não realizado**: E2/E3/fechamento da 2.4, alteração de regras/app/auth/GCal/backend,
  novas dependências, commit/push/merge/deploy ou acesso a dados reais. B2 local continua ligado.