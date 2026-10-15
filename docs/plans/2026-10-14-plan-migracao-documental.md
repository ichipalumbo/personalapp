# Plano vivo — Migração e reconciliação documental

> **Status**: Em execução · **Criado**: 2026-10-14 · **Atualizado**: 2026-10-14
> **Responsável**: GitHub Copilot · **Dono das decisões**: dono do repositório
> **Branch**: `docs/auditoria-roadmap`; working tree limpo na abertura.
> **Origem**: [auditoria documental](../archive/diagnostics/2026-10-14-diag-arquitetura-documentacao.md) e [governança vigente](../README.md).

## 1. Objetivo

Incorporar conhecimento útil ainda ausente nas fontes vivas apropriadas e reconciliar incoerências documentais comprovadas, com rastreabilidade por trecho e sem alterar comportamento do produto ou reescrever seu histórico.

## 2. Autorização e limites

| Decisão | Origem | Efeito |
|---|---|---|
| Continuar na branch atual | Resposta do dono em 2026-10-14 | Não criar branch nem executar operações de publicação |
| Começar pelo roadmap e fontes vivas | Resposta do dono em 2026-10-14 | Triagem incremental, transferência de conhecimento ausente e reconciliação documental comprovada |
| Preservar roadmap antigo, registros fechados, reports/archive e kit | Resposta do dono em 2026-10-14 | Somente leitura dessas fontes; sem exclusão, renomeação ou atualização retroativa |
| Não alterar regras de produto nem código | Resposta do dono em 2026-10-14 | Divergência que exija decisão de comportamento será registrada como bloqueio, não resolvida por inferência |
| Adotar `roadmap-v1.md` após a renomeação feita pelo dono | Confirmação durante o primeiro incremento, 2026-10-14 | Ajustar os ponteiros vivos, sem restaurar `roadmap.md` nem sobrescrever o conteúdo atual |
| Adotar `lessons-learned.md` após a renomeação feita pelo dono | Confirmação durante o primeiro incremento, 2026-10-14 | Preservar a transferência já incorporada e ajustar referências vivas; alterações paralelas em registros antigos não são trabalho do agente |
| Continuar a migração e depois arquivar o material sem manutenção | Pedido e confirmação do dono na continuação de 2026-10-14 | Executar primeiro as transferências/reconciliações comprovadas e depois a organização histórica |
| Arquivar planos encerrados, diagnósticos concluídos, reports e roadmaps v1/v2 | Confirmação do dono nesta continuação | Exceção controlada ao congelamento anterior: mover os arquivos e ajustar caminhos de links sem reescrever conclusões históricas; não presumir fechamento de caso ambíguo |
| Arquivar a cópia com o nome antigo `APRENDIZADOS.md` | Confirmação do dono nesta continuação | Preservar como referência histórica, mantendo `lessons-learned.md` como a única fonte viva |
| Manter fora de archive as fontes em manutenção | Conjunto confirmado pelo dono | Specs vigentes, roadmap v3, plano aberto, guias, referência viva e kit permanecem ativos |
| Arquivar também investigações antigas e o plano inicial de reposições com estado ambíguo | Confirmação do dono nesta continuação | Preservar como históricos com ressalva no índice do arquivo; arquivamento não certifica conclusão de suas pendências |
| Continuar na branch atual após o commit da organização histórica | Confirmação do dono na retomada de 2026-10-14 | Retomar os recortes pendentes deste plano, sem reabrir os históricos |
| Preservar cópias das três specs antes de separar histórico e contrato | Confirmação do dono nesta retomada | Cópias históricas em `archive/spec-history/`; `docs/specs/` permanece a única fonte vigente. Não alterar regra, código ou dados por inferência |
| Cobrança da reposição editável enquanto o ciclo responsável não estiver pago | Decisão do dono nesta retomada, 2026-10-14 | Manter a edição existente e o bloqueio após pagamento; não apresentar a escolha como irreversível desde o envio |
| Falha parcial/desconhecida conserva pendência para recuperação explícita | Decisão do dono nesta retomada, 2026-10-14 | Manter política de Finanças/B2, sem replay geral ou compensação remota cega; não implementar novo rollback automático |
| Reconciliar o plano de fluxos UX reaparecido com a cópia arquivada | Confirmação do dono nesta retomada | Comparar conteúdo antes de agir; preservar a versão histórica canônica e não reabrir seus cartões. A comparação confirmou equivalência descontando links/caminhos |
| Corrigir o rodapé e continuar a documentação | Confirmação do dono nesta rodada | Exceção pontual ao escopo anterior sem código: alterar o texto da UI, proteger no teste existente e validar no mock; não alterar handlers, cálculo ou gravação |
| Explicitar a exceção restrita de limpeza de órfã de envio avulso falho | Confirmação do dono nesta rodada | Preservar registros de negócio; DELETE idempotente por ownerEmail e best-effort apenas no caso previsto, sem ação geral, extensão a outros fluxos ou compensação cega |

