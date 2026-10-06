const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {
    criarAmbiente, snapshot, remoto, resposta, adiada, copiar,
    EMAIL, ALVOS, BATCH, ROTA_REPOSICAO, ROTA_HISTORICO
} = require('./setup/recuperacao-dados');

const testar = (nome, executar) => test(nome, { timeout: 5000 }, executar);
const drenar = () => new Promise((resolve) => setImmediate(resolve));
const rotas = (a) => a.requisicoes().map((c) => c.rota);

function preservado(a, memoria, disco, tentativaId) {
    assert.deepEqual(a.memoria(), memoria, 'Nenhuma parte do batch pode substituir a intenção');
    assert.deepEqual(a.disco(), disco, 'Cache e pendência devem permanecer intactos');
    assert.equal(a.contexto.obterPendencia().tentativaId, tentativaId);
    assert.equal(a.painel.hidden, false);
}

// Mutações candidatas T01: ignorar lerPendencias em obterPendencia/lerPrincipal;
// remover a guarda de dono em obterPendencia. Não executadas por este arquivo.
testar('T01 — pendência parcial sobrevive nova página e troca de conta sem exposição', async (t) => {
    const original = await criarAmbiente(t);
    const pendencia = copiar(original.contexto.obterPendencia());
    assert.equal(pendencia.estado, 'parcial');
    assert.equal(pendencia.tipo, 'reposicao-composta');
    assert.deepEqual(pendencia.alvos, ALVOS);
    assert.equal(pendencia.etapas[0].confirmada, true);
    assert.equal(pendencia.etapas[1].confirmada, false);
    const a = await criarAmbiente(t, { discoInicial: original.disco() });
    assert.deepEqual(copiar(a.contexto.obterPendencia()), pendencia);
    assert.equal(a.window.obterAlunos()[0].nome, 'Ana — intenção local');
    assert.equal(a.painel.hidden, false);
    assert.equal(a.verificar.disabled, false);
    assert.equal(a.usar.disabled, false);
    assert.equal(a.requisicoes().length, 0, 'Reidratação não faz replay nem consulta remota');
    a.window.abrirRecuperacaoDados();
    assert.equal(a.window.document.activeElement, a.painel);
    const disco = a.disco();
    a.trocar('bia@example.com');
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.window.obterAlunos().length, 0);
    assert.equal(a.painel.hidden, true);
    assert.deepEqual(a.disco(), disco);
    a.trocar(EMAIL);
    a.window.carregarDadosDoLocalStorage();
    assert.equal(a.window.obterAlunos()[0].nome, pendencia.snapshot.alunos[0].nome);
    assert.deepEqual(copiar(a.contexto.obterPendencia()), pendencia);
    assert.equal(a.painel.hidden, false);
});

// T02: aplicar leitura ou abandonarPendencia no ramo verificar;
// pular verificarAlvos; permitir duas consultas simultâneas.
testar('T02 — verificar consulta batch e alvos GET sem aplicar, limpar intenção ou fechar forms', async (t) => {
    const a = await criarAmbiente(t);
    a.abrirFormularios();
    const memoria = a.memoria();
    const disco = a.disco();
    const id = a.contexto.obterPendencia().tentativaId;
    const alvo = adiada();
    const iniciou = adiada();
    a.substitutos[ROTA_REPOSICAO] = () => { iniciou.resolver(); return alvo.promise; };
    const consulta = a.window.verificarDadosServidor();
    await iniciou.promise;
    assert.equal(a.verificar.disabled, true);
    assert.equal(a.usar.disabled, true);
    assert.equal((await a.window.verificarDadosServidor()).estado, 'adiado');
    assert.equal((await a.window.usarDadosServidor()).estado, 'adiado');
    preservado(a, memoria, disco, id);
    alvo.resolver(resposta(a.servidor[ROTA_REPOSICAO]));
    const resultado = await consulta;
    assert.equal(resultado.ok, true);
    assert.equal(resultado.estado, 'verificado');
    assert.deepEqual(rotas(a).slice(0, 5).sort(), [...BATCH].sort());
    assert.deepEqual(rotas(a).slice(5), [ROTA_REPOSICAO, ROTA_HISTORICO]);
    preservado(a, memoria, disco, id);
    assert.equal(a.confirmacoes.length, 0);
    assert.equal(a.contexto.podeLer(), false);
    assert.equal(a.window.DialogController.getStack().length, 1);
    assert.equal(a.window.document.getElementById('rascunho').value, 'Rascunho da agenda');
    assert.equal(a.verificar.disabled, false);
    assert.match(a.mensagem(), /não comprova/);
});

