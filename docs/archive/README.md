# Arquivo histórico da documentação

> **Finalidade**: consultar registros anteriores, sem tratá-los como contrato ou backlog vigente.
> **Organização autorizada pelo dono**: 2026-10-14. Conteúdo preservado; caminhos de referências ajustados para continuar navegável.

Para trabalho atual, começar pelo [índice documental](../README.md), pelas [specs vigentes](../specs/)
e pelo [roadmap oficial](../roadmap-v3.md). A [migração em andamento](../plans/2026-10-14-plan-migracao-documental.md)
registra transferências, decisões e pendências desta reorganização.

## O que está arquivado

| Pasta | Conteúdo | Quantidade na organização de 2026-10-14 |
|---|---|---|
| [agent-reports/](agent-reports/) | Relatórios do processo antigo, inclusive saídas de terminal | 26 |
| [sagas/](sagas/) | Consolidações históricas de várias rodadas | 11 |
| [reports/](reports/) | Relatórios pontuais anteriormente em `docs/reports/` | 10 |
| [plans/](plans/) | Planos anteriores e registros de execução/validação | 15 |
| [diagnostics/](diagnostics/) | Investigações e auditorias de bases anteriores | 12 |
| [roadmaps/](roadmaps/) | Roadmaps v1 e v2, substituídos pelo v3 | 2 |
| [reference/](reference/) | Cópia histórica de Aprendizados; a referência viva é [lessons-learned](../reference/lessons-learned.md) | 1 |

Essas quantidades descrevem a operação de organização, não contadores vivos a duplicar em
outros índices. O [catálogo da auditoria](diagnostics/2026-10-14-diag-arquitetura-documentacao.md)
permite localizar cada registro pelo seu objetivo original; é uma fotografia daquela base.

## Como interpretar os registros

- Arquivar não declara que um defeito foi corrigido, uma feature publicada ou uma pendência encerrada.
- O plano inicial de reposições/observações e investigações antigas sem status uniforme foram arquivados por decisão explícita do dono, **sem recertificar seu fechamento**. Contradições entre cabeçalho e execução permanecem como evidência histórica.
- O diagnóstico mobile mistura investigação, plano e execução. Sua movimentação não o transforma em spec vigente nem reabre todas as etapas que descreve.
- Medições de suíte, commits, versões citadas e observações são da época/base do documento. Não usá-los como estado atual do app.
- Os roadmaps v1/v2 não recebem novo backlog. O nome antigo `roadmap.md`, quando usado como destino de link, foi redirecionado para o v1 arquivado.
- A cópia `APRENDIZADOS.md` não compete com a referência viva; não manter duas versões do mesmo inventário de riscos.

## Preservação e continuidade

O corpo histórico não é reescrito. Na reorganização autorizada, foram permitidos somente
movimentos e ajustes mecânicos de caminhos de links/referências, sem apagar conclusões,
hipóteses, decisões, resultados ou limitações. A preservação foi verificada pela comparação
do conteúdo descontando esses caminhos.

Novo trabalho usa plano ou diagnóstico na área ativa, conforme a [governança](../README.md).
Não voltar a gerar relatório final por rodada nem criar nova saga para uma frente atual.
Mover outro conjunto, podar evidência, excluir uma cópia ou corrigir o conteúdo de um registro
exige autorização específica; o arquivamento desta rodada não concede essa permissão geral.