O [roadmap oficial](../roadmap-v3.md) continua como índice. Não usar este plano como depósito de todo o texto retirado de fontes anteriores: históricos e duplicações podem permanecer apenas na origem preservada.

## 3. Critérios da frente

- [x] Cada trecho trabalhado no primeiro incremento tem origem, classificação, destino e resultado registrados.
- [x] Informação incorporada acrescenta conhecimento ao destino, não apenas um link novo.
- [x] Duplicação já coberta e material somente histórico são classificados, sem cópia desnecessária.
- [x] Incoerências corrigidas têm evidência local e não mudam contrato de produto por inferência.
- [x] Preservação e validação final do primeiro incremento, descontando as alterações do dono identificadas durante a execução.
- [ ] Fechamento de todos os recortes da frente; os itens deste checklist já concluídos não significam migração completa.

## 4. Cartões

| Cartão | Resultado esperado | Estado |
|---|---|---|
| T01 | Comparar trechos do roadmap com as fontes vivas e registrar a matriz de transferência | Parcial: MIG-01–MIG-20 classificados; os limites de revalidação funcional continuam explícitos |
| T02 | Incorporar conhecimento técnico pertinente em referência/manual, conciliando descrições antigas | Primeiro incremento realizado e validado; outros recortes podem exigir nova triagem |
| T03 | Reconciliar e migrar trechos de contrato/spec apenas com fundamento suficiente e sem mudança de regra | Trechos finais de Finanças/Reposições e seção 9 de GCal consolidados, com cópias históricas e decisões confirmadas. Revalidação funcional e outros trechos não examinados não foram declarados encerrados |
| T04 | Atualizar navegação e referências afetadas e declarar o que resta migrar | Concluído neste incremento: fontes vivas e arquivo histórico navegáveis, sem links locais ausentes |
| T05 | Validar cada incremento e registrar preservação e resultado | Incremento validado: links, contratos preservados, diagnósticos, diff e ausência de temporários |
| T06 | Arquivar o conjunto confirmado e corrigir navegação | 40 movimentos executados e verificados; conteúdo preservado descontando caminhos; casos ambíguos identificados no índice histórico |

## 5. Matriz de transferência

Usar uma linha por trecho significativo, não por arquivo inteiro. Classificações: contrato durável, procedimento, aprendizado, execução histórica, duplicação ou bloqueio por decisão/evidência.

