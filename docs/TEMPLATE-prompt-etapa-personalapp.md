# Template — prompt de etapa para agente executor (padrão `personalapp`)

> **Para que serve este arquivo.** Registrar o formato de prompt que funcionou nas etapas 1 a 4 do
> fix de vínculo série↔avulsa, para que ele não se perca. Quando um prompt novo fugir deste
> desenho, mande este arquivo de volta como lembrete.
>
> **Premissa.** O modelo do outro lado é **executor, não planejador**. Ele obedece bem instrução
> verificável e improvisa mal em instrução narrativa. Todo bloco abaixo existe para transformar
> julgamento em verificação.
>
> Duas partes: **Parte A** — esqueleto anotado. **Parte B** — exemplo real completo.

---

# Parte A — Esqueleto anotado

## Bloco 1 — Cabeçalho de identidade

```markdown
# Prompt — Etapa N: <o defeito em uma frase, na voz do usuário>

> Prompt autossuficiente. Pode ser usado em conversa nova.
> Projeto: `personalapp` — agenda de personal trainer (Prô Josy).
> **Etapa N de M — <o que fecha>.** Branch nova.
> **Defeito ATIVO / LATENTE:** <o que acontece hoje, em uma linha>.
> **Escopo mínimo:** <o tamanho real da mudança>. Não ampliar.
```

**Por que.** "Autossuficiente" impede o agente de pedir contexto. Dizer se o defeito é **ativo**
(grava dado errado agora) ou **latente** (protegido por uma cláusula frágil) calibra o cuidado. O
tamanho declarado — "um termo de uma condição, um teste" — é a defesa contra refactor espontâneo.

## Bloco 2 — Contexto opcional, com caminho completo

```markdown
> **Contexto opcional** em `docs/`: `_reports/<arquivo>.md` (a **seção X** é o diagnóstico deste
> defeito) e `specs/<spec>.md` item Y. Ler ajuda, **não é obrigatório** — este prompt traz o
> necessário.
```

**Por que.** Caminho completo, sempre — referência solta pelo nome faz o agente procurar no lugar
errado e seguir sem avisar. Apontar a **seção** economiza leitura. E declarar "não é obrigatório"
evita que ele pare esperando arquivo que não achou.

## Bloco 3 — Ambiente

```markdown
## Ambiente
- **Windows 11 / PowerShell.** Repositório em `E:\Projetos\GIT\personalapp`.
- Comandos: **um por linha**, sem `&&`. Usar `Select-String`, não `grep`.
- Se a sessão estiver em `/workspaces/...` (Codespaces/Linux), traduzir para POSIX e **dizer isso
  no relatório**.
- Não existe backend local nem `npm run dev`. Tudo roda por `npm test` em `backend/`.
```

**Por que.** O agente tenta `&&` no PowerShell e perde turnos. E se não disser que não há ambiente
local, ele inventa um `npm run dev`.

## Bloco 4 — Branch e permissões de git

```markdown
## Branch — criar nesta etapa
Branch desta etapa: **`fix/<nome>`**, a partir de `main` **depois** do merge da etapa anterior.

O agente **não roda git para alterar estado**. Permitido (só leem): `git rev-parse`,
`git status`, `git diff`. Proibido: `commit`, `push`, `branch`, `checkout`, `reset`, `restore`,
`stash`.

No portão de base, **confirmar** que a branch atual é essa. Se estiver em `main` ou em outra,
**parar e reportar** pedindo a criação.

A pergunta de branch exigida pela §11 das instruções deve ser feita **uma única vez, antes da
primeira edição**. Não repetir depois de já ter editado arquivos.
```

**Por que.** Lista literal de verbos proibidos funciona; "cuidado com git" não. A regra da pergunta
única existe porque já aconteceu o agente perguntar duas vezes, a segunda com tudo alterado.

## Bloco 5 — Skills

```markdown
## Skills
**Sem skills de validação.** Não invocar `/rubber-duck` nem equivalente.
```

**Por que.** Uma linha evita que ele gaste a rodada em auto-avaliação em vez de código.

## Bloco 6 — Tabela de etapas

