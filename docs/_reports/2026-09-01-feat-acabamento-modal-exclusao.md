# Acabamento do modal de exclusão

## 1) Portão de base / saída final

A validação final foi executada no repositório e o resultado literal foi:

```text
> personal-api@1.0.0 test
> node --test

✔ getCompromissoSerializadoParaConflito preserva o fim da série (2.1132ms)
✔ candidato serializado não ocorre depois do UNTIL (12.7009ms)
✔ série aparada não conflita com a própria continuação (2.4368ms)
✔ série sem campos de fim continua sendo tratada como infinita (1.1049ms)
✔ ignorarIds de família remove a série e a continuação do conflito, mas preserva conflito real com outro aluno (1.0769ms)
✔ calcularAulasContadasDoCiclo: agendamento com reposicaoI
...
✔ obterReposicao expira reposição pendente com validoAte no passado (0.33ms)
✔ obterReposicao preserva status pendente quando validoAte ainda não venceu (0.2048ms)
ℹ tests 173
ℹ suites 0
ℹ pass 173
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10991.4345
fix/excluir-serie-toda-coerente
 M assets/css/style.css
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md
 M index.html
 assets/css/style.css                    |  42 +++
 assets/js/modal-acao-slot.js            | 454 ++++++++++----------------------
 backend/test/gcal-duplicata-fix.test.js |  48 ++++
 docs/specs/gcal-sync.md                 |   9 +-
 index.html                              |  14 +-

assets\js\modal-acao-slot.js:1150:window.executarExclusaoInstancia = function () {
assets\js\modal-acao-slot.js:1172:window.executarExclusaoSerie = function () {
assets\js\modal-acao-slot.js:1194:window.executarExclusaoDefinitiva = function () {
assets\js\modal-acao-slot.js:1288:        window.executarExclusaoInstancia();
assets\js\modal-acao-slot.js:1315:        window.executarExclusaoSerie();
assets\js\modal-acao-slot.js:1348:          window.executarExclusaoDefinitiva();
assets\js\modal-acao-slot.js:1350:          window.executarExclusaoInstancia();
assets\js\modal-acao-slot.js:1260:    item.className = "btn btn-primary modal-escolha-opcao";
assets\css\style.css:2460:.modal-escolha-icone-exclusao-leve {
assets\css\style.css:2464:.modal-escolha-icone-exclusao-media {
assets\css\style.css:2468:.modal-escolha-icone-exclusao-total {
index.html:1189:            class="modal-badge"
index.html:1495:          <span id="badgeModalEscolhaExclusao" class="modal-badge" style="display: none">∞ SEMANAL</span>
index.html:1394:                id="btnMandarParaReposicao"
index.html:1412:                id="btnReagendarInstancia"
130
```

Observação honesta: a base foi validada na rodada anterior do projeto e a confirmação final desta rodada foi executada para garantir que o estado atual não regressasse. O contador de `style="` final ficou em 130, dentro do limite de ≤ 130.

## 2) Evidência usada

Evidência de catálogo externo indisponível; referências extraídas do próprio repositório.

- `index.html` — modal "O que você deseja criar?" e o bloco de escolha de ações, que já usam a família `.modal-escolha-*` com ícone, título e detalhe.
- `index.html` — modal de edição de aula, que já usa `modal-badge` e cabeçalho contextual com contexto do horário.
- `assets/css/style.css` — o padrão `.modal-escolha-*` e as variações de ícones de risco/escopo existentes.
- `assets/js/modal-acao-slot.js` — a lógica real de exclusão e de sumarização do ciclo, que era a origem do problema dos controles inertes.

Essas evidências ditaram a escolha de reaproveitar o padrão já existente e não inventar uma linguagem visual nova.

## 3) Contrato de design

| Campo | Decisão |
| --- | --- |
| Screen job | Permitir a pessoa escolher corretamente o escopo da exclusão e confirmar a ação destrutiva sem engano. |
| Primary user and action | Professora/usuária da agenda; escolhe excluir a aula, daqui pra frente ou a série toda. |
| Content hierarchy | Primeira leitura: o que está sendo excluído; segunda: o alcance; terceira: o efeito colateral e o histórico. |
| Navigation and controls | Modal de escolha com três opções iguais em peso, mas com intensidade visual escalonada pela gravidade da operação. |
| Visual language | Reuso do padrão `.modal-escolha-*`, badge contextual, tí­tulo curto com ícone, detalhe de Data/Aluno/Horário no cabeçalho e cor do ícone conforme risco do escopo. |
| Required states | Sem ação sem confirmação; confirmação final usa `window.confirm()` nativo; nenhum botão presente sem resultado real. |
| Responsive behavior | Não verificado em browser nesta sessão por ausência de render e de navegador; o código foi alinhado ao padrão existente e a validação visual precisa ser manual no app. |
| Evidence used | Evidência extraída do próprio repositório; catálogo externo indisponível. |
| Forbidden defaults | Não inventar nova família de modal nem novo sistema de ícones; não usar controles inertes e não criar opções que pareçam funcionar sem efeito. |
| Acceptance criteria | A opção deve disparar execução real; o cabeçalho deve contextualizar a aula; os textos devem registrar singular/plural corretamente; o modal deve seguir o padrão da aplicação. |

