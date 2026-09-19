# Relatório — fix/ciclo-atrasado-bloqueia-ciclo-atual (2026-09-18)

## 1) Escopo da rodada

Correção do defeito descrito no diagnóstico [`docs/_diags_llm/2026-09-18-diag-ciclo-atrasado-bloqueia-ciclo-atual.md`](../_diags_llm/2026-09-18-diag-ciclo-atrasado-bloqueia-ciclo-atual.md): a existência de qualquer ciclo financeiro anterior não pago (ex.: "Atrasado") que **não se sobreponha** ao ciclo vigente fazia `obterOuCriarCicloVigente` abortar e retornar `null` para o aluno inteiro, impedindo o cálculo/criação do ciclo atual e deixando os botões "Marcar como pago" e "Editar ajuste" inoperantes.

Decisão do dono do repositório: o ciclo vigente deve **sempre** ser calculado, independentemente do status de ciclos anteriores — inclusive quando a professora simplesmente esqueceu de marcar um ciclo antigo como pago. A funcionalidade de edição de ciclos anteriores/inadimplência fica para uma etapa futura, fora do escopo desta correção.

## 2) Alteração realizada

**Arquivo:** [`backend/src/services/financasService.js`](../../backend/src/services/financasService.js)
**Função:** `obterOuCriarCicloVigente`

O laço que percorre os ciclos abertos do aluno chamava `encerrarCicloSobrepostoSeNecessario` para cada ciclo aberto que não fosse o vigente, e tratava o retorno `null` dessa função como uma falha geral (`return null`, abortando a criação/leitura do ciclo vigente). Como `encerrarCicloSobrepostoSeNecessario` retorna `null` tanto em caso de erro quanto no caso normal de **ausência de sobreposição**, qualquer ciclo atrasado antigo sem relação temporal com o ciclo vigente bloqueava o aluno inteiro.

A correção substitui o `else { return null; }` por um simples "nada a fazer, segue para o próximo ciclo aberto" — apenas os ciclos que efetivamente se sobrepõem ao ciclo vigente são encurtados; os demais são ignorados pelo laço e o fluxo de criação/leitura do ciclo vigente continua normalmente.

## 3) Testes

### 3.1 Suíte de regressão

Adicionado o teste `obterOuCriarCicloVigente cria o ciclo vigente mesmo com ciclo atrasado antigo sem sobreposição` em [`backend/test/financas-pure.test.js`](../../backend/test/financas-pure.test.js), mockando `CicloFinanceiro.find/findOne/create` no padrão já usado em `reposicao-api.test.js`.

**Prova por mutação**: o fix foi revertido temporariamente e o teste voltou a falhar (7/8 passando, com `AssertionError` no ciclo vigente esperado); reaplicado o fix, o teste voltou a passar (8/8). Confirma que o teste captura a regressão caso o comportamento antigo retorne.

### 3.2 Números medidos

- `financas-pure.test.js` + `financas-competencia.test.js` + `reposicao-api.test.js` + `reposicao-prazo.test.js` + `reposicao-c4-regressao.test.js` + `reposicao-extrato-prazo.test.js` + `agenda-conflitos.test.js`: **60/60 passando** após o fix.
- Suíte completa do backend (`npm test`): **170/218 passando, 48 falhando** — todas as 48 falhas pertencem exclusivamente a `test/gcal-duplicata-fix.test.js` (`ReferenceError: capturarValoresFormularioEdicao is not defined` e correlatos em `assets/js/modal-acao-slot.js`), não relacionadas a esta alteração. **Atualização**: a causa raiz dessas 48 falhas foi investigada e corrigida em rodada posterior no mesmo dia — ver [`2026-09-18-fix-restaurar-funcoes-modal-acao-slot.md`](2026-09-18-fix-restaurar-funcoes-modal-acao-slot.md). Após aquela correção, a suíte completa do backend passa **219/219**.
- Suíte de frontend (`tests-frontend/`): não executada nesta rodada — a alteração é restrita ao backend e não toca em nenhum arquivo consumido por essa suíte.

## 4) Fora de escopo (registrado para o roadmap)

Conforme combinado, a feature de **edição de ciclos anteriores** (permitir à professora corrigir/marcar como pago um ciclo atrasado diretamente, resolvendo a causa raiz da inadimplência acumulada) não foi implementada nesta rodada. Fica registrada como próximo passo a discutir.