```markdown
## Regra de etapa — nada escapa
| Etapa | Defeito | Situação |
|---|---|---|
| 1 | ... | **fechada, em `main`** |
| N | **esta** | — |

Defeito fora do escopo: **anotar no relatório** com arquivo e linha, e **não corrigir aqui**, salvo
se impedir o fechamento — caso em que se corrige nesta branch e se registra por quê.
```

**Por que.** Dá ao agente um lugar legítimo para colocar o que ele encontrar. Sem isso, ele escolhe
entre corrigir por conta própria (escopo estourado) ou calar (defeito perdido).

## Bloco 7 — Portão de base ⭐

O bloco mais importante do formato.

```markdown
## Portão de base — executar ANTES de editar

```powershell
Get-Location
git rev-parse --abbrev-ref HEAD
git status --short
Select-String -Path 'assets\js\<arquivo>.js' -Pattern '<simbolo-da-etapa-atual>'
Select-String -Path 'assets\js\<arquivo>.js' -Pattern '<simbolo-da-etapa-anterior>'
```

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
```

### Valores esperados
| Verificação | Esperado |
| --- | --- |
| branch | `fix/<nome>` |
| `<simbolo>` | **N ocorrências** (~linha) — a etapa X está na base |
| `npm test` | **N testes, N aprovados, zero falhas** |

**Parar e reportar** se `<simbolo>` não aparecer: a etapa anterior não está na base.

**Colar a saída literal no relatório.**
```

**Por que.** Contagem de ocorrências é o mecanismo central deste formato. Ela converte "as etapas
anteriores continuam intactas" — que é julgamento — em um número que fecha ou não fecha. Cada
símbolo contado é a assinatura de uma correção anterior.

**Como levantar os números.** Rodar `Select-String` no repo antes de escrever o prompt. Número
chutado é pior que número ausente: manda o agente parar sem motivo.

## Bloco 8 — O defeito

```markdown
## O defeito
### Onde
`<arquivo>`, `<função ou escopo>`, **linhas ~N–M**:

```js
// trecho real, copiado do arquivo, com o ponto marcado
```

### Comportamento observado
```
saída real de execução, lado a lado com o esperado
```

### Por que é alcançável em uso real
<a cadeia concreta, com ids e datas do banco>

### Por que o código está assim — e o que precisa continuar coberto
<a razão legítima da linha errada, e qual teste depende dela>
```

**Por que.** "Comportamento observado" precisa ser execução, não teoria. E a última subseção é a
que impede a correção destrutiva: se o agente não souber **por que** aquela linha existe, ele
apaga e quebra outro teste.

## Bloco 9 — Itens numerados, com requisitos e proibições

```markdown
## Item 1 — <ação>
### Requisitos
- <verificável>
- **Reusar `<variável existente>`**, declarada em ~linha. Não criar variável nova.
- **Não mexer** em <bloco>, que é a correção da etapa X e está certa.

### O que **não** fazer
**Não <a tentação óbvia>.** <por quê>
```

**Por que.** O "o que não fazer" em cada item é onde o escopo é realmente contido. Apontar a
variável que já existe elimina a chance de ele escrever parser ou helper redundante.

## Bloco 10 — Critério de aceitação por mutação ⭐

```markdown
## Critério de aceitação — não negociável
Aplicar as mutações **no arquivo de produção**, **uma por vez**, e **colar a saída de cada uma**:

### A correção desta etapa
| # | Mutação | Resultado exigido |
| --- | --- | --- |
| A | <reverter a correção> | **o teste novo FALHA** |
| B | <a correção preguiçosa que passa em A> | **o teste da linha N FALHA** |

### Guardas — as etapas anteriores continuam protegidas
| # | Mutação | Resultado exigido |
| --- | --- | --- |
| C | <reverter etapa anterior> | **≥ 1 teste FALHA** |

**<X> é a mutação mais importante desta etapa.** <por quê>

**Restaurar o arquivo após cada mutação.** Provar a restauração com um `npm test` final em **N** ou
mais, zero falhas.

