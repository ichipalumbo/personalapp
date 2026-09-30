# Kit de trabalho com agentes de IA — guia reutilizável

> **O que é**: um conjunto de práticas e arquivos para trabalhar com agentes de código em
> qualquer projeto. Extraído de um projeto real, depois de erros de fato cometidos — cada
> regra aqui existe porque a ausência dela já causou um problema.
>
> **O que não é**: não contém regra de negócio, stack, URL, nome de produto ou preferência
> pessoal de nenhum projeto específico. Os pontos que dependem do projeto são marcados como
> `[ADAPTAR]`.
>
> **Como usar**: leia este arquivo uma vez. Depois copie os três templates para o projeto
> novo (`copilot-instructions.template.md`, `diagnostic.template.md`, `plan.template.md`) e
> preencha o que está marcado como `[ADAPTAR]`.

---

## 1. Objetivo

Agentes de código erram de formas previsíveis: inventam regra que não existe, confiam em
documento velho, escrevem teste que não prova nada, repetem tentativa sem limite, mexem em
arquivo grande e apagam o que não deviam. Este kit organiza o trabalho para que cada uma
dessas falhas tenha uma barreira barata.

O kit resolve quatro problemas:

1. **Falta de fonte de verdade** — o agente não sabe qual documento vence quando dois divergem.
2. **Ambiguidade tratada como autorização** — o agente decide sozinho uma regra de produto.
3. **Evidência fraca** — teste que passa mesmo com o defeito, código validado só por sintaxe.
4. **Documentação que envelhece** — metadado repetido em dois lugares, link quebrado, arquivo
   movido, histórico tratado como estado atual.

## 2. Princípios

| # | Princípio | Regra prática |
|---|---|---|
| 1 | **Fonte única** | Todo dado mutável (versão, status, contagem) existe em um lugar só. Os outros apontam para ele. |
| 2 | **Hierarquia explícita** | Declare o que vence em caso de divergência. Sem isso, o agente segue o Markdown mais bonito. |
| 3 | **Evidência antes de ação** | Ler o código real antes de concluir. Nome de função não é contrato. |
| 4 | **Ambiguidade é portão** | Regra não escrita não pode ser inferida. Apresente opções e espere decisão. |
| 5 | **Escopo mínimo** | Uma frente, um objetivo. Fora de escopo é explícito e não se toca. |
| 6 | **Incremento fechável** | Poucos arquivos por passo, com critério binário de aceite e validação. |
| 7 | **Prova por mutação** | Teste novo só vale se falhar quando a correção é revertida. |
| 8 | **Declarar o que não é coberto** | "Passou tudo" ≠ "funciona". Diga o que a suíte não testa. |
| 9 | **Limite de repetição** | Toda retentativa tem teto e saída definida. |
| 10 | **Permissão coerente** | Nunca ofereça opção que exige ação proibida ao agente. |
| 11 | **Registro vivo** | Plano aberto recebe a execução no próprio arquivo. Sem relatório final redundante. |
| 12 | **Histórico não é verdade atual** | Diagnóstico e plano fechado explicam o passado, não definem o presente. |

## 3. Hierarquia de fontes de verdade

`[ADAPTAR]` — ajuste os caminhos, mantenha a lógica.

| Nível | Artefato | Autoridade | Quando consultar |
|---|---|---|---|
| 1 | Código e contratos executáveis | O que existe de fato | Sempre, antes de afirmar qualquer coisa |
| 2 | Especificações aprovadas | Regra de negócio | Antes de alterar comportamento |
| 3 | Plano vivo (aberto) | Decisão da frente em curso | Ao retomar trabalho |
| 4 | Roadmap | Priorização e estado | Antes de escolher a próxima tarefa |
| 5 | Guia e README | Convenção operacional | Ao configurar ou explicar |
| 6 | Diagnóstico e histórico | Evidência de época | Para entender o "porquê" |
| 7 | Artefato gerado por ferramenta | Nunca é fonte | Só como pista; regenerar |

**Regra de desempate**: o nível menor vence. Se o código contradiz a spec, o código está
certo *como descrição do que existe* — e a spec precisa ser corrigida ou o código consertado.
Isso é uma decisão humana, não do agente.

**Regra de metadado**: nunca copie versão, status, contagem de teste ou lista de arquivos
para outro documento. Referencie o caminho.

## 4. Os quatro arquivos

| Arquivo | Papel | Onde vive |
|---|---|---|
| `copilot-instructions.template.md` | Contrato permanente do agente: como trabalhar, invariantes, testes, Git | `.github/copilot-instructions.md` |
| `diagnostic.template.md` | Investigação antes de agir, somente leitura | `docs/diagnostics/AAAA-MM-DD-diag-<slug>.md` |
| `plan.template.md` | Plano vivo: decisões, passos e o registro da execução | `docs/plans/AAAA-MM-DD-plan-<slug>.md` |
| este `README.md` | Guia e navegação | onde fizer sentido no projeto |

Uma frente de trabalho **não gera relatório final separado**. O plano recebe a execução.
Relatório curto existe apenas para mudança pontual que não justifica plano
(`docs/reports/AAAA-MM-DD-<tipo>-<slug>.md`).

## 5. Ciclo de trabalho

```
1. Ler o contrato permanente (copilot-instructions)
2. Identificar a fonte de verdade do que vai mudar
3. Investigar e medir  ──► diagnóstico (se houver dúvida de causa)
4. Fechar ambiguidades ──► pergunta ao responsável, com opções
5. Abrir ou atualizar o plano vivo
6. Medir baseline (testes, reprodução, números)
7. Implementar em incremento pequeno
8. Validar (teste + mutação + verificação do não coberto)
9. Registrar a execução no plano
10. Atualizar roadmap; fechar o plano ou criar continuação
```

