# Relatório — feat/login-render-button (2026-08-27)

## 1) Motivo da mudança

O login interativo atual depende do botão customizado (`#custom-google-login`), que dispara `google.accounts.id.prompt()`. Quando o Google grava o cookie `g_state` após o fechamento repetido do One Tap, esse prompt entra em embargo com motivo `suppressed_by_user` e todo o fluxo de login automático fica bloqueado. O app ficava sem saída porque o único caminho visível era o botão customizado que chama exatamente `prompt()`, e o `g_state` desativa essa chamada.

A correção foi adicionar um fluxo paralelo usando o botão oficial do Google via `google.accounts.id.renderButton()`. Esse caminho não passa pelo One Tap e, portanto, não é suprimido pelo mesmo embargo. O botão customizado e o callback existente foram preservados; a diferença é que agora o usuário tem uma alternativa funcional mesmo quando o embargado do `g_state` bloqueia o prompt.

## 2) Trecho adicionado em cada arquivo

### `index.html`

Adicionado o container para o botão oficial, imediatamente ao lado do botão customizado:

```html
<button
  id="custom-google-login"
  type="button"
  class="btn-google-custom"
>
  <i class="fa-brands fa-google"></i>
  <span>Entrar com Google</span>
</button>
<div id="googleSignInButtonFallback" class="google-signin-fallback"></div>
```

### `assets/js/auth/google-identity.js`

Novo helper:

```js
function _renderGoogleOfficialButton() {
    const container = document.getElementById('googleSignInButtonFallback');
    if (!container || !global.google || !global.google.accounts || !global.google.accounts.id) {
        return;
    }

    if (container.dataset.gisRendered === 'true') {
        return;
    }

    try {
        global.google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'filled_black',
            size: 'medium',
            text: 'signin_with',
            shape: 'pill',
            locale: 'pt-BR'
        });
        container.dataset.gisRendered = 'true';
    } catch (error) {
        console.warn('[auth] Falha ao renderizar botão oficial do Google:', error);
    }
}
```

Chamada no fluxo de inicialização:

```js
_bindCustomLoginButton();
_renderGoogleOfficialButton();
_initializeGISCalendarCodeClient();
```

Mensagem revisada no ramo `suppressed_by_user`:

```js
_showAuthMessage('O Google suprimiu o login automático. Use o botão oficial do Google ao lado para entrar.', 'warning');
```

## 3) Preservação do botão customizado

A correção preservou o caminho atual e o elemento existente:

- `#custom-google-login` continua no HTML.
- `_bindCustomLoginButton()` continua definido e sendo usado no fluxo de inicialização e no `refreshButton` exportado.
- O callback `_handleCredentialResponse` foi mantido intacto.
- `initialize()` e as opções de `google.accounts.id.initialize()` não foram alteradas.

Em outras palavras, o botão oficial foi adicionado como fallback paralelo, não como substituto do botão customizado.

## 4) Item 4 (CSS)

Não foi necessário. O botão oficial renderizou alinhado ao lado do botão customizado no sanity check do browser local e não exigiu regra adicional de CSS.

## 5) Portão de base

Comandos executados:

```powershell
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'renderButton|_bindCustomLoginButton|suppressed_by_user|_initializeGISIdentity'
Select-String -Path 'index.html' -Pattern 'custom-google-login|googleSignedOutState'
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'serieOrigemId'
```

Saída literal:

```text
assets\js\auth\google-identity.js:171:        if (motivo === 'suppressed_by_user') {
assets\js\auth\google-identity.js:399:    function _bindCustomLoginButton() {
assets\js\auth\google-identity.js:763:    function _initializeGISIdentity() {
assets\js\auth\google-identity.js:778:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:804:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:807:            global.__registerGISReadyHandler(_initializeGISIdentity);
assets\js\auth\google-identity.js:874:        refreshButton: _bindCustomLoginButton,
index.html:34:            <div id="googleSignedOutState" class="header-session-state">
index.html:40:                id="custom-google-login"
assets\js\modal-acao-slot.js:1101:            serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
```

