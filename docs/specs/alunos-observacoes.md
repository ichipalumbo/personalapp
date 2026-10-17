# Spec — Observações no cadastro do aluno

> **Status**: Em produção · **Versão**: 1 · **Atualizado**: 2026-10-14
> Consolidação documental de comportamento já entregue; não introduz campo, validação ou mudança de produto nesta rodada.

## 1. Objetivo e escopo

Permitir guardar uma anotação livre no cadastro do aluno e consultá-la no card da tela
Alunos. O contrato é de **observação por aluno**, não por aula, agendamento ou ciclo financeiro.

## 2. Campo e comportamento

- O campo persistido chama-se `observacoes`; não confundir com `observacaoAjuste` do ciclo financeiro.
- O formulário usa um textarea opcional, identificado por `alunoObservacoes` e rotulado `Observações (Opcional)`.
- Ao editar um aluno, o formulário carrega a observação existente; ausência de conteúdo não impede cadastro ou edição.
- Ao salvar, a observação acompanha os demais dados do aluno no fluxo de persistência existente. Espaços nas extremidades são removidos, sem criar uma segunda gravação específica para a anotação.
- O card exibe a observação somente quando há conteúdo; não mostra um bloco vazio ou placeholder de anotação ausente.
- Texto livre é escapado antes de compor o HTML do card. Conteúdo semelhante a markup aparece como texto, não é executado como HTML ou script.

## 3. Decisões e casos de borda

| Caso | Contrato |
|---|---|
| Aluno sem observação | Campo opcional e card sem bloco de anotação |
| Abrir edição | Carregar o valor salvo no textarea |
| Alterar e salvar | Atualizar `observacoes` no objeto do aluno pelo fluxo existente |
| Texto com caracteres de HTML | Exibir como texto escapado no card |
| Observação vazia após remoção de espaços | Não exibir o bloco no card |

As regras financeiras do cadastro continuam na spec de Finanças; o histórico e as ações de
reposição continuam na spec de Reposições. Esta spec não duplica esses contratos.

## 4. Proteção e implementação de referência

- [Formulário real](../../index.html): campo opcional de observações.
- [Tela de Alunos](../../assets/js/view-alunos.js): carregamento na edição, persistência e render seguro.
- [Testes existentes](../../tests-frontend/view-alunos-observacoes.test.js): texto escapado no card, carregamento do valor na edição e atualização ao salvar. São recortes de lógica/DOM, não prova visual completa ou de escrita real no backend.

## 5. Fora de escopo

- Anotação por aula/agendamento, evolução clínica ou avaliação física.
- Edição de anotação financeira de um ciclo por este campo.
- Texto rico, anexos, novo limite de tamanho ou novas regras de validação não definidas aqui.
- Mudança do fluxo de persistência, isolamento por conta ou contrato financeiro do cadastro.