Passo 3 é opcional quando a causa é óbvia. Passo 4 é obrigatório sempre que a mudança
altera comportamento, dados, segurança ou interface.

## 6. Quando criar cada documento

| Situação | Documento |
|---|---|
| Causa desconhecida, ou auditoria de uma área | **Diagnóstico** |
| Frente com decisões, várias etapas, ou execução longa | **Plano vivo** |
| Mudança pontual, sem decisão de produto | **Relatório curto** |
| Descoberta durante o trabalho fora do escopo | Registro no plano; depois roadmap ou diagnóstico separado |
| Item concluído | Não criar nada novo: fechar o plano e atualizar o roadmap |

Nunca crie `roadmap-v2.md`, `spec-nova.md` ou cópia de documento vivo. Documento vivo é
único; o histórico fica no versionamento.

## 7. Convenções de nome e estado

- Data só onde ordena histórico: `AAAA-MM-DD-<tipo>-<slug>.md`.
- `tipo` em `fix`, `feat`, `chore`, `refactor`, `hotfix`, `remocao`, `docs`.
- `slug` curto, kebab-case, sem acento.
- Status padronizados e poucos: `Rascunho` · `Aprovada, não implementada` · `Em implementação`
  · `Em produção` · `Substituída`. Para plano: `aberto` · `executado` · `fechado`.
- Caminhos relativos dentro do repositório.
- Pastas e prefixos novos em inglês; conteúdo no idioma do time.

## 8. Manutenção da documentação

Faça isto periodicamente — de preferência com script, não a olho:

1. **Links**: todo link relativo resolve para um arquivo existente.
2. **Caminhos citados**: todo caminho entre crases existe.
3. **Duplicação**: nenhum metadado volátil repetido fora da fonte.
4. **Poda**: remova evidência bruta (saída literal de suíte, `git status`, `git log`,
   blocos duplicados). Nunca remova conclusão, decisão ou defeito registrado — migre antes
   para a spec ou para o documento de aprendizados.
5. **Congelamento**: plano fechado não é reescrito; correção posterior gera documento novo.
6. **Artefato gerado**: se desatualizado, regenerar; nunca editar à mão.

Auditoria de documentação encontra erro real. Um documento referenciado no índice que não
existe é o sintoma clássico de que ninguém rodou a verificação.

## 9. Checklist de início

- [ ] Li `.github/copilot-instructions.md` deste projeto.
- [ ] Sei qual artefato é a fonte de verdade do que vou mudar.
- [ ] Se existe spec da área, li a seção de fora de escopo.
- [ ] Se a área é sensível, li o documento de aprendizados.
- [ ] Estou numa branch adequada e sei o estado do working tree.
- [ ] Conheço o baseline: o que já estava quebrado e o resultado da suíte afetada.

## 10. Checklist de fechamento

- [ ] Rodei a validação afetada **antes e depois**, e reportei os números medidos.
- [ ] Teste novo tem prova por mutação (reverti a correção; o teste falhou; restaurei).
- [ ] Declarei o que **não** é coberto pela validação que rodei.
- [ ] Registrei a execução no plano (arquivos, resultado, desvios, pendências).
- [ ] Atualizei o roadmap do item correspondente.
- [ ] Reportei o que encontrei e **não** alterei, com o motivo.
- [ ] Não deixei mutação de teste no código nem sujeira no working tree.

---

## Anexo — anti-padrões observados em projeto real

Cada linha abaixo é uma falha que aconteceu, com o princípio que a evita.

| Anti-padrão | Falha observada | Princípio |
|---|---|---|
| Versão de spec repetida em vários documentos | A spec avançou e o índice ficou para trás; o agente confiou no número velho | Fonte única |
| Histórico tratado como estado atual | Documento de aprendizados apontava para módulo que já tinha mudado de lugar | Hierarquia + validade temporal |
| Índice sem verificação de link | O índice citava um arquivo que não existia mais | Auditoria mecânica |
| Busca textual sensível a maiúsculas | O agente não achou "Fora de escopo", declarou ausente e seguiu premissa errada | Evidência robusta |
| Branch com upstream incorreto | Um "Sync Changes" enviou commits direto para a branch principal, sem revisão | Política de Git + verificar upstream |
| Perguntar o que o agente não pode executar | Loop: a resposta exigia ação proibida ao agente | Permissão coerente |
| Retentativa sem teto | Correção e teste repetidos sem produzir saída | Limite + saída |
| Símbolo repetido sem âncora | Mutação aplicou no lugar errado e outra saída foi apresentada como sucesso | Âncora precisa |
| Teste decorativo | O teste verificava texto-fonte, não comportamento | Teste comportamental |
| Espião como prova | Confirmar que o argumento chegou à função não provava o resultado | Efeito observável |
| Teste que já passava antes | A cobertura nova não distinguia certo de errado | Prova por mutação |
| Edição grande sem verificação | Remoção apagou centenas de linhas sem erro de sintaxe | Incremento pequeno |
| Confiar em sintaxe | O arquivo continuou válido, mas funções sumiram | Validação funcional |
| Rodada com itens demais | Depois de ~4 itens, os últimos saíram vazios ou ignorados | Escopo reduzido |
| API presumida pelo nome | Interface plausível adotada sem localizar a definição real | Inspecionar contrato |
| Auditoria estática como certeza | Classe usada só em runtime foi classificada como morta | Confirmar em execução |
| Regra duplicada entre camadas | Duas implementações divergiram em silêncio | Implementação única |
| Estado local como conclusão | Escrita sensível parecia concluída antes da confirmação do servidor | Confirmação autoritativa |
| Comando inadequado ao shell | Aspas aninhadas penduraram o terminal, parecendo processo lento | Documentar ambiente real |
