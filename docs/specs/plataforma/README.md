# Domínio — Plataforma

> **Papel deste arquivo**: índice do domínio. Ele **aponta**; a regra mora na spec.
>
> **Atualizado**: 2026-09-01

---

## O que este domínio cobre

O que o sistema **garante**, independente de qual feature está na tela. Não descreve o que a usuária faz; descreve o que não pode falhar enquanto ela faz.

- Isolamento de dados por conta (`ownerEmail`).
- Fonte de verdade entre memória, `localStorage` e API.
- Modo leitura sem login, fallback e comportamento em falha de rede.
- Confirmação de escrita antes de a interface tratar algo como concluído.
- Banco de dados, ambientes e deploy.

## O que este domínio **não** cobre

| Assunto | Domínio dono |
| --- | --- |
| Login Google e ciclo do token | [`../integracoes/`](../integracoes/README.md) |
| Sincronização de eventos com o Google | [`../integracoes/`](../integracoes/README.md) |
| Qualquer regra sobre aluno, aula ou cobrança | domínios de produto |

**Distinção deliberada**: a integração diz *quem é você*; a plataforma diz *o que você enxerga*. Se o provedor de identidade for trocado, este domínio não deve mudar.

## Specs deste domínio

| Spec | Decide | Status |
| --- | --- | --- |
| `isolamento-por-conta.md` | escopo por `ownerEmail`, exigências para toda rota e collection nova, troca de conta no mesmo dispositivo | **pendente** |
| `sincronizacao-e-resiliencia-de-dados.md` | fonte de verdade, cache, diff, retry, modo leitura, escrita confirmada, sync em cascata | **pendente** |

## Sem spec ainda — comportamento definido pelo código

| Comportamento | Onde está hoje |
| --- | --- |
| Escopo obrigatório por conta | `backend/src/utils/ownerScope.js`, `backend/src/middleware/requireAuth.js` |
| Carga, cache, diff e persistência | `assets/js/storage.js` |
| Sincronização em cascata de agendamentos do aluno | `assets/js/cascade-sync-aluno.js` |
| Seleção de ambiente da API por hostname | `assets/js/config/api-config.js` |
| Conexão com o banco | `backend/src/config/database.js`, `backend/src/config/env.js` |

Enquanto não houver spec, **o código é a verdade**.

## Invariante que já vale hoje

Toda query ao MongoDB é filtrada por `ownerEmail`, obtido via `getOwnerEmailOrThrow(req)`. Não existe nenhuma outra camada impedindo vazamento entre contas. Está registrado como regra permanente em [`../../../.github/copilot-instructions.md`](../../../.github/copilot-instructions.md) §4.1 e migra para a spec de isolamento quando ela nascer.

## Referências operacionais

- Rodar o projeto, `.env` e troubleshooting: [`../../ambiente-local.md`](../../ambiente-local.md)
- Estrutura de arquivos e ordem de carregamento: [`../../mapa-do-codigo.md`](../../mapa-do-codigo.md)
