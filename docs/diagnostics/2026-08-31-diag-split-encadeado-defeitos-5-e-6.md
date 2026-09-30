# Diagnóstico — defeitos 5 e 6 no split `fromDate`, encontrados em validação manual

> Origem: roteiro de teste manual das etapas 1 a 4, executado em **31/08/2026**.
> Projeto: `personalapp` (Prô Josy).
> Arquivo afetado: `assets/js/modal-acao-slot.js`, bloco `escopoRecorrencia === "fromDate"`.
> **Nenhum dos dois é regressão** das etapas 1 a 4 — ambos são anteriores e ficaram visíveis agora.

---

## 0) Resumo

A validação manual das quatro correções encontrou:

| | |
| --- | --- |
| Etapas 1, 2, 3 e 4 | fizeram o que prometeram — cenários A, B, D, E e F passaram |
| **Defeito 5** | série criada pelo split **nasce sempre infinita** e invade a irmã → **aula duplicada** |
| **Defeito 6** | série original aparada vira **casco invisível** que nunca é removido do banco |
| Questão de UX | o rótulo "excluir a série toda" não corresponde ao efeito |

Os defeitos 5 e 6 estão **no mesmo bloco de código**, a três linhas de distância.

---

## 1) Resultado da validação manual

| Cenário | O que testou | Resultado |
| --- | --- | --- |
| A | dois splits encadeados, sem alerta de conflito falso | **passou** |
| B | avulsa de ocorrência limpa e vinculada | **passou** — etapa 4 confirmada em produção |
| C | cancelar + remarcar + split de data anterior | **FALHOU** — defeito 5 |
| D | excluir série → cascata | comportamento correto, **rótulo enganoso** |
| E | excluir continuação → histórico sobrevive | **passou** tecnicamente; UX questionável |
| F | reposição preservada na exclusão da série | **passou** |
| G | reconhecer o casco fantasma | resíduo confirmado — defeito 6 |

Dados usados: aluno `Aluno Teste Roteiro`, `alunoId: 1788144603544`, série original iniciando
em **31/08/2026**, Seg/Ter/Qua, 07:00–08:00.

**Observação de método:** o defeito 5 só se manifesta com **dois splits encadeados** e edição no
meio da cadeia. Nenhuma suíte automatizada tinha esse cenário — ele apareceu porque o cenário A
do roteiro montou a cadeia antes do cenário C dividi-la.

---

## 2) Defeito 5 — a série nova nasce sempre infinita

### 2.1 Onde

`assets/js/modal-acao-slot.js`, bloco `fromDate`, **linhas ~1282–1284**:

```js
// Nova série não tem prazo de término — remove campos de encerramento herdados
delete _novaSerieFd.recorrenciaFimCondicao;
delete _novaSerieFd.recorrenciaDataFim;
```

### 2.2 A premissa errada

O comentário revela a suposição: *"nova série não tem prazo de término"*.

Isso é verdade quando você divide uma série que **ia até o infinito**. É falso quando a série
dividida **já tinha um fim** — porque ela mesma já havia sido aparada por um split anterior.

Nesse caso a série nova precisa **herdar o fim da mãe**, senão ela ultrapassa o limite e passa a
gerar aulas em cima da série irmã, que já era responsável por aquele período.

### 2.3 Reprodução com dados reais

Estado do banco após o cenário C (`alunoId: 1788144603544`):

```
id                        horário       início      fim              pai
────────────────────────────────────────────────────────────────────────────────────
1788144661888             07:00-08:00   31/08/2026  01/09/2026       —          (original)
1788144754435-y3f9p       07:30-08:30   02/09/2026  06/09/2026       original
1788144775165-j6u4q       08:00-09:00   09/09/2026  SEM FIM          y3f9p      excecoes: [09/09]
1788145986122-de140       09:00-10:00   07/09/2026  SEM FIM          y3f9p
1788145353378-xi35h       10:00 uma_vez 01/09/2026  —                original   (avulsa, cenário B)
ag-1788145913623-0eyu2h   15:00 uma_vez 09/09/2026  —                —          (reposição)
```