// T03: retirar global.confirm ou ignorar sua resposta.
testar('T03 — cancelar adoção não busca, não fecha formulários e não limpa pendência', async (t) => {
    const a = await criarAmbiente(t);
    a.abrirFormularios();
    a.aceitar = false;
    const memoria = a.memoria();
    const disco = a.disco();
    const id = a.contexto.obterPendencia().tentativaId;
    const resultado = await a.window.usarDadosServidor();
    assert.equal(resultado.ok, false);
    assert.equal(resultado.motivo, 'cancelado');
    assert.equal(a.confirmacoes.length, 1);
    assert.equal(a.requisicoes().length, 0);
    assert.equal(a.contexto.podeLer(), false);
    assert.equal(a.window.DialogController.getStack().length, 1);
    assert.equal(a.window.document.getElementById('nomeAluno').value, 'Rascunho do aluno');
    preservado(a, memoria, disco, id);
});

// T04: reutilizar a leitura de verificar; antecipar abandono; retirar fechamento,
// reset dos forms ou usar onRequestClose em lugar de DialogController.close.
testar('T04 — adoção confirmada fecha e reseta forms, busca NOVO batch e só então abandona intenção', async (t) => {
    const a = await criarAmbiente(t);
    assert.equal((await a.window.verificarDadosServidor()).estado, 'verificado');
    Object.assign(a.servidor, remoto('Ana — servidor v2'));
    a.abrirFormularios();
    const memoria = a.memoria();
    const disco = a.disco();
    const id = a.contexto.obterPendencia().tentativaId;
    const inicio = a.requisicoes().length;
    a.substitutos.alunos = () => {
        assert.equal(a.confirmacoes.length, 1);
        assert.equal(a.contexto.podeLer(), true, 'Ambos os formulários devem fechar antes do novo fetch');
        assert.equal(a.window.DialogController.getStack().length, 0);
        assert.equal(a.window.document.getElementById('rascunho').value, '');
        assert.equal(a.window.document.getElementById('nomeAluno').value, '');
        assert.equal(a.contexto.obterPendencia().tentativaId, id, 'Buscar antes de abandonar');
        return resposta(a.servidor.alunos);
    };
    const alvo = adiada();
    const iniciou = adiada();
    a.substitutos[ROTA_HISTORICO] = () => { iniciou.resolver(); return alvo.promise; };
    const adocao = a.window.usarDadosServidor();
    await iniciou.promise;
    preservado(a, memoria, disco, id);
    alvo.resolver(resposta(a.servidor[ROTA_HISTORICO]));
    const resultado = await adocao;
    assert.equal(resultado.ok, true);
    assert.equal(resultado.estado, 'aplicado');
    assert.equal(resultado.complementoPendente, false);
    assert.deepEqual(rotas(a).slice(inicio, inicio + 5).sort(), [...BATCH].sort());
    assert.equal(a.window.obterAlunos()[0].nome, 'Ana — servidor v2');
    assert.equal(a.contexto.lerPrincipal().alunos[0].nome, 'Ana — servidor v2');
    assert.equal(a.window.obterAulas()[0].horarioInicio, '10:00');
    assert.equal(a.window.obterAulas().length, 2, 'Inclui bloqueio externo normalizado');
    assert.equal(a.window.obterAulas()[0].gcalSyncPendingAt, undefined);
    assert.equal(a.window.obterReposicoes()[0].cobravel, false);
    assert.deepEqual(copiar(a.window.obterLimitesGrade()), { inicio: '06:00', fim: '21:00' });
    assert.equal(a.window.faturamentoMeta, 640);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(JSON.parse(a.window.localStorage.getItem('personal_cache_pendencias')).itens.length, 0);
    assert.equal(a.painel.hidden, true);
    assert.equal(a.fechamentosSolicitados, 0);
    assert.equal(a.window._retornoHistoricoReposicoes, null);
    assert.equal(a.window.reposicaoIdEmReagendamento, null);
    assert.equal(a.window.reagendamentoDirectCardId, null);
    assert.equal(a.window.__financasState.cards[0].aluno.nome, 'Ana — servidor v2');
    assert.equal(a.contexto.lerFinancas().dados[0].aluno.nome, 'Ana — servidor v2');
});

