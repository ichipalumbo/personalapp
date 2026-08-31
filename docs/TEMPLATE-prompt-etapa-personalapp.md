# Template — prompt de etapa para agente executor (padrão `personalapp`)

> **Para que serve este arquivo.** Registrar o formato de prompt que funcionou nas etapas 1 a 4 do
> fix de vínculo série↔avulsa, para que ele não se perca. Quando um prompt novo fugir deste
> desenho, mande este arquivo de volta como lembrete.
>
> **Premissa.** O modelo do outro lado é **executor, não planejador**. Ele obedece bem instrução
> verificável e improvisa mal em instrução narrativa. Todo bloco abaixo existe para transformar
> julgamento em verificação.
>
> **Versão 3** — inclui o protocolo de branch por verificação (o dono cria a branch com script
> próprio), as regras anti-loop, a regra de alvo ambíguo, a regra de proibição coerente (R4) e o
> procedimento de restauração por `git restore` verificado com `git diff --exit-code`.

---

# Regras estruturais — valem para qualquer prompt

Quatro regras que vêm de falhas reais. Violá-las produz loop, trabalho frágil ou evidência falsa.

### R1 — Nunca faça o agente perguntar algo cuja resposta exija uma ação proibida a ele

Se a ação é do dono, o bloco é **"pare e reporte"**, não "pergunte se quer que eu faça".

**Falha real.** Um prompt mandava perguntar "criar branch nova a partir da `main`?" e, ao mesmo
tempo, proibia `git branch` e `git checkout`. O agente perguntava, recebia "crie", não podia
executar, reverificava o estado, encontrava a pré-condição não satisfeita e perguntava de novo.
Loop sem saída.

**Teste rápido.** Para cada pergunta do prompt: *cada resposta possível leva a uma ação que o
agente pode executar?* Se não, reescreva como parada.

### R2 — Todo laço de retentativa precisa de teto e de saída registrada

"Corrija o alvo e repita" sem limite é convite a loop. Sempre:

```markdown
Limite: no máximo 2 tentativas por <unidade>. Na segunda falha, escrever
"<falha esperada> não ocorreu — alvo não casou" e **seguir para a próxima**.
Não repetir indefinidamente.
```

### R3 — Símbolo que aparece mais de uma vez exige linha, indentação e vizinho de contexto

**Falha real.** Uma mutação pedia "remover `serieOrigemId` da avulsa". O símbolo aparecia **duas
vezes**, ambas com 14 espaços de indentação; o agente usou um padrão com 15 e a mutação não
aplicou — mas ele colou a saída de outra mutação como se tivesse aplicado.

Formato correto:

```markdown
**Atenção:** `<símbolo>` aparece **N vezes**, todas com **14 espaços** de indentação:
- **~linha A** — dentro de `<bloco>`, perto de `<vizinho identificável>`. **É esta.**
- **~linha B** — dentro de `<outro bloco>`, perto de `<outro vizinho>`. **Não é esta.**
```

### R4 — Se a tarefa exige uma operação, essa operação não pode estar na lista de proibições ⭐

Ao proibir verbos de git (ou qualquer família de comandos), **listar as exceções que a tarefa
exige**, com o escopo delimitado.

**Falha real.** Um prompt de prova de mutação proibia `git restore` e `git checkout` — e a tarefa
consistia em mutar e **restaurar** dois arquivos sete vezes. Sem a ferramenta certa, o agente
passou a guardar o conteúdo em variável e reescrever à mão, o que é frágil quanto a BOM, fim de
linha e `-NoNewline`. Um arquivo pode voltar "igual" para `Select-String` e ainda estar diferente
em bytes.

Formato correto:

```markdown
Proibido: `commit`, `push`, `branch`, `checkout` de branch, `switch`, `reset`, `stash`, `merge`.

**Exceção autorizada, exclusiva para restauração após mutação:**
`git restore -- <caminho1>`
`git restore -- <caminho2>`
Nenhum outro caminho, nenhuma outra forma de `restore`.
```