Se alguma mutação não derrubar teste, **o item correspondente não está entregue** — dizer isso no
relatório em vez de declarar conclusão.
```

**Por que.** Teste que passa no código antigo não é cobertura. A mutação B — a "correção
preguiçosa" — é a invenção mais útil deste formato: ela é a solução parcial que satisfaz a mutação
A e mesmo assim está errada. Sem ela, o agente entrega meia correção com suíte verde.

## Bloco 11 — Restrições, arquivo por arquivo

```markdown
## Restrições — linhas explícitas
- **Alterar apenas**: <lista fechada de caminhos>.
- **Não alterar nada em `backend/src/`.** Se parecer necessário, **parar e reportar**.
- **Não alterar** <arquivos vizinhos, nominalmente>.
- **Não alterar** os N testes existentes. Acrescentar um.
- **Não adicionar** chamada de rede. `apiFetchBackend` continua com **N ocorrências**.
- **Não escrever migração de dados.** **Não executar limpeza em produção.**
- **Não adicionar dependência.** Sem `'use strict'`, sem lint, sem formatação em massa.
- **Não colar blocos de código no chat.** Editar os arquivos e relatar em texto.
```

**Por que.** Escopo explícito por caminho é o que impede edição colateral. "Não adicionar
dependência / sem formatação em massa" evita o diff de 400 linhas que ninguém consegue revisar.

## Bloco 12 — Regra de honestidade ⭐

```markdown
## Regra de honestidade
1. **Prova é mutação no arquivo real seguida de `npm test`, com a saída colada.**
2. **Se a mutação não aplicar, isso não é "não falha".** Conferir que o arquivo mudou antes de
   rodar — `.replace` que não casa produz falso negativo.
3. **Teste que constrói o objeto que depois verifica não é teste.** Idem `assert.match` sobre
   texto-fonte.
4. **A asserção decisiva é <a asserção>.** Sem ela, o teste não prova nada.
5. **Não declarar item concluído sem `git diff` mostrando a mudança.**
6. **A pergunta de branch é uma só**, no início.
7. Se algo não puder ser feito, **dizer isso**. Impedimento reportado vale mais que evidência
   fabricada.
```

**Por que.** A regra 2 é a mais valiosa do arquivo inteiro. Mutação aplicada com `.replace` que não
casa produz "o teste não falhou" — indistinguível de teste fraco. Já aconteceu mais de uma vez.

## Bloco 13 — Portão de saída e relatório

```markdown
## Portão de saída — colar saída LITERAL no relatório
```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
Select-String -Path '<arquivo>' -Pattern '<simbolo>'
```

- `npm test`: **zero falhas**, total **≥ N**.
- `<simbolo que deve MUDAR>`: **N ocorrências** — caiu/subiu porque <motivo>.
- `<simbolo que deve FICAR>`: **N ocorrências** — etapa X intacta.
- `git diff --stat` **precisa listar**: <lista>.
- `git diff --stat` **não pode listar**: <lista>. Se listar, reverter o excedente e reportar.

## Relatório — último item, obrigatório
Gravar em **`docs/_reports/<AAAA-MM-DD>-<slug>.md>`**, com a data real da execução, contendo:
1. Saída **literal** do portão de base.
2. ... (lista numerada, um item por exigência do prompt)
N. Saída **literal** do portão de saída. **Defeitos encontrados e não corrigidos**, com arquivo e
   linha.