// T05: tratar HTTP/401/JSON inválido como vazio ou retirar validação de aluno.
testar('T05 — falha de rede, HTTP, JSON, payload ou 401 preserva batch, cache e pendência', async (t) => {
    const casos = [
        ['rede', 'alunos', () => { throw new Error('Sem conexão'); }],
        ['HTTP', 'reposicoes', () => resposta({ error: 'Indisponível' }, 500)],
        ['payload', 'alunos', () => resposta([{ id: 'aluno-ana' }])],
        ['JSON', 'agendamentos', () => new Response('{', { status: 200 })],
        ['401', 'reposicoes', () => resposta({ error: 'Token expirado' }, 401)]
    ];
    for (const [nome, rota, substituir] of casos) {
        const a = await criarAmbiente(t);
        const memoria = a.memoria();
        const disco = a.disco();
        const id = a.contexto.obterPendencia().tentativaId;
        a.substitutos[rota] = substituir;
        const resultado = await a.window.usarDadosServidor();
        assert.equal(resultado.ok, false, nome);
        assert.equal(resultado.estado, 'falha', nome);
        preservado(a, memoria, disco, id);
        assert.deepEqual(rotas(a).sort(), [...BATCH].sort(), `${nome}: não consultar alvos/complementos de batch inválido`);
        assert.equal(a.verificar.disabled, false);
        assert.equal(a.usar.disabled, false);
    }
});

// T06: pular validação/leitura de alvos ou aceitar 401 como ausência; rejeitar 404
// mesmo com aceitarAusente; omitir aluno obrigatório quando há cicloIds.
testar('T06 — alvo inválido ou indisponível impede adoção; 404 de reposição permite só verificar', async (t) => {
    const casos = [
        ['401 de alvo', ROTA_REPOSICAO, () => resposta({ error: 'Token expirado' }, 401)],
        ['JSON de alvo', ROTA_REPOSICAO, () => new Response('{', { status: 200 })],
        ['reposição array', ROTA_REPOSICAO, () => resposta([])],
        ['histórico objeto', ROTA_HISTORICO, () => resposta({ ciclos: [] })],
        ['histórico com item inválido', ROTA_HISTORICO, () => resposta([null])],
        ['HTTP de histórico', ROTA_HISTORICO, () => resposta({ error: 'Indisponível' }, 500)]
    ];
    for (const [nome, rota, substituir] of casos) {
        const a = await criarAmbiente(t);
        const memoria = a.memoria();
        const disco = a.disco();
        const id = a.contexto.obterPendencia().tentativaId;
        a.substitutos[rota] = substituir;
        assert.equal((await a.window.usarDadosServidor()).estado, 'falha', nome);
        preservado(a, memoria, disco, id);
        assert.ok(rotas(a).includes(rota), nome);
        assert.equal(rotas(a).includes('financas'), false, 'Não atualizar complementos antes de adotar');
    }
    const a = await criarAmbiente(t);
    a.substitutos[ROTA_REPOSICAO] = () => resposta({ error: 'Não encontrada' }, 404);
    const disco = a.disco();
    assert.equal((await a.window.verificarDadosServidor()).estado, 'verificado');
    assert.deepEqual(a.disco(), disco);
    const id = a.contexto.obterPendencia().tentativaId;
    a.contexto.atualizarPendencia(id, a.contexto.capturar(), { alvos: { ...ALVOS, alunoIds: [] } });
    const pendente = a.disco();
    assert.equal((await a.window.usarDadosServidor()).estado, 'falha');
    assert.deepEqual(a.disco(), pendente);
    assert.equal(a.contexto.obterPendencia().tentativaId, id);
});