| ID | Origem / trecho | Classificação | Destino responsável | Resultado e prova |
|---|---|---|---|---|
| MIG-01 | [Roadmap v1, 0.12/3.5](../archive/roadmaps/roadmap-v1.md): recortes de cobertura e seus limites | Procedimento/aprendizado | [Manual §7](../setup-ambiente-local.md) e [Aprendizados §5](../reference/lessons-learned.md) | Incorporados testes de render do Dia, bandas/bordas, conflitos e modais; preservados limites de pixels, clipping, variantes e integração. Quatro arquivos de teste conferidos; sem nova contagem de suíte |
| MIG-02 | [Roadmap v1, 0.3](../archive/roadmaps/roadmap-v1.md): seletores preservados e uso dinâmico | Aprendizado | [Aprendizados §3.1–§3.2](../reference/lessons-learned.md) | Uso dinâmico já existia na §3.1; não duplicado. Incorporada a decisão de preservar os dois seletores por falta de evidência, retirando a classificação categórica de “CSS órfão real” |
| MIG-03 | Aprendizados 1.5 e governança: versões copiadas em outras fontes | Reconciliação documental | [Aprendizados §1.5](../reference/lessons-learned.md) | Retirados números copiados e a alegação de risco atual sem verificar índice/instruções. Registrado o controle vigente, sem encerrar os demais riscos |
| MIG-04 | [Roadmap v1, 3.2–3.4](../archive/roadmaps/roadmap-v1.md), manual e configuração real | Procedimento/reconciliação | [Manual, abertura e §7–§8](../setup-ambiente-local.md) | A execução de backend/banco já estava documentada, não foi copiada. Reconciliados hostname versus `.env`, separação API/banco e os dois links; configuração dos quatro hosts conferida no código, sem acessar banco/GCal |
| MIG-05 | [Roadmap v1, 5.7](../archive/roadmaps/roadmap-v1.md), registro da Etapa 7 e fonte atual | Aprendizado/reconciliação | [Aprendizados §3.3](../reference/lessons-learned.md) | Substituído o alerta antigo de animações pela lição vigente de cascata e liberação sem `animationend`; bloco CSS e caminho JS conferidos, sem declarar novo aceite visual |
| MIG-06 | [Roadmap v1, 3.5](../archive/roadmaps/roadmap-v1.md): loader `vm`, `window === globalThis` e pasta separada | Duplicação já coberta | [Manual §7](../setup-ambiente-local.md) | O procedimento já existia no destino e o carregador atual o confirma. Mantido sem nova cópia; retiradas apenas as contagens/listas de cobertura obsoletas |
| MIG-07 | Renomeações do dono: roadmap histórico e referência de aprendizados | Roteamento, não migração de conteúdo | [Índice](../README.md), [v3](../roadmap-v3.md), manual, instruções e mapa da raiz | Nomes adotados após confirmação; specs apontam ao backlog oficial v3, não ao histórico v1. Nenhum registro encerrado foi reescrito pelo agente |
| MIG-08 | Instruções §5/§9/§10 versus testes existentes e [roadmap v1, 0.12](../archive/roadmaps/roadmap-v1.md) | Reconciliação documental | [Instruções permanentes](../../.github/copilot-instructions.md) | Corrigidas as alegações de `jsdom` ocioso e ausência genérica de testes de views/modais/conflitos; mantida a exigência de validação visual e de prova dos recortes efetivamente exercitados |
| MIG-09 | Roadmap 1.3, plano inicial de reposições/observações e testes existentes | Contrato durável antes disperso | [Spec de observações](../specs/alunos-observacoes.md) | Consolidado comportamento opcional por aluno, edição/persistência, bloco condicional e texto escapado; três casos de teste existentes conferidos, sem implementação nova |
| MIG-10 | Reposições §9.4 e referência de notificações no fora de escopo | Reconciliação editorial | [Spec de Reposições](../specs/reposicoes-e-competencia.md) | Removido “PENDENTE” do contrato já entregue, sem alterar os requisitos; notificações apontam ao ID 4.2, sem mudança de escopo |
| MIG-11 | Finanças §12.2/§12.4 versus entregas 0.3/0.4 e fonte viva | Reconciliação editorial | [Spec de Finanças](../specs/financas-ciclo-cobranca.md) | Limpeza entregue distinguida dos candidatos preservados; nota de árvore antiga substituída pela condição vigente e pela cautela com artefatos gerados |
| MIG-12 | Etapas mobile 5.1–5.8 e contratos registrados nos planos anteriores | Contrato durável antes disperso | [Spec de interface](../specs/interface-e-navegacao.md) | Consolidados navegação/hash, diálogos/foco, cards/bandas, acessibilidade e feedback; exceções de publicação e resíduo 5.9 preservados; sem criar regra nova ou depender de plano como fonte normativa |
| MIG-13 | Planos/diagnósticos anteriores, reports, roadmaps v1/v2 e referência antiga | Arquivamento autorizado, não conclusão de pendências | [Índice histórico](../archive/README.md) | 40 arquivos movidos; 77 históricos no conjunto, além do novo índice; links/caminhos atualizados mecanicamente e corpo comparado antes/depois descontando apenas esses caminhos |
| MIG-14 | Três specs na base da retomada após o commit | Preservação anterior à extração | [Histórico das specs](../archive/spec-history/README.md) | Cópias conferidas byte a byte antes das mudanças; depois somente dois destinos de links de Finanças foram ajustados. Corpo histórico comparado descontando links |
| MIG-15 | GCal §9, cronologia de correções e medições, mais enquadramento antigo de objetivo/prioridade | Separação entre contrato, histórico e limite de evidência | [Spec GCal](../specs/gcal-sync.md) e cópia histórica | 26 subseções preservadas sem duplicação; retirados relatos de rodadas, contagens e amostra de execução. Mantidos COUNT/EXDATE, propriedade, cortes, confirmação, idempotência/best-effort, pendência de boot e limite de I/O |
| MIG-16 | Rodapé e §11.2–§11.3/§13 de Reposições | Decisão confirmada e consolidação de limites | [Spec de Reposições](../specs/reposicoes-e-competencia.md) | Cobrança editável até pagamento e recuperação explícita confirmadas pelo dono; cobertura/cronologia preservadas no histórico. Regras centrais de prazo/competência inalteradas; texto antigo da UI sinalizado |
| MIG-17 | Finanças §12, relatos de dívida/correção versus requisitos de arquitetura/expansão | Consolidação do contrato e cautelas | [Spec de Finanças](../specs/financas-ciclo-cobranca.md) | Requisitos do compartilhamento e expansão preservados; retirado enquadramento de cronologia/backlog. Regras financeiras e contratos de rede centrais idênticos à entrada |
| MIG-18 | Plano UX reaparecido fora do archive | Reconciliação de duplicata autorizada | [Plano histórico canônico](../archive/plans/2026-10-13-plan-melhorias-fluxos-ux.md) | 556 linhas equivalentes após normalizar links e caminhos históricos, sem conteúdo novo. Duplicata retirada da área ativa e cópia arquivada preservada; nenhum cartão reaberto |
| MIG-19 | Rodapé contraditório de cobrança e contrato de edição antes do pagamento | Correção pontual de UI autorizada | [HTML](../../index.html), [teste do modal](../../tests-frontend/modal-acao-slot.test.js) e [spec de Reposições](../specs/reposicoes-e-competencia.md) | Texto alinhado, asserção no markup real; focado 14/14, mutação 13 pass/1 fail esperada e restauração 14/14; suíte frontend 420/420 antes e depois, mock nos três viewports |
| MIG-20 | Reposições decisão 15 versus limpeza excepcional de GCal 9.27 | Clarificação documental confirmada | [Reposições 13.1](../specs/reposicoes-e-competencia.md) e [GCal 9.27](../specs/gcal-sync.md) | Registros de negócio preservados; exceção restrita à órfã de envio avulso que falhou. Sem exclusão geral, extensão de escopo ou alteração de runtime da limpeza |

