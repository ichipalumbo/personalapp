## 1. Portão de base — saída bruta e contagem de ocorrências

```
Get-Location
C:\Users\LBRESSIA\OneDrive - azureford\Documents\GitHub Person\personalapp

git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerent

git status --short
<sem saída — working tree limpa>
```

Branch bate com a esperada (`fix/excluir-serie-toda-coerent`, sem o "e" final) — pré-condição de
branch satisfeita.

```
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'salvarEventoComGCal' -AllMatches
```
8 ocorrências de chamada/checagem de tipo em `modal-acao-slot.js`, nas linhas: 1284/1288,
1390/1394, 1467/1471, 1813/1818, 2380/2384, 2390, 2395, 2508/2512. Descontando os pares
`typeof ... === "function"` + chamada, são **8 chamadas reais** a `window.salvarEventoComGCal`
neste arquivo.

```
Select-String -Path 'assets\js\modal-agendamento.js' -Pattern 'salvarEventoComGCal' -AllMatches
```
1 ocorrência de checagem + 1 chamada real, na linha 907.

```
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '9\.23'
```
Confirma o registro do débito nº 6 no item 9.23, com a redação: *"Seis pontos de chamada de
`salvarEventoComGCal` fora do escopo da 6h — criação em `modal-agendamento.js:907`;
edição/split em `modal-acao-slot.js` nos trechos `novoCompromisso`, `_novaOcorrenciaSerie`,
`_novaSerieSplit` e o par `compromisso`/`_snapshotEdicao`."*

**Contagem total e conferência com o débito:** 8 chamadas reais em `modal-acao-slot.js` + 1 em
`modal-agendamento.js` = 9 chamadas no total. Destas, **3 já foram corrigidas na 6h** (as três
exclusões: `compromisso` na linha 1288, `_serieDeletar` na linha 1394, `_compDeletar` na linha
1471 — todas com `operacao: "excluir"` e checagem de `resultadoPersistencia`). Restam **6
chamadas não corrigidas**, que batem com o número do débito: 1 em `modal-agendamento.js`
(criação) + 5 em `modal-acao-slot.js` (`novoCompromisso`, o par `compromisso`/`_snapshotEdicao`
em `formEditar`, `_novaOcorrenciaSerie`, `_novaSerieSplit`, e uma quinta chamada com
`compromisso` dentro de `window.executarEnvioParaReposicao`, distinta do par de `formEditar`).