**Teste rápido.** Liste as operações que a tarefa exige. Cruze com a lista de proibições. Qualquer
interseção é bug do prompt.

---

# Parte A — Esqueleto anotado

## Bloco 1 — Cabeçalho de identidade

```markdown
# Prompt — Etapa N: <o defeito em uma frase, na voz do usuário>

> Prompt autossuficiente. Pode ser usado em conversa nova.
> Projeto: `personalapp` — agenda de personal trainer (Prô Josy).
> **Etapa N de M — <o que fecha>.**
> **Defeito ATIVO / LATENTE:** <o que acontece hoje, em uma linha>.
> **Escopo mínimo:** <o tamanho real da mudança>. Não ampliar.
```

**Por que.** "Autossuficiente" impede o agente de pedir contexto. Dizer se o defeito é **ativo**
(grava dado errado agora) ou **latente** (protegido por uma cláusula frágil) calibra o cuidado. O
tamanho declarado — "um termo de uma condição, um teste" — é a defesa contra refactor espontâneo.

Se a rodada **não altera código de produção em definitivo** (rodada de evidência, de documentação),
dizer isso no cabeçalho — **e dizer que arquivos de produção serão tocados temporariamente**, se
for o caso. Simplifica a verificação de saída: `git diff --stat` passa a ter lista fechada.

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
- Não existe backend local nem `npm run dev`. Tudo roda por `npm test` em `backend/`.
- **Ler a saída do `npm test` no terminal.** Não redirecionar por padrão. Se precisar salvar:
  `npm test 2>&1 | Out-File -FilePath saida.txt -Encoding utf8`. Redirecionamento cru (`>`)
  produz arquivo em UTF-16, ilegível para as ferramentas de leitura.
- Se a sessão estiver em `/workspaces/...` (Codespaces/Linux), traduzir para POSIX e **dizer isso
  no relatório**.
```

**Por que.** O agente tenta `&&` no PowerShell e perde turnos. E o UTF-16 já fez ele ler lixo,
concluir "não consegui verificar" e voltar a etapas anteriores — que é um dos gatilhos de loop, e
foi a origem de uma evidência falsa.

## Bloco 4 — Branch: verificação, não criação ⭐

O dono cria a branch com script próprio. O agente **verifica**.

```markdown
## Branch — verificar, não criar

Branch esperada nesta etapa: **`<tipo>/<slug>`**, a partir de `main` depois do merge da etapa
anterior.

O agente **não roda git para alterar estado do histórico**. Permitido (só leem): `git rev-parse`,
`git status`, `git diff`. Proibido: `commit`, `push`, `branch`, `checkout` de branch, `switch`,
`reset`, `stash`, `merge`.

**Exceção autorizada** — ver bloco de mutação: `git restore -- <caminhos listados>`, exclusivamente
para restaurar arquivo mutado.

### Protocolo

1. Ler a branch atual com `git rev-parse --abbrev-ref HEAD`.
2. **Se for a branch esperada:** registrar no relatório
   *"pré-condição da §11 satisfeita: branch `<nome>` confirmada"* e **seguir sem perguntar nada**.
3. **Se não for:** emitir **uma única** mensagem no formato abaixo e **parar**.

```text
Branch atual: <atual>              (working tree: limpo | sujo)
Branch recomendada: <tipo>/<slug>

Comando de referência: git checkout -b <tipo>/<slug> origin/main

[ ] Já criei a branch — reverifique
[ ] Continuar na branch atual
```

Depois da resposta: se for "reverifique", repetir o passo 1 e seguir; se for "continuar",
registrar a decisão do dono no relatório e seguir. **Nunca oferecer "quero que você crie"** — o
agente não tem permissão.

### Anti-loop

- A verificação de branch acontece **uma vez, no início**. Uma vez satisfeita, está satisfeita
  para o resto da rodada.
- Se em algum momento posterior a pré-condição de branch voltar a parecer pendente, tratar como
  **já resolvida** e seguir.