## 6. Validação

- Capturar hashes da documentação de entrada e dos arquivos de produto/protegidos antes das transferências.
- Verificar no destino o conteúdo efetivamente incorporado, distinguindo texto novo de material que já existia.
- Validar destinos dos links e diagnósticos dos arquivos tocados; conferir o diff e a lista de arquivos modificados.
- Não executar operação em Mongo/GCal, servidor de produção ou escrita remota. Testes de produto não serão atribuídos a uma validação documental que não os executou.
- Não anunciar migração completa por ter criado a matriz ou atualizado referências.

## 7. Registro da execução

### 2026-10-14 — Abertura

- Dono confirmou branch atual e recorte de roadmap/fontes vivas, com originais e históricos preservados.
- Criado este plano de continuidade; diagnóstico e plano encerrados da auditoria não foram reabertos.
- Primeiro incremento definido: conhecimento técnico de cobertura/testes, CSS e ambiente; casos de contrato sensíveis serão tratados separadamente se houver evidência e autorização suficientes.
- Nenhuma transferência é marcada como concluída nesta abertura. Conteúdo, comparações e provas serão registrados nas linhas MIG e nos incrementos abaixo.

### 2026-10-14 — Primeiro incremento: conhecimento técnico e fontes vivas

- **Transferência real**: acrescentados em Aprendizados o cuidado com os seletores preservados por segurança e o limite entre cobertura de lógica/DOM e validação visual; no manual foram incorporados os recortes de render/conflitos/modais e seus limites. Não foi só atualização de links.
- **Reconciliação**: referências antigas de versões, animações, cobertura, dependências de carga e escolha de API foram confrontadas com governança, registros anteriores e código/testes. Nenhuma regra financeira, recorrência, autenticação ou sincronização foi alterada.
- **Duplicação evitada**: funcionamento do loader `vm`, identidade de `window/globalThis`, separação da pasta de testes e preparação do ambiente já tinham texto no manual. Mantidos os procedimentos em vez de copiar novamente a descrição do roadmap.
- **Primeiras checagens passaram**: conteúdo de destino verificado, hosts conferidos em `api-config.js`, quatro testes citados existentes, dois links originais do manual corrigidos e hashes dos 131 arquivos de produto/teste monitorados preservados.
- **Renomeações em paralelo**: o dono removeu o nome `roadmap.md` e criou `roadmap-v1.md`; seu hash não era idêntico à base inicial. Após confirmação, a versão atual foi adotada sem restauração. Depois, o dono renomeou Aprendizados para `lessons-learned.md`; a transferência permaneceu no novo arquivo e o nome foi confirmado.
- **Outras alterações do dono preservadas**: surgiram mudanças no diagnóstico da arquitetura documental, no plano de validação da Etapa 7 e no EXPORT de práticas. O agente não as realizou nem as reverteu. Seus hashes atuais e o do v1 foram capturados para a checagem final; não serão apresentados como documentos byte a byte iguais à abertura.
- **Ponteiros**: índice, roadmap v3, instruções e mapa da raiz adotam os nomes confirmados. Finanças e GCal apontam ao v3 como backlog oficial; versões/cabeçalhos e contratos permanecem inalterados. A introdução da seção de débitos financeiros foi contextualizada como registro de itens/correções/limites, sem concluir os débitos remanescentes.
- **Validação sobre a base adotada**: oito fontes vivas conferidas, **114 links locais válidos**, 50 IDs do roadmap preservados e conteúdo transferido mantido no arquivo renomeado. A checagem das renomeações não é prova de preservação da cópia de entrada anterior às alterações do dono.
- **Falhas das checagens intermediárias**: dois testes documentais de existência de caminho falharam durante as renomeações concorrentes; o trabalho foi interrompido para conferir o Git e confirmar o tratamento com o dono. Não eram falhas de produto ou razão para restaurar os arquivos antigos.
- **Escopo de edição do agente**: referência de aprendizados (no nome original antes da renomeação do dono), manual, índice, v3, instruções, mapa do README da raiz, dois ponteiros de specs e este plano. Não foi movido conteúdo para reports/archive nem reaberto plano/diagnóstico encerrado.
- **Suítes de produto**: não executadas, pois só houve migração/reconciliação documental. Não se atribuem novas medições, mutações, aceite de UI, operações remotas ou publicação a esta rodada.

