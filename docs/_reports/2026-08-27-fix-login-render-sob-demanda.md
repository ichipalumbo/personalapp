# Relatório — fix/login-render-sob-demanda (2026-08-27)

## 1) Causa do vazamento

A causa do vazamento foi a renderização do botão oficial do Google no boot: `_renderGoogleOfficialButton()` era chamado dentro de `_initializeGISIdentity()`, antes de qualquer embargo ou qualquer visibilidade do container. O Google, ao chamar `google.accounts.id.renderButton()`, escreve estilos inline no próprio container. Como o estilo inline prevalece sobre a regra CSS, o `display: none` do `.google-signin-fallback` era sobrescrito imediatamente.

Isso criava dois efeitos:

- o botão oficial aparecia mesmo sem embargo;
- o iframe do GIS nascia dentro de um container sem layout suficiente, com dimensão indefinida e o risco de permanecer quebrado mesmo depois de revelar o botão.

## 2) Por que a renderização sob demanda corrige os dois problemas

A correção foi não renderizar no boot. O fluxo agora faz o seguinte:

1. o container continua vazio e oculto;
2. quando o embargo é detectado, `container.classList.add('is-visible')` é executado;
3. somente então `_renderGoogleOfficialButton()` é chamado;
4. o mesmo container já tem layout e o Google consegue medir o espaço corretamente.

Como a renderização só acontece depois da visibilidade, o conteúdo do container não aparece no estado normal, e o iframe do GIS é criado no momento certo, com tamanho adequado.

## 3) Três blocos reescritos e expandidos

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

### 3.3 `_renderGoogleOfficialButton()`

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
                type: 'icon',
                theme: 'filled_black',
                size: 'medium',
                shape: 'circle'
            });
            container.dataset.gisRendered = 'true';
        } catch (error) {
            console.warn('[auth] Falha ao renderizar botão oficial do Google:', error);
        }
    }
```

## 4) Confirmação de escopo

- `index.html` não foi alterado nesta rodada.
- `assets/css/style.css` não foi alterado nesta rodada.
- O caminho principal do login continua preservado:
  - `#custom-google-login`
  - `_bindCustomLoginButton()`
  - `_requestInteractiveSignIn()`
  - `_handleCredentialResponse`
- A chamada `_renderGoogleOfficialButton()` foi removida do boot em `_initializeGISIdentity()` e passou a ocorrer somente dentro de `_revelarBotaoOficialGoogle()`.
- O ramo `_attemptSilentSessionRestore()` também revela o botão ao detectar `suppressed_by_user` sem levantar `_promptBloqueado` nem disparar toast.

## 5) Portão de base

Comandos executados:

```powershell
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_renderGoogleOfficialButton|_revelarBotaoOficialGoogle|renderButton'
Select-String -Path 'assets\css\style.css' -Pattern 'google-signin-fallback' -Context 1,3
Select-String -Path 'index.html' -Pattern 'googleSignInButtonFallback'
```

Saída literal:

```text
assets\js\auth\google-identity.js:144:    function _revelarBotaoOficialGoogle() {
assets\js\auth\google-identity.js:173:        if (motivo === 'suppressed_by_user') {
assets\js\auth\google-identity.js:398:    function _renderGoogleOfficialButton() {
assets\js\auth\google-identity.js:780:        _renderGoogleOfficialButton();
assets\css\style.css:252:
> assets\css\style.css:253:.google-signin-fallback {
  assets\css\style.css:254:  display: none;
  assets\css\style.css:255}
  assets\css\style.css:256:
> assets\css\style.css:257:.google-signin-fallback.is-visible {
  assets\css\style.css:258:  display: inline-flex;
  assets\css\style.css:259:  align-items: center;
  assets\css\style.css:260:  margin-left: 8px;
index.html:47:              <div id="googleSignInButtonFallback" class="google-signin-fallback"></div>
```

Observação: neste ponto, a linha do `renderButton` foi removida do boot e a renderização sob demanda foi implementada no mesmo arquivo, conforme o objetivo da rodada.

## 6) Portão de saída

Comandos executados:

```powershell
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_renderGoogleOfficialButton' -Context 3,3
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_revelarBotaoOficialGoogle' -Context 2,6
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_bindCustomLoginButton'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern "type: 'icon'|shape: 'circle'"
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'serieOrigemId'
node --check 'assets/js/auth/google-identity.js'
git diff --stat
git status --short
```

Saída literal:

```text
assets\js\auth\google-identity.js:148:        }
  assets\js\auth\google-identity.js:149:
  assets\js\auth\google-identity.js:150:        container.classList.add('is-visible');
> assets\js\auth\google-identity.js:151:        _renderGoogleOfficialButton();
  assets\js\auth\google-identity.js:152:    }
  assets\js\auth\google-identity.js:153:
  assets\js\auth\google-identity.js:154:    function _tratarResultadoPrompt(notification) {
  assets\js\auth\google-identity.js:411:        });
  assets\js\auth\google-identity.js:412:    }
  assets\js\auth\google-identity.js:413:
> assets\js\auth\google-identity.js:414:    function _renderGoogleOfficialButton() {
  assets\js\auth\google-identity.js:415:        const container = 
document.getElementById('googleSignInButtonFallback');
  assets\js\auth\google-identity.js:416:        if (!container || !global.google || !global.google.accounts || 
!global.google.accounts.id) {
  assets\js\auth\google-identity.js:417:            return;
---
  assets\js\auth\google-identity.js:142:    }
  assets\js\auth\google-identity.js:143:
> assets\js\auth\google-identity.js:144:    function _revelarBotaoOficialGoogle() {
  assets\js\auth\google-identity.js:145:        const container = 
document.getElementById('googleSignInButtonFallback');
  assets\js\auth\google-identity.js:146:        if (!container) {
  assets\js\auth\google-identity.js:147:            return;
  assets\js\auth\google-identity.js:148:        }
  assets\js\auth\google-identity.js:149:
  assets\js\auth\google-identity.js:150:        container.classList.add('is-visible');
  assets\js\auth\google-identity.js:180:
  assets\js\auth\google-identity.js:181:        if (motivo === 'suppressed_by_user') {
> assets\js\auth\google-identity.js:182:            _revelarBotaoOficialGoogle();
  assets\js\auth\google-identity.js:183:            _showAuthMessage('O Google bloqueou o login automático. Use o botão do Google que apareceu no topo.', 'warning');
  assets\js\auth\google-identity.js:184:            return;
  assets\js\auth\google-identity.js:185:        }
  assets\js\auth\google-identity.js:186:
  assets\js\auth\google-identity.js:187:        _showAuthMessage('Prompt de login não foi exibido neste contexto. Tente no navegador padrão.', 'warning');
  assets\js\auth\google-identity.js:186:    }
  assets\js\auth\google-identity.js:405:
  assets\js\auth\google-identity.js:406:            if (motivo === 'suppressed_by_user') {
> assets\js\auth\google-identity.js:407:                _revelarBotaoOficialGoogle();
  assets\js\auth\google-identity.js:408:            }
  assets\js\auth\google-identity.js:409:
  assets\js\auth\google-identity.js:410:            console.info('[auth] Restauração silenciosa de sessão não concluída. Motivo:', motivo);
  assets\js\auth\google-identity.js:411:        });
  assets\js\auth\google-identity.js:412:    }
  assets\js\auth\google-identity.js:413:
---
assets\js\auth\google-identity.js:437:    function _bindCustomLoginButton() {
assets\js\auth\google-identity.js:816:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:842:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:912:        refreshButton: _bindCustomLoginButton,
assets\js\auth\google-identity.js:426:                type: 'icon',
assets\js\auth\google-identity.js:429:                shape: 'circle'
assets\js\modal-acao-slot.js:1101:            serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
---
---
 assets/js/auth/google-identity.js | 44 +++++++++++++++++++++++++++++++++++----
 1 file changed, 40 insertions(+), 4 deletions(-)
---
 M assets/js/auth/google-identity.js
```

Conclusão: o gate ficou conforme o esperado. Não houve chamada de render no boot, `_revelarBotaoOficialGoogle()` foi chamado nos dois pontos corretos, o botão customizado continua com 4 ocorrências, e o `serieOrigemId` permanece preservado.

## 7) Resultado dos testes manuais

### Passo 1 — vazamento no header

Não executado nesta sessão. O ambiente aqui não tinha uma sessão real do Google nem cookies do navegador para validar o comportamento completo do One Tap e do `g_state`.

A correção foi implementada para o cenário lógico: o container fica vazio e oculto em estado normal, e a renderização do Google só ocorre quando o botão é revelado. Isso impede o efeito de vazamento causado pelo estilo inline do Google.

### Passo 2 — login normal

Não executado nesta sessão. Requer autenticação real do Google.

### Passo 3 — logout

Não executado nesta sessão. Requer sessão real aberta.

### Passo 4 — embargo com sessão ativa

Não executado nesta sessão. O cenário de `g_state` e fechamento do One Tap duas vezes exige ambiente autenticado do Google no navegador.

### Passo 5 — embargo no boot

Não executado nesta sessão. Requer reinicialização real no browser com `g_state` gravado antes do carregamento.

### Passo 6 — alinhamento visual

Não executado nesta sessão, mas a correção foi feita sem tocar em `index.html` nem em CSS; o problema era a renderização sob demanda, não a regra de visibilidade em si.

## 8) Conclusão

A correção atende ao requisito de impedir o vazamento do botão oficial do Google no estado normal e, ao mesmo tempo, preservar a emergência visual quando o `g_state` bloqueia o One Tap. O ponto de lógica central foi simples e robusto: renderizar somente quando o container já está visível e quando o embargo foi realmente detectado.