`j6u4q` e `de140` são **irmãs** — mesma mãe `y3f9p` — e **ambas infinitas**, com janelas
sobrepostas para sempre.

Agenda gerada pelo motor real do app:

```
07/09 Seg   09:00 [de140]
08/09 Ter   09:00 [de140]
09/09 Qua   15:00 *repo   |  09:00 [de140]
14/09 Seg   08:00 [j6u4q] |  09:00 [de140]   <<< DUPLICADO
15/09 Ter   08:00 [j6u4q] |  09:00 [de140]   <<< DUPLICADO
16/09 Qua   08:00 [j6u4q] |  09:00 [de140]   <<< DUPLICADO
```

Confirmado nas duas pontas: app e Google Calendar mostravam os dois cards.

### 2.4 A sequência que produz o defeito

1. série original criada, Seg/Ter/Qua, infinita;
2. split em **02/09** → original aparada até 01/09, nasce `y3f9p` **infinita**;
3. split em **09/09** → `y3f9p` aparada até **08/09**, nasce `j6u4q` infinita;
4. split em **07/09**, ou seja **dentro** da janela de `y3f9p` → `y3f9p` re-aparada até 06/09,
   nasce `de140` **infinita**;
5. `de140` não sabe que `j6u4q` existe e assume tudo de 07/09 em diante → **colisão permanente**.

### 2.5 Efeito colateral no mesmo caso

O dia **09/09** também aparece errado: `de140` gera aula às 09:00 num dia que foi enviado para
reposição. A exceção de 09/09 está registrada em **`j6u4q`**, que é a **irmã** de `de140`, não a
mãe. A mãe (`y3f9p`) tem `excecoes: []`.

**A etapa 3 funcionou corretamente aqui.** O filtro recebeu lista vazia da mãe, filtrou, devolveu
vazia. Não havia o que herdar. Se `de140` tivesse nascido com fim em 08/09 — a correção do
defeito 5 — ela nem alcançaria o dia 09/09.

### 2.6 Correção proposta

Quando a série sendo dividida **tem** `recorrenciaDataFim`, a série nova deve herdar esse fim, em
vez de apagá-lo. Só apagar quando a mãe for genuinamente infinita.

Cuidado: a decisão precisa olhar o valor **antes** do re-aparo da mãe, porque o mesmo bloco
sobrescreve `recorrenciaDataFim` da original no processo.

---

## 3) Defeito 6 — o casco invisível

### 3.1 Onde

`assets/js/modal-acao-slot.js`, bloco `fromDate`, **linhas ~1228–1240**:

```js
const _serieOriginalVaziaFd =
  _dataFimRecorrenciaFd && _dataInicioEfeitoFd &&
  _dataFimRecorrenciaFd < _dataInicioEfeitoFd;

if (_serieOriginalVaziaFd) {
  const _indiceSerieOriginalFd = aulas.findIndex(
    (item) => item && item.id === compromisso.id,
  );
  if (_indiceSerieOriginalFd >= 0) {
    aulas.splice(_indiceSerieOriginalFd, 1);
  }
}
```

### 3.2 A pergunta errada

A checagem pergunta **"a janela ficou invertida?"**. A pergunta correta é
**"sobrou alguma ocorrência?"**.

Quando o corte cai numa **segunda-feira**, o `UNTIL` vai para o **domingo anterior**. A janela
fica com um dia só — e esse dia não é dia de aula. A comparação de datas dá falso, a série não é
removida, mas ela **não gera nenhuma ocorrência**.

### 3.3 Caso real já no banco de produção

Documento observado na collection `agendamentos`:

```js
{
  id: '1788104932657',
  diasSemana: ['Segunda', 'Terça', 'Quarta'],
  recorrenciaDataInicio: '30/08/2026',
  recorrenciaDataFim:    '30/08/2026',   // 30/08/2026 é DOMINGO
  recorrenciaFimCondicao: 'untilDate',
  googleCalendarEventId: 'app1bd18453cdd1703a786c5c76cdacb54a030e106048090618dcbbd43b0092583e'
}
```

Verificação com o motor real:

