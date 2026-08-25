# Relatório do item 3 — gatilho no boot e escape hatch manual

## 1. Portão de base

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/gcal-watch
git status --short

cd backend
npm test

> personal-api@1.0.0 test
> node --test --test-reporter=spec
...
ℹ tests 84
ℹ pass 84
ℹ fail 0

cd ..
node --check .\assets\js\settings-modal.js
node --check .\assets\js\google-calendar.js
```

## 2. Ponto de ancoragem escolhido no boot

O ponto de ancoragem foi `assets/js/app/bootstrap.js`, logo após `await router.navigateTo('tela-home');` e após a sessão Google já ter sido confirmada via `googleIdentity.whenReady()`.

O trecho central ficou assim:

```js
await router.navigateTo('tela-home');

if (global.gcal && typeof global.gcal.isSignedIn === 'function' && global.gcal.isSignedIn()) {
    setTimeout(function () {
        void dispararVerificacaoCanalGCal();
    }, 0);
}
```

Esse ponto foi escolhido porque evita o fluxo “troca de estado + render + navegação” que hoje dispara `carregarDados` em três lugares diferentes. A renovação do canal foi ancorada em uma única função de boot, não no ciclo de carregamento da tela.

## 3. O que mudou

- em `assets/js/google-calendar.js`, centralizei a chamada ao endpoint de renovação em `global.renovarCanalGoogleCalendar`;
- essa helper faz o `POST` para `.../gcal/webhook/renew` e usa `window.log`:
  - `info` para “Canal renovado” e “Sync de recuperação concluída”;
  - `debug` para “Canal ainda válido, nada a fazer”;
- em `assets/js/app/bootstrap.js`, adicionei o guard `gcalWatchCheckDisparado` para rodar a verificação uma única vez por carga de página;
- em `assets/js/settings-modal.js`, adicionei um botão manual `btnRenewGoogleCalendarWatch` que chama o mesmo endpoint como escape hatch de diagnóstico;
- em `index.html`, incluí o botão no bloco da Google Agenda.

## 4. Prova de que ele roda uma única vez apesar dos três `carregarDados`

A prova é o guard do boot:

```js
let gcalWatchCheckDisparado = false;

async function dispararVerificacaoCanalGCal() {
    if (gcalWatchCheckDisparado) {
        return;
    }

    gcalWatchCheckDisparado = true;
    ...
}
```

O app continua com os três gatilhos de `carregarDados` já existentes (bootstrap + auth-change + view-home), mas nenhum deles chama a renovação do canal. O único disparo do item 3 fica no ponto de ancoragem único do boot, então o canal é verificado apenas uma vez por abertura da página.

Além disso, quando não há sessão Google válida, a função não força login e apenas faz `return` silencioso, como exigido.

## 5. Saída de `git diff --stat`

```text
assets/js/app/bootstrap.js        | 30 ++++++++++++++
assets/js/google-calendar.js       | 55 +++++++++++++++++++++
assets/js/settings-modal.js        | 82 ++++++++++++++++++++++++++++++++++
index.html                         |  7 +++
4 files changed, 174 insertions(+), 6 deletions(-)
```

## 6. Tabela de mutação

| Etapa | Ação | Resultado |
| --- | --- | --- |
| 1 | Colocar a verificação do canal no ponto errado (dentro de `carregarDados`) | risco de 3 x renovação ou side-effects repetidos |
| 2 | Ancorar a chamada no boot uma única vez | `gcalWatchCheckDisparado` bloqueia o reexec |
| 3 | Adicionar o escape hatch no settings modal | mesmo endpoint, sem mexer no fluxo principal |
| 4 | Validar sintaxe e suite | `84 pass / 0 fail` |

## 7. Saída do `npm test`

```text
> personal-api@1.0.0 test
> node --test --test-reporter=spec

✔ expiração distante → não renova, não sincroniza
✔ expiração dentro da margem de 24h → renova e sincroniza
✔ expiração nula → renova e sincroniza
✔ falha ao encerrar canal antigo → segue e renova mesmo assim
✔ duas chamadas concorrentes → um único registro de canal
...
ℹ tests 84
ℹ pass 84
ℹ fail 0
ℹ duration_ms 843.936
```
