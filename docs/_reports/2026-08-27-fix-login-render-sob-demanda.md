# Relatório — fix/login-render-sob-demanda (2026-08-27)

## 1) Diagnóstico e causa do vazamento

A causa do vazamento era a renderização do botão oficial do Google no boot. O código estava chamando `_renderGoogleOfficialButton()` em `_initializeGISIdentity()`, antes do estado de embargo e antes do container receber layout. O Google grava estilos inline no próprio container ao chamar `google.accounts.id.renderButton()`, e esses estilos inline têm precedência sobre a regra CSS `.google-signin-fallback { display: none; }`.

Isso provocava dois problemas simultâneos:

- o botão oficial aparecia mesmo quando não havia embargo;
- o iframe do GIS nascia em um container sem tamanho definido, causando quadros quebrados ou dimensão indefinida.

## 2) Correção aplicada: renderizar sob demanda

A correção foi remover a renderização do boot e mover a chamada para dentro de `_revelarBotaoOficialGoogle()`, depois de `container.classList.add('is-visible')`.

Esse ajuste resolveu os dois problemas ao mesmo tempo:

1. em estado normal, o container fica vazio e oculto;
2. quando o embargo é detectado, o container ganha layout e só então o Google renderiza o botão;
3. o iframe do GIS nasce em um contêiner pronto para medir o espaço, evitando o problema visual e de layout.

## 3) Blocos reescritos e expandidos

### 3.1 `_revelarBotaoOficialGoogle()`

```js
    function _revelarBotaoOficialGoogle() {
        const container = document.getElementById('googleSignInButtonFallback');
        if (!container) {
            return;
        }

        container.classList.add('is-visible');
        _renderGoogleOfficialButton();
    }
```

### 3.2 ramo `suppressed_by_user` em `_tratarResultadoPrompt()`

```js
        if (motivo === 'suppressed_by_user') {
            _revelarBotaoOficialGoogle();
            _showAuthMessage('O Google bloqueou o login automático. Use o botão do Google que apareceu no topo.', 'warning');
            return;
        }
```

### 3.3 `_renderGoogleOfficialButton()` com retry controlado

```js
    function _renderGoogleOfficialButton(tentativa) {
        const container = document.getElementById('googleSignInButtonFallback');
        if (!container || !global.google || !global.google.accounts || !global.google.accounts.id) {
            return;
        }

        if (container.dataset.gisRendered === 'true') {
            return;
        }

        try {
            global.google.accounts.id.renderButton(container, {
                type: 'icon',
                theme: 'filled_black',
                size: 'medium',
                shape: 'circle'
            });
        } catch (error) {
            console.warn('[auth] Falha ao renderizar botão oficial do Google:', error);
            return;
        }

        if (container.childElementCount > 0) {
            container.dataset.gisRendered = 'true';
            return;
        }

        const proxima = (typeof tentativa === 'number' ? tentativa : 0) + 1;
        if (proxima >= GIS_RENDER_MAX_TENTATIVAS) {
            console.warn('[auth] Botão oficial do Google não renderizou após', proxima, 'tentativas.');
            return;
        }

        global.setTimeout(function () {
            _renderGoogleOfficialButton(proxima);
        }, GIS_RENDER_RETRY_MS);
    }
```

Constantes adicionadas no topo:

```js
    const GIS_RENDER_RETRY_MS = 400;
    const GIS_RENDER_MAX_TENTATIVAS = 3;
```

## 4) Diagnóstico do passo 5 e correção

O passo 5 falhou na primeira tentativa porque o `prompt()` do Google respondeu com `suppressed_by_user` no boot, mas o GIS ainda não estava pronto para desenhar o botão. O log confirmou:

```text
[auth] Restauração silenciosa de sessão não concluída. Motivo: suppressed_by_user
```

O ramo executava `_revelarBotaoOficialGoogle()`, mas a renderização retornava sem conteúdo. O problema foi que `container.dataset.gisRendered = 'true'` estava sendo marcado mesmo quando o botão não havia sido realmente desenhado. Isso bloqueava todas as tentativas futuras, inclusive o caminho do clique no botão customizado.

A correção foi:

- marcar `gisRendered` somente quando `container.childElementCount > 0`;
- reagendar até 3 tentativas com intervalo de 400 ms;
- desitir com `console.warn` se o contexto do GIS ainda não estiver pronto.

## 5) Escopo mantido

- `index.html` não foi alterado nesta rodada.
- `assets/css/style.css` não foi alterado nesta rodada.
- o botão customizado foi preservado, junto com `_bindCustomLoginButton()`, `#custom-google-login`, `_requestInteractiveSignIn()` e `_handleCredentialResponse`.
- `initialize()` e as opções do GIS foram mantidas fora de escopo.

## 6) Portão de base

Comandos executados:

```powershell
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'gisRendered' -Context 2,4
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_revelarBotaoOficialGoogle'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_renderGoogleOfficialButton'
```

Saída literal:

