# Refactor: nomes de exclusão e Promise da escolha de cobrança

## Resumo

A rodada 6d realizou a limpeza mecânica exigida sem mudar o desenho visual do modal. O foco foi o alinhamento dos nomes e a correção de um vazamento silencioso: a Promise do modal de cobrança ficava pendurada ao cancelar.

## O que foi ajustado

- Renomeou `window.executarExclusaoDefinitiva` para `window.executarExclusaoAulaAvulsa` no corpo do arquivo de produção e nas asserções de teste que validam o nome exposto.
- Extraiu o bloco "daqui pra frente" para `window.executarExclusaoSerieAPartirDe` e preservou a `return` do despacho para evitar cair no ramo de série após a execução da ação de corte.
- Guardou o `resolve` da Promise do modal de escolha de cobrança em escopo compartilhado e o chamou em `window.fecharModalEscolhaCobrancaReposicao()`, de forma idempotente.
- Registrou a decisão de arquitetura na spec: a ordem do fluxo de reposição em série é pessimista por decisão do dono, com rollback e não deve ser "otimizada" sem aprovação explícita.

## Evidência

- A correção foi validada por mutação no arquivo real de produção, com a suíte `backend/test/gcal-duplicata-fix.test.js` cobrindo:
  - `executarExclusaoSerieAPartirDe apara a série e preserva o histórico`;
  - `cancelar a escolha de cobrança não deixa a operação pendurada`;
  - os guardas da 6c e da 6b-ui.3.

## Observação

O nome antigo `executarExclusaoDefinitiva` permanece nos relatórios antigos por causa do histórico do projeto; o mapeamento de leitura fica em `docs/specs/gcal-sync.md` como `executarExclusaoDefinitiva` → `executarExclusaoAulaAvulsa`.