- **Máximo uma pergunta de branch por rodada.** Se a branch estiver certa, zero perguntas.

```

**Por que.** Lista literal de verbos proibidos funciona; "cuidado com git" não. O protocolo em três
passos elimina o loop da R1: a pergunta só existe quando há divergência real, e as duas opções são
executáveis — uma pelo dono, outra pelo agente.

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
| branch | `<tipo>/<slug>` |
| `<simbolo>` | **N ocorrências** (~linha) — a etapa X está na base |
| `npm test` | **N testes, N aprovados, zero falhas** |

**Parar e reportar** se `<simbolo>` não aparecer: a etapa anterior não está na base.

**Colar a saída literal no relatório.**

```

**Por que.** Contagem de ocorrências é o mecanismo central deste formato. Ela converte "as etapas
anteriores continuam intactas" — que é julgamento — em um número que fecha ou não fecha. Cada
símbolo contado é a assinatura de uma correção anterior.

**Como levantar os números.** Rodar `Select-String` no repo **antes** de escrever o prompt. Número
chutado é pior que número ausente: manda o agente parar sem motivo.

**Se os números de linha puderam mudar** (merge recente, arquivo grande), avisar: *"os números de
linha mudaram com o merge — casar por conteúdo, não por linha"*, e dar os **nomes** dos testes em
vez de só as linhas.

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
| # | Mutação | Falha esperada — teste e assinatura |
| --- | --- | --- |
| A | <reverter a correção> | `<nome do teste>` — `<valor obtido>` vs `<esperado>` |
| B | <a correção preguiçosa que passa em A> | `<nome do teste>` — `<assinatura>` |

### Guardas — as etapas anteriores continuam protegidas
| # | Mutação | Falha esperada |
| --- | --- | --- |
| C | <reverter etapa anterior> | `<nome do teste>` |

**<X> é a mutação mais importante desta etapa.** <por quê>

### Restauração — ferramenta autorizada

O código desta etapa **já está em `main`**, então `git restore` é seguro e é o mecanismo correto:

```powershell
git restore -- assets/js/modal-acao-slot.js
git restore -- assets/js/agenda-conflitos.js
```

**Não** reescrever o arquivo a partir de conteúdo guardado em variável: BOM, fim de linha e
`-NoNewline` fazem o arquivo voltar "igual" para `Select-String` e diferente em bytes.

### Procedimento por mutação — uma por vez, nunca em lote

1. `Select-String` confirmando que o alvo **existe**.
2. Aplicar a mutação.
3. `Select-String` confirmando que o arquivo **mudou**.
4. `npm test` — **ler a saída no terminal**, sem redirecionar.
5. Copiar o bloco `failing tests`: nome do teste e asserção.
6. `git restore -- <caminho>`.
7. `git diff --exit-code -- assets/js/` — **tem que sair limpo**.

O passo 7 compara **bytes** contra o commit. Contagem de símbolos não detecta diferença de
whitespace, BOM ou fim de linha; `git diff --exit-code` detecta.

**Não executar as mutações em lote.** Se um alvo não casar no meio de um lote, o erro passa
silencioso e contamina as saídas seguintes.

**Limite: 2 tentativas por mutação.** Na segunda falha, escrever "alvo não casou" e seguir.

Se alguma mutação não derrubar teste, **o item correspondente não está entregue** — dizer isso no
relatório em vez de declarar conclusão.

```

**Por que.** Teste que passa no código antigo não é cobertura. A mutação B — a "correção
preguiçosa" — é a invenção mais útil deste formato: ela é a solução parcial que satisfaz a mutação
A e mesmo assim está errada. Sem ela, o agente entrega meia correção com suíte verde.

**Dar a assinatura esperada de cada falha** — nome do teste e valores — é o que permite detectar
saída copiada entre mutações. Duas mutações com saída idêntica é sinal de cópia; já aconteceu.

## Bloco 11 — Restrições, arquivo por arquivo

```markdown
## Restrições — linhas explícitas
- **Alterar em definitivo apenas**: <lista fechada de caminhos>.
- **Tocados só temporariamente**, durante as mutações, e **restaurados com `git restore`**:
  <lista fechada>.
