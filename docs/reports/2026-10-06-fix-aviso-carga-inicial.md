# Ajuste pontual — aviso imediato de carga inicial

> **Status**: Implementado e validado localmente; teste no app instalado/publicação pendentes · **Data**: 2026-10-06
> **Branch**: `docs/planejar-sync-boot` · **Base**: `0a081c9`

## Origem e decisão

Após testar o deploy da branch pelo app instalado, o dono relatou Home inicialmente
zerada, seguida de carga normal, sem aviso imediato. Autorizou nas três telas:
**Carregando dados...** quando ainda não há conteúdo autorizado disponível e
**Sincronizando dados...** ao atualizar conteúdo já exibido. Não alterar regras de negócio.

## Recorte

- Aviso inicial no HTML antes de aguardar identidade/navegação; leitura principal e
  financeira preservam propriedade por voo/conta e retiram indicador no término/descarte.
- Cache vazio válido continua distinto de ausência. Sem sessão, pendência ou edição,
  indicador não fica indefinidamente ativo nem encobre a orientação correspondente.
- Reutilizar o rótulo existente, sem nova dependência, tela ou mudança auth/GCal/SW.
- Baseline frontend medida: **321/321**, zero falhas. Validar casos por testes/mutação
  e mock mobile; abertura instalada é representada sem alterar o caminho de bootstrap.
- Teste real no celular/deploy do ajuste continua com o dono; não alegar PWA real validada.
- Este relatório pontual não reabre a execução A–E3; atualização do status do item 2.4
  não dispensa pendências manuais/publicação registradas no plano anterior.

## Resultado

- `index.html`: aviso `Carregando dados...` visível e com `role="status"` já no HTML,
  antes de a identificação da sessão e a navegação terminarem. O app instalado usa esse
  mesmo documento (`manifest.json` aponta para `/index.html`); manifesto não alterado.
- `assets/js/storage.js`: texto distingue falta de conteúdo de atualização sobre dados;
  mantém propriedade por voo/contexto/interação. Falha, descarte, edição ou perda de
  sessão não deixam o aviso inicial preso nem permitem que um finally antigo apague
  o indicador de outra leitura. Cache válido vazio continua sendo conteúdo autorizado.
- `assets/js/app/bootstrap.js`: encerra a apresentação inicial ao hidratar cache ou ao
  concluir a navegação, inclusive em erro. Aviso cobre também o await da identificação
  inicial; não modifica login, gatilhos do GCal ou comportamento de navegação.
- `assets/js/view-financas.js`: leitura financeira mantém seu indicador independente;
  helper de apresentação identifica conteúdo financeiro autorizado na tela ativa.
  B2 sem cache principal, mas com Finanças já exibida, anuncia sincronização e não
  carga vazia. Sem cálculo de regra, GET adicional ou novo cache.
- `tests-frontend/d3-boot-integracao.test.js`: **16 regressões novas** de HTML inicial,
  sessão pendente, carga/500/401 nas três telas, ausência/perda de sessão, cache,
  indicador financeiro independente e edição. `header-cache-state.test.js` e
  `d2-coordenador-sync-boot.test.js`: expectativas de leitura sem cache atualizadas
  para o novo contrato aprovado (não é mais um estado sem rótulo).
- Spec de Finanças e item 2.4 do roadmap atualizados; plano A–E3 não reaberto.

## Validação medida

- Frontend: **321/321 antes → 337/337 depois**, zero falhas/cancelados/ignorados.
- Foco de contratos existentes antes dos testes novos: **95/95**; foco novo **16/16**.
- Backend não executado nesta rodada: alteração exclusivamente de apresentação frontend.
  O controle backend do E3 permanece histórico, não é apresentado como medição deste fix.
- Revisão read-only pontual encontrou reativação do aviso inicial ao fechar edição e
  texto de carga sobre Finanças já exibida; corrigidos e testados sem auditoria geral.
- Mutação temporária do HTML oculto, da regra que excluía voo sem cache e da invalidação
  por edição: **16 testes, 13 passam / 3 falham**, com assert de cada contrato; todos os
  trechos restaurados por edição antes do browser e da suíte completa **337/337**.
  Diff/status conferidos, sem mutação residual. Diagnósticos sem erros.
- Uma execução focada anterior encerrou com código 1 e somente cabeçalho TAP, sem
  diagnóstico utilizável; não contada como validação. A execução focada subsequente
  e a suíte completa finalizaram normalmente com os números acima.

## Mock mobile e limites

- Em **433×762, DPR ~2.81**, touch/UA/coarse confirmados, as três hashes mostraram
  `Carregando dados...` enquanto GETs sintéticos estavam retidos e retiraram o aviso
  após carregamento. Hash preservada, quatro alunos e sem overflow horizontal.
- Cache sintético antigo já apresentado: `Sincronizando dados...` até concluir.
  Falha sintética sem cache: `Carregando dados...` durante a espera, oculto ao terminar
  com estado de falha/retomada por evento, sem loop infinito.
- Stress **320×568**: aviso imediato visível, sem overflow; viewport de referência
  restaurado depois. Service worker bypass/desativado apenas na página de teste para
  não servir scripts antigos; nenhum arquivo de PWA/SW alterado.
- Abertura real pelo ícone no celular, confirmação nativa, teclado/TalkBack e conferência
  dos deploys continuam com o dono. Não declarar PWA instalada ou dados reais testados.
- Dono relatou uso normal aparentemente correto no deploy anterior, exceto ausência
  de aviso na primeira abertura; relato não substitui a verificação deste ajuste novo.
- Nenhum commit, push, merge, deploy, dependência ou acesso a dados reais pelo agente.

**Fechamento**: ajuste local concluído; sem novos cartões de implementação. Validar no
app instalado após publicação autorizada, junto das pendências externas da 2.4.