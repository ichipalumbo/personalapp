# Plano — `[ADAPTAR: nome da frente]`

> **Status**: aberto · executado · fechado
> **Abertura**: AAAA-MM-DD
> **Responsável**: `[ADAPTAR]`
> **Branch**: `[ADAPTAR]`
> **Diagnóstico de origem**: `[ADAPTAR: caminho, se houver]`
> **Válido contra**: `[ADAPTAR: commit/base]`

> **Este arquivo é vivo.** Enquanto o item estiver aberto, ele recebe decisões, execução,
> medições e desvios. Não crie um relatório separado para "o depois".
> Depois de fechado, **não é reescrito**: trabalho posterior gera documento novo.

---

## 1. Objetivo

`[ADAPTAR: uma frase e um resultado observável]`

## 2. Critérios de aceite

- [ ] `[ADAPTAR: funcional]`
- [ ] `[ADAPTAR: segurança / dados]`
- [ ] `[ADAPTAR: regressão]`
- [ ] `[ADAPTAR: interface / UX, se aplicável]`

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| `[ADAPTAR]` | | | |

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| 1 | `[ADAPTAR]` | A / B | sim/não |

## 5. Escopo

- **Arquivos/componentes prováveis**: `[ADAPTAR]`
- **Comportamentos que podem mudar**: `[ADAPTAR]`

## 6. Fora de escopo

- `[ADAPTAR: refatorações adjacentes, débitos conhecidos, migrações, mudanças não aprovadas]`

## 7. Invariantes a preservar

`[ADAPTAR: segurança, compatibilidade, dados, APIs, regras de negócio]`

## 8. Baseline

- Estado da branch e do working tree: `[ADAPTAR]`
- Suíte afetada antes: `[ADAPTAR: número medido]`
- Reprodução do defeito: `[ADAPTAR]`
- Condição de parada se o baseline divergir: `[ADAPTAR]`

## 9. Cartões de tarefas

Organize o trabalho em cartões numerados e ordenados por dependência. Cada cartão é uma
unidade de execução incremental: representa um resultado pequeno, implementável e
verificável por si só. A implementação deve concluir e validar um cartão antes de avançar
para o próximo, respeitando suas dependências e registrando o resultado no plano. Agrupe
cartões por etapa ou marco apenas quando isso ajudar a explicar a sequência; não use etapas
como substituto dos cartões. Evite cartões que sejam apenas uma lista de arquivos ou ações
sem resultado observável.

### Cartão T01 — `[ADAPTAR: verbo + resultado]`
- **Objetivo / resultado**: `[ADAPTAR: mudança observável]`
- **Depende de**: `[ADAPTAR: IDs de cartões ou nenhum]`
- **Arquivos / componentes prováveis**: `[ADAPTAR]`
- **Inclui**: `[ADAPTAR: comportamento e ações deste cartão]`
- **Não inclui**: `[ADAPTAR: limites específicos deste cartão]`
- **Decisões pendentes / bloqueios**: `[ADAPTAR: decisão e responsável, ou nenhum]`
- **Critérios de aceite**: `[ADAPTAR: condições objetivas e verificáveis]`
- **Validação**: `[ADAPTAR: testes, medições ou verificação manual; declarar lacunas]`
- **Riscos e rollback**: `[ADAPTAR: efeito e limite de reversão, ou não aplicável]`
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T02 — `[ADAPTAR: verbo + resultado]`
- **Objetivo / resultado**: `[ADAPTAR]`
- **Depende de**: `[ADAPTAR]`
- **Arquivos / componentes prováveis**: `[ADAPTAR]`
- **Inclui**: `[ADAPTAR]`
- **Não inclui**: `[ADAPTAR]`
- **Decisões pendentes / bloqueios**: `[ADAPTAR]`
- **Critérios de aceite**: `[ADAPTAR]`
- **Validação**: `[ADAPTAR]`
- **Riscos e rollback**: `[ADAPTAR]`
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

## 10. Matriz de validação

| Tipo | O que cobre | Onde | Observação |
|---|---|---|---|
| Automatizada | `[ADAPTAR]` | | |
| Integração | | | |
| Manual | `[ADAPTAR]` | | necessário/frágil |
| Negativos | | | |

**Não coberto por esta validação**: `[ADAPTAR: declaração explícita]`

## 11. Prova por mutação

| Mutação aplicada | Teste que deve falhar | Resultado observado | Restaurado? |
|---|---|---|---|
| `[ADAPTAR]` | | | |

## 12. Registro da execução

### AAAA-MM-DD — `[ADAPTAR: etapa]`
- **Arquivos alterados**: 
- **Resultado**: 
- **Suíte antes/depois**: 
- **Desvio do plano**: 
- **Decisão adicional tomada**: 

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| `[ADAPTAR]` | | roadmap / aprendizados | |

## 14. Deploy e rollback

- **Efeito externo**: `[ADAPTAR]`
- **Ordem de publicação**: 
- **Verificação pós-deploy**: 
- **Limite do rollback**: `[ADAPTAR: o que git revert não desfaz]`

## 15. Fechamento

- **Critérios atendidos**: `[ADAPTAR]`
- **Pendências**: `[ADAPTAR]`
- **Riscos aceitos**: `[ADAPTAR]`
- **Data de fechamento**: AAAA-MM-DD
