# Relatório — fix/login-botao-discreto (2026-08-27)

## 1) Motivo da mudança

O botão oficial do Google foi adicionado como fallback no header, mas ele era grande demais para o desenho discreto do app: o header foi pensado como uma pílula de leitura com um botão customizado enxuto. O caso real de uso do botão oficial é muito específico: quando o Google bloqueia `google.accounts.id.prompt()` por `suppressed_by_user`, o botão customizado fica sem efeito e o app fica sem login.

A correção foi manter o header praticamente inalterado e ativar o botão oficial apenas quando o embargo aparece. Em vez de mostrar o botão oficial o tempo inteiro, a UI o mantém oculto por padrão e o revela em formato de ícone apenas no cenário de emergência.

## 2) Três mudanças implementadas

### 2.1 — CSS no arquivo correto

O arquivo escolhido foi `assets/css/style.css`, porque é ali que a regra `.btn-google-custom` já existe e funciona como ponto de encaixe do header discreto.

Trecho adicionado:

```css
.google-signin-fallback {
  display: none;
}

.google-signin-fallback.is-visible {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
}
```

### 2.2 — Botão oficial em formato de ícone

No `assets/js/auth/google-identity.js`, a renderização foi ajustada para o modo discreto:

```js
global.google.accounts.id.renderButton(container, {
    type: 'icon',
    theme: 'filled_black',
    size: 'medium',
    text: 'signin_with',
    shape: 'circle',
    locale: 'pt-BR'
});
```

O restante da função foi preservado: guarda de `container`, guarda de `dataset.gisRendered`, e o `try/catch` continuam intactos.

### 2.3 — Revelar somente no embargo

Foi adicionada a função auxiliar:

```js
function _revelarBotaoOficialGoogle() {
    const container = document.getElementById('googleSignInButtonFallback');
    if (container) {
        container.classList.add('is-visible');
    }
}
```

E o ramo `suppressed_by_user` passou a fazer:

```js
if (motivo === 'suppressed_by_user') {
    _revelarBotaoOficialGoogle();
    _showAuthMessage('O Google bloqueou o login automático. Use o botão do Google que apareceu no topo.', 'warning');
    return;
}
```

A flag `_promptBloqueado` continua não sendo ativada nesse ramo, exatamente como o fluxo exige: o botão customizado continua tentando `prompt()` repetidamente; o Google recusa; e cada tentativa reativa a emergência visual do botão oficial.

## 3) Confirmação do escopo

- `#custom-google-login` e `_bindCustomLoginButton()` foram preservados.
- `index.html` foi deixado intocado neste ciclo; o container do botão oficial já existia da rodada anterior.
- Os pontos de negócio do login normal, do callback e da inicialização do GIS não foram alterados.

## 4) Portão de base

Comandos executados:

```powershell
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_renderGoogleOfficialButton|renderButton|suppressed_by_user'
Select-String -Path 'index.html' -Pattern 'googleSignInButtonFallback|custom-google-login'
Select-String -Path 'assets\css\*.css' -Pattern 'btn-google-custom|google-signin-fallback'
```

Saída literal:

```text
assets\js\auth\google-identity.js:171:        if (motivo === 'suppressed_by_user') {
assets\js\auth\google-identity.js:399:    function _renderGoogleOfficialButton() {
assets\js\auth\google-identity.js:410:            global.google.accounts.id.renderButton(container, {
assets\js\auth\google-identity.js:804:        _renderGoogleOfficialButton();
assets\css\style.css:214:.btn-google-custom {
assets\css\style.css:235:.btn-google-custom i {
assets\css\style.css:239:.btn-google-custom:hover {
assets\css\style.css:244:.btn-google-custom:active {
assets\css\style.css:248:.btn-google-custom:focus-visible {
assets\css\style.css:252:.google-signin-fallback {
assets\css\style.css:257:.google-signin-fallback.is-visible {
index.html:40:                id="custom-google-login"
index.html:47:              <div id="googleSignInButtonFallback" class="google-signin-fallback"></div>
```

## 5) Portão de saída

Comandos executados:

```powershell
Select-String -Path 'assets\css\*.css' -Pattern 'google-signin-fallback' -Context 1,3
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern "type: 'icon'|shape: 'circle'"
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_revelarBotaoOficialGoogle'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_renderGoogleOfficialButton'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern '_bindCustomLoginButton'
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'serieOrigemId'
node --check 'assets/js/auth/google-identity.js'
git diff --stat
git status --short
```

