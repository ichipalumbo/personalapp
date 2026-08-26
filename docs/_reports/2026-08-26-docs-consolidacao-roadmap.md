# Consolidação do roadmap e auditoria das specs — 2026-08-26

## 1. Portão de base

```text
docs/consolidacao-roadmap

1
1
```

## 2. Tabela de itens do roadmap

| Item | Antes | Depois | Status antes | Status depois | O que mudou |
| --- | --- | --- | --- | --- | --- |
| 0.5 | 0.5 | 0.5 | `[~] IMPLEMENTADO NA BRANCH, PENDENTE DE ROLLOUT` | `[x] EM PRODUÇÃO` | Status corrigido para refletir a implementação mergeada e validada em produção; manteve a ressalva da caixinha do card do aluno. |
| 0.8 | 0.8 | 0.8 | `[ ] Avisos in-app ...` | `[ ] Avisos in-app ...` | Consolidou o conteúdo funcional do alerta de reposição vencendo e o contexto do card do aluno; manteve a dependência do item 0.7 e o estado de não implementado. |
| 1.8 | 1.8 | 1.8 | `[ ] Visão de "aulas a repor" no card do aluno` | `[ ] Visão de "aulas a repor" no card do aluno` | Corpo substituído por remissão de uma linha: `Consolidado no item 0.8.` |
| 0.10 | — | 0.10 | — | `[x]` | Item deduplicado movido do Grupo 2 para o Grupo 0, com o texto do débito técnico e o estado concluído. |
| 2.1 | 2.1 | 2.1 | `[x] ...` | `[x] ...` | Mantido, mas a ressalva foi tornada acionável com o que observar (`window.log.nivel = 'debug'`, mensagem "Canal renovado"), e o motivo da data (janela de 24h antes do vencimento em 02/09/2026). |
| 2.10 | — | 2.10 | — | `[ ]` | Item órfão de Google Calendar renumerado e mantido no Grupo 2. |
| 2.11 | — | 2.11 | — | `[ ]` | Item órfão de Google Calendar renumerado e mantido no Grupo 2. |
| 3.1 | 3.1 | 3.1 | `[ ] Testes automatizados das regras financeiras` | `[ ] Ampliar cobertura das regras financeiras` | Reescrito para refletir a suíte atual em 84 testes e excluir a narrativa antiga de criar a rede de proteção do zero. |

## 3. Resultado da verificação 1.4

Verificação no código:

- `Select-String -Path 'assets\js\view-financas.js' -Pattern 'reposicao|reposicoes' | Measure-Object` = `6`
- `Select-String -Path 'backend\src\models\*.js' -Pattern 'Reposicao' | Measure-Object` = `6`

Conclusão: o frontend de finanças realmente consome reposições e o backend tem a collection/model `Reposicao` em produção. O documento errado era o roadmap, não a spec: o item 0.5 estava desatualizado. O cabeçalho de `docs/specs/reposicoes-e-competencia.md` estava correto e o roadmap foi ajustado para refletir a produção.

## 4. Lacunas de teste apuradas em 1.5

Os arquivos de teste existentes em `backend/test/` são:

- `financas-pure.test.js`
- `financas-competencia.test.js`
- `gcal-sync.test.js`
- `reposicao-api.test.js`
- `reposicao-c4-regressao.test.js`
- `reposicao-extrato-prazo.test.js`
- `reposicao-prazo.test.js`

O que foi verificado em `financasService.js`:

- Cobertura existente: `calcularCicloVigente`, `calcularTotalAulasCobradas`, `calcularValorTotalCiclo`, `filtrarHistoricoExcluindoCicloAtual`, `encerrarCicloSobrepostoSeNecessario`, `calcularAulasContadasDoCiclo`, `montarExtratoDoCiclo`, `calcularPrazoReposicao`.
- Não há teste de frontend verificado em `assets/` nem em `backend/test/` para UI. Isso foi tratado como decisão consciente, não uma lacuna a corrigir agora.

## 5. Correções da Parte 2

Aplicadas:

- `docs/specs/gcal-sync.md`: removido o resíduo `<cite index="3-3">...</cite>` preservando o texto da frase; invertida a ordem das subseções 9.14 e 9.13 para seguir a sequência numérica.
- `.github/copilot-instructions.md`: adicionada a menção à spec `docs/specs/gcal-sync.md` (v6) na seção 2, mantendo a versão lida do cabeçalho do arquivo.

Já estavam corretos e não sofreram alteração:

- A numeração da seção `## 11.` em `.github/copilot-instructions.md` já estava ajustada.
- O espaçamento antes do separador `---` da seção 1 já estava correto.
- `docs/specs/reposicoes-e-competencia.md` e `docs/specs/financas-ciclo-cobranca.md` já estavam alinhadas com o código e com a produção; não foi necessário mudar o status do cabeçalho.

## 6. Divergências encontradas e NÃO corrigidas

Nenhuma divergência de regra de negócio foi confirmada no código durante esta auditoria. As divergências que a rodada visava corrigir eram de documentação e consistência do roadmap, e elas foram resolvidas sem alterar regras de negócio.

O ponto pendente que continua explícito no código e na spec é o contador do card do aluno (item 0.8 / seção 9.5): a feature ainda não foi implementada. O app não renderiza o contador em `index.html` e `view-alunos.js`, conforme a spec. Isso é trabalho futuro, não um bug de documentação.

## 7. Contagem de itens antes/depois

- Antes: `34`
- Depois: `33`

Justificativa da diferença:

- A consolidação da caixinha 9.5 reduziu 3 entradas (0.8 + 1.8 + o órfão "Implementação da caixinha 9.5") para 2 entradas (0.8 + remissão em 1.8): `-1`.
- O item de deduplicação de `calcularPrazoReposicao` foi movido do Grupo 2 para o Grupo 0 e renumerado como `0.10`, substituindo o órfão do Grupo 2: net `0` no total de itens.
- Os itens de Google Calendar 2.10 e 2.11 substituiram os dois órfãos sem alterar o total geral.

Resultado final: queda de `34` para `33`, justificável pela fusão da caixinha de reposição e pela migração do débito técnico de deduplicação para o Grupo 0.