```
janela = um único dia: 30/08/2026 → Domingo
diasSemana da série   = Segunda, Terça, Quarta
ocorrências geradas em 25/08 .. 09/09 = 0

teste do código: 30/08/2026 < 30/08/2026  →  false  →  NÃO removeu
```

### 3.4 O que custa hoje

| | |
| --- | --- |
| Aparece no app | não — zero ocorrências |
| Aparece no Google | não — `UNTIL` em domingo, o Google também expande zero |
| Gera conflito fantasma | não — a etapa 1 fez a serialização respeitar o `UNTIL` |
| Ocupa espaço no banco | **sim**, e acumula a cada split em segunda-feira |
| Ocupa um `googleCalendarEventId` determinístico | **sim** |
| Removível pela interface | **não** — é invisível, não há o que clicar |

### 3.5 Correção proposta

Substituir a comparação de datas por uma verificação de ocorrência real: se a série aparada não
produz nenhuma ocorrência dentro da janela resultante, remover o registro.

O motor para isso já existe (`checarCompromissoNaData` / helpers de recorrência).

---

## 4) Por que os dois podem virar uma etapa só

Estão no mesmo bloco, a três linhas de distância:

```
~1228–1240   defeito 6 — teste de série vazia
~1242–1263   filtro de exceções (etapa 3, já corrigido)
~1265–1281   criação da série nova
~1282–1284   defeito 5 — apaga o fim herdado
```

Além da proximidade, **as mutações de um passam pelo caminho do outro**: mudar o teste de série
vazia altera quais séries sobrevivem, o que altera quais mães têm `recorrenciaDataFim` para a
nova herdar. Corrigir separado obriga a refazer o mesmo raciocínio duas vezes.

Recomendação: **uma etapa cobrindo os dois**, com mutações independentes para cada um.

---

## 5) Cenário de teste — usar os dados reais

O caso mínimo que reproduz o defeito 5, para virar teste automatizado:

```
1. série S0: Seg/Ter/Qua, 07:00, início 31/08/2026, infinita
2. split em 02/09  → S0 até 01/09 | S1 (07:30) infinita
3. split em 09/09  → S1 até 08/09 | S2 (08:00) infinita
4. split em 07/09, DENTRO da janela de S1

ESPERADO:  S3 nasce com recorrenciaDataFim = 08/09/2026  (herdado de S1)
ATUAL:     S3 nasce infinita  → duplica com S2 em 14, 15 e 16/09
```

Asserção decisiva: **14/09/2026 tem exatamente uma aula**.

Para o defeito 6:

```
série Seg/Ter/Qua, split numa SEGUNDA-FEIRA
→ original recebe UNTIL no domingo anterior
ESPERADO:  a série original é removida (zero ocorrências)
ATUAL:     permanece no banco como casco invisível
```

### 5.1 Consulta para achar casos já em produção

Séries irmãs infinitas sobrepostas — o defeito 5 já gravado:

```js
// séries sem fim que compartilham o mesmo pai
db.agendamentos.aggregate([
  { $match: { ownerEmail: 'luccaspalumbo@gmail.com',
              frequencia: 'semanal',
              serieOrigemId: { $ne: null },
              recorrenciaDataFim: { $in: [null, ''] } } },
  { $group: { _id: '$serieOrigemId', filhas: { $sum: 1 },
              ids: { $push: '$id' }, horarios: { $push: '$horarioInicio' } } },
  { $match: { filhas: { $gte: 2 } } }
])
```

**Se retornar algo de aluno real, essa série está duplicando aula agora.**

Cascos do defeito 6:

```js
db.agendamentos.find(
  { ownerEmail: 'luccaspalumbo@gmail.com',
    recorrenciaFimCondicao: 'untilDate',
    $expr: { $eq: ['$recorrenciaDataInicio', '$recorrenciaDataFim'] } },
  { _id: 0, id: 1, diasSemana: 1, recorrenciaDataInicio: 1, googleCalendarEventId: 1 }
)
```

---

## 6) Questão de UX levantada na validação — registrada, não decidida

> Observação do dono do produto, cenários D e E.

### 6.1 O problema

O botão diz **"excluir a série toda"**, mas executa semântica de **descendentes**:

