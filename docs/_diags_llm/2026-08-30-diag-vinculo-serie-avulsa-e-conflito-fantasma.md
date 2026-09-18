# Diagnóstico — vínculo série↔avulsa, conflito fantasma e duplicação de aulas

> **Data**: 2026-08-30 · **Tipo**: diagnóstico, sem alteração de código
> **Origem**: comportamento relatado pela usuária ao editar a primeira segunda-feira de uma
> recorrência Seg/Ter/Qua criada em 30/08/2026.
> **Base auditada**: `main` após as rodadas F, G, H e I (suíte em 122/122).
> **Método**: execução do código real — handler de `modal-acao-slot.js` carregado via `vm` com o
> harness de `backend/test/gcal-duplicata-fix.test.js`, mais `gcalSyncService.montarEventoGoogle`
> e a cadeia `shared/recurrence-helpers.js` → `calendario-engine.js` → `agenda-conflitos.js`.
> Nenhum achado abaixo vem de leitura de código sem execução.

---

## 1. Resumo executivo

Foram reproduzidos **quatro defeitos**, todos com a mesma raiz: **aulas derivadas de uma série
não guardam vínculo com ela**, e a série aparada por um split não carrega seu próprio teto para
o algoritmo de conflito.

| # | Defeito | Sintoma para a usuária | Gravidade |
| --- | --- | --- | --- |
| 1 | Serialização para conflito perde `UNTIL` | "Conflito" com aulas da própria recorrência | **Alta** |
| 2 | Split zera `excecoes` | Aulas duplicadas no app e no Mongo | **Alta** |
| 3 | Avulsa sem vínculo com a série | "Excluir a série" deixa aulas para trás | **Alta** |
| 4 | Avulsa herda vínculo/campos da avó | Latente; dado incoerente no banco | Média |

O que **já está correto** e não deve ser tocado está na seção 7.

---

## 2. Defeito 1 — a serialização para conflito perde o fim da série

### Onde

`assets/js/agenda-conflitos.js`, `getCompromissoSerializadoParaConflito`, linhas 14–32.

A função copia 15 campos do compromisso. **Não copia `recorrenciaFimCondicao` nem
`recorrenciaDataFim`.**

### Evidência

O motor de recorrência respeita o teto corretamente:

```
T1 — checarCompromissoNaData com série UNTIL=01/09/2026
  2026-08-31 -> true
  2026-09-01 -> true
  2026-09-02 -> false
  2026-09-07 -> false
  2026-09-14 -> false
```

Mas o candidato serializado a partir da **mesma** série perde o teto e vira série infinita:

```
T2 — candidato tem recorrenciaDataFim? false | fimCondicao? false
  candidato ocorre em 2026-09-07 -> true      (deveria ser false)
  candidato ocorre em 2026-09-14 -> true      (deveria ser false)
  datas geradas para checagem: 20, de 31/08/2026 até 13/10/2026
```

Com a série original aparada por um split (UNTIL=01/09) e a série de continuação (`S2`,
`serieOrigemId: 'S1'`) existindo a partir de 02/09:

```
T3 — conflitos reportados: 18
  -> 02/09/2026  09:00 - 10:00  (id S2)
  -> 07/09/2026  09:00 - 10:00  (id S2)
  -> 08/09/2026  09:00 - 10:00  (id S2)
  -> 09/09/2026  09:00 - 10:00  (id S2)
  -> 14/09/2026  09:00 - 10:00  (id S2)
  -> 15/09/2026  09:00 - 10:00  (id S2)
  ... (18 no total)
```

**A série colide com a sua própria continuação.** É exatamente a mensagem de conflito que a
usuária viu ao editar a primeira segunda-feira.

### Agravante

Em todos os pontos de checagem de `modal-acao-slot.js` o filtro é
`{ ignorarIds: [compromisso.id] }` — linhas **977**, **1023**, **1099**, **1160** e **1183**.
Só a série que está sendo editada é ignorada. Séries irmãs de split e avulsas descendentes
entram na conta como se fossem compromisso de outro aluno.

### Correção proposta

Acrescentar dois campos à serialização:

```js
recorrenciaFimCondicao: compromisso.recorrenciaFimCondicao || null,
recorrenciaDataFim: compromisso.recorrenciaDataFim || null,
```

É a mudança de **menor custo e maior efeito** de todo este diagnóstico. Não depende das demais.

---

## 3. Defeito 2 — o split apaga as exceções futuras

### Onde

`assets/js/modal-acao-slot.js`, bloco `fromDate`, linhas **1144–1145**:

```js
excecoes: [],
excecoesDetalhadas: [],
```

### Evidência

