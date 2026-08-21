# Ajustes a aplicar nos documentos que já existem

> Complemento da spec `docs/specs/reposicoes-e-competencia.md`.
> Este arquivo **não vai para o repo** — é um checklist do que editar em cada documento.
> Descarte depois de aplicar.

---

## 1. `docs/specs/financas-ciclo-cobranca.md` → v6

A spec de Finanças **não precisa ser reescrita**. Ela ganha um ponteiro e três ajustes
pontuais.

### 1.1 Cabeçalho

Subir para **versão 6**, atualizar a data, e acrescentar logo abaixo do bloco de status:

> **Relacionada**: `docs/specs/reposicoes-e-competencia.md` — altera a regra 5.8 e
> introduz a collection `Reposicao`. Em caso de divergência sobre reposições, aquela
> spec prevalece.

### 1.2 Regra 5.8 (contagem de aulas cobráveis)

Hoje a regra conta ocorrências da agenda. Substituir o parágrafo de contagem por uma
remissão:

> A contagem passa a seguir o **modelo de competência** definido na seção 5 de
> `reposicoes-e-competencia.md`: agendamentos normais não vinculados a reposição, mais
> reposições cobráveis com origem no ciclo, mais reposições não cobráveis resolvidas no
> ciclo.

Manter o restante da 5.8 (piso zero, snapshot, valor fixo) intacto.

### 1.3 Grafia de `tipo`

Você já corrigiu `financasService.js` de `'reposição'` para `'reposicao'`. Conferir se a
spec ainda cita a grafia antiga na seção de contagem — se citar, alinhar. Grafia válida:
**`'reposicao'`, sem acento**, igual ao serializer e ao `gcalSyncService`.

### 1.4 Tabela de decisões

A **decisão 16** (excluir aula da agenda remove do financeiro?) ganha uma ressalva:

> Continua válida para exclusão. **Envio para reposição não é exclusão** — ver
> `reposicoes-e-competencia.md`.

### 1.5 Seção "Fora de escopo"

Remover "reposições" da lista, se estiver lá, e apontar para a spec nova.

---

## 2. `docs/roadmap.md`

### 2.1 Itens novos

| Item | Descrição | Nota |
|---|---|---|
| — | **Collection `Reposicao` + modelo de competência** | Entrega principal da spec nova |
| — | **Extrato do ciclo** | Pode sair junto ou logo depois |
| — | **Prazo de validade + expiração lazy** | Entra junto, por decisão de negócio |
| — | **Avisos in-app de reposição a vencer** | Card do aluno + painel |

### 2.2 Itens afetados

- **1.5 (status de presença / no-show)** — ganha uma nota: quando existir, a escolha
  cobrável/não cobrável pode passar a ser derivada de *quem cancelou*.
- **1.8 (visão de aulas a repor no card do aluno)** — passa a ser parcialmente atendido
  pela caixinha de avisos (9.5 da spec nova). Reavaliar escopo.
- **2.2 (notificações)** — segue como está; a spec nova depende dele para notificação
  real, mas entrega aviso in-app sem ele.
- **3.1 (testes das funções puras)** — **subir a prioridade**. A spec nova mexe em
  cálculo de dinheiro e cria casos de borda de data, e a janela é ideal: base zerada e
  app não lançado.

### 2.3 Item que pode ser fechado

O bug latente das duas grafias de `'reposicao'` — se você já corrigiu o
`financasService.js`, some. Vale conferir se havia item aberto para isso.

---

## 3. `docs/README.md` (índice)

Acrescentar na lista de specs:

```
- specs/reposicoes-e-competencia.md — fila de reposições, competência de cobrança,
  prazo de validade e extrato do ciclo.
```

---

## 4. `contexto-personalapp-para-novas-conversas.md`

Duas correções, ambas na parte que hoje está **errada**.

### 4.1 Seção 1 — "usuário final real"

Onde está:

> O app está em produção e é usado de verdade. Bug em cálculo financeiro afeta cobrança
> de aluno real.

Trocar por algo como:

> O app está publicado, mas **ainda não foi lançado oficialmente**. A base de produção é
> usada para teste e limpa em seguida — hoje está zerada. Não há dado real em risco, o
> que torna esta a melhor janela para mudanças estruturais e para escrever testes.
> **Essa janela fecha no lançamento.**

### 4.2 Seção 3.4 — testes

Manter o registro dos dois bugs financeiros que escaparam (eles aconteceram), mas ajustar
a consequência: não afetaram cobrança de aluno real.

### 4.3 Seção 8 — estado atual

- Registrar a spec nova como **proposta, não implementada**.
- Registrar que a grafia `'reposicao'` foi normalizada.
- Atualizar os gatilhos de v6 da spec de Finanças: o de reposições **já disparou**.

### 4.4 Seção 7 — erros

Vale acrescentar um quinto:

> **5. Presumir que a fila de reposição era persistida.**
> Discuti regras de cobrança sobre a fila por um bom tempo antes de verificar que
> `aulasParaRepor` é só um array em memória, nunca gravado. *Lição: antes de desenhar
> regra sobre um dado, confirmar que o dado sobrevive a um reload.*

---

## 5. Ordem sugerida de commit

1. Criar `docs/specs/reposicoes-e-competencia.md`.
2. Atualizar `docs/specs/financas-ciclo-cobranca.md` para v6 (só os ponteiros).
3. Atualizar `docs/README.md` e `docs/roadmap.md`.
4. Atualizar o doc de contexto (repo + knowledge base — as duas cópias).

Nada aqui toca código, então o push na `main` é seguro apesar do deploy automático.
