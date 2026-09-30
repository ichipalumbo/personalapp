# Instruções permanentes do repositório — `[ADAPTAR: nome do projeto]`

> Modelo para `.github/copilot-instructions.md`.
> Vale para **todas** as sessões, independentemente da tarefa.
> Preencha cada `[ADAPTAR]`. Apague as seções que não se aplicam ao projeto.

---

## 1. Como trabalhar com o responsável

- **Em caso de ambiguidade, pergunte antes de decidir.** Não escolha um caminho e siga.
  Uma pergunta curta antes vale mais que uma correção depois.
- **Não extrapole o escopo pedido.** A única exceção é levantar um risco encontrado —
  traga o ponto, mas não implemente por conta própria.
- **`[ADAPTAR]` Formato da resposta final**: arquivos alterados, o que mudou em cada um e
  o que foi encontrado mas **não** alterado.
- **`[ADAPTAR]` Preferência de comunicação** (ex.: não colar blocos de código no chat;
  editar o arquivo direto).

## 2. Fonte de verdade das decisões

- Antes de alterar **qualquer regra de negócio**, leia a especificação correspondente em
  `[ADAPTAR: caminho]`.
- A spec é a fonte de verdade. **Não infira regra que não esteja escrita nela** — o que não
  está coberto é fora de escopo e precisa de confirmação.
- Consulte sempre as seções "Decisões e Casos de Borda" e "Fora de Escopo" da spec.
- Backlog e priorização: `[ADAPTAR: caminho do roadmap]`.
- **Hierarquia de confiabilidade**: código > specs > roadmap > guia/README. Se divergir, o
  código descreve o que existe; a divergência é decisão humana.
- **Nunca duplique metadado volátil** (versão de spec, status, contagem de teste) fora da
  fonte. Referencie o caminho.

## 3. Stack e execução real

- `[ADAPTAR]` Linguagens, frameworks e restrições estruturais.
- `[ADAPTAR]` Ponto de entrada de cada parte do sistema.
- `[ADAPTAR]` Comandos reais de build, execução e teste.
- `[ADAPTAR]` **O que não existe** no projeto (ex.: sem build step, sem ambiente local,
  sem seed, sem watch mode). Isto evita que o agente sugira o que não há.
- `[ADAPTAR]` Ambiente local, teste e produção: o que roda onde, e o que é atingido por
  uma alteração.

## 4. Invariantes arquiteturais

Liste o que **não pode ser quebrado**. Para cada invariante:

- **Regra** (uma frase);
- **Risco prevenido** (o que acontece se quebrar);
- **Onde** (arquivo, camada ou fronteira);
- **Verificação** (teste ou inspeção obrigatória).

Exemplos de categoria (adapte): isolamento de dados por usuário, autorização, cálculo
monetário, normalização de identidade, recorrência, estados terminais, idempotência.

**Regra de implementação única**: regra de negócio não pode existir em duas cópias
divergentes. Se precisar nos dois lados, um módulo único e compartilhado.

## 5. Segurança e isolamento

- `[ADAPTAR]` Como a identidade do usuário é estabelecida.
- `[ADAPTAR]` Como toda consulta é filtrada por usuário (ou equivalente). Esquecer isso
  vaza dado entre contas — diga explicitamente se não há outra camada protegendo.
- `[ADAPTAR]` Segredos: onde vivem, o que nunca vai para o repositório.
- `[ADAPTAR]` Operações destrutivas e como são confirmadas.

## 6. Áreas sensíveis — avise antes de mexer

Lista curta. Alteração aqui exige confirmação antes de implementar, mesmo que pareça pequena.

- `[ADAPTAR]` (ex.: motor de cálculo, autenticação, sincronização externa, migração de dados)

## 7. Dependências

- `[ADAPTAR]` Política: quantas dependências existem, quem aprova nova, o que justifica.
- Sem dependência nova sem confirmar.

## 8. Testes e validação

- `[ADAPTAR]` Quais suítes existem, onde, e como rodar cada uma.
- `[ADAPTAR]` **O que cada suíte cobre** e **o que não cobre**. Diga explicitamente quais
  camadas são validadas só manualmente.
- Rode a suíte afetada **antes e depois**, e reporte os **números que você mediu** — nunca
  os que leu na documentação, que envelhece.
- **Teste novo precisa ser provado por mutação**: reverta a correção, confirme que o teste
  falha pela razão esperada, restaure e confirme que a suíte volta a passar.
- Declare o que **não** foi validado.

## 9. Política de edição

- Mudanças pequenas e incrementais.
- Não refatore fora do escopo.
- Depois de remover, mover ou substituir bloco grande, execute imediatamente a validação
  que carrega o arquivo. Sintaxe válida não prova que a função continua existindo.
- Preserve o estilo e o idioma do arquivo que está editando.
- `[ADAPTAR]` Quais arquivos podem ser alterados sem perguntar (ex.: lockfile).

## 10. Git, revisão e deploy

- `[ADAPTAR]` Operações que o agente **pode** executar.
- `[ADAPTAR]` Operações que são **do responsável** (commit, push, merge, PR…).
- `[ADAPTAR]` Fluxo de branch e nome sugerido.
- **Verifique o upstream antes de escrever**: se a branch atual rastreia a principal, um
  "Sync Changes" pode enviar direto para produção sem revisão. Verificável com
  `git config --get-regexp "branch\..*\.merge"`.
- `[ADAPTAR]` O que dispara produção. Existe staging? Existe preview?
- Toda mudança entra por pull request.

## 11. Ambiente e terminal

- `[ADAPTAR]` Shell padrão e versão.
- `[ADAPTAR]` Armadilhas conhecidas e verificadas. Ex.: não embutir código com aspas
  aninhadas num comando de uma linha — o shell entra em continuação e parece travado.
  Sintoma: prompt de continuação com o comando repetido.
- Comando de tiro único responde em segundos. Se um comando simples não retorna em ~30s,
  **não faça polling**: leia a saída, mate o terminal e rode de forma mais simples.
- `[ADAPTAR]` Como tratar prompt interativo.

## 12. Fechamento da rodada

Ao final, relate:

1. arquivos alterados e o que mudou em cada um;
2. validação executada, com os números medidos antes e depois;
3. o que foi **encontrado e não alterado**, com o motivo;
4. branch utilizada;
5. riscos residuais e pendências do responsável.
