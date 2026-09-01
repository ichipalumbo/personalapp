# Diagnóstico — cobertura de specs das features já em produção

> Origem: varredura estática de documentação, frontend, backend, modelos, rotas, controllers, serviços e testes em **01/09/2026**.
> Projeto: `personalapp` (Prô Josy).
> Escopo: identificar features que já existem em produção e não possuem uma spec própria nem cobertura inequívoca nas specs vigentes.
> Método: nenhuma alteração de código, dado remoto ou configuração foi executada.

---

## 0) Resumo

Existem três specs de produto vigentes:

| Spec | Domínio coberto |
| --- | --- |
| `docs/specs/financas-ciclo-cobranca.md` | ciclo financeiro, cobrança, consistência de agenda e seus impactos no cadastro |
| `docs/specs/reposicoes-e-competencia.md` | fila de reposições, competência, prazo, expiração e extrato |
| `docs/specs/gcal-sync.md` | integração com Google Calendar, recorrência no Google, webhook e bloqueios externos |

A varredura encontrou cinco domínios já implementados cuja decisão funcional está fora dessas specs. Três devem virar specs de produto próprias; dois são contratos transversais e podem ser tratados como specs de plataforma.

| Prioridade | Lacuna | Tipo de documento recomendado |
| --- | --- | --- |
| Alta | Agenda e agendamentos | `agenda-e-agendamentos.md` |
| Alta | Cadastro e ciclo de vida de alunos | `alunos-cadastro-e-ciclo-de-vida.md` |
| Alta | Sincronização e resiliência de dados | `sincronizacao-e-resiliencia-de-dados.md` |
| Média | Configuração da grade de horários | `configuracao-da-grade.md` |
| Média | Autenticação e isolamento por conta | `autenticacao-e-isolamento-por-conta.md` |

Não entram nesta lista itens apenas planejados no roadmap. Também não entram comportamentos já cobertos de forma suficiente pelas três specs existentes.

---

## 1) Lacuna alta — Agenda e agendamentos

### Evidência de feature em produção

- A interface permite criar `aula`, `bloqueio`, `deslocamento` e reposição a partir de `index.html` e `assets/js/modal-agendamento.js`.
- `backend/src/models/Agendamento.js` persiste agendamentos, inclusive tipo, status, horários, recorrência, exceções, vínculo de reposição e identificador do Google.
- `backend/src/controllers/agendamentoController.js` implementa CRUD, comportamento idempotente na exclusão e integração do CRUD com o Google Calendar.
- `assets/js/modal-acao-slot.js` implementa edição de ocorrência, edição a partir de uma data, edição da série, exclusões com escopos distintos, split de séries e envio para reposição.
- `assets/js/agenda-conflitos.js` detecta sobreposições de horário para compromissos únicos e recorrentes.

### O que as specs atuais cobrem e o que não cobrem

A spec de GCal define como a recorrência local é traduzida para `RRULE`/`EXDATE` e documenta correções de séries. A spec de Finanças define como ocorrências contam para cobrança. Nenhuma delas estabelece o contrato do recurso de agenda em si.

### Spec recomendada

`docs/specs/agenda-e-agendamentos.md`

### Decisões que a spec precisa fechar

1. Quais tipos de compromisso existem e quais campos são obrigatórios para cada tipo.
2. Semântica de aula avulsa, série recorrente, bloqueio, deslocamento e dia inteiro.
3. Regras de recorrência e formatos canônicos dos campos locais.
4. Escopos de edição e exclusão: ocorrência, daqui para frente e cadeia completa.
5. O que preserva ou remove reposições quando uma série é alterada ou excluída.
6. Política de conflito: quais tipos colidem, se conflito bloqueia ou apenas avisa, e qual janela é verificada para recorrência.
7. Regra de aluno inativo para edição, exclusão e envio à reposição.
8. Contrato de persistência pessimista e rollback de mutações destrutivas.

### Risco de continuar sem spec

Esta é a maior lacuna: agenda é o dado que alimenta tanto o financeiro quanto o Google Calendar. Uma mudança aparentemente visual em recorrência, exceções ou exclusão pode alterar cobrança ou criar divergência com o calendário externo.

---

## 2) Lacuna alta — Cadastro e ciclo de vida de alunos

### Evidência de feature em produção

- `backend/src/models/Aluno.js` persiste cadastro, telefone, status, frequência de contrato e campos financeiros.
- `backend/src/controllers/alunoController.js` normaliza `ativo`/`inativo`, cria e atualiza por upsert, rejeita alteração de id e exclui os agendamentos do aluno junto à exclusão.
- `assets/js/view-alunos.js` implementa formulário, edição, exclusão, filtros por status e objetivo e indicadores no card.
- `assets/js/alunos-helpers.js` concentra o comportamento de aluno ativo e os selects disponíveis nos fluxos de agenda.