```
resolverFamiliaSerie              definido, 7 usos   → cadeia COMPLETA (sobe e desce)
resolverFamiliaDescendenteSerie   definido, 1 uso    → só desce
removerFamiliaSerie               →  usa  resolverFamiliaDescendenteSerie
```

A etapa 2 fez isso deliberadamente, e está correto para o cenário E — excluir a continuação não
deve apagar o histórico. **O problema é o rótulo, não a função.**

No cenário D, excluir as duas séries duplicadas deixou as ancestrais aparadas, cada uma gerando
uma única aula:

```
31/08 Seg  07:00  [original, até 01/09]
01/09 Ter  10:00  *avulsa
02/09 Qua  07:30  [y3f9p, até 06/09]
09/09 Qua  15:00  *reposição
→ 4 aulas no mês. A recorrência Seg/Ter/Qua acabou.
```

Não é bagunça aleatória: são fósseis de séries aparadas. Mas o resultado surpreende quem clicou
em "excluir a série toda".

### 6.2 Desenho proposto

Três ações explícitas, cada uma ligada ao resolver correto:

| Botão | Resolver | Efeito |
| --- | --- | --- |
| Excluir esta aula | — | exceção na série + remove a avulsa do dia |
| **Excluir daqui pra frente** | `resolverFamiliaDescendenteSerie` | apara a série com `UNTIL` + remove descendentes |
| **Excluir a série toda** | `resolverFamiliaSerie` | sobe até a raiz e remove a cadeia inteira |

O motor já existe — `resolverFamiliaSerie` está implementado e testado desde a etapa 2. O
trabalho é de ligação e de rótulo, não de algoritmo.

### 6.3 Dependência de ordem

O botão "excluir daqui pra frente" vai **reusar o código de aparar do split** — exatamente onde
vivem os defeitos 5 e 6. Se ele entrar antes das correções, herda os dois.

**Ordem obrigatória:** defeitos 5 e 6 primeiro, redesenho da exclusão depois.

### 6.4 Ideia de fundo — agrupar a cadeia na interface

Hoje a cadeia de uma mesma aula recorrente aparece como vários compromissos independentes. No
cenário C, dois cards marcados "Recorrente" no mesmo dia. Para quem usa o app, uma aula recorrente
é **uma coisa** — o split é decisão de implementação vazando para a tela.

A interface poderia resolver a cadeia com `resolverFamiliaSerie` e apresentar um único
compromisso, com o histórico como detalhe interno:

```
Aluno Teste Roteiro — Seg/Ter/Qua
desde 31/08 · atualmente 09:00–10:00
3 alterações de horário
```

Assim "excluir a série toda" fica autoexplicativo, porque o que está na tela **é** a série toda.

**Isto é apresentação, não correção.** Não resolve os defeitos 5 e 6 — dado errado no banco não
se conserta na tela. É escopo grande e fica registrado como direção, não como próximo passo.

---

## 7) Estado do ambiente de teste

O banco do aluno de teste (`1788144603544`) ficou com 4 documentos residuais, sem recorrência
ativa após 02/09. **Não serve para novas validações.** Recomendado apagar as entradas pelo app e
criar série nova quando os testes voltarem.

---

## 8) Prioridade

**Nada neste documento é regressão.** Os defeitos 5 e 6 são anteriores às etapas 1 a 4 e não
foram introduzidos por elas. Ambos esperam.

Ordem recomendada:

1. **Validação em produção da renovação do canal — 01 a 02/09/2026.**
   O canal expira em **02/09**. Janela não repetível. Prioridade acima de todo o resto.
2. Merge da etapa 4.
3. **Etapa 5** — defeitos 5 e 6 juntos, no bloco `fromDate`.
4. Decisão sobre limpeza retroativa: séries irmãs sobrepostas e cascos já gravados.
5. **Etapa 6** — redesenho dos três botões de exclusão.
6. Rodada de documentação: os relatórios de 30/08 e este de 31/08 não constam na tabela **9.17**
   de `docs/specs/gcal-sync.md`, que segue na **versão 7** com "Defeitos em aberto: 2" — número
   que já não corresponde à realidade.
7. Séries antigas com `DTSTART` defeituoso: **anotar quais são antes** de reeditar.