Saída literal:

```text
assets\css\style.css:252:
> assets\css\style.css:253:.google-signin-fallback {
  assets\css\style.css:254:  display: none;
  assets\css\style.css:255:}
  assets\css\style.css:256:
> assets\css\style.css:257:.google-signin-fallback.is-visible {
  assets\css\style.css:258:  display: inline-flex;
  assets\css\style.css:259:  align-items: center;
  assets\css\style.css:260:  margin-left: 8px;
assets\js\auth\google-identity.js:419:                type: 'icon',
assets\js\auth\google-identity.js:423:                shape: 'circle',
assets\js\auth\google-identity.js:144:    function _revelarBotaoOficialGoogle() {
assets\js\auth\google-identity.js:179:            _revelarBotaoOficialGoogle();
assets\js\auth\google-identity.js:407:    function _renderGoogleOfficialButton() {
assets\js\auth\google-identity.js:812:        _renderGoogleOfficialButton();
assets\js\auth\google-identity.js:432:    function _bindCustomLoginButton() {
assets\js\auth\google-identity.js:811:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:838:        _bindCustomLoginButton();
assets\js\auth\google-identity.js:908:        refreshButton: _bindCustomLoginButton,
assets\js\modal-acao-slot.js:1101:            serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
---
---
 assets/css/style.css              | 10 ++++++++++
 assets/js/auth/google-identity.js | 36 +++++++++++++++++++++++++++++++++++-
 index.html                        |  1 +
 3 files changed, 46 insertions(+), 1 deletion(-)
---
[... saida podada ...]
 M index.html
```

Observação: a linha `index.html` aparece como modificada no estado atual por causa do trabalho anterior já existente na árvore; neste ciclo, o arquivo foi mantido sem edição do escopo. O comportamento pedido do botão discreto foi implementado no CSS e no JS.

## 6) Teste manual documentado

### Passo 1 — Header limpo

- Com `g_state` apagado em DevTools → Application → Cookies e recarregando a página, o header deve mostrar apenas a pílula “Modo leitura” e o botão customizado.
- O botão oficial não deve aparecer.
- Estado verificado: a regra CSS default deixa o container oculto (`display: none`).

### Passo 2 — Login normal

- Clicar no botão customizado e autenticar via One Tap.
- Esperado: o header troca para `#googleSignedInState`; avatar aparece e o modo edição é liberado.
- Resultado: não executado neste ambiente, por ausência de sessão Google ativa real para autenticar.

### Passo 3 — Logout

- Sair pela área do usuário.
- Esperado: voltar ao estado do passo 1, sem o botão oficial visível.
- Resultado: não executado neste ambiente por ausência de sessão ativa.

### Passo 4 — Recriar o embargo do `g_state`

- Fechar o One Tap duas vezes seguidas até a gravação do cookie `g_state`.
- Sem remover esse cookie, clicar no botão customizado.
- Esperado: o prompt do One Tap continua inerte, o toast novo aparece e o botão oficial em ícone aparece ao lado do botão customizado.
- Em seguida, clicar no ícone do Google e confirmar o login.
- Resultado: não executado neste ambiente, porque não havia sessão autenticada do Google e também não foi possível reproduzir o embargo com cookies reais do Google.

Este passo é o mais importante da validação: a correção foi feita para que o botão do Google apareça somente no embargo, mas a confirmação real do login só pode ser feita em um navegador com sessão Google real e com `g_state` gravado.

### Passo 5 — Visual

- Confirmar se o botão circular não empurra a pílula nem quebra o alinhamento do header.
- Resultado: verificado pela regra CSS do container, que usa `inline-flex`, `align-items: center` e `margin-left: 8px`; não há indicadores de quebra de layout no sanity check do frontend local.

## 7) Conclusão

A mudança cumpriu o objetivo de deixar o botão oficial discreto e somente visível no cenário crítico de embargo do `g_state`. O botão customizado continua sendo o caminho principal, enquanto o botão oficial vira uma emergência visual que não polui o header em condições normais.

A validação de autenticação real com Google e com `g_state` gravado depende de um browser com conta Google autenticada e cookies reais do Google, então esse passo crítico foi documentado como pendente fora deste ambiente específico.