### 2026-10-14 — Encerramento técnico do primeiro incremento

- Matriz conferida: **8 registros MIG**, com **19 links de origem/destino existentes**; conteúdo incorporado e descrições reconciliadas verificados nos destinos. Nenhum desses números representa cobertura de todos os trechos do roadmap.
- Preservação confirmada: **47 históricos congelados** e **131 arquivos de produto/teste monitorados** com hashes de entrada; as **4 fontes protegidas adotadas após as alterações do dono** mantêm os hashes dessa adoção.
- Verificação dos nove artefatos editados/criados pelo agente com `get_errors`: nenhum diagnóstico. `git diff --check` passou; Git informou avisos de normalização CRLF/LF, sem erro de whitespace.
- Revisão do diff das specs: somente ponteiros de backlog, contextualização do registro financeiro e indentação normalizada de uma continuação Markdown; nenhum contrato ou cabeçalho de versão alterado. A continuação de lista em GCal foi conferida com os quatro espaços efetivamente mantidos pelo editor.
- Varredura documental de encerramento: **349 links locais verificados**, **2 destinos ausentes** em registros encerrados — diagnóstico da arquitetura documental, linha 92, e plano B2, linha 5, ainda apontando ao nome antigo do roadmap. Permanecem registrados, sem edição retroativa pelo agente.
- O arquivo com o nome anterior `docs/archive/reference/APRENDIZADOS.md` reapareceu no working tree durante as validações. Não foi apagado pelo agente. A referência viva adotada por confirmação do dono continua sendo `docs/reference/lessons-learned.md`; o reaparecimento não foi tratado como autorização para uma nova poda.
- **Resultado deste incremento**: MIG-01/MIG-02 incorporam conhecimento que faltava no destino; MIG-03/MIG-04/MIG-05/MIG-08 reconciliam descrições com evidência; MIG-06 evita duplicação; MIG-07 mantém o roteamento dos nomes adotados. Revisão e integração continuam com o dono, sem commit/push pelo agente.

## 8. Pendências e fechamento

Frente em execução. O primeiro incremento técnico não conclui M01–M03 para toda a documentação. Permanecem pendentes a triagem dos demais trechos do roadmap e das specs, a reconciliação de estados como o título “PENDENTE” de Reposições §9.4 e a confirmação de riscos antigos não revalidados. Nenhum desses itens foi marcado como migrado apenas por apontar a uma fonte.