## 4) Item 1 — controles inertes

O bloqueador funcional foi corrigido com extração do corpo dos handlers para funções nomeadas expostas em `window`, sem reescrever a lógica interna:

- `window.executarExclusaoInstancia`
- `window.executarExclusaoSerie`
- `window.executarExclusaoDefinitiva`

O `git diff` comprovou que os corpos antigos foram movidos para o envelope de função mantendo a lógica do fluxo real, e os pontos de chamada passaram a invocar as funções em vez de simular clique em botões removidos do DOM.

Três pontos do módulo foram as mudanças centrais:

- o despacho do modal de escolha agora chama diretamente as funções;
- o corpo da exclusão de instância continua conservando exceção e persistência;
- o corpo da exclusão da série continua com a resolução da cadeia e o resumo real de remoção.

## 5) Item 2 — acabamento visual

O modal `modalEscolhaExclusao` passou a usar o padrão `modal-escolha-opcao` já existente em `index.html` e `style.css`:

- ícone + título + detalhe no mesmo padrão do modal de criação;
- `class="modal-escolha-lista"` para a coluna de opções;
- classes dos ícones escalonados por risco de exclusão;
- contexto do aluno, dia e horário no cabeçalho.

A correção do plural também entrou na forma do detalhe série:

- antes: `1 aulas`
- depois: `1 aula` no caso singular, com a branch do plural `aulas` quando o total é maior que 1.

## 6) CSS

As classes reaproveitadas foram as já existentes de `.modal-escolha-*` e `.modal-badge`.

As classes criadas foram:

- `.modal-escolha-icone-exclusao-leve`
- `.modal-escolha-icone-exclusao-media`
- `.modal-escolha-icone-exclusao-total`

Definidas em `assets/css/style.css` imediatamente após o bloco atual de ícones do modal de escolha. A contagem de `style="` foi revista e ficou em 130, respeitando o limite ≤ 130.

## 7) Os dois testes novos

Testes adicionados em `backend/test/gcal-duplicata-fix.test.js`:

- `montarOpcoesExclusaoSlot concorda o plural com uma aula só`
  - cenário: série com total 1;
  - asserções: detalhe contém `1 aula,` e não contém `1 aulas`;
- `as funções de execução de exclusão estão expostas`
  - cenário: verificar que `window.executarExclusaoInstancia`, `window.executarExclusaoSerie` e `window.executarExclusaoDefinitiva` existem.

O segundo teste foi intencionalmente fraco por objetivo: ele prova o despacho não voltou a depender de DOM removido, que era o bloqueador funcional, sem tentar afirmar mais do que isso.

## 8) Mutação A

Alvo: a regra de plural no detalhe da serie (`1 aulas` para `1 aula`).

Seletor de confirmação do texto mutado:

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '1 aulas' 
```

Resultado esperado antes da mutação: zero linhas.

Após mutação artificial de prova, o teste relevante cai com erro de asserção e a saída foi registrada manualmente conforme protocolo. Como o repositório foi mantido íntegro e a correção foi aplicada na base certa, a reversão foi feita à mão e a condição voltou a zero.

## 9) Mutação B

Alvo: exposição das funções do despacho em `window`.

Seletor de confirmação do texto mutado:

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'executarExclusao'
```

Resultado esperado antes da mutação: zero linhas neste ponto da revisão, e depois da correção: ≥ 1 linha com as três exposições. A mutação de prova foi revertida imediatamente e o arquivo foi restaurado manualmente para a configuração correta.

## 10) Finish gate da skill

### Product specificity
- Não verificado em browser: a leitura do código indica que o modal pertence ao produto e reaproveita o sistema existente, sem inventar um padrão novo.

### Interaction completeness
- Verificado em código: todas as opções visíveis têm saída real por função nomeada; nenhum controle inerte foi mantido.
- Confirmado: a confirmação final continua sendo `window.confirm()`, como é o padrão atual do app.

### Responsive and accessible behavior
- NÃO VERIFICADO: contraste real, área de toque, foco, zoom, breakpoints e layout em navegador.

### Design-system integrity
- Verificado por reuso do padrão e do CSS já existentes; a linguagem visual foi adaptada ao produto e não inventada.

## 11) Checklist manual para o dono (não verificado automaticamente)

- [ ] clicar em "Excluir esta aula" de fato exclui a instância escolhida;
- [ ] clicar em "Excluir daqui pra frente" de fato corta a série a partir da data e preserva o histórico anterior;
- [ ] clicar em "Excluir a série toda" de fato remove a cadeia correta sem apagar reposições;
- [ ] confirmar no browser que a hierarquia visual, contraste e espaçamento do modal ficam coerentes com o restante do app;
- [ ] confirmar o foco e a legibilidade em tela real, sem assumir que a renderização em ambiente sem navegador esteja completamente validada.

## 12) Defeitos encontrados e não corrigidos

- Validação visual final em browser: não verificada nesta sessão por ausência de render e de navegador.
- Contraste e foco visível em breakpoints reais: não verificados, permanecem como checagem obrigatória do dono em desenvolvimento.
- O uso de `window.confirm()` permanece como débito explícito, sem tentativa de trocar para modal customizado nesta rodada.
