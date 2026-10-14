# Plano vivo — Auditoria e governança da documentação

> **Status**: Encerrado · **Criado**: 2026-10-14 · **Atualizado**: 2026-10-14
> **Responsável**: GitHub Copilot · **Dono das decisões**: dono do repositório
> **Diagnóstico**: [Arquitetura e finalidade da documentação](../diagnostics/2026-10-14-diag-arquitetura-documentacao.md)
> **Branch**: `docs/auditoria-roadmap`; alterações da rodada anterior e do dono preservadas.

## 1. Objetivo

Auditar toda a pasta `docs/`, definir a finalidade e os limites de cada tipo de documento e registrar a governança nos locais apropriados, com foco em spec, plano e diagnóstico e com benchmarks públicos verificáveis.

## 2. Escopo autorizado

- Inventário/classificação de cada documento da base e investigação das misturas de função e autoridade.
- Registro dos achados no diagnóstico desta frente.
- Definições permanentes e navegação em `docs/README.md`; alinhamento da seção documental de `.github/copilot-instructions.md` com essas definições.
- Registro da execução e pendências neste plano, sem relatório paralelo.
- Preservação das specs, planos/diagnósticos anteriores, referências, conteúdo dos roadmaps e histórico congelado.

## 3. Fora de escopo

- Redistribuir conteúdo do roadmap ou de outras fontes, mover/renomear documentos, criar novas pastas de arquitetura/ADRs ou implantar ferramenta de documentação.
- Reescrever registros encerrados, o kit exportável ou o manual de ambiente.
- Corrigir contratos de produto, regras financeiras, código ou dados remotos.
- Certificar toda afirmação histórica, execução de suítes, UI real ou produção.
- Commit, push, merge ou publicação pelo agente.

## 4. Decisões do dono

| Decisão | Origem | Consequência |
|---|---|---|
| Continuar na branch atual com o working tree existente | Resposta desta rodada, 2026-10-14 | Não criar branch nem reverter alterações anteriores |
| Auditar a documentação antes de redistribuir conteúdo | Pedido desta rodada | A migração fica para uma frente posterior |
| Manter `reports/` e `archive/` congelados | Confirmação desta rodada, 2026-10-14 | Somente consulta; nenhum arquivo novo, exclusão ou migração nessas pastas |
| Revisar especialmente spec, plano e diagnóstico, com benchmarks | Pedido desta rodada | Definir finalidade, autoridade, conteúdo e ciclo de vida, não apenas padronizar nomes |

## 5. Critérios de aceite

- [x] Todos os documentos da base estão identificados uma vez no inventário, com propósito e tratamento proposto.
- [x] Cada pasta tem finalidade, conteúdo permitido, exclusões e condição de manutenção explícitos.
- [x] Spec, plano e diagnóstico têm fronteiras claras e exemplos que distinguem contrato, execução e evidência.
- [x] Benchmarks utilizados foram consultados; limites e adaptações locais estão declarados.
- [x] O índice e as instruções não permitem novos relatórios em pastas congeladas nem competem entre si na governança.
- [x] Mudança pequena não exige três documentos por padrão; documento novo é justificado por sua finalidade.
- [x] Achados, hipóteses, conclusões e futuras ações estão separados; nenhuma migração é anunciada como executada.
- [x] Links dos documentos criados/alterados são válidos; documentos fora do escopo mantêm seus hashes de entrada.

## 6. Cartões da rodada

| Cartão | Trabalho | Estado |
|---|---|---|
| T01 | Inventariar arquivos, tamanho, cabeçalhos e marcadores estruturais | Concluído: base de 86 documentos medida |
| T02 | Confrontar benchmarks e ler casos de fronteira entre tipos | Concluído: cinco referências públicas consultadas, com adaptações locais |
| T03 | Registrar finalidade, autoridade, ciclo e roteamento no índice/instruções | Concluído: definições e links validados, 85 documentos preservados |
| T04 | Consolidar achados e catálogo individual no diagnóstico | Concluído: F01–F10 e os 86 arquivos, sem omissões/duplicações |
| T05 | Validar cobertura, links, preservação e fechamento | Concluído: checagens focadas, diagnósticos e diff sem erros |

## 7. Validação

- Verificação documental focada, sem executar suítes de produto: cabeçalhos, links locais e cobertura exata dos arquivos da base.
- Comparação SHA-256 contra a base capturada no início para documentos não autorizados a mudar.
- `get_errors` nos arquivos criados/alterados e `git diff --check` para alterações rastreadas.
- Links preexistentes quebrados serão classificados por vigência e contexto; apontar um link não equivale a autorizar sua correção histórica.
- Resultado estrutural não comprova conteúdo funcional correto, acessibilidade da aplicação ou atualidade de toda informação legada.

## 8. Registro da execução

### 2026-10-14 — Abertura e inventário (T01)

