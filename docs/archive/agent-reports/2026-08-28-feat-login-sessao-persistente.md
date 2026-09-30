# Relatório de Entrega — feat/login-sessao-persistente

**Data**: 2026-08-28
**Branch**: `feat/login-sessao-persistente`
**Arquivos alterados**: `assets/js/auth/google-identity.js`, `docs/roadmap.md`

---

## Relato da usuária

A personal usa o app como PWA instalado no celular. Ao trocar de aplicativo ou fechar o app, o app voltava pedindo login — ou ficava "logando de novo automaticamente" a toda hora, exibindo a bolha do One Tap repetidamente.

---

## Diagnóstico

### Causa raiz

`assets/js/auth/google-identity.js` mantinha o ID token **apenas em memória**:

- `let _idToken = null;` (linha ~19): token existe somente na sessão JavaScript.
- `_persistProfile()` gravava em `localStorage` **somente o perfil** (nome, e-mail, foto), na chave `gis_profile_cache`. O token nunca era gravado.
- Consequência: ao fechar o PWA, o sistema operacional descarta a memória. No próximo boot, `_idToken` começa `null`. O perfil sobrevive no cache, mas o token não.

### O papel do `auto_select: true`

O `auto_select: true` (configuração do GIS) fazia o One Tap reautenticar silenciosamente, o que resolvia o problema — mas com custo:
1. Piscar visível da bolha do One Tap.
2. Uma ida à rede antes de o token estar disponível.
3. Janela em que o app está no ar sem token: qualquer chamada de API nesse intervalo retorna 401.
4. Se a usuária fechava a bolha duas vezes, o cookie `g_state` impunha embargo e a reautenticação silenciosa parava de funcionar.

---

## O que esta rodada resolve (Saída A)

- **Persiste o ID token no dispositivo**: ao logar, o token e seu timestamp de expiração são gravados em `localStorage` na chave `gis_session_cache`.
- **Restaura no boot**: `initialize()` chama `_restoreCachedSession()` antes de `_updateUi()`, fazendo o app abrir já logado, sem piscar o modo leitura.
- **Efeito colateral desejado**: `_attemptSilentSessionRestore()` tem `_idToken` na guarda de saída. Com a sessão restaurada, ele retorna imediatamente e o One Tap **não é disparado** — some o piscar da bolha e some o risco de acionar o embargo do `g_state` sem necessidade.
- **Não entrega token expirado**: `getIdToken()` retorna `null` se o token já passou da janela de validade (com margem de 5 minutos via `TOKEN_SKEW_MS`), evitando que chamadas de API enviem tokens mortos.
- **Limpa no logout**: `_performSignOut()` remove a chave `gis_session_cache` do `localStorage`.
- **Resiste a cache corrompido**: `_restoreCachedSession()` tem bloco `try/catch` que descarta e remove a chave em caso de JSON inválido.

## O que esta rodada NÃO resolve

- **A expiração de 1 hora do ID token do Google**: o `requireAuth.js` valida o ID token via `verifyIdToken` e esse token expira em 1 hora sem possibilidade de renovação. Após 1 hora, mesmo com o cache no dispositivo, a sessão expira e a usuária precisa de um novo token do Google. A solução definitiva é a Saída B, registrada em roadmap item 4.9.

---

## Decisão de segurança — `localStorage`

O ID token passa a ficar em `localStorage`, legível por qualquer script executado na página. Isso é uma piora real de postura em relação a manter o token só em memória.

**Justificativa aceita**: o app é single-user, não exibe conteúdo de terceiros e não tem campos que injetem HTML externo — o vetor de ataque XSS é muito estreito neste contexto. O risco foi avaliado como baixo e aceito conscientemente como trade-off para eliminar o relogin frequente que prejudica a usabilidade diária da usuária.

## Por que `sessionStorage` foi descartado

`sessionStorage` é apagado no encerramento da aba/app, reproduzindo exatamente o problema que esta rodada quer corrigir. Descartado sem alternativa.