```
S2 — ANTES: série com exceção em 07/09 + avulsa A1 em 07/09 às 11:00 (aula remarcada)
  série original: UNTIL=01/09/2026   excecoes=["07/09/2026"]
  série NOVA:     início=02/09/2026  excecoes=[]
  avulsa A1 continua existindo: true
```

A série nova começa em 02/09 e **não herda a exceção de 07/09**. Resultado: volta a gerar aula
às 09:00 em 07/09, enquanto a avulsa das 11:00 permanece no banco. **Duas aulas no mesmo dia** —
é a duplicação observada no Mongo.

### Correção proposta

Em vez de zerar, **filtrar** as exceções mantendo apenas as com data **maior ou igual** ao ponto
de corte. As anteriores pertencem à série original e devem continuar nela.

---

## 4. Defeito 3 — aula avulsa não tem vínculo com a série de origem

### Onde

- Criação da avulsa: `modal-acao-slot.js`, escopo `occurrence`, linhas **1003–1016**.
- Exclusão da série: `modal-acao-slot.js`, `btnDeletarSerie`, linhas **1588–1602**.

### Evidência

```
S1 — editar UMA ocorrência e depois "excluir a série"
  registros após editar 1 ocorrência: 2
  série.excecoes: ["31/08/2026"]
  avulsa: freq=uma_vez data=31/08/2026 09:00-10:30
  campos de vínculo na avulsa:
     serieOrigemId=undefined  serieMaeId=undefined
     origemSerieId=undefined  parentId=undefined
  APÓS "excluir a série": 1 registro restante (uma_vez, 31/08/2026)
```

A série ganha a data em `excecoes`, mas a avulsa **não guarda de quem veio**. A exclusão remove
um único registro por ID:

```js
const _idxSerie = aulas.findIndex((a) => a.id === window.idCompromissoSelecionado);
if (_idxSerie !== -1) aulas.splice(_idxSerie, 1);
```

Não há como cascatear — o vínculo não existe. A mensagem de confirmação promete *"remove a
recorrência inteira, incluindo as aulas futuras"* e entrega menos que isso.

### Sobre o campo `serieOrigemId`

Existe, mas está **morto**. Duas ocorrências em todo o projeto:

```
modal-acao-slot.js:1146   serieOrigemId: compromisso.id,              (escrita — só no split)
modal-acao-slot.js:1592   if (_serieDeletar && _serieDeletar.serieOrigemId) {   (leitura — só aviso)
```

Nunca é usado para cascatear exclusão nem para filtrar conflito.

### Correção proposta

1. Avulsa de `occurrence` grava o ID da série mãe.
2. `ignorarIds` passa a receber a **família** (série mãe, continuações, avulsas descendentes).
3. Exclusão de série cascateia sobre a família, com confirmação que diga quantas aulas serão
   removidas.

---

## 5. Defeito 4 — avulsa herda vínculo e campos de recorrência da avó

### Onde

`modal-acao-slot.js`, linha **1004**: `...compromisso` copia tudo antes de sobrescrever.

### Evidência

Split encadeado — `S1` → continuação → editar uma ocorrência da continuação:

```
S3 — nova.serieOrigemId = S1                    (correto: continuação de S1)
     avulsa.serieOrigemId = S1                  (ERRADO)
     mãe real da avulsa   = 1788101186266-3o3to
```

A avulsa se declara continuação da **avó**. Herda também `tipoRecorrencia`, `diasSemana` e
`recorrenciaDataInicio` — dados de recorrência num registro que é aula única:

```
S6 — avulsa mantém tipoRecorrencia=semanal  diasSemana=["Segunda","Terça","Quarta"]
     recurrence gerado para o Google: undefined
     guarda por frequencia="uma_vez" impede o RRULE — mas os campos ficam no banco
```

Hoje **não vaza para o Google**, porque `montarRecurrence` tem gate duplo
(`frequencia !== 'semanal'` e `tipoRecorrencia === 'uma_vez'`). É defeito **latente**: qualquer
mudança nesse gate transforma a avulsa em série.

### Correção proposta

Ao criar a avulsa, remover explicitamente `serieOrigemId` herdado (e gravar o correto),
`tipoRecorrencia`, `diasSemana`, `recorrenciaDataInicio`, `recorrenciaFimCondicao`,
`recorrenciaDataFim` e `recorrenciaEscopo`.

---

## 6. Paridade com o Google Calendar

O objetivo declarado é que o calendário do app e o do Google se comportem de forma parecida,
para reduzir a curva de aprendizado. Estado atual:

