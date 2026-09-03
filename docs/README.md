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
| [`setup-ambiente-local.md`](setup-ambiente-local.md) | Passo a passo para deixar uma máquina nova rodando frontend, backend e banco de dev, mais como rodar as duas suítes de teste | Ao configurar um computador novo, quando o ambiente local parar de funcionar, ou antes de escrever teste novo |
| [`_reports/APRENDIZADOS.md`](_reports/APRENDIZADOS.md) | Riscos, limites aceitos e armadilhas consolidados de todos os relatórios | Antes de abrir uma rodada numa área sensível |

---

## Como estes documentos se relacionam

- O **roadmap** é um documento **único e vivo**: muda toda vez que algo é entregue ou repriorizado. Nunca versionar por data nem duplicar em `roadmap-v2.md`.
- As **specs** são **uma por feature** e congelam o estado de uma decisão. Cada uma tem número de versão no cabeçalho; o histórico fica no Git, não em arquivos paralelos (`v1.md`, `v2.md`).
- **Versão e status de uma spec existem em um lugar só: o cabeçalho da própria spec.** Nenhum outro documento — nem este índice, nem o roadmap, nem `.github/copilot-instructions.md` — repete o número. Repetir cria drift silencioso: já aconteceu de uma spec andar cinco versões com o índice parado, e um agente confiar no número errado.
- Quando uma feature é entregue, o item correspondente no roadmap é marcado como concluído e passa a **apontar para a spec**, em vez de repetir o conteúdo dela.
- **Spec não referencia relatório.** A spec é a fonte de verdade e precisa sobreviver à poda periódica de `_reports/`. Se um fato de um relatório importa para a regra, ele é escrito na spec — não linkado.
- Relatório de item **fechado** não é reescrito por rodada de correção ou diagnóstico: correção posterior ao fechamento vai em **relatório novo**. Relatório de item **em aberto** pode ser corrigido enquanto o trabalho corre.
- **Poda periódica é exceção autorizada à regra acima.** De tempos em tempos, `_reports/` é podada para tirar peso morto — saída literal de suíte, `git status`, `git log` e blocos duplicados. A poda remove **evidência bruta**, nunca conclusão, decisão ou defeito registrado. O que tiver valor durável migra para a spec ou para `_reports/APRENDIZADOS.md` **antes** de qualquer remoção.
- **`_reports/SAGA-*.md`** consolida várias rodadas de um mesmo esforço num arquivo só: linha do tempo, causa-raiz, o que ficou de pé, decisões deliberadas e limites herdados. Quando um problema exige mais de uma rodada, o histórico vira saga e os relatórios intermediários saem.

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
- Instruções permanentes para agentes ficam em `.agents/skills/`, não aqui.

---

## O que **não** vai nesta pasta

- **Artefatos gerados por ferramenta** (ex.: `graphify-out/`). São saída de análise, não documentação escrita — devem ser regenerados, nunca editados à mão. Atenção: quando desatualizados, referenciam arquivos que já não existem e induzem a erro em varreduras de código.
- **Documentação de API consumida por código** (se um dia existir), que deve viver junto do código que descreve.