```

**Por que.** Contagens que **devem mudar** são a prova positiva de que a correção entrou; as que
**devem ficar** são a prova negativa de que nada mais foi tocado. O `git diff --stat` com lista
proibida pega edição colateral que a suíte não vê. E o relatório numerado é o que permite auditar
depois: item sem resposta é item não feito.

---

# Parte B — Exemplo real completo

> Prompt da etapa 5b, escrito neste formato. Serve como referência de tom e densidade.

---

## Prompt — Etapa 5b: a filha não herda o término quando a série mãe fica vazia

> Prompt autossuficiente. Pode ser usado em conversa nova.
> Projeto: `personalapp` — agenda de personal trainer (Prô Josy).
> **Etapa 5b — fecha o buraco deixado pela etapa 5.** Branch nova.
> **Defeito ATIVO:** duplica aula na agenda real, no app e no Google. Não é latente.
> **Escopo mínimo:** um termo de uma condição, um teste. Não ampliar.

> **Contexto opcional** em `docs/`:
> `_diags_llm/2026-08-31-diag-split-encadeado-defeitos-5-e-6.md` (seção 2 = defeito 5),
> `_reports/2026-08-31-fix-split-encadeado-heranca-e-serie-vazia.md` (a etapa 5) e
> `specs/gcal-sync.md` item 9.15. Ler ajuda, **não é obrigatório**.

### Ambiente

- **Windows 11 / PowerShell.** Repositório em `E:\Projetos\GIT\personalapp`.
- Comandos: **um por linha**, sem `&&`. Usar `Select-String`, não `grep`.
- Não existe backend local nem `npm run dev`. Tudo roda por `npm test` em `backend/`.

### Branch — criar nesta etapa

Branch: **`fix/heranca-mae-vazia-split`**, a partir de `main` depois do merge da etapa 5.

O agente **não roda git para alterar estado**. Permitido: `git rev-parse`, `git status`,
`git diff`. Proibido: `commit`, `push`, `branch`, `checkout`, `reset`, `restore`, `stash`.

A pergunta de branch da §11 é feita **uma única vez**, antes da primeira edição.

### Skills

**Sem skills de validação.** Não invocar `/rubber-duck` nem equivalente.

### Regra de etapa — nada escapa

| Etapa | Defeito | Situação |
|---|---|---|
| 1 | serialização de conflito perdia `UNTIL` | **fechada, em `main`** |
| 2 | vínculo de família, `ignorarIds`, cascata | **fechada, em `main`** |
| 3 | split zerava `excecoes` | **fechada, em `main`** |
| 4 | avulsa herdava campos de recorrência | **fechada, em `main`** |
| 5 | herança de término + remoção de série sem ocorrência | **fechada, com buraco** |
| 5b | **esta** | — |

Defeito fora do escopo: anotar no relatório com arquivo e linha, e não corrigir aqui.

### Portão de base — executar ANTES de editar

```powershell
Get-Location
git rev-parse --abbrev-ref HEAD
git status --short
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_deveHerdarFimOriginalFd'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_serieOriginalVaziaFd'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_dataCorteExcecoesFd'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'checarCompromissoNaData'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_filtrarExcecoesAposData'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'familiaIgnorarIds'
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaDataFim'
```

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
```

#### Valores esperados

| Verificação | Esperado |
| --- | --- |
| branch | `fix/heranca-mae-vazia-split` |
| `_deveHerdarFimOriginalFd` | **2 ocorrências** (~1324, ~1330) — etapa 5 na base |
| `_serieOriginalVaziaFd` | **3 ocorrências** (~1241, ~1275, ~1325) |
| `_dataCorteExcecoesFd` | **3 ocorrências** — a de ~1284 é a data do corte já parseada |
| `checarCompromissoNaData` | **1 ocorrência** (~1259) — etapa 5 na base |
| `_filtrarExcecoesAposData` | **3 ocorrências** — etapa 3 na base |
| `familiaIgnorarIds` | **13 ocorrências** — etapa 2 na base |
| `recorrenciaDataFim` em `agenda-conflitos.js` | **2 ocorrências** — etapa 1 na base |
| `npm test` | **157 testes, 157 aprovados, zero falhas** |

**Parar e reportar** se `_deveHerdarFimOriginalFd` não aparecer: a etapa 5 não está na base.

**Colar a saída literal no relatório.**

### O defeito

#### Onde

`assets/js/modal-acao-slot.js`, escopo `fromDate`, **linhas ~1324–1327**:

```js
const _deveHerdarFimOriginalFd =
  !_serieOriginalVaziaFd &&                              // <- o problema
  _recorrenciaFimCondicaoOriginalFd === "untilDate" &&
  Boolean(_recorrenciaDataFimOriginalFd);
```

**Quando a série mãe fica vazia e é removida, a filha não herda nada e nasce infinita.**

#### Comportamento observado, rodando o arquivo real pelo harness da etapa 5

```
A) split no MEIO de mãe finita (até 08/09)
     fim da filha = 08/09/2026        ocorre em 14/09? false     correto

B) split na PRIMEIRA ocorrência de mãe finita (até 08/09)
     mãe removida?  true
     fim da filha = undefined         ocorre em 14/09? true      ERRADO
     esperado:      08/09/2026                         false
```