### Cobertura existente

`financas-ciclo-cobranca.md` cobre os campos financeiros do aluno e declara que `Consultoria Online` não entra no financeiro. Ela não define o ciclo de vida do aluno nem a consequência geral de status e exclusão.

### Spec recomendada

`docs/specs/alunos-cadastro-e-ciclo-de-vida.md`

### Decisões que a spec precisa fechar

1. Campos canônicos de cadastro, obrigatoriedade e normalização.
2. Diferença funcional entre `Personal Trainer` e `Consultoria Online` fora do financeiro.
3. Transições entre `ativo` e `inativo`, inclusive reativação.
4. Quais operações de agenda são bloqueadas para aluno inativo e por quê.
5. Exclusão definitiva versus inativação, incluindo impacto em agendamentos, reposições, ciclos e registros históricos.
6. Política para aluno sem configuração financeira e para dados legados.
7. Contrato dos filtros de alunos e quais estados devem aparecer por padrão.

### Risco de continuar sem spec

O código já estabelece efeitos irreversíveis ou sensíveis, como `DELETE /alunos/:id` apagando agendamentos associados. Sem decisão de produto registrada, mudanças futuras podem tratar inativação, exclusão e histórico de forma incompatível entre as telas.

---

## 3) Lacuna alta — Sincronização e resiliência de dados

### Evidência de feature em produção

- `assets/js/storage.js` mantém estado local, cache em `localStorage`, carga remota, fallback local, timeout, autenticação por token e diff granular de CRUD.
- O botão `#btnSyncBanco` em `index.html` expõe sincronização manual ao usuário.
- `assets/js/cascade-sync-aluno.js` atualiza em cascata os agendamentos associados depois de mudança no aluno, enriquecendo o payload com dados atuais.
- O README descreve modo leitura sem autenticação e a estratégia de fallback, mas esse conteúdo não é uma spec de produto.

### Cobertura existente

As specs de Finanças e Reposições definem regras pontuais de cache e confirmação de escrita para seus fluxos. A spec de GCal define falha parcial entre Mongo e Google. Falta a regra transversal sobre quem é fonte de verdade, o que pode sobreviver localmente e como a interface se comporta em falhas de API.

### Spec recomendada

`docs/specs/sincronizacao-e-resiliencia-de-dados.md`

### Decisões que a spec precisa fechar

1. Fonte de verdade por entidade entre memória, `localStorage` e API.
2. Comportamento do modo leitura sem login e do cache de outra sessão/conta.
3. Quais operações podem ter fallback local e quais exigem confirmação remota antes de alterar a interface.
4. Contrato de `salvarDados`, `carregarDados` e sincronização manual.
5. Política de retry, timeout, erros recuperáveis e comunicação ao usuário.
6. Quando a sincronização em cascata de aluno é disparada, quais agendamentos alcança, e o que acontece em falha parcial.
7. Limites explícitos do modo offline, para não confundi-lo com edição offline confiável.

### Risco de continuar sem spec

Persistência e fallback são transversais. Sem uma fonte de verdade única, é fácil reintroduzir UI otimista em fluxo que exige confirmação remota ou fazer cache local atravessar a fronteira de uma conta Google.

---

## 4) Lacuna média — Configuração da grade de horários

### Evidência de feature em produção

- `backend/src/models/Config.js` mantém configuração por `ownerEmail` e chave.
- `backend/src/controllers/configController.js` cria a grade padrão `06:00`–`22:00` sob demanda, persiste alteração e tem endpoints genéricos para qualquer chave.
- `assets/js/settings-modal.js` expõe configurações da aplicação; as views de agenda usam a grade para renderização e escolha de horário.

### Spec recomendada

`docs/specs/configuracao-da-grade.md`

### Decisões que a spec precisa fechar

1. Intervalos permitidos e validação de `horaInicio`/`horaFim`.
2. Significado de excluir ou recriar a configuração.
3. Se a configuração é somente grade de horários ou infraestrutura para outras preferências.
4. Quando pode haver fallback em memória em vez de erro explícito.
5. Efeito de reduzir a grade sobre agendamentos existentes.

### Risco de continuar sem spec

O controller aceita chaves genéricas enquanto a UI trata apenas `grade_horarios`. Sem contrato, uma nova configuração pode nascer sem semântica, validação ou dono claro.

---