- **Não alterar nada em `backend/src/`.** Se parecer necessário, **parar e reportar**.
- **Não alterar** <arquivos vizinhos, nominalmente>.
- **Não alterar** os N testes existentes. Acrescentar um.
- **Não adicionar** chamada de rede. `apiFetchBackend` continua com **N ocorrências**.
- **Não escrever migração de dados.** **Não executar limpeza em produção.**
- **Não adicionar dependência.** Sem `'use strict'`, sem lint, sem formatação em massa.
- **Não colar blocos de código no chat.** Editar os arquivos e relatar em texto.
```

**Por que.** Escopo explícito por caminho é o que impede edição colateral. Distinguir "alterar em
definitivo" de "tocado temporariamente" evita que o agente ache que uma restauração pendente é
alteração legítima — e deixa claro qual lista o `git diff --stat` final pode conter.

## Bloco 12 — Regra de honestidade ⭐

```markdown
## Regra de honestidade
1. **Prova é mutação no arquivo real seguida de `npm test`, com a saída colada.**
2. **Mutação que não aplica não é "não falha".** Confirmar que o arquivo mudou antes de rodar —
   `.replace` que não casa produz falso negativo.
3. **Não reaproveitar saída entre mutações.** Saída idêntica em duas mutações é sinal de cópia.
4. **Conferir se o teste que caiu é o previsto.** Falhar "algum teste" não basta.
5. **Restauração provada por `git diff --exit-code`**, não por contagem de símbolos.
6. **Teste que constrói o objeto que depois verifica não é teste.** Idem `assert.match` sobre
   texto-fonte.
7. **A asserção decisiva é <a asserção>.** Sem ela, o teste não prova nada.
8. **Não declarar item concluído sem `git diff` mostrando a mudança.**
9. **Se der `fail 0` numa mutação, escrever "a mutação não aplicou"** e corrigir o alvo. **Nunca**
   justificar `fail 0` em prosa como resultado aceitável.
10. **Se a assinatura real divergir da prevista no prompt**, registrar a divergência com a saída —
    pode ser o prompt que está errado, e isso é informação útil.
11. Se algo não puder ser feito, **dizer isso**. Impedimento reportado vale mais que evidência
    fabricada.
```

**Por que.** As regras 2 e 9 são as mais valiosas do arquivo. Mutação aplicada com padrão que não
casa produz "o teste não falhou" — indistinguível de teste fraco. Num caso real, o agente viu
`fail 0` e escreveu um parágrafo dizendo que "a alteração foi mais leve que a regressão real"; a
mutação funcionava perfeitamente, só não tinha sido aplicada.

## Bloco 13 — Portão de saída e relatório

```markdown
## Portão de saída — colar saída LITERAL no relatório
```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git status --short
git diff --stat
git diff --exit-code -- assets/js/
Select-String -Path '<arquivo>' -Pattern '<simbolo>'
```

- `npm test`: **zero falhas**, total **≥ N**.
- `git diff --exit-code -- assets/js/`: **sem saída** — todas as mutações restauradas.
- `<simbolo que deve MUDAR>`: **N ocorrências** — caiu/subiu porque <motivo>.
- `<simbolo que deve FICAR>`: **N ocorrências** — etapa X intacta.
- `git diff --stat` **precisa listar**: <lista>.
- `git diff --stat` **não pode listar**: <lista>. Se listar, reverter o excedente e reportar.

## Relatório — último item, obrigatório

Gravar em **`docs/_reports/<AAAA-MM-DD>-<slug>.md`**, com a data real da execução, contendo:

1. Saída **literal** do portão de base, incluindo branch e contagem da suíte.
2. ... (lista numerada, um item por exigência do prompt)
N. Saída **literal** do portão de saída. **Defeitos encontrados e não corrigidos**, com arquivo e
   linha.