// T07: remover invalidadores/abort e guardas de conta em consulta ou aplicação.
testar('T07 — trocar conta durante JSON do batch descarta consulta sem expor resposta de A em B', async (t) => {
    const a = await criarAmbiente(t);
    const corpo = adiada();
    const iniciou = adiada();
    const pendencia = a.window.localStorage.getItem('personal_cache_pendencias');
    a.substitutos.alunos = () => ({ ok: true, status: 200, json: () => { iniciou.resolver(); return corpo.promise; } });
    const consulta = a.window.usarDadosServidor();
    await iniciou.promise;
    a.trocar('bia@example.com');
    assert.equal(a.contexto.salvarPrincipal(snapshot('Bia — conta atual')), true);
    a.window.carregarDadosDoLocalStorage();
    const memoria = a.memoria();
    const disco = a.disco();
    corpo.resolver([{ id: 'aluno-secreto', nome: 'SEGREDO DA CONTA A' }]);
    assert.equal((await consulta).estado, 'descartado');
    await drenar();
    assert.deepEqual(a.memoria(), memoria);
    assert.deepEqual(a.disco(), disco);
    assert.equal(a.window.localStorage.getItem('personal_cache_pendencias'), pendencia);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.painel.hidden, true);
    assert.equal(rotas(a).includes(ROTA_REPOSICAO), false);
    // fetchComTimeout desliga o signal nos headers; a guarda deve descartar
    // também JSON tardio que não obedece ao abort, sem depender desse signal.
    assert.equal(a.requisicoes().length, 5);
    assert.doesNotMatch(a.window.document.body.textContent, /SEGREDO DA CONTA A/);
    assert.doesNotMatch(JSON.stringify(a.memoria()), /SEGREDO DA CONTA A/);
});

// T08: validar somente email e não geração/id da consulta após A→B→A;
// retirar conferirConsulta depois de json do alvo.
testar('T08 — troca A→B→A durante alvo descarta resposta antiga e preserva intenção identificada', async (t) => {
    const a = await criarAmbiente(t);
    const corpo = adiada();
    const iniciou = adiada();
    const id = a.contexto.obterPendencia().tentativaId;
    a.substitutos[ROTA_REPOSICAO] = () => ({ ok: true, status: 200, json: () => { iniciou.resolver(); return corpo.promise; } });
    const consulta = a.window.usarDadosServidor();
    await iniciou.promise;
    const antiga = a.contexto.capturar();
    a.trocar('bia@example.com');
    assert.equal(a.painel.hidden, true);
    assert.equal(a.window.obterAlunos().length, 0);
    a.trocar(EMAIL);
    a.window.carregarDadosDoLocalStorage();
    const memoria = a.memoria();
    const disco = a.disco();
    corpo.resolver({ ...a.servidor[ROTA_REPOSICAO], alunoNome: 'ALVO ANTIGO SECRETO' });
    assert.equal((await consulta).estado, 'descartado');
    await drenar();
    assert.equal(a.contexto.atual(antiga), false);
    preservado(a, memoria, disco, id);
    assert.equal(rotas(a).includes(ROTA_HISTORICO), false);
    assert.equal(a.usar.disabled, false);
    assert.doesNotMatch(a.window.document.body.textContent, /ALVO ANTIGO SECRETO/);
    delete a.substitutos[ROTA_REPOSICAO];
    assert.equal((await a.window.verificarDadosServidor()).estado, 'verificado', 'Nova geração pode verificar normalmente');
    preservado(a, memoria, disco, id);
});