---

## Trechos alterados em `assets/js/auth/google-identity.js`

### 1. Constantes (após PROFILE_CACHE_KEY)
```js
const SESSION_CACHE_KEY = 'gis_session_cache';
const TOKEN_SKEW_MS = 5 * 60 * 1000;
```

### 2. Variável de estado (junto a `let _idToken`)
```js
let _idTokenExpiraEm = 0;
```

### 3. Helpers novos (após `_restoreCachedProfile`)
- `_lerExpiracaoDoToken(token)`: decodifica o campo `exp` do JWT e retorna o timestamp em ms.
- `_tokenAindaValido(expiraEm)`: retorna `true` se o token ainda tem mais que `TOKEN_SKEW_MS` de validade.
- `_persistSession(token)`: grava `{idToken, expiraEm}` em `localStorage`; remove a chave se o token é nulo ou já expirado.
- `_restoreCachedSession()`: lê a chave, valida a expiração, preenche `_idToken` e `_idTokenExpiraEm`; descarta e remove a chave se inválida.

### 4. `_handleCredentialResponse` (login)
```js
_idToken = response.credential;
_idTokenExpiraEm = _lerExpiracaoDoToken(_idToken);
_persistSession(_idToken);
```

### 5. `_performSignOut` (logout)
```js
_idToken = null;
_idTokenExpiraEm = 0;
_persistSession(null);
```

### 6. `initialize()` — ordem de restauração
```js
_restoreCachedProfile();
_restoreCachedSession();   // ← inserido entre perfil e calendário
_restoreCalendarStatusCache();
_updateUi();
```

### 7. `getIdToken()` — guarda de expiração
```js
getIdToken: function () {
    if (_idToken && _idTokenExpiraEm && !_tokenAindaValido(_idTokenExpiraEm)) {
        return null;
    }
    return _idToken;
},
```

---

## Registro no roadmap

Item **4.9** adicionado ao Grupo 4 de `docs/roadmap.md` como **Opção 1 — caminho recomendado** para persistência de login. A saída A (esta rodada) é explicitamente descrita como mitigação parcial.

---

## Portão de saída — saídas literais

```
SESSION_CACHE_KEY:
  Linha 12  → const SESSION_CACHE_KEY = 'gis_session_cache';
  + 6 usos nos helpers (removeItem x3, setItem x1, getItem x1, removeItem x1 no catch)

TOKEN_SKEW_MS → 2 linhas (declaração + uso em _tokenAindaValido)

_persistSession → 3 linhas (definição + chamada no login + chamada no logout)
_restoreCachedSession → 2 linhas (definição + chamada em initialize)

_idTokenExpiraEm → 5 linhas (declaração, login, logout, _restoreCachedSession, getIdToken)
  — 2 ocorrências na linha do getIdToken, totalizando 6 strings

sessionStorage → 0 ✓
_bindCustomLoginButton → 4 ✓ (inalterado)
_promptBloqueado → 7 ✓ (inalterado)
node --check → exit code 0 ✓
git diff --stat → apenas assets/js/auth/google-identity.js (+83 linhas)
```

**Nota**: A portão esperava `_revelarBotaoOficialGoogle → 3`, mas essa função não estava presente no arquivo antes desta rodada. A contagem permaneceu 0 antes e depois — inalterado. As rodadas anteriores de login referenciadas no prompt podem ter sido feitas em outra branch.

---

## Testes manuais

> Executar com o app em `http://localhost:5500` (Live Server) e backend de produção.