## 6) Portão de saída

Comandos executados:

```powershell
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'renderButton' -Context 2,2
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_bindCustomLoginButton'
Select-String -Path 'index.html' -Pattern 'googleSignInButtonFallback'
Select-String -Path 'index.html' -Pattern 'custom-google-login'
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'serieOrigemId'
node --check 'assets/js/auth/google-identity.js'
git diff --stat
git status --short
```

Saída literal:

```text
assets\js\auth\google-identity.js:408:
  assets\js\auth\google-identity.js:409:        try {
> assets\js\auth\google-identity.js:410:            global.google.accounts.id.renderButton(container, {
  assets\js\auth\google-identity.js:411:                type: 'standard',
  assets\js\auth\google-identity.js:412:                theme: 'filled_black',
assets\js\auth\google-identity.js:424:    function _bindCustomLoginButton() {
assets\js\auth\google-identity.js:803:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:830:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:900:        refreshButton: _bindCustomLoginButton,
index.html:47:              <div id="googleSignInButtonFallback" class="google-signin-fallback"></div>
index.html:40:                id="custom-google-login"
assets\js\modal-acao-slot.js:1101:            serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
---
---
 assets/js/auth/google-identity.js | 28 +++++++++++++++++++++++++++-
 index.html                        |  1 +
 2 files changed, 28 insertions(+), 1 deletion(-)
---
 M assets/js/auth/google-identity.js
 M index.html
```

Observação: o `node --check` foi executado sem erro, e a saída ficou em branco entre a linha de `serieOrigemId` e o diff, como esperado para o comando final. O diff do arquivo do Google identity ficou em 28 linhas alteradas, dentro do limite de 40 linhas da convenção do prompt.

## 7) Resultado dos testes manuais

### Passo 1 — Estado limpo e botão oficial visível

Resultado verificado no browser em `http://localhost:5500`: o botão oficial do Google apareceu no header ao lado do botão customizado. O snapshot do navegador mostrou ambos os caminhos visíveis (o botão customizado `Entrar com Google` e o botão oficial do Google em um container separado do header).

### Passo 2 — Login pelo botão oficial

Não executado nesta sessão. Requer autenticação real do Google e um backend autenticado em funcionamento. Neste ambiente não havia uma sessão de usuário ou token Google válido para completar o fluxo real.

### Passo 3 — Logout

Não executado nesta sessão por não haver sessão de login real ativa.

### Passo 4 — Recriar o embargo do `g_state`

Não executado nesta sessão. Para reproduzir o embargo real do Google, é necessário interagir com a UI do Google em um navegador autenticado e com cookies reais do Google. Não houve no contexto desta execução uma sessão de Google válida para fechar o One Tap duas vezes seguidas e confirmar a gravação de `g_state`.

Este é o passo crítico do cenário e, por isso, merece destaque: a correção está implementada e o botão oficial continua visível, mas a validação real do embargo do `g_state` não pôde ser completada neste ambiente sem uma sessão de usuário e cookies do Google em operação.

### Passo 5 — Botão customizado continua funcionando

Não foi possível confirmar em interação real neste ambiente, mas a lógica do botão customizado foi preservada no código (`_bindCustomLoginButton`, `#custom-google-login`, callback e `initialize()`) e a chamada do botão oficial foi adicionada como paralelo, não substitutiva.

## 8) Conclusão

A implementação atende ao requisito de adicionar um caminho de login alternativo que não passa por `prompt()` e, portanto, não fica bloqueado pelo embargo do `g_state`. A correção foi validada no nível de renderização do frontend e pela ausência de erros de sintaxe do arquivo JavaScript. A validação de login real com conta Google e embargo do One Tap fica como próxima etapa em ambiente com usuário Google autenticado e backend disponível.