// T09: tratar complemento false como sucesso; parar antes do segundo complemento;
// retry chamar obterLeituraDados/aplicar/salvar ou ignorar formulário aberto.
testar('T09 — complementos reais falhos mantêm aviso; retry faz só leitura complementar', async (t) => {
    const a = await criarAmbiente(t);
    let falhar = true;
    let leiturasReposicoes = 0;
    a.substitutos.financas = () => resposta(falhar ? { error: 'Financeiro indisponível' } : a.servidor.financas, falhar ? 500 : 200);
    a.substitutos.reposicoes = () => {
        leiturasReposicoes++;
        return falhar && leiturasReposicoes > 1 ? resposta({ error: 'Histórico indisponível' }, 500) : resposta(a.servidor.reposicoes);
    };
    const resultado = await a.window.usarDadosServidor();
    assert.equal(resultado.ok, true);
    assert.equal(resultado.estado, 'aplicado');
    assert.equal(resultado.complementoPendente, true);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.window.obterAlunos()[0].nome, 'Ana — servidor v1');
    assert.equal(a.painel.hidden, false);
    assert.equal(a.usar.disabled, true);
    assert.equal(a.verificar.disabled, false);
    assert.match(a.mensagem(), /complementares/);
    assert.deepEqual(rotas(a).slice(-3), ['financas', 'reposicoes', 'alunos/consistencia-agenda']);
    const memoria = a.memoria();
    const inicio = a.requisicoes().length;
    assert.equal((await a.window.usarDadosServidor()).estado, 'adiado');
    a.abrirFormularios();
    assert.equal((await a.window.verificarDadosServidor()).motivo, 'formulario-aberto');
    assert.equal(a.requisicoes().length, inicio);
    a.window.togglePainelCadastro(false);
    a.window.DialogController.close(a.window.document.getElementById('modalRascunho'));
    const aindaIncompleto = await a.window.verificarDadosServidor();
    assert.equal(aindaIncompleto.complementoPendente, true);
    assert.equal(a.painel.hidden, false);
    falhar = false;
    const recuperado = await a.window.verificarDadosServidor();
    assert.equal(recuperado.complementoPendente, false);
    assert.equal(a.painel.hidden, true);
    // Sem cards, garantirDadosFinancas tenta sua própria leitura dentro do
    // complemento de alunos, mesmo após falha do complemento financeiro.
    assert.deepEqual(rotas(a).slice(inicio), [
        'financas', 'financas', 'reposicoes', 'alunos/consistencia-agenda',
        'financas', 'reposicoes', 'alunos/consistencia-agenda'
    ]);
    assert.equal(a.confirmacoes.length, 1, 'Retry não confirma novo abandono nem grava');
    assert.deepEqual(a.memoria(), memoria);
    assert.equal(a.contexto.lerFinancas().dados[0].aluno.nome, 'Ana — servidor v1');
    assert.equal(a.contexto.obterPendencia(), null);
});

// T10: remover guarda de pendência em manual/carregarDados/aplicarLeituraDados;
// deixar salvarDados iniciar CRUD apesar de iniciarOperacao retornar null.
testar('T10 — pendência bloqueia manual, carregamento ordinário e aplicação sem autorização de recuperação', async (t) => {
    const a = await criarAmbiente(t);
    const memoria = a.memoria();
    const disco = a.disco();
    const id = a.contexto.obterPendencia().tentativaId;
    const manual = await a.window.sincronizarBancoDados();
    assert.equal(manual.motivo, 'pendencia-local');
    const ordinario = await a.window.carregarDados({ forcarRemoto: true, forcarRender: false });
    assert.equal(ordinario.motivo, 'pendencia-local');
    assert.equal(a.requisicoes().length, 0);
    assert.equal((await a.window.salvarDados(true)).ok, false);
    assert.equal(a.requisicoes().length, 0, 'Pendência não pode autorizar replay CRUD');
    // Primitiva compartilhada com B2: preparar é permitido, adotar ordinariamente não.
    const leitura = await a.window.obterLeituraDados();
    assert.equal(leitura.estado, 'preparado');
    const aplicacao = a.window.aplicarLeituraDados(leitura);
    assert.equal(aplicacao.ok, false);
    assert.equal(aplicacao.motivo, 'pendencia-local');
    preservado(a, memoria, disco, id);
    assert.equal(a.confirmacoes.length, 0);
});

