# Mock de runtime para validação de UI

Esta pasta reúne um conjunto de fixtures e um bootstrap para simular o app em qualquer ambiente de desenvolvimento sem tocar em produção.

## O que ele faz

- bloqueia autenticação real do Google;
- finge que o usuário está logado com um e-mail mockado;
- intercepta chamadas de fetch para `/api/*`;
- devolve fixtures por cenário;
- bloqueia escrita em `localStorage` e em endpoints mutáveis;
- limpa os caches de dados do app ao entrar no modo mock, evitando misturar dados reais com fixtures;
- mantém o fluxo real da interface e da renderização do frontend.

## Como usar

1. Abra a página do app em qualquer ambiente local ou remoto.
2. Use o host `127.0.0.2` para ativar automaticamente o mock ou adicione o parâmetro `?mockScenario=<nome>` para escolher o cenário.
3. O `index.html` já carrega os dois scripts na ordem correta, antes do bootstrap da aplicação.

### Exemplos

- `?mockScenario=default`
- `?mockScenario=agendaLotada`
- `?mockScenario=alunosEmAtraso`
- `?mockScenario=vazio`

## Carregamento rápido

O carregamento deve acontecer como script, e não com `fetch()`. `fetch()` apenas baixa o
texto do arquivo e não executa JavaScript. Se o seu ambiente usa uma cópia própria do
`index.html`, inclua estes scripts antes de `assets/js/app.js`:

```html
<script src="/mocks/ui-runtime/scenarios.js"></script>
<script src="/mocks/ui-runtime/mock-runtime.js"></script>
```

Para usar o projeto atual com Live Server, abra uma destas URLs:

```text
http://127.0.0.2:5500/index.html?mockScenario=default
http://127.0.0.2:5500/index.html?mockScenario=agendaLotada
http://127.0.0.2:5500/index.html?mockScenario=alunosEmAtraso
http://127.0.0.2:5500/index.html?mockScenario=vazio
```

No host `127.0.0.2`, o cenário `default` é ativado mesmo sem parâmetro. Em outros hosts,
sem `mockScenario`, o mock não é ativado: o app segue usando o login Google e a API normal.

Ao abrir uma URL com `mockScenario`, os caches locais de alunos, aulas, reposições,
finanças e configurações são removidos daquela origem antes do bootstrap. Isso evita que
uma renderização inicial mostre dados antigos enquanto os fixtures são carregados.

## Cenários disponíveis

- `default` — dashboard completo com alunos e agenda.
- `agendaLotada` — tela densa, agenda com vários horários em sequência.
- `alunosEmAtraso` — alunos com alertas e atraso no ciclo.
- `vazio` — estado sem dados para validar empty states.

## Observações importantes

- este mock é apenas para UI/UX e validação visual;
- não substitui testes de backend nem autenticação real;
- ele é intencionalmente bloqueante para escrita, para evitar qualquer efeito colateral em produção.

## Mudança de cenário em runtime

Se o app já estiver carregado, você pode trocar o cenário com:

```js
window.__UI_MOCK_RUNTIME.setScenario('agendaLotada');
```

## Estrutura

```text
mocks/
  ui-runtime/
    README.md
    scenarios.js
    mock-runtime.js
```