A leitura do Ponto 6 (seção 7) explica por que a redação do débito ("o par
`compromisso`/`_snapshotEdicao`") descreve só 1 bloco em `formEditar`, e por que a quinta
chamada com `compromisso` (em `executarEnvioParaReposicao`) é um bloco à parte que a redação do
débito não citou explicitamente, mas que está coberto pelo mesmo padrão e entra na contagem de
seis. Não há divergência de número a registrar — os seis batem.

---

## 2. Ponto 1 — Criação de aula

**Arquivo e linha:** `assets/js/modal-agendamento.js:907`
**Função que contém a chamada:** handler inline — listener de `submit` de `formAgendamento`,
dentro do callback de `document.addEventListener('DOMContentLoaded', ...)`.
**O que essa operação faz no domínio:** cria uma aula, bloqueio ou deslocamento novo (avulso ou
série) a partir do formulário principal de agendamento.

**Trecho de código relevante:**
```js
            // Fecha o modal imediatamente; o overlay bloqueará re-interação durante o salvamento
            document.getElementById('modalAgendamento').style.display = 'none';

            if (typeof window.salvarEventoComGCal === 'function' && window.gcal && window.gcal.isSignedIn()) {
                // Optimistic UI in salvarEventoComGCal renders the new event immediately.
                window.salvarEventoComGCal(resultado.payload, { operacao: 'criar' });
            } else {
                if (typeof salvarDados === 'function') salvarDados();
                window.inicializarHome();
                if (typeof mostrarToast === 'function') mostrarToast('✅ Horário agendado com sucesso!');
            }
```

**O que existe hoje se `salvarEventoComGCal` falhar:**
- [x] nada — o código segue como se tivesse dado certo

A chamada nem usa `await`: a Promise retornada por `salvarEventoComGCal` não é aguardada nem
tem `.then`/`.catch`. O modal já foi fechado antes da chamada, e o item já foi empurrado em
`aulas` (`aulas.push(resultado.payload)`) antes disso também. Não há nenhum ponto de checagem
do retorno.

**O que a Josy veria na tela, hoje, se a gravação falhasse silenciosamente:** o modal fecha, a
aula aparece na agenda (estado local otimista), e nenhum aviso é mostrado — ela segue usando o
app acreditando que a aula foi salva, quando na verdade pode não ter persistido no banco.

**Pergunta de UX para o dono, específica deste ponto:** se a criação falhar silenciosamente com
Google Agenda conectado, o que deve acontecer?
1. Reverter — remover a aula recém-criada da tela, reabrir o formulário de agendamento com os
   dados que a Josy tinha acabado de preencher, e avisar por toast que a criação falhou.
2. Reverter — remover a aula recém-criada da tela sem reabrir o formulário, e avisar por toast
   que a criação falhou.
3. Não reverter — manter a aula como está na tela (silêncio hoje se mantém, sem revert), só
   acrescentando um aviso por toast de que a sincronização falhou.

---

## 3. Ponto 2 — Edição de compromisso

**Arquivo e linha:** `assets/js/modal-acao-slot.js:2380-2384`
**Função que contém a chamada:** handler inline — listener de `submit` de `formEditar`
(`formEditarCompromisso`).
**O que essa operação faz no domínio:** atualiza um compromisso existente (aula, bloqueio ou
deslocamento) nos escopos `entireSeries`, `monthOfDate` ou avulso — ou seja, os casos de edição
que **não** disparam um split (`occurrence` e `fromDate` são os pontos 3/4 e 5, tratados à
parte, mas a mesma chamada de `compromisso` roda em todos os escopos, inclusive nesses dois).

**Trecho de código relevante:**
```js
        window.fecharModalAcaoSlot();

        // [TAG-FRESH-DATA-BEFORE-SAVE] Enriquece agendamento com dados frescos do aluno antes de salvar
        if (typeof window.enriquecerAgendamentoComDadosFrescos === "function") {
          window.enriquecerAgendamentoComDadosFrescos(compromisso);
        }

        if (
          typeof window.salvarEventoComGCal === "function" &&
          window.gcal &&
          window.gcal.isSignedIn()
        ) {
          await window.salvarEventoComGCal(compromisso, {
            operacao: "atualizar",
            snapshotAnterior: _snapshotEdicao,
          });
          if (_novaOcorrenciaSerie) {
            // occurrence: depois de adicionar EXDATE na série, cria o evento avulso com novo horário
            await window.salvarEventoComGCal(_novaOcorrenciaSerie, {
              operacao: "criar",
            });
          } else if (_novaSerieSplit) {
            // fromDate: termina série original com UNTIL, depois cria nova série a partir da data clicada
            await window.salvarEventoComGCal(_novaSerieSplit, { operacao: "criar" });
          }
          // Optimistic UI in salvarEventoComGCal already rendered the result — no inicializarHome needed.
        } else {
          if (typeof salvarDados === "function") await salvarDados();
          if (typeof window.inicializarHome === "function") {
            await window.inicializarHome();
          }
          if (typeof mostrarToast === "function")
            mostrarToast("✅ Alterações salvas com sucesso!");
        }
      } finally {
        _submissaoEdicaoEmAndamento = false;
        atualizarEstadoSubmitEdicao(false);
      }
```

O `_snapshotEdicao` é montado logo no início do handler (linha ~1899): `{ ...compromisso,
excecoes: [...(compromisso.excecoes || [])] }` — é passado para `salvarEventoComGCal` como
`snapshotAnterior`, mas o próprio handler nunca lê o retorno dessa chamada para decidir se deve
usar esse snapshot para reverter algo.

**O que existe hoje se `salvarEventoComGCal` falhar:**
- [x] nada — o código segue como se tivesse dado certo

`await window.salvarEventoComGCal(compromisso, {...})` é aguardado, mas o valor de retorno não
é atribuído a nenhuma variável nem checado. Por leitura de `google-calendar.js`, essa função não
lança exceção em caso de falha de persistência — ela resolve normalmente com
`{ ok: false, motivo: ... }` (ver `_persistirDadosComBackend`). Como não há `if` nenhum checando
esse retorno, uma falha de persistência aqui é indistinguível de sucesso do ponto de vista do
código.

**O que a Josy veria na tela, hoje, se a gravação falhasse silenciosamente:** o modal já fechou
antes da chamada; a tela mostra o compromisso já com os novos dados (horário, dia etc.), e
nenhum aviso aparece — ela acredita que a edição foi salva, mesmo que não tenha persistido.

**Pergunta de UX para o dono, específica deste ponto:** se a edição falhar silenciosamente com
Google Agenda conectado, o que deve acontecer?
1. Reverter — usar `_snapshotEdicao` para devolver o compromisso ao estado anterior na tela,
   reabrir o modal de edição já preenchido com os dados que a Josy tinha acabado de submeter, e
   avisar por toast.
2. Reverter — usar `_snapshotEdicao` para devolver o compromisso ao estado anterior na tela sem
   reabrir o modal, e avisar por toast.
3. Não reverter — manter a edição como está na tela (silêncio hoje se mantém, sem revert), só
   acrescentando um aviso por toast de que a sincronização falhou.

---

## 4. Ponto 3 — Criação de ocorrência em fluxo de edição de série

**Arquivo e linha:** `assets/js/modal-acao-slot.js:1818`
**Função que contém a chamada:** handler inline — listener de `submit` de `formReagendarAula`.
**O que essa operação faz no domínio:** este não é o fluxo de edição de série citado no nome do
ponto — por leitura, é o fluxo de **reagendamento de uma reposição** (a Josy escolhe um novo dia
e horário para uma aula que estava pendente de reposição). O código cria um `novoCompromisso`
avulso, marca a reposição de origem como `agendada` via `PATCH` no backend, e só depois tenta
sincronizar esse novo compromisso com o Google Agenda.

**Trecho de código relevante:**
```js
      try {
        aulas.push(novoCompromisso);
        const salvar =
          typeof window.salvarDados === "function"
            ? window.salvarDados
            : salvarDados;
        const resultadoPersistencia =
          typeof salvar === "function"
            ? await salvar(true)
            : { ok: false, motivo: "falha_remota" };
        if (!deveEnviarPatchReposicao(resultadoPersistencia)) {
          throw new Error(
            obterMensagemFalhaPersistencia(resultadoPersistencia),
          );
        }

        const respostaPatch = await window.apiFetchBackend(
          `${window.APP_API_CONFIG.apiBaseUrl}/reposicoes/${encodeURIComponent(repObj.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "agendada",
              agendamentoReposicaoId: novoCompromisso.id,
            }),
          },
        );

        if (!respostaPatch.ok) {
          const erroPatch = await respostaPatch.json().catch(() => ({}));
          throw new Error(
            erroPatch.error || "Falha ao vincular a reposição ao agendamento.",
          );
        }

        let avisoGCal = "";
        if (
          typeof window.salvarEventoComGCal === "function" &&
          window.gcal &&
          window.gcal.isSignedIn()
        ) {
          try {
            await window.salvarEventoComGCal(novoCompromisso, {
              operacao: "criar",
            });
          } catch (erroGCal) {
            window.log.error(
              "[reposicao]",
              "Falha ao sincronizar reposição no Google Calendar",
              erroGCal,
            );
            avisoGCal =
              " Reposição salva, mas não foi possível sincronizar com Google Agenda.";
          }
        }