- Working tree de entrada: alterações em `.github/copilot-instructions.md`, `docs/README.md`, `docs/roadmap-v2.md` e o novo `docs/roadmap-v3.md`; todas preservadas.
- Criado diagnóstico próprio com pergunta, hipótese disconfirmável, escopo e método; primeira checagem passou com links locais válidos e histórico congelado intacto.
- Base medida: **86 documentos, 22.338 linhas**. Raiz: 5; specs: 3; plans: 14; diagnostics: 11; reference: 6; reports: 10; archive: 37.
- O detector estrutural encontrou 62 arquivos sem `Status` no primeiro bloco de 20 linhas e 18 com marcadores de saída literal. Esses números são triagem, não defeitos automáticos: histórico congelado e exemplos operacionais têm usos legítimos.
- Capturados hashes da base para conferir preservação ao final; o diagnóstico e este plano são documentos novos da frente, não parte dos 86 arquivos de entrada.
- Benchmarks consultados até aqui: Diátaxis, Atlassian PRD/planejamento, Google SRE e Microsoft Azure ADR. Página de ADR da AWS indisponível na consulta; não utilizada como evidência.
- Primeiros casos confirmados por leitura: diagnóstico mobile mistura investigação/execução; spec de GCal combina contratos, backlog e relatos de correção; plano antigo de reposições tem cabeçalho de não execução e registros de etapas executadas. Tratamento será classificado, sem reescrever essas fontes nesta rodada.

### 2026-10-14 — Benchmarks e governança (T02–T03)

- Consultadas cinco fontes públicas com conteúdo extraído: Diátaxis, Atlassian PRD, Atlassian planejamento, Google SRE e Microsoft Azure ADR. A referência indisponível da AWS não foi utilizada. Adaptações foram registradas no índice e no diagnóstico, sem alegar formato universal de mercado.
- Atualizado `docs/README.md` com finalidade/autoridade por assunto, fronteiras de spec/plano/diagnóstico, exemplos de classificação, ciclo proporcional, estados mínimos e público dos exportáveis. Foram mantidos a precedência das specs, o roadmap v3 oficial e a proibição local de dependência normativa da spec em planos/relatórios.
- Alinhada somente a seção 8 de `.github/copilot-instructions.md`: roteamento, promoção de decisão durável, registros no plano e congelamento de reports/archive. Demais regras e alterações anteriores preservadas.
- Validação focada passou: definições presentes; **20 links locais do índice válidos**; instruções sem destino de relatório novo; **85 documentos preexistentes fora do índice mantêm SHA-256 idêntico à base**. Nenhuma redistribuição executada.
- A varredura da base encontrou **212 links locais, 2 ausentes em 1 arquivo**, nas linhas 25/274 do manual de ambiente. Achado registrado no diagnóstico, sem correção do manual.
- Consolidado catálogo individual dos 86 documentos, com finalidade e tratamento, além de F01–F10 e possíveis frentes posteriores. Cobertura exata e fechamento permanecem no T05; nenhuma tarefa de migração foi marcada como executada.

### 2026-10-14 — Catálogo, validação e fechamento (T04–T05)

- Comparação do catálogo com os caminhos da base: **86/86 arquivos identificados, 0 duplicações, 0 omissões**; a classificação é estrutural/semântica dirigida, não certificação de todas as afirmações históricas.
- **115 ocorrências de links locais** dos quatro artefatos desta rodada com destinos existentes; âncoras internas e todos os links externos da pasta não foram recertificados.
- Comparação SHA-256: **85 documentos preexistentes fora do índice inalterados**, incluindo todos os **47 documentos congelados** e os três roadmaps. Arquivos novos: somente diagnóstico e plano desta frente.
- `get_errors` não apontou erros nos quatro artefatos; `git diff --check` passou. Working tree conferido: alterações anteriores de v2/v3 e ponteiros preservadas; nenhuma edição de produto, spec, manual, exportável ou histórico nesta rodada.
- **Arquivos desta rodada**: `docs/README.md` (governança e navegação), `.github/copilot-instructions.md` (somente roteamento documental da seção 8), o diagnóstico (benchmarks, cobertura, achados e catálogo) e este plano (decisões/execução/provas).
- Suítes backend/frontend não executadas: nenhuma regra ou código de produto foi alterado; validação requerida neste escopo é documental. Nenhuma prova de UI, produção, Mongo ou GCal é atribuída a esta rodada.
- Resultado: governança registrada e auditoria encerrada tecnicamente, com redistribuição/reconciliação legada, revisão do dono e integração por PR ainda fora da execução do agente.

## 9. Pendências e continuidade

A redistribuição de conteúdo, a reconciliação factual das fontes e qualquer poda permanecem fora desta rodada. F02–F10 têm limites ou trabalho posterior registrado; governança de F01 foi tratada sem reescrever esses documentos. M01–M04 são possibilidades de continuidade no diagnóstico, sem prioridade, autorização automática ou novo item de roadmap. Os dois links do manual continuam quebrados e identificados.

## 10. Fechamento

- **Resultado**: T01–T05 concluídos no escopo de auditoria e registro de governança; critérios técnicos verificados acima.
- **Limite**: não houve migração, poda, correção funcional ou revalidação integral dos riscos/afirmações legados. Encerramento do documento não significa publicação nem aceite do dono sobre cada possível frente posterior.
- **Revisão/publicação**: com o dono, por PR; agente não fez commit/push/merge nem operação em produção.
- **Data de encerramento técnico**: 2026-10-14.
- **Retomada**: redistribuição ou reconciliação constitui frente posterior e referencia este plano; não reescrever o encerramento como se a migração já tivesse ocorrido.