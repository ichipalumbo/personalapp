# Documentação — Agenda Personal Trainer (Prô Josy)

> Porta de entrada da documentação. Este arquivo **aponta**; a regra mora na spec do domínio.
>
> **Fonte de verdade de regra de negócio**: as specs em [`specs/`](specs/). Se uma regra não estiver escrita lá, ela não está decidida — confirme antes de implementar.
>
> **Atualizado**: 2026-09-01

---

## Caminho de leitura

A documentação tem quatro camadas. Cada uma responde uma pergunta diferente; nenhuma repete a de baixo.

| Camada | Onde | Responde |
| --- | --- | --- |
| 1 | [`../README.md`](../README.md) | o que é o projeto e como ele se organiza |
| 2 | este arquivo | quais domínios existem e qual tela usa o quê |
| 3 | `specs/<domínio>/README.md` | o que o domínio cobre e quais decisões já foram tomadas |
| 4 | `specs/<domínio>/<feature>.md` | **a regra** — fonte de verdade |

Documentos de apoio, fora dessa escada:

| Documento | Para quê |
| --- | --- |
| [`roadmap.md`](roadmap.md) | o que falta fazer e o que depende de quê |
| [`ambiente-local.md`](ambiente-local.md) | rodar o projeto, `.env`, troubleshooting |
| [`mapa-do-codigo.md`](mapa-do-codigo.md) | árvore de arquivos, ordem de carregamento, convenções de nome |
| [`contexto-personalapp-para-novas-conversas.md`](contexto-personalapp-para-novas-conversas.md) | como o dono trabalha e o que não está no código |
| [`TEMPLATE-prompt-etapa-personalapp.md`](TEMPLATE-prompt-etapa-personalapp.md) | formato de prompt de etapa para o agente |
| [`_reports/`](_reports/) e [`_diags_llm/`](_diags_llm/) | histórico e diagnósticos — imutáveis |

**Hierarquia de confiabilidade**: código > specs > roadmap > README. Se divergir, o código vence.

---

## Domínios

| Domínio | Cobre | Índice |
| --- | --- | --- |
| **Alunos** | cadastro, objetivo, status, ciclo de vida | [`specs/alunos/`](specs/alunos/README.md) |
| **Agenda** | compromissos, recorrência, conflito, exclusão, grade | [`specs/agenda/`](specs/agenda/README.md) |
| **Financeiro** | ciclo de cobrança, pagamento, reposições, extrato | [`specs/financeiro/`](specs/financeiro/README.md) |
| **Integrações** | Google Calendar, autenticação Google | [`specs/integracoes/`](specs/integracoes/README.md) |
| **Plataforma** | isolamento por conta, persistência, resiliência, deploy | [`specs/plataforma/`](specs/plataforma/README.md) |

### Specs existentes

| Spec | Domínio | Status |
| --- | --- | --- |
| [`financas-ciclo-cobranca.md`](specs/financeiro/financas-ciclo-cobranca.md) | Financeiro | v7 · em produção |
| [`reposicoes-e-competencia.md`](specs/financeiro/reposicoes-e-competencia.md) | Financeiro | v6 · em produção |
| [`gcal-sync.md`](specs/integracoes/gcal-sync.md) | Integrações | v11 · em produção |

### Specs pendentes

Nomeadas, ainda não escritas. Enquanto não existirem, o comportamento é o do código — e **não** deve ser tratado como decisão de produto confirmada.

| Spec | Domínio |
| --- | --- |
| `alunos-cadastro-e-ciclo-de-vida.md` | Alunos |
| `agenda-e-agendamentos.md` | Agenda |
| `configuracao-da-grade.md` | Agenda |
| `autenticacao-google.md` | Integrações |
| `isolamento-por-conta.md` | Plataforma |
| `sincronizacao-e-resiliencia-de-dados.md` | Plataforma |

Levantamento que originou essa lista: [`_diags_llm/2026-09-01-diag-cobertura-specs-features-producao.md`](_diags_llm/2026-09-01-diag-cobertura-specs-features-producao.md).

---

## Mapa de telas