**Autorização posterior para organização histórica**: o dono confirmou a movimentação dos planos encerrados, diagnósticos concluídos, reports, roadmaps v1/v2 e referência antiga para `archive/`, com ajustes de links. Essa exceção substitui o impedimento anterior de movimentar esse conjunto; não autoriza reescrever conclusões, podar evidências ou encerrar trabalho sem prova. Código, kit e demais exportáveis continuam fora da edição de conteúdo. As alterações anteriores do dono serão preservadas.

**Próximo recorte**: triagem de conteúdo durável e estados documentais nas specs, separando o que já está coberto, o que falta incorporar e o que depende de decisão/evidência adicional. Não corrigir o título ou copiar uma regra antiga apenas para fazer fontes concordarem; a spec vigente e a decisão aprovada continuam prevalecendo.

### 2026-10-14 — Consolidação de contratos e organização histórica

- **Decisões novas do dono**: continuar na mesma branch; autorizar movimentação de históricos com ajuste de caminhos; incluir a cópia antiga de Aprendizados e os casos antigos de status ambíguo, sem afirmar conclusão de suas pendências. A autorização superou o bloqueio de movimentação, não o compromisso de preservar conteúdo.
- **Contratos promovidos**: nova spec de observações por aluno, confrontada com três casos de teste existentes; nova spec transversal de interface/navegação, consolidando decisões já aprovadas. Specs não dependem de planos/históricos para definir comportamento; provas e origem das decisões permanecem nesta matriz e no arquivo.
- **Reconciliação editorial**: retirado o rótulo “PENDENTE” de Reposições §9.4 e corrigido o ID de notificações; em Finanças, limpeza de CSS entregue foi distinguida de seletores preservados e a nota de documentação antiga foi contextualizada. Nenhuma regra nova de produto ou implementação.
- **Proteção de dinheiro**: seção 5 de Finanças conferida contra o HEAD por leitura UTF-8 explícita, com **8.879 caracteres de regras idênticos**. A primeira comparação via decodificação do terminal não foi usada como evidência; não se alterou regra para satisfazer um validador.
- **Arquivamento executado depois desses incrementos**: 10 reports → `archive/reports/`; 15 planos → `archive/plans/`; 12 diagnósticos → `archive/diagnostics/`; 2 roadmaps → `archive/roadmaps/`; 1 referência substituída → `archive/reference/`. Os 37 históricos já em archive permaneceram no conjunto.
- **Preservação**: automação temporária criou uma prévia sem escrita e depois moveu os 40 arquivos, ajustando destinos de links e referências de caminho. Comparação de conteúdo antes/depois descontando esses caminhos passou para todos os documentos processados. Não foram apagados resultados, hipóteses, decisões ou limitações; a movimentação não certifica os fechamentos ambíguos.
- **Portão imediato**: 40 destinos confirmados, origens ausentes e 355 links locais de docs válidos após a operação; 143 arquivos de produto/teste monitorados permaneceram com os hashes de entrada. Foram corrigidos também os dois links antigos pendentes pela nova resolução para o v1 arquivado.
- **Navegação/governança**: criado `archive/README.md`, atualizado o índice ativo, mapa da raiz e seção documental das instruções. Fora do arquivo permanecem contratos vigentes, guias, referência viva, kit e somente este plano de execução. Novos diagnósticos usam a pasta ativa quando necessários.
- **Publicação e limite**: a rodada não faz commit/push/merge, não executa suíte de produto ou validação visual/produção e não conclui débitos antigos apenas porque seus documentos foram arquivados. A automação temporária será removida após o uso; não entra como ferramenta permanente.

### 2026-10-14 — Validação final do incremento de archive

- **Estrutura medida**: 93 documentos Markdown em `docs/`; 77 históricos mais o novo índice em archive; 3 arquivos na raiz de docs e somente o plano de migração na área ativa de planos. Specs, guias, referência viva e kit permanecem fora do arquivo.
- **Links**: 374 destinos locais de docs verificados, sem ausências. Esta checagem não recertifica URLs externas nem o destino de cada âncora de seção.
- **Conteúdo e produto**: os 40 movimentos e o corpo descontando caminhos foram validados na operação; hashes dos 143 arquivos de produto/teste monitorados permanecem iguais à entrada. Os 50 IDs do roadmap foram preservados. Regra financeira da seção 5 idêntica à base, sem alteração de código ou dinheiro.
- **Diagnósticos/diff**: nenhum erro apontado nas fontes vivas criadas/alteradas; `git diff --check` passou com avisos de normalização CRLF/LF, não erros. A automação temporária foi removida e não há dependência nova.
- **Rastreabilidade**: 13 entradas MIG distinguem transferência de contrato, reconciliação, duplicação já coberta e movimentação de arquivo. O histórico foi preservado, não convertido integralmente em regra vigente.
- **Estado da frente**: o incremento solicitado de consolidação/arquivamento está entregue localmente. A frente permanece em execução apenas para os recortes pendentes abaixo; não se declara migração normativa completa ou conclusão de débitos antigos. Revisão e integração por PR ficam com o dono.

