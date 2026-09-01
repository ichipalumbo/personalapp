# Domínio — Financeiro

> **Papel deste arquivo**: índice do domínio. Ele **aponta**; a regra mora na spec.
> Não copie regra de negócio para cá — índice com regra dentro vira segunda fonte de verdade.
>
> **Atualizado**: 2026-09-01

---

## O que este domínio cobre

Quanto o aluno paga, quando paga, o que entra na conta e como isso é registrado.

- Ciclo de cobrança por aluno (vencimento móvel ou mês cheio).
- Método de cobrança (por aula ou valor fixo) e congelamento por snapshot.
- Contagem de aulas cobráveis e ajuste manual do ciclo.
- Registro de pagamento, status e histórico de ciclos.
- Fila de reposições, competência de cobrança, prazo de validade e extrato.

## O que este domínio **não** cobre

| Assunto | Domínio dono |
| --- | --- |
| Como a aula existe, repete ou é excluída da agenda | [`../agenda/`](../agenda/README.md) |
| Cadastro, status e ciclo de vida do aluno | [`../alunos/`](../alunos/README.md) |
| Publicação da aula no Google Calendar | [`../integracoes/`](../integracoes/README.md) |
| Cache, fallback e confirmação de escrita | [`../plataforma/`](../plataforma/README.md) |

O financeiro **lê** a agenda para contar aulas, mas não decide como a agenda funciona.

## Specs deste domínio

| Spec | Decide | Status |
| --- | --- | --- |
| [`financas-ciclo-cobranca.md`](financas-ciclo-cobranca.md) | ciclo, snapshot, valor, pagamento, congelamento, indicador de consistência de agenda | v7 · em produção |
| [`reposicoes-e-competencia.md`](reposicoes-e-competencia.md) | fila de reposição, competência, prazo, expiração, extrato do ciclo | v6 · em produção |

**Precedência**: em divergência sobre reposições, `reposicoes-e-competencia.md` prevalece — ela redefine a regra 5.8 da spec de ciclo.

## Ordem de leitura sugerida

1. `financas-ciclo-cobranca.md` seções 1 a 5 — o modelo de ciclo e o cálculo.
2. `reposicoes-e-competencia.md` seções 3 e 5 — por que a contagem mudou para competência.
3. `reposicoes-e-competencia.md` seção 8 — o extrato, que explica de onde vem o total.

## Avisos permanentes

- Código que calcula dinheiro tem suíte automatizada em `backend/test/`. Rodar `npm test` antes e depois de qualquer alteração, e reportar os dois números.
- Recálculo usa sempre o snapshot do ciclo, nunca o preço atual do aluno.
- Ciclo pago é congelado. Tentativa de ajuste retorna HTTP 409.
