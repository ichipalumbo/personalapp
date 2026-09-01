# Domínio — Integrações

> **Papel deste arquivo**: índice do domínio. Ele **aponta**; a regra mora na spec.
>
> **Atualizado**: 2026-09-01

---

## O que este domínio cobre

Tudo que é **externo ao app** e pode ser substituído sem que o produto deixe de existir: serviços de terceiros, suas credenciais, seus contratos e suas falhas.

- Sincronização com o Google Calendar (escrita, leitura, webhook, renovação de canal).
- Autenticação pelo Google como **fonte de identidade**.

## O que este domínio **não** cobre

| Assunto | Domínio dono |
| --- | --- |
| Isolamento de dados por conta (`ownerEmail`) | [`../plataforma/`](../plataforma/README.md) |
| Banco de dados, deploy e resiliência | [`../plataforma/`](../plataforma/README.md) |
| Recorrência e exceções no modelo local | [`../agenda/`](../agenda/README.md) |

**A costura mais importante deste domínio**: a integração responde *"quem é você"*; a plataforma responde *"o que você enxerga"*. As duas se encontram no `ownerEmail` extraído do token. Trocar o provedor de identidade deve afetar apenas este domínio — se afetar o isolamento, a fronteira foi violada.

## Specs deste domínio

| Spec | Decide | Status |
| --- | --- | --- |
| [`gcal-sync.md`](gcal-sync.md) | modelo de sincronização, `RRULE`/`EXDATE`, webhook, renovação de canal, bloqueios externos | v11 · em produção |
| `autenticacao-google.md` | login GIS, ciclo do token, sessão local, logout, conexão do calendário | **pendente** |

## Sem spec ainda — comportamento definido pelo código

| Comportamento | Onde está hoje |
| --- | --- |
| Login Google, restauração de sessão e cache de perfil | `assets/js/auth/google-identity.js` |
| Validação do ID token no servidor | `backend/src/middleware/requireAuth.js` |
| Conexão e desconexão do Google Calendar pela UI | `assets/js/settings-modal.js`, `backend/src/controllers/gcalAuthController.js` |

Enquanto não houver spec, **o código é a verdade** — e nenhuma regra acima deve ser tratada como decisão de produto confirmada.

## Avisos permanentes

- Área sensível: envolve credencial, webhook externo e estado remoto que `git revert` não desfaz.
- O app nunca edita evento criado pela usuária dentro do Google.