## 5) Lacuna média — Autenticação e isolamento por conta

### Evidência de feature em produção

- `assets/js/auth/google-identity.js` implementa login Google, restauração de sessão, cache de perfil e de conexão com calendário, logout e listeners de autenticação.
- `backend/src/middleware/requireAuth.js` valida o token e entrega `ownerEmail` ao request.
- `backend/src/utils/ownerScope.js` centraliza a extração do escopo; todos os domínios autenticados dependem disso.
- O README e `.github/copilot-instructions.md` descrevem o modelo, mas sem uma spec versionada com decisões e casos de borda.

### Spec recomendada

`docs/specs/autenticacao-e-isolamento-por-conta.md`

### Decisões que a spec precisa fechar

1. Fonte de identidade, validade de token e tratamento de sessão expirada.
2. Regra de isolamento por `ownerEmail` e requisitos para qualquer nova collection/rota.
3. O que login e logout devem limpar em memória e em `localStorage`.
4. Garantias e limites do modo leitura.
5. Comportamento esperado para alternância de conta no mesmo dispositivo.
6. Relação entre a autorização da aplicação e a autorização adicional do Google Calendar.

### Risco de continuar sem spec

É uma fronteira de segurança, não apenas conveniência de UI. A regra de `ownerEmail` hoje aparece em instruções de engenharia; uma spec permite definir o comportamento do produto quando a sessão muda ou não existe.

---

## 6) Comportamentos já cobertos: não criar specs novas

| Comportamento | Cobertura atual | Ação recomendada |
| --- | --- | --- |
| Consultoria Online e exclusão do financeiro | Finanças, seções 3.1.1, 4.4, 7 e 11 | manter na spec de Finanças |
| Status financeiro, snapshots, ajustes e histórico | Finanças | manter na spec de Finanças |
| Reposições, validade, expiração e competência | Reposições | manter na spec de Reposições |
| Bloqueio externo do Google | GCal, seções 2.1 e 5.4 | ampliar detalhe do modelo somente se necessário |
| RRULE, EXDATE, webhook e renovação de canal | GCal | manter na spec de GCal |
| Filtros por aluno | parte do ciclo de vida de Alunos | incluir na spec de Alunos, não criar arquivo próprio |
| Botão de sincronização manual | parte da resiliência de dados | incluir na spec de Sincronização, não criar arquivo próprio |
| Sync em cascata de aluno | parte da resiliência e sincronização | incluir na spec de Sincronização, não criar arquivo próprio |

---

## 7) Inconsistências de documentação encontradas

Estas observações não foram alteradas nesta rodada.

1. `README.md` ainda menciona visão mensal e descreve `calendario-engine.js` como "motor de recorrência + grid mensal", enquanto `financas-ciclo-cobranca.md` determina que a visão mensal foi removida.
2. `README.md` informa uma estrutura e uma ordem de scripts desatualizadas em relação aos módulos atuais, incluindo compartilhados e o bootstrap.
3. `docs/roadmap.md` contém duas afirmações incompatíveis sobre o frontend local: uma registra o ambiente local isolado como entregue e outra ainda diz que o Live Server grava em produção.
4. `docs/README.md` declara versões menores para as specs do que os cabeçalhos atuais de Finanças e GCal.
5. A spec de Reposições preserva, na seção 13, débitos já resolvidos posteriormente, como a declaração duplicada de `calcularPrazoReposicao`; o roadmap já aponta a deduplicação como concluída.

---

## 8) Ordem recomendada de documentação

1. Criar `agenda-e-agendamentos.md` antes de qualquer nova mudança na agenda, recorrência, conflitos ou exclusões.
2. Criar `alunos-cadastro-e-ciclo-de-vida.md` antes de evoluir status, exclusão, filtros ou campos de aluno.
3. Criar `sincronizacao-e-resiliencia-de-dados.md` antes de alterar fallback, cache, diffs, persistência pessimista ou cascata.
4. Criar as specs de grade e autenticação como rodada de consolidação de contratos transversais.
5. Atualizar o índice e os documentos de apoio depois de aprovar as decisões das novas specs; não transportar regras não decididas do código para a spec como se fossem decisão de produto sem validação do dono.

## 9) Limites da varredura

- A análise foi estática: não executou frontend, backend, MongoDB, Google Calendar nem validação visual.
- "Em produção" foi inferido pelo código ativo, pelas rotas montadas e pelo status registrado nas specs/roadmap; não foi feita consulta ao ambiente remoto.
- A recomendação de uma spec indica ausência de contrato de produto versionado, não necessariamente defeito na implementação atual.