| Ação | Google Calendar | App hoje | Paridade |
| --- | --- | --- | --- |
| Cancelar um dia | `EXDATE` na série | `excecoes` → `EXDATE` | **igual** |
| "Esta e as futuras" | apara com `UNTIL` + série nova | apara com `UNTIL` + série nova | **igual** |
| Editar uma ocorrência | instância modificada **dentro** da série | registro **independente**, sem vínculo | **diverge** |
| Excluir a série | apaga tudo, inclusive as modificadas | avulsas **sobrevivem** | **diverge** |
| Conflito com a própria série | não existe | 18 falsos positivos | **diverge** |

A divergência de fundo é **uma só**: no Google a instância modificada continua pertencendo à
série; no app ela se solta. Resolver o vínculo alinha exclusão, conflito e duplicação de uma vez.

---

## 7. O que está correto — não mexer

Verificado por execução nesta auditoria:

- **Alinhamento `DTSTART`/`BYDAY`.** Série Seg/Ter/Qua criada no domingo 30/08:

  ```
  DTSTART: 2026-08-31T09:00:00 (Segunda)
  RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE
  ```

  O `DTSTART` é alinhado para a primeira segunda — o Google não gera ocorrência que o app não
  mostra.
- **Bordas de `EXDATE`.** Com `UNTIL=20260901T235959Z`, exceção em 07/09 é corretamente
  descartada do payload.
- **Avulsa vai como evento único**, sem `recurrence` — equivale à instância modificada do Google.
- **`checarCompromissoNaData` respeita o `UNTIL`** (o defeito 1 está na serialização, não no
  motor).
- Ordem do `DELETE` (Google antes do Mongo), normalização de acento em `diasSemana`, teto de
  pendência server-side, `gcalSyncPausado`, remoção do `DELETE` redundante no split (rodada F).

---

## 8. Roadmap do fix — etapas e branches

Regra de trabalho acordada: **uma branch por etapa**, e **nenhum item escapa de uma etapa para a
outra**. Se aparecer defeito dentro de uma etapa, ele é corrigido **naquela** branch até fechar,
antes de abrir a próxima.

### Etapa 1 — conflito fantasma

- **Branch**: `fix/conflito-serializacao-until`
- **Arquivo**: `assets/js/agenda-conflitos.js`
- **Escopo**: acrescentar `recorrenciaFimCondicao` e `recorrenciaDataFim` à serialização.
- **Critério de saída**: teste que reproduz os 18 conflitos passa a reportar 0; mutação que
  remove qualquer um dos dois campos faz o teste falhar.
- **Não entra aqui**: vínculo de família, `ignorarIds`, exclusão, exceções do split.

### Etapa 2 — vínculo de família

- **Branch**: `fix/vinculo-serie-familia`
- **Arquivos**: `modal-acao-slot.js` (criação da avulsa, `ignorarIds`, exclusão da série).
- **Escopo**: avulsa grava a série mãe; helper de resolução de família; `ignorarIds` passa a
  receber a família; exclusão cascateia.
- **Critério de saída**: após "excluir a série", zero registros descendentes restantes; mutação
  que remove a cascata faz o teste falhar.
- **Depende da etapa 1** (o `ignorarIds` de família só faz sentido com a serialização correta).

### Etapa 3 — preservar exceções no split

- **Branch**: `fix/split-preserva-excecoes`
- **Arquivo**: `modal-acao-slot.js`, linhas 1144–1145.
- **Escopo**: filtrar exceções pelo ponto de corte em vez de zerar.
- **Critério de saída**: cenário S2 deixa de produzir aula duplicada em 07/09.

### Etapa 4 — higiene da avulsa

- **Branch**: `fix/avulsa-limpa-campos-recorrencia`
- **Arquivo**: `modal-acao-slot.js`, criação da avulsa.
- **Escopo**: remover campos de recorrência herdados; corrigir o `serieOrigemId` da avó.
- **Critério de saída**: avulsa criada a partir de uma continuação não carrega
  `tipoRecorrencia`, `diasSemana` nem `serieOrigemId` da avó.

### Regra comum a todas as etapas

- Zero mudança fora dos arquivos listados na etapa.
- Toda correção precisa de teste que **falhe sob mutação** no arquivo de produção.
- Nenhum relatório de item fechado é editado; correção posterior vai em relatório novo.
- Suíte tem que sair da etapa com o total **maior ou igual** ao de entrada, zero falhas.

---

## 9. Fila de risco fora deste diagnóstico

1. **Validação em produção da renovação do canal, 01–02/09/2026** — o canal expira em 02/09.
   Janela não repetível.
2. **Reeditar à mão as séries antigas com `DTSTART` defeituoso.** Anotar quais são **antes** de
   mexer: depois de corrigidas não há como identificá-las.
3. Gatilho triplo de sincronização no boot (§9.14 da spec / item 2.2 do roadmap).