// T11: semOperacoes sempre true ou finalizarOperacao ignorar tarefas conhecidas.
testar('T11 — recuperação espera tarefas cliente terminarem antes de consultar ou confirmar', async (t) => {
    const a = await criarAmbiente(t, { criarPendencia: false });
    const op = a.contexto.iniciarOperacao({ tipo: 'reposicao-composta', alvos: ALVOS });
    assert.ok(op);
    const tarefa = adiada();
    a.contexto.acompanharTarefa(op, tarefa.promise);
    a.contexto.registrarEtapa(op, { method: 'POST', confirmada: false });
    a.contexto.marcarFalhaOperacao(op, new Error('Resposta perdida'));
    const finalizacao = a.contexto.finalizarOperacao(op);
    assert.equal(a.contexto.semOperacoes(), false);
    assert.equal(a.verificar.disabled, true);
    assert.equal(a.usar.disabled, true);
    assert.equal((await a.window.verificarDadosServidor()).estado, 'adiado');
    assert.equal((await a.window.usarDadosServidor()).estado, 'adiado');
    assert.equal(a.confirmacoes.length, 0);
    assert.equal(a.requisicoes().length, 0);
    tarefa.resolver();
    await finalizacao;
    assert.equal(a.contexto.semOperacoes(), true);
    assert.equal(a.contexto.obterPendencia().tentativaId, op.id);
    assert.equal(a.verificar.disabled, false);
    assert.equal((await a.window.verificarDadosServidor()).estado, 'verificado');
    assert.equal(a.contexto.obterPendencia().tentativaId, op.id);
});

// T12: remover guardas de requestId/interação de carregarFinancas; aplicar leitura
// preparada sem conferir sequência; atualizar vínculo sem exigir tentativa existente.
testar('T12 — callbacks de leitura e tentativa antigos não reaplicam dados depois da adoção', async (t) => {
    const a = await criarAmbiente(t);
    const contextoAntigo = a.contexto.capturar();
    const idAntigo = a.contexto.obterPendencia().tentativaId;
    const leituraAntiga = await a.window.obterLeituraDados();
    const corpo = adiada();
    const iniciou = adiada();
    a.substitutos.financas = () => ({ ok: true, status: 200, json: () => { iniciou.resolver(); return corpo.promise; } });
    const financeiroAntigo = a.window.inicializarFinancas({ forcarRemoto: true, silencioso: true });
    await iniciou.promise;
    assert.equal(a.contexto.podeLer(), true, 'A adoção deve invalidar callbacks mesmo sem abrir formulário');
    delete a.substitutos.financas;
    Object.assign(a.servidor, remoto('Ana — adoção mais recente'));
    assert.equal((await a.window.usarDadosServidor()).complementoPendente, false);
    const memoria = a.memoria();
    const disco = a.disco();
    corpo.resolver(remoto('CALLBACK ANTIGO').financas);
    assert.equal(await financeiroAntigo, false);
    assert.equal(a.window.aplicarLeituraDados(leituraAntiga, { tentativaId: idAntigo }).estado, 'descartado');
    assert.equal(a.contexto.atualizarVinculoPendente(idAntigo, contextoAntigo, 'aula-ana', 'evento-antigo'), false);
    assert.equal(a.contexto.confirmarPendencia(idAntigo, contextoAntigo, snapshot('CALLBACK ANTIGO')), false);
    await a.contexto.finalizarOperacao(a.operacaoAntiga);
    assert.deepEqual(a.memoria(), memoria);
    assert.deepEqual(a.disco(), disco);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.window.__financasState.cards[0].aluno.nome, 'Ana — adoção mais recente');
    assert.doesNotMatch(a.window.document.body.textContent, /CALLBACK ANTIGO/);
});

