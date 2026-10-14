# Plano vivo — Migração e reconciliação documental

> **Status**: Em execução · **Criado**: 2026-10-14 · **Atualizado**: 2026-10-14
> **Responsável**: GitHub Copilot · **Dono das decisões**: dono do repositório
> **Branch**: `docs/auditoria-roadmap`; working tree limpo na abertura.
> **Origem**: [auditoria documental](../diagnostics/2026-10-14-diag-arquitetura-documentacao.md) e [governança vigente](../README.md).

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
| T01 | Comparar trechos do roadmap com as fontes vivas e registrar a matriz de transferência | Parcial: MIG-01–MIG-08 classificados; demais trechos ainda não encerrados |
| T02 | Incorporar conhecimento técnico pertinente em referência/manual, conciliando descrições antigas | Primeiro incremento realizado e validado; outros recortes podem exigir nova triagem |
| T03 | Reconciliar e migrar trechos de contrato/spec apenas com fundamento suficiente e sem mudança de regra | Pendente; nesta rodada as specs receberam somente ajuste de ponteiros/apresentação do backlog |
| T04 | Atualizar navegação e referências afetadas e declarar o que resta migrar | Ponteiros vivos atualizados; registros encerrados não foram reescritos pelo agente |
| T05 | Validar cada incremento e registrar preservação e resultado | Primeiro incremento validado e registrado; repetir o portão para cada próximo recorte |

## 5. Matriz de transferência

Usar uma linha por trecho significativo, não por arquivo inteiro. Classificações: contrato durável, procedimento, aprendizado, execução histórica, duplicação ou bloqueio por decisão/evidência.

| ID | Origem / trecho | Classificação | Destino responsável | Resultado e prova |
|---|---|---|---|---|
| MIG-01 | [Roadmap v1, 0.12/3.5](../roadmap-v1.md): recortes de cobertura e seus limites | Procedimento/aprendizado | [Manual §7](../setup-ambiente-local.md) e [Aprendizados §5](../reference/lessons-learned.md) | Incorporados testes de render do Dia, bandas/bordas, conflitos e modais; preservados limites de pixels, clipping, variantes e integração. Quatro arquivos de teste conferidos; sem nova contagem de suíte |
| MIG-02 | [Roadmap v1, 0.3](../roadmap-v1.md): seletores preservados e uso dinâmico | Aprendizado | [Aprendizados §3.1–§3.2](../reference/lessons-learned.md) | Uso dinâmico já existia na §3.1; não duplicado. Incorporada a decisão de preservar os dois seletores por falta de evidência, retirando a classificação categórica de “CSS órfão real” |
| MIG-03 | Aprendizados 1.5 e governança: versões copiadas em outras fontes | Reconciliação documental | [Aprendizados §1.5](../reference/lessons-learned.md) | Retirados números copiados e a alegação de risco atual sem verificar índice/instruções. Registrado o controle vigente, sem encerrar os demais riscos |
| MIG-04 | [Roadmap v1, 3.2–3.4](../roadmap-v1.md), manual e configuração real | Procedimento/reconciliação | [Manual, abertura e §7–§8](../setup-ambiente-local.md) | A execução de backend/banco já estava documentada, não foi copiada. Reconciliados hostname versus `.env`, separação API/banco e os dois links; configuração dos quatro hosts conferida no código, sem acessar banco/GCal |
| MIG-05 | [Roadmap v1, 5.7](../roadmap-v1.md), registro da Etapa 7 e fonte atual | Aprendizado/reconciliação | [Aprendizados §3.3](../reference/lessons-learned.md) | Substituído o alerta antigo de animações pela lição vigente de cascata e liberação sem `animationend`; bloco CSS e caminho JS conferidos, sem declarar novo aceite visual |
| MIG-06 | [Roadmap v1, 3.5](../roadmap-v1.md): loader `vm`, `window === globalThis` e pasta separada | Duplicação já coberta | [Manual §7](../setup-ambiente-local.md) | O procedimento já existia no destino e o carregador atual o confirma. Mantido sem nova cópia; retiradas apenas as contagens/listas de cobertura obsoletas |
| MIG-07 | Renomeações do dono: roadmap histórico e referência de aprendizados | Roteamento, não migração de conteúdo | [Índice](../README.md), [v3](../roadmap-v3.md), manual, instruções e mapa da raiz | Nomes adotados após confirmação; specs apontam ao backlog oficial v3, não ao histórico v1. Nenhum registro encerrado foi reescrito pelo agente |
| MIG-08 | Instruções §5/§9/§10 versus testes existentes e [roadmap v1, 0.12](../roadmap-v1.md) | Reconciliação documental | [Instruções permanentes](../../.github/copilot-instructions.md) | Corrigidas as alegações de `jsdom` ocioso e ausência genérica de testes de views/modais/conflitos; mantida a exigência de validação visual e de prova dos recortes efetivamente exercitados |

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
- O arquivo com o nome anterior `docs/reference/APRENDIZADOS.md` reapareceu no working tree durante as validações. Não foi apagado pelo agente. A referência viva adotada por confirmação do dono continua sendo `docs/reference/lessons-learned.md`; o reaparecimento não foi tratado como autorização para uma nova poda.
- **Resultado deste incremento**: MIG-01/MIG-02 incorporam conhecimento que faltava no destino; MIG-03/MIG-04/MIG-05/MIG-08 reconciliam descrições com evidência; MIG-06 evita duplicação; MIG-07 mantém o roteamento dos nomes adotados. Revisão e integração continuam com o dono, sem commit/push pelo agente.

## 8. Pendências e fechamento

Frente em execução. O primeiro incremento técnico não conclui M01–M03 para toda a documentação. Permanecem pendentes a triagem dos demais trechos do roadmap e das specs, a reconciliação de estados como o título “PENDENTE” de Reposições §9.4 e a confirmação de riscos antigos não revalidados. Nenhum desses itens foi marcado como migrado apenas por apontar a uma fonte.

Material exportável (M04 da auditoria), planos/diagnósticos encerrados, reports/archive e código permanecem fora da edição pelo agente. As alterações paralelas do dono ficam registradas acima, sem serem apagadas nem usadas para afirmar uma migração completa. O roadmap histórico adotado é preservado, não um novo backlog vivo.

**Próximo recorte**: triagem de conteúdo durável e estados documentais nas specs, separando o que já está coberto, o que falta incorporar e o que depende de decisão/evidência adicional. Não corrigir o título ou copiar uma regra antiga apenas para fazer fontes concordarem; a spec vigente e a decisão aprovada continuam prevalecendo.