```

**O que existe hoje se `salvarEventoComGCal` falhar:**
- [ ] nada — o código segue como se tivesse dado certo
- [x] existe algum tratamento parcial — descrever qual

Há um `try/catch` em volta da chamada, e se ela lançar uma exceção, o código monta uma
`avisoGCal` que depois é anexada ao toast de sucesso (toast vira `warning` em vez de `success`).
**Mas, por leitura de `google-calendar.js`, `salvarEventoComGCal` não lança exceção quando a
persistência falha** — `_persistirDadosComBackend` resolve normalmente com
`{ ok: false, motivo: ... }`, sem `throw`. O `catch` deste bloco só seria acionado por um erro
verdadeiramente inesperado (ex.: exceção de programação), não pelo caminho normal de "gravação
não persistiu". Ou seja: o tratamento existe no texto do código, mas **não cobre o cenário real
de falha silenciosa de persistência** que a 6h corrigiu nos outros três pontos — o retorno de
`salvarEventoComGCal` nunca é lido aqui. Este ponto já persistiu localmente a aula (o
`resultadoPersistencia` de `salvar(true)`, checado logo acima) e já confirmou o PATCH da
reposição no servidor antes de chegar nesta chamada — a falha aqui seria só do segundo passo de
sincronização com o Google Agenda, não da gravação do compromisso em si.

**O que a Josy veria na tela, hoje, se a gravação falhasse silenciosamente:** como a exceção
normalmente não dispara, ela veria o toast de sucesso puro (`✅ Reposição reagendada com
sucesso!`), sem o aviso amarelo que o código pretende mostrar — nenhum sinal de que algo não
sincronizou.

**Pergunta de UX para o dono, específica deste ponto:** este bloco já tem um aviso desenhado
para "falhou a sincronizar com o Google Agenda", mas ele só dispara em exceções, não no retorno
`{ ok: false }` que é o caminho real de falha. Ajustar esse ponto para também reagir ao
`{ ok: false }` deve seguir qual caminho?
1. Reverter — desfazer a marcação da reposição como `agendada` (chamando o PATCH de volta) e
   remover o `novoCompromisso` recém-criado, avisando por toast que o reagendamento falhou por
   completo.
2. Não reverter o que já foi confirmado (a reposição já foi marcada como `agendada` no
   servidor) — apenas mostrar o aviso amarelo já existente também para o caso de `{ ok: false }`,
   como se fosse uma exceção.
3. Não reverter e não ajustar — deixar como está hoje (o aviso só cobre exceções reais).

---

## 5. Ponto 4 — Split de série, ocorrência nova

**Arquivo e linha:** `assets/js/modal-acao-slot.js:2390` (chamada); a variável
`_novaOcorrenciaSerie` é criada em 2018, dentro do ramo `escopoRecorrencia === "occurrence"` do
mesmo handler de `formEditar` do Ponto 2.
**Função que contém a chamada:** handler inline — listener de `submit` de `formEditar`
(mesmo handler do Ponto 2; a chamada deste ponto é a segunda de uma sequência de até duas
chamadas dentro do mesmo `if`).
**O que essa operação faz no domínio:** quando a Josy edita uma única ocorrência de uma série
(escopo "esta aula"), o código adiciona uma exceção (`EXDATE`) na série original e cria um novo
compromisso avulso (`_novaOcorrenciaSerie`) com o novo horário/dia só para aquela data.

**Trecho de código relevante** (a variável sendo criada, e a chamada em sequência):
```js
            aulas.push(novoCompromisso);
            _novaOcorrenciaSerie = novoCompromisso;