#### Por que é alcançável em uso real

É a cadeia do banco de teste. A série `1788144754435-y3f9p` vai de 02/09 a 08/09 e sua primeira
ocorrência é 02/09. Editar "esta e as futuras" em 02/09 deixa a mãe vazia — ela é removida,
corretamente — e a filha nasce infinita, colidindo com `1788144775165-j6u4q`, que responde por
09/09 em diante. Duas aulas no mesmo dia, no app e no Google.

#### Por que o termo existe — e precisa continuar coberto

No teste **`test/gcal-duplicata-fix.test.js:1705`** a mãe tem `recorrenciaDataFim: '30/08/2026'` e o
corte é `31/08/2026`. Herdar aquele fim mataria a filha antes de ela começar. O termo
`!_serieOriginalVaziaFd` evita isso, mas **pelo motivo errado**.

### Item 1 — trocar o critério de herança

```
herdar  ⟺  existe fim original  E  fim original >= data do corte
```

| Cenário | fim original | corte | herda? | resultado |
| --- | --- | --- | --- | --- |
| caso B | `08/09/2026` | `02/09/2026` | **sim** | filha termina em 08/09 |
| teste da linha 1705 | `30/08/2026` | `31/08/2026` | **não** | filha infinita — teste segue passando |
| mãe infinita | ausente | qualquer | **não** | filha infinita |

#### Requisitos

- **Remover o termo `!_serieOriginalVaziaFd`** e colocar a comparação no lugar.
- **Reusar `_dataCorteExcecoesFd`** (~1284), que já é `window.parseDataFlex(dataAlvoStr)`. **Não
  criar variável nova de data nem escrever parser** — §4.3 proíbe reimplementar regra existente.
- Se qualquer lado não parsear, **não herdar** (conservador).
- **Manter** a exigência `_recorrenciaFimCondicaoOriginalFd === "untilDate"`.
- **Não mexer** no bloco `_serieOriginalVaziaFd` (~1241–1273) nem no `aulas.splice` (~1275–1282):
  é a etapa 5 e está certa.
- **Não mexer** na captura dos valores originais (~1227–1230).

#### O que **não** fazer

**Não implementar condições de término diferentes de `untilDate`.** Contagem de ocorrências segue
fora de escopo, como decidido na etapa 5.

### Item 2 — o teste do caso B

Acrescentar **um** `test(...)` em `backend/test/gcal-duplicata-fix.test.js`, usando
`criarHarnessModalAcaoSlot`, que já existe e carrega o arquivo real via `vm`.

Invocar `form.listeners.submit(...)` do handler **registrado pelo arquivo real** e afirmar sobre o
registro que **o código** acrescentou a `aulas`. **Não** montar o objeto no teste e afirmar sobre
ele — esse antipadrão já apareceu quatro vezes neste projeto.

```
compromisso: Segunda/Terça/Quarta
  recorrenciaDataInicio: '02/09/2026'
  recorrenciaFimCondicao: 'untilDate'
  recorrenciaDataFim:     '08/09/2026'
dataAlvoStr: '02/09/2026'      <- a própria primeira ocorrência
```

Asserções:

1. a série mãe **não está mais** em `aulas`;
2. `filha.recorrenciaFimCondicao === 'untilDate'`;
3. `filha.recorrenciaDataFim === '08/09/2026'`;
4. `checarCompromissoNaData(filha, 07/09/2026)` → `true`;
5. **`checarCompromissoNaData(filha, 14/09/2026)` → `false`** — a asserção decisiva.

Os cinco testes da etapa 5 (linhas **1640, 1674, 1705, 1738, 1766**) devem continuar passando **sem
alteração**. Se algum precisar mudar, **parar e explicar antes**.

### Critério de aceitação — não negociável

#### A correção desta etapa

| # | Mutação | Resultado exigido |
| --- | --- | --- |
| A | restaurar o termo `!_serieOriginalVaziaFd` | **o teste novo do item 2 FALHA** |
| B | herdar sempre que existir fim original, **sem** comparar com o corte | **o teste da linha 1705 FALHA** |