// T13: retirar apenas invalidarLeiturasAnteriores em aplicarLeituraDados permite
// que o JSON complementar anterior à adoção substitua o histórico recém-confirmado.
testar('T13 — reposições complementares anteriores à adoção são descartadas mesmo sem abrir formulário', async (t) => {
    const a = await criarAmbiente(t);
    const lista = a.window.document.createElement('div');
    lista.id = 'listaAlunos';
    a.window.document.getElementById('tela-alunos').appendChild(lista);
    a.window.reposicaoFlowHelpers = require('../backend/shared/reposicao-flow-helpers');
    const historico = () => copiar(vm.runInContext('_reposicoesHistorico', a.dom.getInternalVMContext()));
    const corpo = adiada();
    const iniciou = adiada();
    const idAntigo = 'repo-callback-anterior-adocao';
    const tentativaId = a.contexto.obterPendencia().tentativaId;
    a.substitutos.reposicoes = () => ({
        ok: true, status: 200,
        json: () => { iniciou.resolver(); return corpo.promise; }
    });
    const leituraAntiga = a.window.carregarDadosComplementaresAlunos();
    await iniciou.promise;
    assert.deepEqual(rotas(a), ['financas', 'reposicoes'], 'Financeiro resolvido; JSON complementar de reposições ainda pendente');
    assert.equal(a.window.__financasState.cards[0].aluno.nome, 'Ana — servidor v1');
    assert.equal(a.contexto.obterPendencia().tentativaId, tentativaId);
    assert.equal(a.contexto.podeLer(), true, 'Não abrir formulários para invalidar a leitura antiga');
    assert.equal(a.window.DialogController.getStack().length, 0);
    assert.equal(a.confirmacoes.length, 0);

    delete a.substitutos.reposicoes;
    Object.assign(a.servidor, remoto('Ana — adoção com complementos novos'));
    const resultado = await a.window.usarDadosServidor();
    assert.equal(resultado.ok, true);
    assert.equal(resultado.estado, 'aplicado');
    assert.equal(resultado.complementoPendente, false, 'Complementos da nova geração precisam ser confirmados');
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.painel.hidden, true);
    assert.equal(a.confirmacoes.length, 1);
    assert.equal(a.contexto.podeLer(), true);
    assert.equal(a.window.DialogController.getStack().length, 0);
    assert.deepEqual(rotas(a).slice(-3), ['financas', 'reposicoes', 'alunos/consistencia-agenda']);
    assert.deepEqual(historico(), a.servidor.reposicoes);
    assert.equal(a.window.__financasState.cards[0].aluno.nome, 'Ana — adoção com complementos novos');
    assert.match(lista.textContent, /Ana — adoção com complementos novos/);
    assert.ok(lista.querySelector('[data-historico-aluno="aluno-ana"]'), 'Render real do indicador de reposições');
    const memoria = a.memoria();
    const disco = a.disco();
    const historicoConfirmado = historico();
    const html = a.window.document.body.innerHTML;
    const quantidadeLeituras = a.requisicoes().length;

    corpo.resolver([{ ...a.servidor.reposicoes[0], id: idAntigo, status: 'realizada' }]);
    assert.equal(await leituraAntiga, false, 'Callback anterior à adoção deve ser descartado');
    await drenar();
    assert.equal(historico().some((item) => item.id === idAntigo), false);
    assert.deepEqual(historico(), historicoConfirmado);
    assert.deepEqual(a.memoria(), memoria);
    assert.deepEqual(a.disco(), disco);
    assert.equal(a.window.document.body.innerHTML, html);
    assert.doesNotMatch(a.window.document.body.innerHTML, /repo-callback-anterior-adocao/);
    assert.equal(a.requisicoes().length, quantidadeLeituras, 'Callback descartado não pode continuar a consulta de consistência');
});