# Diagnóstico — ciclo "Atrasado" no histórico impede o cálculo do ciclo vigente

> Origem: relato do dono do repositório em 2026-09-18 — "quando temos ciclos anteriores
> marcados como 'Atrasado' (ou outros status), o novo ciclo em aberto não é calculado
> corretamente e os botões 'Marcar como pago' e 'Editar ajuste' do ciclo atual não funcionam".
> Escopo desta rodada: **somente investigação**. Nenhuma correção foi aplicada.
> Arquivo raiz do defeito: `backend/src/services/financasService.js`, função
> `obterOuCriarCicloVigente`.

---

## 1) Resumo executivo

A causa raiz está na função `obterOuCriarCicloVigente` (backend/src/services/financasService.js#L623-L717). Ela varre **todos** os ciclos não pagos do aluno (`ciclosAbertos`, incluindo ciclos "atrasado" de meses anteriores) e, para cada um que **não** seja exatamente o ciclo vigente, chama `encerrarCicloSobrepostoSeNecessario` esperando que ele sempre se sobreponha ao ciclo novo. Quando um ciclo atrasado antigo **não se sobrepõe** à janela do ciclo vigente (o caso comum: um ciclo de meses atrás, já vencido, sem relação temporal com o ciclo de hoje), a função retorna `null` — e esse `null` é tratado no laço como uma falha geral, fazendo `obterOuCriarCicloVigente` abortar e devolver `null` para **o aluno inteiro**, mesmo que o ciclo vigente devesse ser criado/lido normalmente.

Resultado observável:
- `GET /api/financas` retorna `cicloAtual: null` para esse aluno.
- No frontend (`assets/js/view-financas.js`), o template usa `const ciclo = card.cicloAtual || {}`, então o card renderiza com campos vazios/zerados — "o novo ciclo em aberto não é calculado corretamente".
- Os botões "Marcar como pago" e "Editar ajuste" chamam `abrirModalPagamento`/`abrirModalAjuste`, que começam com `if (!card || !card.cicloAtual) return;` — como `cicloAtual` é `null`, o clique não faz nada, sem erro visível no console e sem toast.

---

## 2) Trecho de código responsável

```js
// backend/src/services/financasService.js
async function obterOuCriarCicloVigente(
  ownerEmail,
  aluno,
  agendamentos,
  reposicoes,
  hoje = new Date(),
) {
  const ciclo = calcularCicloVigente(aluno, hoje);
  if (!ciclo) return null;

  const ciclosAbertos = await CicloFinanceiro.find({
    ownerEmail,
    alunoId: aluno.id,
    dataPagamento: null,
    status: { $ne: "pago" },
  }).sort({ cicloInicio: 1 });

  for (const cicloAberto of ciclosAbertos) {
    if (String(cicloAberto.cicloInicio) === String(ciclo.cicloInicioISO)) {
      // ... reconciliação do próprio ciclo vigente (não é o caminho do defeito)
      continue;
    }

    const encurtado = encerrarCicloSobrepostoSeNecessario(cicloAberto, ciclo);
    if (encurtado) {
      // ... encurta e salva o ciclo anterior sobreposto
    } else {
      return null;   // <-- PONTO DO DEFEITO
    }
  }
  // ... só chega aqui se TODOS os ciclos abertos anteriores se sobrepuserem (ou forem o próprio vigente)
  ...
}
```

E a função chamada:

```js
function encerrarCicloSobrepostoSeNecessario(cicloAnterior, cicloNovo) {
  if (!cicloAnterior || !cicloNovo) return null;
  ...
  const sobrepoe = inicioAnterior <= fimNovo && inicioNovo <= fimAnterior;
  if (!sobrepoe) {
    return null;   // <-- comportamento correto e esperado quando NÃO há sobreposição
  }
  ...
  return proximo;   // só quando há sobreposição real
}
```

`encerrarCicloSobrepostoSeNecessario` retornar `null` quando **não há sobreposição** é o comportamento correto e documentado (é a maioria dos casos — ciclos atrasados antigos raramente se sobrepõem ao ciclo vigente). O problema é que o chamador (`obterOuCriarCicloVigente`) interpreta esse `null` como "não consegui reconciliar, abortar tudo", em vez de "não havia nada a fazer aqui, seguir para o próximo ciclo aberto".

---

## 3) Cenário mínimo de reprodução

1. Aluno com `diaVencimento = 15`.
2. Ciclo de junho (`16/05–15/06`) nunca foi marcado como pago e o tempo passou — hoje seu status calculado é `"atrasado"`.
3. Data atual cai dentro do ciclo de setembro (`16/08–15/09`), que ainda não existe como documento `CicloFinanceiro`.
4. `GET /api/financas` chama `obterOuCriarCicloVigente` para esse aluno:
   - `ciclo` (vigente) = `16/08–15/09`.
   - `ciclosAbertos` traz o ciclo de junho (não pago, status persistido diferente de `"pago"`).
   - Laço: ciclo de junho não é o vigente (datas diferentes) → chama `encerrarCicloSobrepostoSeNecessario(junho, setembro)`.
   - `15/06 < 16/08` → **não há sobreposição** → retorna `null`.
   - Chamador cai no `else { return null; }` → `obterOuCriarCicloVigente` retorna `null` para o aluno inteiro.
5. `listarFinancasDoOwner` monta o card com `cicloAtual: null`, `configuracaoPendente: false`.
6. Frontend renderiza o card com `ciclo = {}`, todos os campos financeiros aparecem vazios/zerados, e os botões de ação não respondem ao clique porque `card.cicloAtual` é `null`.

**Qualquer aluno com pelo menos um ciclo não pago (atrasado) que não se sobreponha ao ciclo vigente atual dispara esse comportamento** — o que provavelmente é a maioria dos alunos inadimplentes há mais de um ciclo.

---

## 4) Por que isso não apareceu antes

A suíte `backend/test/financas-pure.test.js` testa `encerrarCicloSobrepostoSeNecessario` isoladamente (linha 92) apenas para o caso de **sobreposição real** (mudança de configuração no meio do ciclo, conforme spec 5.6). Não há teste cobrindo `obterOuCriarCicloVigente` com múltiplos ciclos abertos não sobrepostos simultaneamente — o caminho de "ciclo atrasado antigo + ciclo vigente novo, sem relação temporal" não está coberto por nenhum teste automatizado hoje.

---

## 5) Relação com a spec

A regra 5.6 (`docs/specs/financas-ciclo-cobranca.md`) descreve a invariante de não sobreposição **apenas para o caso de mudança de configuração no meio do ciclo em curso** — um cenário de exatamente um ciclo anterior que se sobrepõe ao novo. A spec não previu (nem deveria prever, dado seu escopo) o caso de múltiplos ciclos abertos e atrasados coexistindo sem sobreposição — que é o estado normal de um aluno inadimplente há vários meses. O código generalizou incorretamente essa regra para todos os ciclos abertos, tratando "sem sobreposição" como condição de erro em vez de "nada a fazer, seguir adiante".

---

## 6) Impacto

- **Financeiro**: o ciclo vigente não é criado/lido para alunos com histórico de atraso, então nenhuma cobrança nova é registrada nem visível enquanto o(s) ciclo(s) atrasado(s) anterior(es) não forem pagos ou removidos.
- **UI**: card renderiza com dados zerados, sem indicar ao usuário que há um erro — pode ser confundido com "aluno sem aulas no ciclo".
- **Ação do usuário**: os botões "Marcar como pago" e "Editar ajuste" do ciclo atual ficam inoperantes (falha silenciosa, sem toast de erro), pois dependem de `card.cicloAtual` estar preenchido.
- **Sem risco de dado incorreto persistido**: como a função retorna `null` antes de criar/gravar o documento do ciclo vigente, não há corrupção de dado — o problema é de disponibilidade/exibição, não de integridade.

---

## 7) Não incluído nesta rodada (aguardando decisão)

Conforme solicitado, nenhuma correção foi aplicada. Possíveis caminhos de correção a avaliar com o dono do repositório antes de implementar:

1. No laço de `obterOuCriarCicloVigente`, tratar o retorno `null` de `encerrarCicloSobrepostoSeNecessario` como "sem sobreposição, seguir para o próximo ciclo aberto" (`continue`) em vez de abortar a função inteira com `return null`.
2. Confirmar se existe algum cenário em que o `return null` geral era intencional (ex.: impedir a criação do ciclo vigente por algum motivo de segurança) — não encontrei essa justificativa na spec nem em comentários do código.
3. Adicionar teste de regressão em `backend/test/financas-pure.test.js` ou em um novo arquivo de teste de integração cobrindo `obterOuCriarCicloVigente` com um ciclo atrasado não sobreposto coexistindo com o ciclo vigente — mutação: reverter o fix e confirmar que o teste falha.