**Pendências que continuam ativas**: revalidar riscos antigos quando houver frente de intervenção; distinguir e, se necessário, extrair outros trechos mistos da spec de GCal e de Reposições sem perder contratos; reconciliar divergências funcionais somente com evidência/decisão apropriadas. O arquivamento e as consolidações desta rodada não são declaração de que todo o texto histórico virou requisito vigente.

### 2026-10-14 — Retomada após commit: extração dos trechos mistos

- Working tree limpo em `docs/auditoria-roadmap` na abertura; continuidade confirmada pelo dono. Instruções/índice atuais relidos; mudanças anteriores em governança e ambiente não foram revertidas.
- Criado `archive/spec-history/` por autorização específica, com as três cópias de entrada e um índice que declara sua autoridade histórica. As três cópias foram verificadas byte a byte antes de qualquer extração; a versão histórica de Finanças recebeu depois apenas dois destinos de link relativos corrigidos.
- O dono preferiu decidir as divergências antes da consolidação. Confirmou **edição de cobrança enquanto o ciclo responsável não estiver pago** e **pendência/recuperação explícita para falha parcial/desconhecida**. Essas decisões foram registradas e incorporadas aos contratos, sem alteração de runtime.
- A leitura do reagendamento distinguiu a gravação anterior ao PATCH da confirmação adicional pela ponte posterior ao PATCH. A hipótese inicial de simples inversão de ordem não foi usada como fato; a política de recuperação de Finanças §6.1.3 prevalece sobre relatos antigos de compensação.
- Consolidada a seção 9 de GCal: 26 IDs preservados e contratos centrais (RFC e blocos 3–8) idênticos à entrada. A seção não é mais saga ou contador de testes; pendência funcional do boot e limite de I/O real permanecem explícitos. A política de recuperação não executa nem autoriza compensação remota cega.
- Consolidado o final das specs de Reposições e Finanças; requisitos de prazo/competência, cálculos, rede e expansão preservados. Versões documentais atualizadas somente nos cabeçalhos das fontes; o índice não mantém um mapa duplicado de versões.
- **Iteração corrigida e provada**: a primeira substituição extensa de GCal duplicou seções e deslocou blocos. A validação detectou o problema antes de aceitação. O arquivo foi recomposto a partir da cópia íntegra e apenas trechos delimitados foram substituídos por automação temporária, validada em prévia e depois aplicada. O mesmo teste de numeração/contrato passou; o temporário foi removido.
- **Plano reaparecido**: a primeira varredura ampla encontrou link inválido no plano UX fora do archive. Após autorização do dono, as duas versões foram comparadas; diferenças eram apenas links e caminhos históricos. Preservado o arquivo canônico, retirada a duplicata, sem reescrever resultado ou criar fechamento retroativo.
- **Portões medidos até esta etapa**: 143 arquivos de produto/testes monitorados inalterados; cópias históricas preservadas descontando apenas links; 385 links locais de docs válidos antes de acrescentar esta rastreabilidade; área ativa com somente este plano. Suítes, UI real, Mongo, GCal e produção não executados nesta rodada documental.
- **Validação final da retomada**: 18 registros MIG e 390 destinos de links locais de docs válidos; nenhum diagnóstico nas fontes editadas e `git diff --check` sem erro de whitespace, apenas avisos CRLF/LF. Cópias históricas e blocos centrais conferidos; temporário removido. A frente permanece aberta para as pendências específicas abaixo, sem declarar correção de UI/runtime nem revalidação completa do produto.

#### Pendências específicas preservadas