**B é a mutação mais importante desta etapa.** É a guarda contra a correção preguiçosa: quem apenas
apaga o termo sem colocar a comparação passa em A e quebra em B.

#### Guardas — as etapas anteriores continuam protegidas

| # | Mutação | Resultado exigido |
| --- | --- | --- |
| C | ler o fim da mãe **depois** do aparo (etapa 5) | **≥ 1 teste FALHA** |
| D | voltar o teste de série vazia à comparação de datas invertidas (etapa 5) | **≥ 1 teste FALHA** |
| E | split volta a zerar `excecoes` (etapa 3) | **≥ 1 teste FALHA** |
| F | remover `serieOrigemId` da avulsa (etapa 2) | **≥ 1 teste FALHA** |
| G | remover `recorrenciaDataFim` da serialização em `agenda-conflitos.js` (etapa 1) | **≥ 1 teste FALHA** |

**Restaurar o arquivo após cada mutação.** Provar com um `npm test` final em **158** ou mais, zero
falhas.

Se alguma mutação não derrubar teste, **o item correspondente não está entregue**.

### Restrições — linhas explícitas

- **Alterar apenas**: `assets/js/modal-acao-slot.js`,
  `backend/test/gcal-duplicata-fix.test.js`, `docs/specs/gcal-sync.md`, o relatório da etapa 5 e o
  relatório novo desta etapa.
- **Não alterar nada em `backend/src/`.** Se parecer necessário, **parar e reportar**.
- **Não alterar** `assets/js/agenda-conflitos.js` (etapa 1) — só temporariamente na mutação G, e
  restaurado.
- **Não alterar** `calendario-engine.js`, `shared/recurrence-helpers.js`, `storage.js`,
  `scheduling-serializer.js`.
- **Não alterar** os 51 testes existentes. Acrescentar um.
- **Não adicionar** chamada de rede. `apiFetchBackend` continua com **2 ocorrências**.
- **Não escrever migração de dados. Não executar limpeza em produção.**
- **Não alterar** `docs/roadmap.md` nem outros relatórios.
- **Não adicionar dependência.** Sem `'use strict'`, sem lint, sem formatação em massa.
- **Não colar blocos de código no chat.** Editar os arquivos e relatar em texto.

### Regra de honestidade

1. **Prova é mutação no arquivo real seguida de `npm test`, com a saída colada.** Sete mutações,
   sete saídas.
2. **Se a mutação não aplicar, isso não é "não falha".** Conferir que o arquivo mudou antes de
   rodar — `.replace` que não casa produz falso negativo. Já aconteceu na etapa 3 e quase na 5.
3. **Teste que constrói o objeto que depois verifica não é teste.** Idem `assert.match` sobre
   texto-fonte.
4. **A asserção decisiva é `14/09/2026` com uma aula só.** Sem ela, o teste não prova nada.
5. **Não declarar item concluído sem `git diff` mostrando a mudança.**
6. **A pergunta de branch é uma só**, no início.
7. Se algo não puder ser feito, **dizer isso**. Impedimento reportado vale mais que evidência
   fabricada.