```

**Por que.** Contagens que **devem mudar** são a prova positiva de que a correção entrou; as que
**devem ficar** são a prova negativa de que nada mais foi tocado. O `git diff --stat` com lista
proibida pega edição colateral que a suíte não vê, e o `--exit-code` pega mutação não restaurada. O
relatório numerado é o que permite auditar depois: item sem resposta é item não feito.

---

# Parte B — Blocos prontos para copiar

## B.1 — Branch

```markdown
## Branch — verificar, não criar

Branch esperada: **`fix/<slug>`**.

O agente **não roda git para alterar estado do histórico**. Permitido: `git rev-parse`,
`git status`, `git diff`. Proibido: `commit`, `push`, `branch`, `checkout` de branch, `switch`,
`reset`, `stash`, `merge`.

1. Ler `git rev-parse --abbrev-ref HEAD`.
2. **Se for `fix/<slug>`:** registrar *"pré-condição da §11 satisfeita: branch confirmada"* e
   **seguir sem perguntar**.
3. **Se não for:** emitir uma única mensagem e **parar**:

```text
Branch atual: <atual>              (working tree: limpo | sujo)
Branch recomendada: fix/<slug>
Comando de referência: git checkout -b fix/<slug> origin/main

[ ] Já criei a branch — reverifique
[ ] Continuar na branch atual
```

**Nunca oferecer "quero que você crie a branch"** — o agente não tem permissão.

**Anti-loop:** a verificação acontece uma vez. Uma vez satisfeita, está satisfeita para o resto da
rodada. Se voltar a parecer pendente, tratar como resolvida e seguir. **Máximo uma pergunta de
branch por rodada.**

```

## B.2 — Procedimento de mutação

```markdown
### Procedimento por mutação — uma por vez, nunca em lote

**Restauração autorizada** (exceção à proibição de git; o código já está em `main`):
`git restore -- <caminho1>` e `git restore -- <caminho2>`. Nenhum outro caminho.

Para cada mutação:
1. `Select-String` confirmando que o alvo **existe**.
2. Aplicar.
3. `Select-String` confirmando que o arquivo **mudou**.
4. `npm test` — ler no terminal, sem redirecionar.
5. Copiar o bloco `failing tests`: nome do teste e asserção.
6. `git restore -- <caminho>`.
7. `git diff --exit-code -- assets/js/` — tem que sair limpo.

**Não** reescrever o arquivo a partir de variável: BOM, fim de linha e `-NoNewline` produzem
arquivo que parece igual e não é.