| Pendência | Evidência/limite | Tratamento |
|---|---|---|
| Rodapé do modal afirmava irreversibilidade | Corrigido localmente nesta continuação; texto `Pode alterar antes do pagamento do ciclo.` protegido no markup real | Resolvido na branch, com mutação/testes e mock; publicação/aceite real continuam com o dono |
| Recuperação de todos os ramos legados não foi recertificada | Conferidos controller de cobrança, reagendamento e contrato B2; não executado todo fluxo composto | Não afirmar que todo ramo implementa a política em todas as falhas; revalidar em frente funcional |
| Regra genérica de nunca deletar versus limpeza excepcional de órfã | Exceção restrita confirmada pelo dono e explicitada em Reposições 13.1/GCal 9.27 | Divergência documental esclarecida; implementação de todos os ramos não foi recertificada e a exceção não autoriza ampliação de DELETE |
| Medições antigas e riscos datados | As cópias e demais históricos preservam evidência de época | Não converter relato em validação atual nem encerrar risco só por extrair texto |

### 2026-10-14 — Rodapé alinhado e exceção de órfã esclarecida

- Branch atual confirmada, working tree limpo na abertura. Dono autorizou a correção pontual da UI além da continuação documental; nenhuma alteração em cálculo, preço, prazo, ciclo pago, handlers ou gravação.
- `index.html`: substituída a mensagem de irreversibilidade pela redação `Pode alterar antes do pagamento do ciclo.`. `modal-acao-slot.test.js`: caso existente T01 passou a verificar também o rodapé real extraído do HTML, sem novo arquivo/harness.
- **Suíte frontend medida antes/depois**: **420/420 → 420/420**, exit code 0, sem falhas, cancelamentos ou ignorados; entrada TAP ~25,1 s, final ~44,9 s. A execução inicial terminou com código zero mas sem contagem capturada; repetida com `--test-reporter=tap`, sem usar números de documentação.
- **Focado e mutação**: 14/14 após o fix; recolocar somente a frase antiga produziu exit code 1, **13 pass e 1 fail**, precisamente no caso T01. Frase correta restaurada, focado 14/14 e `git status`/diff conferidos antes da validação visual. A contagem da suíte não aumenta porque foi acrescentada asserção a caso existente.
- **Mock**: servidor estático local na origem dedicada; referência 433×762/DPR 2.81, stress 320×568 e 390×844, com toque, ponteiro coarse e hover-none confirmados. Rodapé legível, sem overflow horizontal, dentro do modal, antes do botão Voltar e sem sobreposição; snapshots conferidos nos três tamanhos. Em 320px o texto quebra em duas linhas, sem clipping.
- **Cancelamento**: Voltar fecha o modal sem nova chamada ou escrita (0/0), com arrays de aulas/reposições intactos. Não foi escolhida opção de cobrança, criado registro, nem executada escrita em Mongo/GCal. O POST bloqueado de renovação GCal do boot pertence ao sandbox, não à ação de cancelamento.
- **Limites da automação**: abertura inicial do navegador falhou até o servidor estar ativo/URL básica carregar; clique na agenda abriu o diálogo mas o Playwright excedeu timeout. A inspeção foi concluída pelos handlers DOM do mock. Isso não é prova de gesto físico, TalkBack ou produção.
- **Continuação documental**: dono confirmou a exceção restrita de limpeza de órfã. Specs de Reposições/GCal agora distinguem preservação de negócio de DELETE excepcional, mantendo ownerEmail, idempotência, best-effort e recuperação explícita. Versões atualizadas apenas nos cabeçalhos; cópias históricas intocadas.
- **Não executado**: suíte backend, validação de todos os ramos legados de recuperação, deploy ou alterações no endpoint de DELETE. Código de backend/GCal, estilos e demais superfícies não foram modificados por esta correção.
- **Portão final**: cinco arquivos deste recorte sem diagnósticos; `git diff --check` sem erro, com aviso de normalização CRLF/LF. Matriz com 20 entradas MIG e 428 links locais de docs válidos na checagem medida. A contagem inclui documentos criados em paralelo e não é atribuição de autoria desta rodada.
- **Alterações paralelas preservadas**: índice, lessons-learned, roadmap e novos documentos de diagnóstico/identidade/OAuth surgiram durante a execução; não foram revertidos nem incluídos como trabalho do agente neste recorte. Escopo realizado: HTML do rodapé, asserção no teste existente, duas specs e este plano.
- **Situação**: divergência de texto do rodapé corrigida e exceção documental esclarecida localmente; publicação/aceite real com o dono. A frente continua aberta para os recortes remanescentes, sem afirmar prova funcional dos ramos não executados.