# Documentação — Agenda Personal Trainer (Prô Josy)

> Este é o ponto de entrada da documentação do projeto.
> **Fonte de verdade de regra de negócio**: as specs em `specs/`. Se uma regra não estiver escrita lá, ela não está decidida — confirme antes de implementar.

---

## Índice

| Documento | O que é | Quando ler |
|---|---|---|
| [`roadmap.md`](roadmap.md) | Backlog vivo do produto, com os débitos técnicos conhecidos mapeados | Antes de escolher a próxima feature |
| [`specs/financas-ciclo-cobranca.md`](specs/financas-ciclo-cobranca.md) | Modelo de cobrança por ciclo de vencimento por aluno | Antes de mexer em qualquer coisa financeira, no cadastro de aluno ou na contagem de aulas |
| [`specs/reposicoes-e-competencia.md`](specs/reposicoes-e-competencia.md) | Fila de reposições, competência de cobrança, prazo de validade e extrato do ciclo | Antes de definir como aulas enviadas para reposição entram no cálculo e no histórico financeiro |
| [`specs/gcal-sync.md`](specs/gcal-sync.md) | Sincronização com Google Calendar | Antes de mexer em recorrência, `EXDATE`, webhook, renovação do canal ou conflitos de sincronização |
| [`setup-ambiente-local.md`](setup-ambiente-local.md) | Passo a passo para deixar uma máquina nova rodando frontend, backend e banco de dev, como rodar as duas suítes de teste, e o viewport de referência do mobile (433×762) | Ao configurar um computador novo, quando o ambiente local parar de funcionar, antes de escrever teste novo, ou ao validar UI mobile |
| [`reference/APRENDIZADOS.md`](reference/APRENDIZADOS.md) | Riscos, limites aceitos e armadilhas consolidados de todos os relatórios | Antes de abrir uma rodada numa área sensível |
| [`reference/agent-workflow-kit/`](reference/agent-workflow-kit/README.md) | Kit reutilizável de boas práticas para trabalhar com agentes: guia, contrato permanente, template de diagnóstico e template de plano vivo. Feito para copiar em outro projeto — não é documentação deste app | Ao iniciar um projeto novo, ou ao padronizar o trabalho com agentes |
| [`diagnostics/`](diagnostics/) | Análise de um defeito ou de uma frente de trabalho **antes** de agir (causa-raiz, evidência, proposta). `AAAA-MM-DD-diag-<slug>.md`. O de auditoria UI/UX mobile é o documento-mãe do Grupo 5 do roadmap | Antes de corrigir um defeito já diagnosticado, ou ao retomar a auditoria mobile |
| [`plans/`](plans/) | **Plano vivo** de uma frente de trabalho: decisões do dono, passos, critério de aceite e o registro do que foi executado, tudo no mesmo arquivo. `AAAA-MM-DD-plan-<slug>.md` | Antes de retomar ou estender uma frente; para saber o que foi decidido e executado |
| [`reports/`](reports/) | Relatório curto de uma mudança pontual já feita (hotfix, remoção, ajuste) que não justifica um plano. `AAAA-MM-DD-<tipo>-<slug>.md` | Para saber o porquê de uma mudança pequena |
| [`archive/`](archive/) | **Histórico do processo antigo** (agente gerava relatório final com saída literal de suíte): `agent-reports/` e `sagas/`. Somente consulta | Ao investigar a origem de uma decisão de agosto/setembro de 2026 |
| [`reference/`](reference/) | Consolidados de leitura: `APRENDIZADOS.md` e `EXPORT-*.md` (material para levar a outro projeto, não é documentação do app) | Ver linhas acima |

---

## Como estes documentos se relacionam