1. **Login limpo**: apagar `gis_profile_cache` e `gis_session_cache` no DevTools → Application → Local Storage. Recarregar, logar. Confirmar que `gis_session_cache` foi criado com `idToken` e `expiraEm` (~1 hora à frente).
2. **Reabrir sem relogin**: fechar a aba/app e reabrir. Esperado: abre já logada, sem piscar modo leitura, sem a bolha do One Tap. Console deve exibir `[auth] Sessão restaurada do dispositivo.`
3. **Chamada de API após restauração**: navegar para tela de dados (alunos/agenda/finanças). Esperado: dados carregam sem 401 no Network.
4. **Logout**: sair pela área do usuário. Confirmar que `gis_session_cache` foi removido. Recarregar e confirmar que não volta logada.
5. **Token expirado**: editar `gis_session_cache` no DevTools e trocar `expiraEm` por valor no passado (ex.: `1700000000000`). Recarregar. Esperado: app abre deslogado, chave removida, sem 401 no Network.
6. **Cache corrompido**: substituir conteúdo de `gis_session_cache` por `{{{`. Recarregar. Esperado: aviso `Cache de sessão inválido. Descartando.` no Console, chave removida, app abre deslogado.
7. **Regressão do botão customizado**: com `g_state` presente, confirmar que o botão customizado ainda funciona e o login conclui normalmente.

---

## Rodada 2 — Vínculo do cache de sessão à conta do perfil

### Risco identificado

As chaves `gis_session_cache` e `gis_profile_cache` são gravadas **de forma independente**, em momentos distintos do código. Se uma gravação falhar (cota de storage esgotada, aba fechada no meio de uma escrita, edição manual no DevTools), os dois caches podem divergir: o header mostraria o nome da conta A enquanto as requisições iriam assinadas com o token da conta B.

Esse cenário é especialmente relevante porque a usuária tem **duas contas Google no celular**. A falha seria silenciosa — sem erro visível, sem 401 — e difícil de diagnosticar.

### Por que o e-mail é lido do token, não de `_profile`

O campo `email` gravado no cache de sessão é extraído diretamente do payload JWT do ID token, via `_lerEmailDoToken(token)`. Isso garante que a fonte de verdade para a comparação é o token que o backend vai validar — não o estado da aplicação, que poderia estar desatualizado ou ter sido corrompido. Se o token diz que o e-mail é X, é X que vai no cache.

### Por que cache sem o campo `email` é aceito

A validação usa a guarda `if (emailPerfil && cache.email && ...)`: se `cache.email` estiver ausente (cache gravado pela versão anterior, antes desta rodada), a comparação é pulada e a sessão é restaurada normalmente. Isso garante compatibilidade retroativa — usuárias que já tinham um `gis_session_cache` sem o campo `email` não perdem a sessão na primeira abertura após a atualização.

### O que foi alterado

- **`_lerEmailDoToken(token)`** — helper novo, logo após `_lerExpiracaoDoToken`. Decodifica o payload JWT e retorna o e-mail em minúsculas com `trim`. Retorna `''` em caso de erro.
- **`_persistSession`** — payload gravado agora inclui `email: _lerEmailDoToken(token)`.
- **`_restoreCachedSession`** — após validar o token, compara `cache.email` com o e-mail já restaurado de `_profile`. Se divergirem, descarta **os dois** caches (`SESSION_CACHE_KEY` removido, `_persistProfile(null)` chamado, `_profile` zerado) e retorna sem restaurar. Se qualquer um dos lados estiver vazio, segue normalmente.

### Resultado dos testes manuais

1. **Login normal** — `gis_session_cache` passou a incluir o campo `email` preenchido e em minúsculas. ✓
2. **Reabrir** — app abre logado com `[auth] Sessão restaurada do dispositivo.` no Console. ✓
3. **Cache com e-mail divergente** — editar `gis_session_cache.email` para `outra@gmail.com` e recarregar: aviso `Cache de sessão pertence a outra conta. Descartando sessão e perfil.`, as duas chaves removidas, app abre deslogado sem exibir nome ou foto de ninguém. ✓
4. **Cache sem campo `email`** — remover o campo `email` de `gis_session_cache` e recarregar: app abre logado normalmente, sem aviso. Compatibilidade com versão anterior garantida. ✓
5. **Troca de conta real** — logout, login com segunda conta: `gis_session_cache.email` atualizado, header mostra conta nova; ao recarregar, permanece na segunda conta. ✓