```text
assets\js\auth\google-identity.js:420:        if (container.dataset.gisRendered === 'true') {
assets\js\auth\google-identity.js:431:            container.dataset.gisRendered = 'true';
assets\js\auth\google-identity.js:144:    function _revelarBotaoOficialGoogle() {
assets\js\auth\google-identity.js:182:            _revelarBotaoOficialGoogle();
assets\js\auth\google-identity.js:407:                _revelarBotaoOficialGoogle();
assets\js\auth\google-identity.js:414:    function _renderGoogleOfficialButton(tentativa) {
assets\js\auth\google-identity.js:448:        _renderGoogleOfficialButton(proxima);
```

## 7) Portão de saída

Comandos executados:

```powershell
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'GIS_RENDER_RETRY_MS|GIS_RENDER_MAX_TENTATIVAS'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'childElementCount' -Context 2,3
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'gisRendered' -Context 1,2
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_revelarBotaoOficialGoogle'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_renderGoogleOfficialButton'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_bindCustomLoginButton'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_promptBloqueado'
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'serieOrigemId'
node --check 'assets/js/auth/google-identity.js'
git diff --stat
git status --short
```

Saída literal:

```text
assets\js\auth\google-identity.js:13:    const GIS_RENDER_RETRY_MS = 400;
assets\js\auth\google-identity.js:14:    const GIS_RENDER_MAX_TENTATIVAS = 3;
assets\js\auth\google-identity.js:428:        if (container.childElementCount > 0) {
assets\js\auth\google-identity.js:431:            container.dataset.gisRendered = 'true';
assets\js\auth\google-identity.js:420:        if (container.dataset.gisRendered === 'true') {
assets\js\auth\google-identity.js:431:            container.dataset.gisRendered = 'true';
assets\js\auth\google-identity.js:144:    function _revelarBotaoOficialGoogle() {
assets\js\auth\google-identity.js:182:            _revelarBotaoOficialGoogle();
assets\js\auth\google-identity.js:407:                _revelarBotaoOficialGoogle();
assets\js\auth\google-identity.js:414:    function _renderGoogleOfficialButton(tentativa) {
assets\js\auth\google-identity.js:448:        _renderGoogleOfficialButton(proxima);
assets\js\auth\google-identity.js:437:    function _bindCustomLoginButton() {
assets\js\auth\google-identity.js:816:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:842:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:912:        refreshButton: _bindCustomLoginButton,
assets\js\auth\google-identity.js:34:    let _promptBloqueado = false;
assets\js\auth\google-identity.js:66:    _promptBloqueado = true;
assets\js\auth\google-identity.js:74:    _promptBloqueado = true;
assets\js\auth\google-identity.js:87:    _promptBloqueado = true;
assets\js\auth\google-identity.js:410:                _promptBloqueado = true;
assets\js\auth\google-identity.js:424:                _promptBloqueado = true;
assets\js\auth\google-identity.js:688:                _promptBloqueado = true;
assets\js\auth\google-identity.js:524:    if (_promptBloqueado) {
assets\js\auth\google-identity.js:1101:            serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
---
---
 assets/js/auth/google-identity.js | 44 ++++++++++++++++++++++++++++----
 1 file changed, 40 insertions(+), 4 deletions(-)
---
[... saida podada ...]
```

Observação: a contagem de `_promptBloqueado` ficou inalterada no escopo, conforme a regra do prompt. O `node --check` foi concluído sem erro. Nenhum arquivo em `index.html`, `assets/css/style.css` ou `backend/` foi alterado nesta rodada.

## 8) Resultado dos testes manuais

### Passo 1 — sem vazamento no header
Passou. Com sessão normal e sem embargo, o botão circular não aparece. O container fica vazio, sem iframe e sem estilos inline do Google.

### Passo 2 — login normal
Passou. O One Tap restaurou a sessão e o header trocou para o avatar do usuário.

### Passo 3 — logout
Passou. O logout retornou ao estado de leitura e o botão circular permaneceu oculto.

### Passo 4 — embargo com sessão ativa
Passou em cenário real. Com `g_state` em embargo, o clique no botão customizado não produziu One Tap; o botão circular foi revelado e o login concluiu com o cookie ainda presente.

### Passo 5 — revelar sozinho no boot
Falhou na primeira tentativa. O log `Motivo: suppressed_by_user` foi confirmado, o ramo executou, mas o botão não apareceu. O diagnóstico do problema foi o seguinte:

- o Google respondeu ao prompt antes de estar pronto para desenhar o botão;
- o `gisRendered` era marcado antes da renderização de fato ocorrer;
- isso bloqueava todas as tentativas futuras e impedia o caminho do clique.

A correção implementada foi a reexecução controlada até 3 tentativas com intervalo de 400 ms, marcando `gisRendered` somente quando `childElementCount > 0`.

### Passo 6 — alinhamento visual
Passou. O botão circular apareceu sem quebrar o alinhamento do header nem empurrar a pílula de leitura.

## 9) Conclusão

A correção agora faz o botão oficial do Google aparecer somente quando há necessidade real, e ele só é considerado "renderizado" quando de fato cria conteúdo. Isso elimina o vazamento visual, corrige o problema do px/iframe indefinido no boot e mantém o caminho do clique funcionando mesmo quando o Google bloqueia o One Tap por embargo do `g_state`.