### Portão de saída — colar saída LITERAL no relatório

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_serieOriginalVaziaFd'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_dataCorteExcecoesFd'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'checarCompromissoNaData'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'familiaIgnorarIds'
```

- `npm test`: **zero falhas**, total **≥ 158**.
- `_serieOriginalVaziaFd`: **2 ocorrências** — caiu de 3, porque saiu da condição de herança.
- `_dataCorteExcecoesFd`: **≥ 4 ocorrências** — subiu, porque passou a ser usada na comparação.
- `checarCompromissoNaData`: **1 ocorrência** — etapa 5 intacta.
- `familiaIgnorarIds`: **13 ocorrências** — etapa 2 intacta.
- `git diff --stat` **precisa listar**: os cinco arquivos do escopo.
- `git diff --stat` **não pode listar**: `agenda-conflitos.js`, `calendario-engine.js`,
  `recurrence-helpers.js`, `storage.js`, `docs/roadmap.md`, nem nada em `backend/src/`. Se listar,
  reverter o excedente e reportar.

### Relatório — último item, obrigatório

Gravar em **`docs/_reports/<AAAA-MM-DD>-fix-heranca-mae-vazia-split.md`**, com a data real da
execução, contendo:

1. Saída **literal** do portão de base, incluindo branch e contagem da suíte.
2. A condição de herança antes e depois, e por que a comparação substitui o termo removido.
3. Confirmação de que `_dataCorteExcecoesFd` foi reusada, sem parser novo.
4. O teste criado, com as cinco asserções e o que cada uma prova.
5. Confirmação de que os cinco testes da etapa 5 passam sem alteração.
6. **As sete mutações A–G, com saída colada mostrando falha em cada uma**, e confirmação de que
   cada uma **foi aplicada** antes de rodar e o arquivo foi restaurado.
7. Contagem da suíte antes e depois.
8. Saída **literal** do portão de saída.
9. **Defeitos encontrados e não corrigidos**, com arquivo e linha.

---

# Parte C — Orientações gerais para agentes do Copilot

Convergem com o formato acima. Fontes públicas de 2025–2026.

- **Três coisas em todo prompt de agent mode:** intenção (o que se quer), escopo (quais arquivos
  pode tocar) e condição de parada (como sabe que terminou). A qualidade da saída acompanha de
  perto a qualidade do prompt. → Blocos 1, 11 e 13.
- **Uma tarefa boa para agente tem:** enunciado do problema, critério de aceitação, arquivos
  relevantes, comandos de teste e limites explícitos de fora-de-escopo. → Blocos 8, 10, 11.
- **A documentação oficial pede:** descrição clara do problema, critério de aceitação completo — por
  exemplo, se deve haver testes — e indicação de quais arquivos mudar.
- **Agent mode funciona** quando a tarefa abrange vários arquivos, tem critério de aceitação claro e
  pode ser revisada como um diff coerente. **Não funciona** para reescritas grandes, mudanças entre
  repositórios ou bases sem cobertura de teste.
- **Escopo explícito** do tipo "altere apenas arquivos em X" previne edição colateral.
- **Prompt vago produz edição ampla e arriscada.** O modelo responde melhor a objetivo, contexto,
  restrições, critério de aceitação e instrução de revisão.
- **Peça fases, não tudo de uma vez:** planejar, implementar uma coisa pequena, adicionar teste,
  tratar erro. Uma tarefa lógica por rodada.
- **Contexto bem escolhido ajuda mais que prompt longo.** Anexar o que importa e remover o
  irrelevante vale mais que adicionar parágrafos.
- **Instruções permanentes** vão em `.github/copilot-instructions.md`; o prompt cuida do que é
  específico da etapa. Não repetir no prompt o que já está nas instruções — só referenciar.

---

# Checklist rápida — antes de mandar qualquer prompt

- [ ] Diz se o defeito é **ativo** ou **latente**?
- [ ] Diz o **tamanho** da mudança esperada?
- [ ] Portão de base com **contagens reais**, medidas no repo?
- [ ] Todas as contagens foram **verificadas**, nenhuma chutada?
- [ ] Mostra **trecho real** do código, com número de linha aproximado?
- [ ] Tem **comportamento observado** por execução, não por teoria?
- [ ] Explica **por que a linha errada existe** e qual teste depende dela?
- [ ] Cada item tem um **"o que não fazer"**?
- [ ] Tem a **mutação da correção preguiçosa**?
- [ ] Tem **guardas** para cada etapa anterior?
- [ ] Restrições listam **caminhos**, não categorias?
- [ ] Portão de saída inclui contagens que **devem mudar** e que **devem ficar**?
- [ ] `git diff --stat` tem lista do que **não pode** aparecer?
- [ ] Relatório é **lista numerada** de exigências?

## Sinais de alerta — o prompt está virando dissertação

Se aparecerem, refaça:

- "localize por conteúdo" sem número de linha nem contagem;
- "no padrão dos anteriores" sem dizer qual padrão;
- tabela de mutação **sem** guardas das etapas anteriores;
- portão de base **sem** tabela de valores esperados;
- restrição por categoria ("não mexa em coisas de recorrência") em vez de por caminho;
- nenhuma menção a `git diff --stat`;
- relatório pedido em prosa, sem itens numerados;
- parágrafos explicando **por que** a correção é boa, em vez de **como verificar** que ela entrou.