```
```js
          await window.salvarEventoComGCal(compromisso, {
            operacao: "atualizar",
            snapshotAnterior: _snapshotEdicao,
          });
          if (_novaOcorrenciaSerie) {
            // occurrence: depois de adicionar EXDATE na série, cria o evento avulso com novo horário
            await window.salvarEventoComGCal(_novaOcorrenciaSerie, {
              operacao: "criar",
            });
          } else if (_novaSerieSplit) {
```

**O que existe hoje se `salvarEventoComGCal` falhar:**
- [x] nada — o código segue como se tivesse dado certo

Nenhuma das duas chamadas (`compromisso` nem `_novaOcorrenciaSerie`) tem o retorno checado.

**Se há dois pontos de gravação em sequência neste fluxo:** sim. A ordem é: (1)
`salvarEventoComGCal(compromisso, { operacao: "atualizar", ... })` — persiste a série original já
com o `EXDATE` da data editada; (2) `salvarEventoComGCal(_novaOcorrenciaSerie, { operacao:
"criar" })` — persiste o novo compromisso avulso. **Se a primeira chamada suceder e a segunda
falhar:** por leitura de código, a série original já foi persistida com a exceção (a ocorrência
"sumiu" da recorrência original), mas o novo compromisso avulso criado em memória
(`aulas.push(novoCompromisso)`, executado antes de qualquer chamada de rede, na montagem do
ramo `occurrence`) nunca teve seu sucesso de persistência confirmado por este trecho — ele pode
ou não ter sido gravado, dependendo de quando exatamente a chamada 2 falhou. Não é possível
confirmar por leitura, sem executar o código, se o objeto `_novaOcorrenciaSerie` chega a ser
persistido no Mongo antes da falha do Google Agenda ou não — isso depende do comportamento
interno de `_persistirDadosComBackend`/`salvarDados`, que persiste o array `aulas` inteiro (já
incluindo o novo item) numa única chamada. **Se a primeira chamada falhar:** a segunda ainda
roda (não há `return` nem `throw` entre as duas), então o código tentaria criar a ocorrência
nova mesmo a série original não tendo persistido a exceção — um estado ainda mais inconsistente
(ocorrência nova pendurada sem a série "mãe" ter registrado o `EXDATE`).

**O que a Josy veria na tela, hoje, se a gravação falhasse silenciosamente:** a tela mostra a
série sem a ocorrência editada no lugar antigo e a ocorrência nova no novo horário — como se
tudo tivesse dado certo — sem nenhum aviso, independente de qual das duas chamadas falhou.

**Pergunta de UX para o dono, específica deste ponto:** cobrindo o caso de meio-sucesso (a
atualização da série com o `EXDATE` persiste, mas a criação da ocorrência nova falha, ou
vice-versa), o que deve acontecer?
1. Reverter as duas gravações — desfazer o `EXDATE` na série original e remover a ocorrência
   nova da tela, voltando ao estado anterior à edição, e avisar por toast.
2. Manter o que já persistiu e avisar por toast que a segunda parte falhou, sem tentar
   desfazer a primeira (ex.: "a série foi atualizada, mas a nova aula não foi salva — tente
   criá-la de novo").
3. Não reverter nada e não avisar — manter o comportamento atual.

---

## 6. Ponto 5 — Split de série, série nova

**Arquivo e linha:** `assets/js/modal-acao-slot.js:2395` (chamada); a variável `_novaSerieSplit`
é criada em 2293, dentro do ramo `escopoRecorrencia === "fromDate"` do mesmo handler de
`formEditar`.
**Função que contém a chamada:** handler inline — listener de `submit` de `formEditar` (mesmo
handler dos Pontos 2 e 4; terceira variação do mesmo `if`/`else if`).
**O que essa operação faz no domínio:** quando a Josy edita uma série "a partir desta data",
o código encerra a série original com `UNTIL` um dia antes da data editada e cria uma nova série
(`_novaSerieSplit`) a partir da data editada, herdando dias da semana, horário e (quando
aplicável) a condição de término da série original.

**Trecho de código relevante** (criação da variável, e a chamada em sequência):
```js
            aulas.push(_novaSerieFd);
            _novaSerieSplit = _novaSerieFd;
```
```js
          await window.salvarEventoComGCal(compromisso, {
            operacao: "atualizar",
            snapshotAnterior: _snapshotEdicao,
          });
          if (_novaOcorrenciaSerie) {
            // occurrence: depois de adicionar EXDATE na série, cria o evento avulso com novo horário
            await window.salvarEventoComGCal(_novaOcorrenciaSerie, {
              operacao: "criar",
            });
          } else if (_novaSerieSplit) {
            // fromDate: termina série original com UNTIL, depois cria nova série a partir da data clicada
            await window.salvarEventoComGCal(_novaSerieSplit, { operacao: "criar" });
          }
```

**O que existe hoje se `salvarEventoComGCal` falhar:**
- [x] nada — o código segue como se tivesse dado certo

Nenhuma das duas chamadas (`compromisso` nem `_novaSerieSplit`) tem o retorno checado.

**Se há dois pontos de gravação em sequência neste fluxo:** sim, mesma estrutura do Ponto 4. A
ordem é: (1) `salvarEventoComGCal(compromisso, { operacao: "atualizar" })` — persiste a série
original já encerrada (`UNTIL` um dia antes da data de corte, ou removida de `aulas` de vez se
ficou vazia, ver `_serieOriginalVaziaFd`); (2) `salvarEventoComGCal(_novaSerieSplit, { operacao:
"criar" })` — persiste a nova série a partir da data de corte. **Se a primeira suceder e a
segunda falhar:** a série original já foi encerrada/removida e persistida assim, mas a nova
série pode não ter sido persistida — resultado possível é a Josy perder as aulas futuras da
série original sem ganhar a nova série no lugar (um "buraco" na agenda a partir da data
editada). **Se a primeira falhar:** a segunda ainda roda do mesmo jeito (sem `return`/`throw`
entre elas), podendo criar a nova série mesmo a série original não tendo persistido o
encerramento — duas séries ativas cobrindo o mesmo período. Como no Ponto 4, não é possível
confirmar por leitura o estado exato do banco nesse meio-caminho sem executar o cenário.

**O que a Josy veria na tela, hoje, se a gravação falhasse silenciosamente:** a tela mostra a
série original encerrada (ou some, se ficou vazia) e a nova série no lugar, como se tudo tivesse
dado certo — sem aviso, independente de qual das duas chamadas falhou.

**Pergunta de UX para o dono, específica deste ponto:** cobrindo o caso de meio-sucesso (o
encerramento da série original persiste, mas a criação da nova série falha, ou vice-versa), o
que deve acontecer?
1. Reverter as duas gravações — restaurar a série original ao estado anterior (sem o `UNTIL` de
   corte, e recolocada em `aulas` se tiver sido removida por estar vazia) e remover a série nova
   da tela, e avisar por toast.
2. Manter o que já persistiu e avisar por toast que a segunda parte falhou, sem tentar desfazer
   a primeira (ex.: "a série original foi encerrada, mas a nova série não foi criada — confira a
   agenda").
3. Não reverter nada e não avisar — manter o comportamento atual.

---

## 7. Ponto 6 — segundo ponto de edição/atualização de `compromisso`

**Confirmação por leitura:** este ponto **não** é uma segunda edição/atualização — é um bloco
distinto, com nome de função próprio (`window.executarEnvioParaReposicao`), e a operação passada
é `operacao: "excluir"`, não `"atualizar"` ou `"criar"`. A redação do débito 9.23 item 6 falou em
"o par `compromisso`/`_snapshotEdicao`" no singular, o que bate com o Ponto 2 sozinho; a leitura
de código não achou um segundo bloco de edição usando `_snapshotEdicao`. O que existe, e que
fecha a conta de seis, é esta quinta chamada em `modal-acao-slot.js`, num fluxo diferente
(envio de uma aula avulsa para reposição) que por leitura é, na prática, uma **exclusão de uma
ocorrência única** — do mesmo tipo do que a 6h corrigiu nos outros três pontos, mas não incluída
naquela correção. Não é o mesmo ponto contado duas vezes, mas também não é "edição" no sentido
literal do nome do ponto — é uma quarta variação de exclusão que ficou de fora da 6h.

**Arquivo e linha:** `assets/js/modal-acao-slot.js:2508-2512`
**Função que contém a chamada:** `window.executarEnvioParaReposicao` (handler ligado aos botões
`btnMandarParaReposicao` e `btnReagendarInstancia`), ramo `!ehSerie` (aula avulsa, não série).
**O que essa operação faz no domínio:** remove da agenda uma aula avulsa que está sendo enviada
para reposição — a reposição já foi criada no servidor (`enviarParaReposicao`) antes deste
trecho, e este é o passo que tira a aula original da tela e do Google Agenda.

**Trecho de código relevante:**
```js
          } else {
            const _idxReposicao = aulas.findIndex(
              (a) => a.id === window.idCompromissoSelecionado,
            );
            if (_idxReposicao !== -1) aulas.splice(_idxReposicao, 1);
          }

          window.fecharModalAcaoSlot();

          if (ehSerie) {
            ...
          }

          if (
            typeof window.salvarEventoComGCal === "function" &&
            window.gcal &&
            window.gcal.isSignedIn()
          ) {
            await window.salvarEventoComGCal(compromisso, {
              operacao: "excluir",
              snapshotAnterior: compromisso,
            });
          } else if (typeof salvarDados === "function") {
            await salvarDados();
          }