**Limite: 2 tentativas por mutação.** Na segunda falha, escrever "alvo não casou" e seguir.
Se der `fail 0`, escrever "a mutação não aplicou" — nunca justificar em prosa.
```

---

# Parte C — Orientações gerais para agentes do Copilot

Convergem com o formato acima. Fontes públicas de 2025–2026.

- **Três coisas em todo prompt de agent mode:** intenção (o que se quer), escopo (quais arquivos
  pode tocar) e condição de parada (como sabe que terminou). → Blocos 1, 11 e 13.
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
- [ ] Se a rodada não altera produção em definitivo, isso está **no cabeçalho** — junto com os
      arquivos tocados temporariamente?
- [ ] Bloco de branch é **verificação**, não criação? Tem as duas opções executáveis?
- [ ] **R1:** nenhuma pergunta do prompt exige ação proibida ao agente?
- [ ] **R2:** todo laço de retentativa tem **teto** e saída registrada?
- [ ] **R3:** símbolos que aparecem mais de uma vez têm linha, indentação e vizinho?
- [ ] **R4:** cruzei a lista de operações exigidas com a lista de proibições? Sem interseção?
- [ ] A restauração usa **`git restore`**, com exceção declarada e caminhos delimitados?
- [ ] O procedimento tem o passo **`git diff --exit-code`**?
- [ ] Diz **"uma mutação por vez, nunca em lote"**?
- [ ] Portão de base com **contagens reais**, medidas no repo?
- [ ] Todas as contagens foram **verificadas**, nenhuma chutada?
- [ ] Avisa se os **números de linha** podem ter mudado, e dá os **nomes** dos testes?
- [ ] Mostra **trecho real** do código?
- [ ] Tem **comportamento observado** por execução, não por teoria?
- [ ] Explica **por que a linha errada existe** e qual teste depende dela?
- [ ] Cada item tem um **"o que não fazer"**?
- [ ] Tem a **mutação da correção preguiçosa**?
- [ ] Tem **guardas** para cada etapa anterior?
- [ ] Cada mutação tem **assinatura de falha esperada** (nome do teste + valores)?
- [ ] Restrições listam **caminhos**, e distinguem "definitivo" de "temporário"?
- [ ] Portão de saída inclui contagens que **devem mudar** e que **devem ficar**?
- [ ] `git diff --stat` tem lista do que **não pode** aparecer?
- [ ] Relatório é **lista numerada** de exigências?
- [ ] Bloco de ambiente avisa do **UTF-16** e manda ler no terminal?

## Sinais de alerta — o prompt está virando dissertação

Se aparecerem, refaça:

- "localize por conteúdo" sem número de linha nem contagem;
- "no padrão dos anteriores" sem dizer qual padrão;
- tabela de mutação **sem** guardas das etapas anteriores;
- tabela de mutação **sem** assinatura de falha esperada;
- portão de base **sem** tabela de valores esperados;
- restrição por categoria ("não mexa em coisas de recorrência") em vez de por caminho;
- pergunta ao dono que exige do agente uma ação que ele não pode executar;
- proibição que colide com uma operação exigida pela própria tarefa;
- laço de retentativa sem teto;
- restauração por variável em vez de `git restore`;
- nenhuma menção a `git diff --stat` nem a `git diff --exit-code`;
- relatório pedido em prosa, sem itens numerados;
- parágrafos explicando **por que** a correção é boa, em vez de **como verificar** que ela entrou.

---

# Sinais de que o agente entrou em loop

Observar durante a rodada:

- repete uma pergunta **já respondida** (branch, escopo, permissão);
- aplica a **mesma mutação** três vezes ou mais sem mudar o alvo;
- volta a reler o prompt do início e refaz o portão de base no meio da execução;
- diz "não consegui verificar" depois de ler arquivo redirecionado (sintoma de UTF-16);
- anuncia que vai fazer tudo **em lote** para "manter o working tree intocado" — sinal de que a
  ferramenta de restauração está proibida e ele está improvisando;
- alterna entre dois passos sem avançar.

## Mensagem de desbloqueio — pronta para copiar

```text
A branch já é a correta: <nome>, criada por mim.
A pré-condição de branch da §11 está SATISFEITA. Não pergunte mais sobre branch
nesta rodada — se voltar a considerar essa pergunta, trate como já respondida.

Você não tem permissão para criar, trocar ou mudar branch. Se em algum momento
concluir que precisa disso, PARE e me diga em uma frase, sem perguntar.

Você ESTÁ AUTORIZADO a usar, exclusivamente para restaurar arquivo mutado:
  git restore -- assets/js/modal-acao-slot.js
  git restore -- assets/js/agenda-conflitos.js
Use git restore em vez de reescrever o conteúdo a partir de variável.

Faça UMA mutação por vez, não em lote. Para cada uma:
  1. Select-String confirmando que o alvo existe
  2. aplicar
  3. Select-String confirmando que o arquivo MUDOU
  4. npm test — ler no terminal, sem redirecionar
  5. copiar o bloco "failing tests"
  6. git restore no arquivo
  7. git diff --exit-code -- assets/js/   (tem que sair limpo)

Limite: 2 tentativas por mutação. Na segunda falha, registre "alvo não casou" e
siga para a próxima. Não repita indefinidamente.

Antes de continuar: rode git status --short e me diga se algum arquivo de
produção está mutado agora e não restaurado.
```