Para quando a pergunta for *"como funciona a tela X?"*. Uma tela costuma atravessar domínios.

| Tela | Domínio principal | Também consome |
| --- | --- | --- |
| **Home — Semana / Dia** | Agenda | Financeiro (painel de reposições pendentes), Integrações (bloqueios externos do Google) |
| **Finanças** | Financeiro | Agenda (contagem de aulas do ciclo) |
| **Alunos** | Alunos | Financeiro (badge do ciclo), Agenda (indicador de consistência) |
| **Modal de agendamento / ação do slot** | Agenda | Financeiro (envio para reposição), Integrações (efeito no Google) |
| **Área do usuário / configurações** | Integrações | Plataforma (sessão), Agenda (grade de horários) |

---

## Convenções

### Cabeçalho de status das specs

Toda spec começa com um bloco que responde "posso confiar nisto?" antes da leitura:

```markdown
> **Status**: Em produção · **Versão**: 7 · **Atualizado**: 2026-08-25
> **Domínio**: Financeiro
> **Precedência**: cede a `reposicoes-e-competencia.md` em regras de reposição
> **Defeitos em aberto**: 0 (ver seção 12)
```

Valores possíveis de **Status**: `Rascunho` · `Aprovada, não implementada` · `Em implementação` · `Em produção` · `Substituída`.

Os campos **Domínio** e **Precedência** existem para que uma spec nunca seja lida isolada quando outra a redefine.

### Nomenclatura e localização

- Specs: `docs/specs/<domínio>/<nome-da-feature>.md`, em kebab-case, sem prefixo `spec_`.
- Uma feature = um arquivo. Se uma feature crescer demais, quebre em seções internas, não em arquivos.
- Índice de domínio: `README.md` dentro da pasta do domínio.
- Ao mover uma spec de pasta, use `git mv` e **preserve o nome do arquivo** — os relatórios históricos citam o nome, não o caminho.

### Regra que sustenta a estrutura

**Índice aponta, spec decide.** Índice de domínio com regra de negócio dentro vira segunda fonte de verdade, e duas fontes divergem na primeira alteração. É o mesmo motivo pelo qual o código não pode ter cópias da mesma regra.

### Como estes documentos se relacionam

- O **roadmap** é um documento **único e vivo**: muda toda vez que algo é entregue ou repriorizado. Nunca versionar por data nem duplicar em `roadmap-v2.md`.
- As **specs** são **uma por feature** e congelam o estado de uma decisão. Cada uma tem número de versão no cabeçalho; o histórico fica no Git, não em arquivos paralelos (`v1.md`, `v2.md`).
- Quando uma feature é entregue, o item correspondente no roadmap é marcado como concluído e passa a **apontar para a spec**, em vez de repetir o conteúdo dela.
- Cada spec mantém uma seção `Fora de escopo` e uma tabela de relatórios relacionados no fim da seção de itens (ex.: `## 9.24 Relatórios desta spec` em `specs/integracoes/gcal-sync.md`). O relatório é o histórico, a spec é a fonte de verdade do que está aberto.
- Relatório de item **fechado** é imutável; relatório de item **em aberto** pode ser corrigido enquanto o trabalho corre. Correção posterior ao fechamento vai em **relatório novo**, que referencia o antigo.

### Trabalhando com agentes de IA

- Sempre passe o **caminho completo** da spec no prompt (ex.: `docs/specs/financeiro/financas-ciclo-cobranca.md`). Referência solta pelo nome faz o agente procurar no lugar errado — e ele costuma seguir em frente sem avisar.
- A spec deve resolver explicitamente os casos de borda. O que estiver fora dela deve estar na seção "Fora de escopo" da própria spec, para o agente não inventar solução.
- Regras permanentes do agente de código ficam em [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md).

---

## O que **não** vai nesta pasta

- **Artefatos gerados por ferramenta** (ex.: `graphify-out/`). São saída de análise, não documentação escrita — devem ser regenerados, nunca editados à mão. Atenção: quando desatualizados, referenciam arquivos que já não existem e induzem a erro em varreduras de código.
- **Documentação de API consumida por código** (se um dia existir), que deve viver junto do código que descreve.