- O **roadmap** é um documento **único e vivo**: muda toda vez que algo é entregue ou repriorizado. Nunca versionar por data nem duplicar em `roadmap-v2.md`.
- As **specs** são **uma por feature** e congelam o estado de uma decisão. Cada uma tem número de versão no cabeçalho; o histórico fica no Git, não em arquivos paralelos (`v1.md`, `v2.md`).
- **Versão e status de uma spec existem em um lugar só: o cabeçalho da própria spec.** Nenhum outro documento — nem este índice, nem o roadmap, nem `.github/copilot-instructions.md` — repete o número. Repetir cria drift silencioso: já aconteceu de uma spec andar cinco versões com o índice parado, e um agente confiar no número errado.
- Quando uma feature é entregue, o item correspondente no roadmap é marcado como concluído e passa a **apontar para a spec**, em vez de repetir o conteúdo dela.
- **Spec não referencia plano nem relatório.** A spec é a fonte de verdade e precisa sobreviver à poda de `plans/`, `reports/` e `archive/`. Se um fato de lá importa para a regra, ele é escrito na spec — não linkado.
- **Poda é exceção autorizada à regra de "não reescrever histórico".** `archive/` é o lugar natural para podar peso morto (saída literal de suíte, `git status`, `git log`, blocos duplicados). A poda remove **evidência bruta**, nunca conclusão, decisão ou defeito registrado. O que tiver valor durável migra para a spec ou para `reference/APRENDIZADOS.md` **antes** de qualquer remoção.

### Ciclo de vida de uma frente de trabalho

O processo atual **não gera relatório final por rodada**. O ciclo é:

1. **Diagnóstico** (`diagnostics/`) — quando há defeito ou auditoria a entender antes de agir.
2. **Plano vivo** (`plans/`) — nasce com as decisões do dono e os passos; **o mesmo arquivo recebe o registro da execução** (o que entrou, medições, pendências). Não se cria um segundo documento para o "depois".
3. **Roadmap** (`roadmap.md`) — a entrada do item aponta para o plano e recebe o status.
4. **Relatório curto** (`reports/`) — só para mudança pontual que não justifica um plano.

Um item pode ter diagnóstico e plano, e um aponta para o outro. Plano de item **fechado** não é reescrito: correção posterior vai em documento novo. Plano de item **em aberto** é editado enquanto o trabalho corre.

### Estrutura e nomes

| Pasta | Estado do documento | Nome do arquivo |
|---|---|---|
| `diagnostics/` | análise antes de agir | `AAAA-MM-DD-diag-<slug>.md` |
| `plans/` | plano vivo, inclui desenho de solução ainda não executada e o registro da execução | `AAAA-MM-DD-plan-<slug>.md` |
| `reports/` | mudança pontual já feita | `AAAA-MM-DD-<tipo>-<slug>.md`, com `tipo` em `fix`, `feat`, `chore`, `refactor`, `hotfix`, `remocao` |
| `archive/agent-reports/` | relatório do processo antigo, congelado | nome original |
| `archive/sagas/` | várias rodadas consolidadas (processo antigo) | `SAGA-<tema>.md` |
| `reference/` | consolidados de leitura | `APRENDIZADOS.md`, `EXPORT-*.md` |

O tipo no nome de `reports/` descreve a **mudança**; a pasta descreve o **estado do documento**. Nomes de pastas e prefixos novos seguem em inglês; o conteúdo segue em português.

---

## Convenções

### Cabeçalho de status das specs

Toda spec começa com um bloco que responde "posso confiar nisto?" antes da leitura:

```markdown
> **Status**: Em produção · **Versão**: 5 · **Atualizado**: 2026-08-20
> **Defeitos em aberto**: 1 (ver seção 12.3)
```

Valores possíveis de **Status**: `Rascunho` · `Aprovada, não implementada` · `Em implementação` · `Em produção` · `Substituída`.

### Nomenclatura

- Specs: `docs/specs/<nome-da-feature>.md`, em kebab-case, sem prefixo `spec_` (a pasta já diz).
- Uma feature = um arquivo. Se uma feature crescer demais, quebre em seções internas, não em arquivos.

### Trabalhando com agentes de IA

- Sempre passe o **caminho completo** da spec no prompt (ex.: `docs/specs/financas-ciclo-cobranca.md`). Referência solta pelo nome faz o agente procurar no lugar errado — e ele costuma seguir em frente sem avisar.
- A spec deve resolver explicitamente os casos de borda. O que estiver fora dela deve estar na seção "Fora de escopo" da própria spec, para o agente não inventar solução.
- Instruções permanentes para o agente de código ficam em `.github/copilot-instructions.md`, não aqui; skills vendorizadas ficam em `.agents/skills/`.

---

## O que **não** vai nesta pasta

- **Artefatos gerados por ferramenta** (ex.: `graphify-out/`). São saída de análise, não documentação escrita — devem ser regenerados, nunca editados à mão. Atenção: quando desatualizados, referenciam arquivos que já não existem e induzem a erro em varreduras de código.
- **Documentação de API consumida por código** (se um dia existir), que deve viver junto do código que descreve.