```

**O que existe hoje se `salvarEventoComGCal` falhar:**
- [x] nada — o código segue como se tivesse dado certo

O `await` existe, mas o retorno não é lido. Há um `catch` mais externo neste handler (compartilhado
com o ramo `ehSerie`), mas ele só reage a exceções lançadas (por exemplo, de
`enviarParaReposicao`) — e, como nos demais pontos, `salvarEventoComGCal` não lança exceção no
caminho de falha de persistência, então esse `catch` não cobre este cenário.

**Nota sobre decisão já registrada na spec para o ramo irmão deste mesmo bloco:** o item 9.20/
seção sobre `window.executarEnvioParaReposicao` (linha ~789 de `gcal-sync.md`) já define que o
**ramo `ehSerie` (série)** desta mesma função é "deliberadamente pessimista": cria a reposição
no servidor, marca a exceção local, fecha a UI, persiste, e só confirma sucesso após o `HTTP
200`, com rollback que reverte a criação remota e a marcação local em caso de falha. Essa decisão
**já existe e não deve ser reaberta** — mas ela cobre o ramo `ehSerie`, que não chama
`salvarEventoComGCal` (usa `salvarDados` direto com checagem). O ramo `!ehSerie` — o que este
Ponto 6 documenta — é o que ficou sem essa mesma garantia.

**O que a Josy veria na tela, hoje, se a gravação falhasse silenciosamente:** a aula avulsa some
da tela (a reposição já aparece como criada), sem nenhum aviso de que a exclusão do lado do
Google Agenda ou do banco pode não ter persistido.

**Pergunta de UX para o dono, específica deste ponto:** dado que o ramo `ehSerie` desta mesma
função já segue o padrão "reverter e avisar" (decisão já registrada na spec), o ramo `!ehSerie`
deve seguir o mesmo padrão?
1. Sim — aplicar aqui o mesmo padrão "reverter e avisar" já usado nos três pontos de exclusão
   corrigidos na 6h e já decidido para o ramo `ehSerie` desta função: devolver a aula à tela e
   avisar por toast.
2. Não — este caso é diferente porque a reposição já foi criada no servidor antes deste trecho;
   reverter a exclusão da aula original exigiria decidir também o que fazer com a reposição já
   criada (cancelá-la? deixá-la órfã, apontando para uma aula que "voltou"?). Se a resposta for
   "não reverter", que aviso mostrar à Josy?
3. Não reverter e não avisar — manter o comportamento atual.

---

## 8. Lista consolidada de perguntas — para o dono responder em lote

1. **(Ponto 1 — criação de aula)** Se a criação falhar silenciosamente com Google Agenda
   conectado: (a) reverter e reabrir o formulário preenchido, avisando por toast; (b) reverter
   sem reabrir o formulário, avisando por toast; (c) não reverter, só avisar por toast.

2. **(Ponto 2 — edição de compromisso, sem split)** Se a edição falhar silenciosamente: (a)
   reverter para o snapshot e reabrir o modal de edição preenchido, avisando por toast; (b)
   reverter para o snapshot sem reabrir o modal, avisando por toast; (c) não reverter, só avisar
   por toast.

3. **(Ponto 3 — criação de novo compromisso ao reagendar reposição)** O aviso amarelo já
   existente hoje só dispara em exceção, não no retorno `{ ok: false }` que é o caminho real de
   falha: (a) reverter tudo, inclusive a marcação da reposição como `agendada` já confirmada no
   servidor; (b) manter o que já foi confirmado e estender o aviso amarelo já existente para
   cobrir também `{ ok: false }`; (c) não reverter e não ajustar o aviso.

4. **(Ponto 4 — split "esta ocorrência", meio-sucesso incluído)** Se a atualização da série
   original (com `EXDATE`) e a criação da ocorrência nova não derem certo as duas: (a) reverter
   as duas gravações e avisar por toast; (b) manter o que já persistiu e avisar por toast sobre
   a parte que falhou, sem desfazer a outra; (c) não reverter nada e não avisar.

5. **(Ponto 5 — split "a partir desta data", meio-sucesso incluído)** Se o encerramento da série
   original e a criação da série nova não derem certo as duas: (a) reverter as duas gravações e
   avisar por toast; (b) manter o que já persistiu e avisar por toast sobre a parte que falhou,
   sem desfazer a outra; (c) não reverter nada e não avisar.

6. **(Ponto 6 — envio de aula avulsa para reposição)** Dado que o ramo de série desta mesma
   função já segue "reverter e avisar" por decisão já registrada na spec: (a) aplicar o mesmo
   padrão aqui, devolvendo a aula à tela e avisando por toast; (b) não reverter, porque a
   reposição já foi criada no servidor e reverter exigiria decidir o destino dela — e, se for
   essa a resposta, qual aviso mostrar; (c) não reverter e não avisar.

---

## 9. O que foi encontrado e não coube em nenhuma ficha

- A contagem de seis pontos bateu exatamente com o registro da spec, mas a redação do débito
  ("o par `compromisso`/`_snapshotEdicao`") descreve só o Ponto 2; o Ponto 6 (quinta chamada em
  `modal-acao-slot.js`) não tem menção explícita na frase do débito, embora esteja coberto pela
  contagem total de seis. Isso não é uma divergência de número, só uma imprecisão de descrição
  no registro original — vale considerar ajustar a redação do item 9.23 nº 6 quando a 6i for
  escrita, para citar `executarEnvioParaReposicao` explicitamente.
- O Ponto 6 é, por natureza, uma operação de **exclusão** (`operacao: "excluir"`), não de
  criação/edição — o nome do ponto no prompt ("segundo ponto de edição/atualização") não bate
  com o que o código faz. Registrei isso na ficha em vez de forçar a descrição a caber.
- Para os Pontos 4 e 5, não foi possível confirmar por leitura, sem executar o cenário, o estado
  exato do banco de dados no meio-caminho entre as duas chamadas em sequência (se a primeira
  chamada já persiste o array inteiro, incluindo o item da segunda etapa, antes mesmo da segunda
  chamada rodar) — isso está registrado explicitamente em cada ficha, não afirmado como fato.
- A spec já tem uma decisão registrada (linha ~469 de `gcal-sync.md`) de que falha do lado do
  Google Calendar sozinha nunca reverte a gravação no Mongo (o backend responde `HTTP 200` e
  sinaliza `gcalSyncFailed`). Essa decisão é sobre a camada de backend/API, não sobre o
  comportamento do frontend quando a própria gravação no Mongo falha — não resolve nenhuma das
  perguntas acima, mas é contexto relevante: o cenário de "falha silenciosa" tratado neste
  diagnóstico é sobre a gravação no Mongo em si falhar (`salvarDados` retornando `{ ok: false
  }`), não sobre uma falha isolada de sincronização com o Google.
