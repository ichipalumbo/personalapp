const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

// Fixtures independentes: não compartilha o ambiente GET-only da recuperação.
// Produção é carregada sem transformação; só rede, identidade e timers de 0ms
// são fronteiras controladas. Os timers longos de segurança continuam reais.
const RAIZ = path.resolve(__dirname, '..');
const CONTA_A = 'ana-manual@example.com';
const CONTA_B = 'bia-manual@example.com';
const BATCH = ['alunos', 'agendamentos', 'configuracao/grade_horarios', 'bloqueios-externos', 'reposicoes'];
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const testar = (nome, executar) => test(nome, { timeout: 5000 }, executar);
// Uma barreira de eventos por transição, nunca polling/espera por tempo decorrido.
const barreiraEventos = () => new Promise((resolver) => setImmediate(resolver));

function gate() {
    let resolver;
    let rejeitar;
    const promise = new Promise((resolve, reject) => { resolver = resolve; rejeitar = reject; });
    return { promise, resolver, rejeitar };
}

function resposta(dados, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => copiar(dados) };
}

function snapshot(nome = 'Ana — cache confirmado') {
    return {
        alunos: [{ id: 'aluno-manual', nome, status: 'ativo', objetivo: 'Personal Trainer' }],
        aulas: [{ id: 'aula-manual', alunoId: 'aluno-manual', tipo: 'aula', data: '2026-10-06', horarioInicio: '08:00', horarioFim: '09:00' }],
        reposicoes: [], grade: { inicio: '07:00', fim: '20:00' }, meta: 123
    };
}

function remoto(nome = 'Ana — servidor novo', vazio = false) {
    const dados = snapshot(nome);
    return {
        alunos: vazio ? [] : dados.alunos,
        agendamentos: vazio ? [] : dados.aulas,
        'configuracao/grade_horarios': { chave: 'grade_horarios', horaInicio: '06:00', horaFim: '21:00' },
        'bloqueios-externos': [], reposicoes: []
    };
}

function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

async function ambiente(t) {
    const dom = new JSDOM(`<!doctype html><html><body><div class="container">
        <button id="btnSyncBanco"><span id="btnSyncBancoText">Sincronizar Dados</span></button>
        <span id="headerCacheState" hidden></span><main id="tela-alunos"></main>
        <div id="modalHistoricoReposicoes" class="modal-overlay" style="display:none">
            <p id="resumoHistoricoReposicoes"></p><div id="conteudoHistoricoReposicoes"></div>
        </div>
    </div></body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    let email = CONTA_A;
    const listeners = new Set();
    const agendados = new Map();
    let proximoTimer = -1;
    const setTimeoutReal = window.setTimeout.bind(window);
    const clearTimeoutReal = window.clearTimeout.bind(window);
    window.setTimeout = (fn, prazo, ...argumentos) => {
        if (prazo !== 0) return setTimeoutReal(fn, prazo, ...argumentos);
        const id = proximoTimer--;
        agendados.set(id, () => fn(...argumentos));
        return id;
    };
    window.clearTimeout = (id) => {
        if (id < 0) agendados.delete(id);
        else clearTimeoutReal(id);
    };
    window.googleIdentity = {
        getOwnerEmail: () => email,
        getIdToken: () => `token-sintetico-${email}`,
        addAuthChangeListener: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
    window.Headers = Headers;
    window.AbortController = AbortController;
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.log = new Proxy({}, { get: () => () => {} });
    window.console = { info() {}, warn() {}, error() {} };
    const a = { dom, window, chamadas: [], avisos: [], overlays: [], recuperacoes: 0, servidor: remoto(), somenteGet: false };
    window.mostrarToast = (texto, tipo) => a.avisos.push({ texto, tipo });
    window.mostrarOverlayErroConexao = (texto, opcoes) => a.overlays.push({ texto, opcoes });
    window.abrirRecuperacaoDados = () => { a.recuperacoes++; };
    window.__appShell = { router: { getCurrentViewId: () => null } };
    a.responder = (chamada) => {
        if (chamada.method !== 'GET') return resposta({ ok: true });
        assert.ok(Object.hasOwn(a.servidor, chamada.rota), `Rota sem fixture: ${chamada.rota}`);
        return resposta(a.servidor[chamada.rota]);
    };
    // Nem o warm-up delega ao fetch nativo. Regressões de escrita no manual falham aqui.
    window.fetch = async (url, opcoes = {}) => {
        const endereco = new URL(String(url));
        assert.equal(endereco.origin, 'http://api.test');
        if (endereco.pathname === '/') return resposta({ ok: true });
        const chamada = {
            rota: endereco.pathname.slice('/api/'.length) + endereco.search,
            method: opcoes.method || 'GET', conta: email, opcoes
        };
        a.chamadas.push(chamada);
        assert.equal(opcoes.headers.get('Authorization'), `Bearer token-sintetico-${email}`);
        if (a.somenteGet) assert.equal(chamada.method, 'GET', `Manual reenviou escrita: ${chamada.rota}`);
        return a.responder(chamada);
    };
    ['assets/js/state.js', 'assets/js/app/contexto-dados.js', 'assets/js/storage.js'].forEach((arquivo) => carregar(dom, arquivo));
    a.contexto = window.contextoDados;
    a.contexto.iniciar();
    assert.equal(a.contexto.salvarPrincipal(snapshot()), true);
    assert.equal((await window.carregarDados({ forcarRender: false })).estado, 'local');
    assert.equal(a.chamadas.length, 0, 'Fixture inicial não precisa de rede');
    a.disco = () => Object.fromEntries(Object.keys(window.localStorage).sort().map((chave) => [chave, window.localStorage.getItem(chave)]));
    a.memoria = () => copiar({ alunos: window.obterAlunos(), aulas: window.obterAulas(), reposicoes: window.obterReposicoes(), grade: window.obterLimitesGrade(), meta: window.faturamentoMeta });
    a.pendencias = () => JSON.parse(window.localStorage.getItem('personal_cache_pendencias') || '{"itens":[]}').itens;
    a.gets = () => a.chamadas.filter((chamada) => chamada.method === 'GET');
    a.escritas = () => a.chamadas.filter((chamada) => chamada.method !== 'GET');
    a.sucessos = () => a.avisos.filter((aviso) => aviso.tipo === 'success' || /Histórico de reposições atualizado/.test(aviso.texto));
    a.manual = () => window.sincronizarBancoDados();
    a.trocar = (novoEmail) => { email = novoEmail; listeners.forEach((fn) => fn()); };
    a.avancarAgendados = async () => {
        const rodada = Array.from(agendados.values());
        agendados.clear();
        rodada.forEach((fn) => fn());
        await barreiraEventos();
    };
    a.segurarAlunos = () => {
        const inicio = gate();
        const corpo = gate();
        const responderAnterior = a.responder;
        a.responder = (chamada) => chamada.method === 'GET' && chamada.rota === 'alunos'
            ? { ok: true, status: 200, json: () => { inicio.resolver(chamada); return corpo.promise; } }
            : responderAnterior(chamada);
        t.after(() => corpo.resolver([]));
        return { inicio, corpo, liberar: (dados) => { a.responder = responderAnterior; corpo.resolver(dados); } };
    };
    return a;
}

function conferirBatch(chamadas) {
    assert.equal(chamadas.length, 5);
    assert.deepEqual(chamadas.map((chamada) => chamada.rota).sort(), [...BATCH].sort());
    assert.ok(chamadas.every((chamada) => chamada.method === 'GET'));
}

// M01: remover iniciarOperacao/atualizarOperacao de salvarDados ou mover
// registrarEtapa para depois de fetch em apiFetchBackend.
testar('M01 — salvarDados persiste raiz antes da rede e etapa antes de cada envio', async (t) => {
    const a = await ambiente(t);
    const intencao = snapshot('Ana — edição ainda não confirmada');
    a.window.atualizarAlunos(intencao.alunos);
    const etapasNoEnvio = [];
    let id;
    a.responder = (chamada) => {
        const pendencia = a.contexto.obterPendencia();
        assert.ok(pendencia, 'Raiz já precisa existir no primeiro GET do CRUD');
        id ||= pendencia.tentativaId;
        assert.equal(pendencia.tentativaId, id, 'Todas as tarefas pertencem à mesma raiz');
        assert.equal(pendencia.tipo, 'dados');
        assert.equal(pendencia.snapshot.alunos[0].nome, intencao.alunos[0].nome);
        if (chamada.method !== 'GET') {
            const etapa = pendencia.etapas.find((item) => item.url.endsWith(`/${chamada.rota}`) && item.method === chamada.method);
            assert.ok(etapa, 'A etapa precisa estar no localStorage antes do fetch');
            assert.equal(etapa.confirmada, false);
            etapasNoEnvio.push(etapa);
        }
        return chamada.method === 'GET' ? resposta([]) : resposta({ ok: true });
    };
    assert.equal((await a.window.salvarDados(true)).ok, true);
    assert.equal(a.escritas().length, 3, 'POST aluno, POST aula e PUT grade');
    assert.equal(etapasNoEnvio.length, 3);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.contexto.lerPrincipal().alunos[0].nome, intencao.alunos[0].nome);
});

// M02: continuar sem raiz, ignorar atualizarOperacao false ou ignorar a falha
// de registrarEtapa. Não substituir o storage: injetar a falha no protótipo real.
testar('M02 — falha ao persistir raiz, metadados ou etapa impede o fetch', async (t) => {
    for (const ponto of ['raiz', 'metadados', 'etapa']) {
        const a = await ambiente(t);
        const op = ponto === 'etapa' ? a.contexto.iniciarOperacao({ tipo: 'teste-persistencia' }) : null;
        const prototipo = Object.getPrototypeOf(a.window.localStorage);
        const gravarReal = prototipo.setItem;
        let pendenciasGravadas = 0;
        const falha = t.mock.method(prototipo, 'setItem', function(chave, valor) {
            if (chave === 'personal_cache_pendencias') {
                pendenciasGravadas++;
                if (ponto !== 'metadados' || pendenciasGravadas >= 2) throw new Error('Quota de persistência simulada');
            }
            return gravarReal.call(this, chave, valor);
        });
        try {
            if (op) {
                await assert.rejects(a.window.apiFetchBackend('http://api.test/api/reposicoes/x', { method: 'PATCH', operacao: op }), /PENDENCIA_NAO_PERSISTIDA/);
            } else assert.equal((await a.window.salvarDados(true)).ok, false, ponto);
            assert.equal(a.chamadas.length, 0, `${ponto}: nenhuma tentativa pode chegar à rede`);
        } finally { falha.mock.restore(); }
        if (op) {
            a.contexto.marcarFalhaOperacao(op, new Error('Etapa não enviada'));
            await a.contexto.finalizarOperacao(op);
        }
    }
});

// M03: confirmar etapa falha, limpar pendência com op.falha ou permitir etapa
// nova depois da falha. O cache confirmado não é a intenção parcial.
testar('M03 — etapa confirmada seguida de falha conserva intenção parcial e bloqueia continuação', async (t) => {
    const a = await ambiente(t);
    const cacheAntes = a.disco();
    a.window.atualizarAlunos(snapshot('Ana — intenção parcial').alunos);
    const op = a.contexto.iniciarOperacao({ tipo: 'reposicao-composta', alvos: { alunoIds: ['aluno-manual'] } });
    a.responder = (chamada) => resposta({}, chamada.method === 'PATCH' ? 500 : 200);
    assert.equal((await a.window.apiFetchBackend('http://api.test/api/agendamentos', { method: 'POST', operacao: op })).ok, true);
    assert.equal((await a.window.apiFetchBackend('http://api.test/api/reposicoes/x', { method: 'PATCH', operacao: op })).status, 500);
    await assert.rejects(a.window.apiFetchBackend('http://api.test/api/agendamentos/x', { method: 'PUT', operacao: op }), /OPERACAO_INTERROMPIDA/);
    await a.contexto.finalizarOperacao(op);
    const pendencia = a.contexto.obterPendencia();
    assert.equal(pendencia.tentativaId, op.id);
    assert.equal(pendencia.estado, 'parcial');
    assert.deepEqual(copiar(pendencia.etapas.map((etapa) => etapa.confirmada)), [true, false]);
    assert.equal(pendencia.snapshot.alunos[0].nome, 'Ana — intenção parcial');
    assert.equal(a.window.localStorage.getItem('personal_alunos'), cacheAntes.personal_alunos);
    assert.equal(a.escritas().length, 2);
    assert.equal(a.contexto.semOperacoes(), true);
});

// M04: retirar while de finalizarOperacao, esperar apenas o primeiro snapshot
// de tarefas ou remover/confirmar a pendência antes de todas elas terminarem.
testar('M04 — etapas confirmadas limpam pendência só depois de todas as tarefas, inclusive a anexada', async (t) => {
    const a = await ambiente(t);
    a.window.atualizarAlunos(snapshot('Ana — confirmação ao final').alunos);
    const op = a.contexto.iniciarOperacao({ tipo: 'agenda' });
    await a.window.apiFetchBackend('http://api.test/api/agendamentos/x', { method: 'PUT', operacao: op });
    const primeira = gate();
    const segunda = gate();
    t.after(() => { primeira.resolver(); segunda.resolver(); });
    a.contexto.acompanharTarefa(op, primeira.promise);
    const finalizacao = a.contexto.finalizarOperacao(op);
    a.contexto.acompanharTarefa(op, segunda.promise);
    assert.equal(op.finalizada, false);
    assert.equal(a.contexto.obterPendencia().tentativaId, op.id);
    primeira.resolver();
    await barreiraEventos();
    assert.equal(op.finalizada, false, 'A segunda tarefa não existia no primeiro Promise.allSettled');
    assert.equal(a.contexto.semOperacoes(), false);
    assert.equal(a.contexto.obterPendencia().tentativaId, op.id);
    segunda.resolver();
    await finalizacao;
    assert.equal(op.finalizada, true);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.contexto.lerPrincipal().alunos[0].nome, 'Ana — confirmação ao final');
});

// M05: retirar statusEsperados [404] dos dois DELETEs do CRUD ou ignorar
// statusEsperados na confirmação da etapa em apiFetchBackend.
testar('M05 — DELETE 404 esperado confirma etapas de aluno e aula sem envenenar a raiz', async (t) => {
    const a = await ambiente(t);
    a.window.atualizarAlunos([]);
    a.window.atualizarAulas([]);
    const op = a.contexto.iniciarOperacao({ tipo: 'exclusao-composta' });
    a.responder = (chamada) => {
        if (chamada.method === 'DELETE') return resposta({ error: 'Já ausente' }, 404);
        if (chamada.method === 'GET') return resposta(chamada.rota === 'alunos' ? snapshot().alunos : snapshot().aulas);
        return resposta({ ok: true });
    };
    assert.equal((await a.window.salvarDados(true, { operacao: op, contextoDados: op.contexto })).ok, true);
    assert.equal(op.finalizada, false, 'Salvar interno não finaliza raiz emprestada');
    const exclusoes = op.etapas.filter((etapa) => etapa.method === 'DELETE');
    assert.equal(exclusoes.length, 2);
    assert.ok(exclusoes.every((etapa) => etapa.confirmada && etapa.status === 404));
    assert.equal(op.falha, false);
    await a.contexto.finalizarOperacao(op);
    assert.equal(a.contexto.obterPendencia(), null);
});

// M06: retirar filtro atual(outra.contexto) de ocupado; incrementar geração
// ativa incondicionalmente no fim de uma operação de outra sessão.
testar('M06 — operação pendurada de A não bloqueia B e seu fim não muda a geração de B', async (t) => {
    const a = await ambiente(t);
    const opA = a.contexto.iniciarOperacao({ tipo: 'agenda-A' });
    const tarefaA = gate();
    t.after(() => tarefaA.resolver());
    a.contexto.acompanharTarefa(opA, tarefaA.promise);
    const fimA = a.contexto.finalizarOperacao(opA);
    a.trocar(CONTA_B);
    assert.equal(a.contexto.semOperacoes(), true);
    assert.equal(a.contexto.podeLer(), true);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.contexto.salvarPrincipal(snapshot('Bia — dados atuais')), true);
    a.window.carregarDadosDoLocalStorage();
    const opB = a.contexto.iniciarOperacao({ tipo: 'agenda-B' });
    assert.ok(opB, 'B pode abrir uma raiz mesmo com tarefa cliente de A pendurada');
    const versaoB = a.contexto.capturarInteracao();
    const contaB = a.contexto.capturar();
    const discoB = a.disco();
    tarefaA.resolver();
    await fimA;
    assert.equal(a.contexto.capturarInteracao(), versaoB, 'Finalização de A não invalida leituras/interação de B');
    assert.equal(a.contexto.atual(contaB), true);
    assert.equal(a.contexto.operacaoAtual(opB), true);
    assert.equal(a.contexto.obterPendencia().tentativaId, opB.id);
    assert.deepEqual(a.disco(), discoB);
    assert.equal(a.pendencias().find((item) => item.ownerEmail === CONTA_A).tentativaId, opA.id);
    await a.contexto.finalizarOperacao(opB);
});

// M07: pular semOperacoes/podeLer ou não acordar ao fechar formulário;
// criar uma Promise/consulta por clique em vez de coalescer na mesma conta.
testar('M07 — manual espera operação e formulário, coalesce cliques e consulta quando ambos liberam', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    a.contexto.definirFormulario('cadastro', true);
    const op = a.contexto.iniciarOperacao({ tipo: 'edicao' });
    const tarefa = gate();
    t.after(() => tarefa.resolver());
    a.contexto.acompanharTarefa(op, tarefa.promise);
    const fim = a.contexto.finalizarOperacao(op);
    const pedido = a.manual();
    assert.equal(a.manual(), pedido);
    assert.match(a.window.document.getElementById('btnSyncBancoText').textContent, /Aguardando/);
    await barreiraEventos();
    assert.equal(a.chamadas.length, 0);
    assert.equal(a.sucessos().length, 0);
    tarefa.resolver();
    await fim;
    await barreiraEventos();
    assert.equal(a.chamadas.length, 0, 'Operação terminou, mas formulário ainda está aberto');
    a.contexto.definirFormulario('cadastro', false);
    assert.equal((await pedido).estado, 'aplicado');
    conferirBatch(a.chamadas);
    assert.equal(a.sucessos().length, 1);
});

// M08: pular _leituraRemotaEmVoo, reutilizar leitura anterior para atender
// o clique ou omitir o evento de retomada no finally de obterLeituraDados.
testar('M08 — manual aguarda voo batch e depois obtém seu próprio batch NOVO', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    const retida = a.segurarAlunos();
    const leituraAnterior = a.window.obterLeituraDados();
    await retida.inicio.promise;
    const pedido = a.manual();
    assert.equal(a.manual(), pedido);
    await barreiraEventos();
    conferirBatch(a.chamadas);
    assert.match(a.window.document.getElementById('btnSyncBancoText').textContent, /Aguardando/);
    a.servidor = remoto('Ana — batch posterior ao clique');
    retida.liberar(snapshot('Ana — batch anterior ao clique').alunos);
    assert.equal((await leituraAnterior).estado, 'preparado');
    assert.equal(a.chamadas.length, 5, 'Fim do voo agenda a retomada, não entrega seu snapshot ao manual');
    await a.avancarAgendados();
    assert.equal((await pedido).estado, 'aplicado');
    conferirBatch(a.chamadas.slice(5));
    assert.equal(a.window.obterAlunos()[0].nome, 'Ana — batch posterior ao clique');
    assert.equal(a.contexto.lerPrincipal().alunos[0].nome, 'Ana — batch posterior ao clique');
    assert.equal(a.sucessos().length, 1);
});

// M09: tratar remoto vazio como migração/reconciliação de cache ou recusar
// arrays vazios válidos na preparação/aplicação do batch.
testar('M09 — manual aceita batch remoto vazio e limpa cache antigo sem qualquer CRUD', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    a.servidor = remoto('', true);
    const resultado = await a.manual();
    assert.equal(resultado.ok, true);
    assert.equal(resultado.estado, 'aplicado');
    conferirBatch(a.chamadas);
    assert.equal(a.window.obterAlunos().length, 0);
    assert.equal(a.window.obterAulas().length, 0);
    assert.equal(a.window.obterReposicoes().length, 0);
    assert.deepEqual(copiar(a.contexto.lerPrincipal().alunos), []);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.sucessos().length, 1);
});

// M10: coalescer apenas por existência de _pedidoLeituraManual, sem validar
// dono/geração antes de devolver sua Promise a um novo clique.
testar('M10 — A→B cancela pedido aguardando de A; clique imediato de B não recebe Promise de A', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    a.contexto.definirFormulario('edicao-A', true);
    const pedidoA = a.manual();
    a.trocar(CONTA_B);
    a.servidor = remoto('Bia — leitura solicitada por B');
    // Propositalmente sem barreira entre troca e clique: reproduz a janela da fila.
    const pedidoB = a.manual();
    assert.notEqual(pedidoB, pedidoA, 'Coalescência só vale para a mesma conta e geração');
    assert.equal((await pedidoA).estado, 'descartado');
    assert.equal((await pedidoB).estado, 'aplicado');
    conferirBatch(a.chamadas);
    assert.ok(a.chamadas.every((chamada) => chamada.conta === CONTA_B));
    assert.equal(a.window.obterAlunos()[0].nome, 'Bia — leitura solicitada por B');
});

// M11: manter pedido aoInvalidar ou transformar pedido de A em leitura
// automática de B; retirar guarda de conta/geração na resposta tardia.
testar('M11 — troca durante corpo cancela A sem pedido automático de B nem aplicação tardia', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    const retida = a.segurarAlunos();
    const pedidoA = a.manual();
    await retida.inicio.promise;
    a.trocar(CONTA_B);
    assert.equal(a.contexto.salvarPrincipal(snapshot('Bia — cache privado')), true);
    a.window.carregarDadosDoLocalStorage();
    const memoriaB = a.memoria();
    const discoB = a.disco();
    assert.equal((await pedidoA).estado, 'descartado');
    assert.equal(a.chamadas.length, 5);
    retida.liberar(snapshot('SEGREDO TARDIO DE A').alunos);
    await barreiraEventos();
    await a.avancarAgendados();
    assert.deepEqual(a.memoria(), memoriaB);
    assert.deepEqual(a.disco(), discoB);
    assert.equal(a.chamadas.length, 5, 'Nenhum batch de B sem clique de B');
    assert.equal(a.sucessos().length, 0);
    a.servidor = remoto('Bia — leitura explícita');
    const pedidoB = a.manual();
    assert.notEqual(pedidoB, pedidoA);
    assert.equal((await pedidoB).estado, 'aplicado');
    conferirBatch(a.chamadas.slice(5));
    assert.ok(a.chamadas.slice(5).every((chamada) => chamada.conta === CONTA_B));
});

// M12: converter falha em remoto vazio/fallback ok ou anunciar success sem
// resultado aplicado. Todas as variantes preservam memória e disco inteiros.
testar('M12 — manual com falha HTTP, rede ou JSON conserva cache e não anuncia sucesso', async (t) => {
    for (const modo of ['HTTP', 'rede', 'JSON']) {
        const a = await ambiente(t);
        a.somenteGet = true;
        const memoria = a.memoria();
        const disco = a.disco();
        const responderAnterior = a.responder;
        a.responder = (chamada) => {
            if (chamada.rota !== 'alunos') return responderAnterior(chamada);
            if (modo === 'HTTP') return resposta({ error: 'Indisponível' }, 500);
            if (modo === 'rede') throw new Error('Sem conexão');
            return { ok: true, status: 200, json: async () => { throw new SyntaxError('JSON quebrado'); } };
        };
        const resultado = await a.manual();
        assert.equal(resultado.ok, false, modo);
        assert.equal(resultado.estado, 'falha', modo);
        await barreiraEventos();
        conferirBatch(a.chamadas);
        assert.deepEqual(a.memoria(), memoria, modo);
        assert.deepEqual(a.disco(), disco, modo);
        assert.equal(a.sucessos().length, 0, modo);
        assert.equal(a.overlays.length, 1, modo);
        assert.equal(a.window.document.getElementById('btnSyncBanco').disabled, false);
    }
});

// M13: ignorar o booleano devolvido pela atualização complementar da view;
// batch aplicado não autoriza anunciar que a atualização inteira terminou.
testar('M13 — complemento financeiro false após batch aplicado não anuncia sucesso manual', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    let complementos = 0;
    a.window.__appShell.router.getCurrentViewId = () => 'tela-financas';
    a.window.atualizarFinancasAposRecuperacao = async () => { complementos++; return false; };
    await a.manual();
    conferirBatch(a.chamadas);
    assert.equal(complementos, 1);
    assert.equal(a.window.obterAlunos()[0].nome, 'Ana — servidor novo', 'Falha complementar não desfaz batch já aplicado');
    assert.equal(a.sucessos().length, 0, 'False complementar precisa impedir success');
});

// M14: retirar podeAplicarInteracao, resolver o pedido descartado em vez de
// mantê-lo aguardando, ou reaplicar a leitura antiga após fechar a edição.
testar('M14 — edição muda geração, descarta leitura manual e espera antes de buscar batch novo', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    const memoria = a.memoria();
    const disco = a.disco();
    const retida = a.segurarAlunos();
    const pedido = a.manual();
    let terminou = false;
    pedido.then(() => { terminou = true; });
    await retida.inicio.promise;
    a.contexto.definirFormulario('edicao-durante-manual', true);
    retida.liberar(snapshot('SNAPSHOT ANTERIOR À EDIÇÃO').alunos);
    await barreiraEventos();
    await a.avancarAgendados();
    assert.equal(terminou, false, 'Pedido continua aguardando a edição terminar');
    assert.equal(a.manual(), pedido, 'Mesmo pedido lógico após descarte por interação');
    assert.deepEqual(a.memoria(), memoria);
    assert.deepEqual(a.disco(), disco);
    assert.equal(a.chamadas.length, 5);
    assert.equal(a.sucessos().length, 0);
    a.servidor = remoto('Ana — leitura após terminar edição');
    a.contexto.definirFormulario('edicao-durante-manual', false);
    assert.equal((await pedido).estado, 'aplicado');
    conferirBatch(a.chamadas.slice(5));
    assert.equal(a.window.obterAlunos()[0].nome, 'Ana — leitura após terminar edição');
});

// M15: onRetry manual chamar salvarDados; reintroduzir onRetry de salvarDados
// no feedback de escrita; contornar pendência ao clicar no manual após falha.
testar('M15 — callback retry faz só nova leitura; escrita falha não oferece replay automático', async (t) => {
    const a = await ambiente(t);
    a.somenteGet = true;
    const responderAnterior = a.responder;
    a.responder = (chamada) => chamada.rota === 'alunos' ? resposta({}, 500) : responderAnterior(chamada);
    assert.equal((await a.manual()).estado, 'falha');
    assert.equal(a.overlays.length, 1);
    const retry = a.overlays[0].opcoes.onRetry;
    assert.equal(typeof retry, 'function');
    a.responder = responderAnterior;
    a.servidor = remoto('Ana — retry somente de leitura');
    assert.equal((await retry()).estado, 'aplicado');
    conferirBatch(a.chamadas.slice(0, 5));
    conferirBatch(a.chamadas.slice(5));
    assert.equal(a.escritas().length, 0);
    const b = await ambiente(t);
    b.responder = (chamada) => chamada.method === 'GET' ? resposta([]) : resposta({}, 500);
    assert.equal((await b.window.salvarDados(false)).ok, false);
    const quantidade = b.chamadas.length;
    const pendencia = copiar(b.contexto.obterPendencia());
    assert.ok(pendencia);
    assert.equal(b.overlays.some((overlay) => typeof overlay.opcoes?.onRetry === 'function'), false, 'Não oferecer callback de replay do CRUD');
    assert.equal((await b.manual()).motivo, 'pendencia-local');
    assert.equal(b.recuperacoes, 1);
    assert.equal(b.chamadas.length, quantidade);
    assert.deepEqual(copiar(b.contexto.obterPendencia()), pendencia);
});

// M16: omitir operacao/contextoDados no retorno ou no GET do histórico;
// anunciar histórico atualizado quando o modal caiu no fallback de erro.
testar('M16 — retorno ao histórico propaga raiz e contexto; falha de leitura não gera toast de atualização', async (t) => {
    for (const falhar of [false, true]) {
        const a = await ambiente(t);
        a.somenteGet = true;
        carregar(a.dom, 'assets/js/view-alunos.js');
        // Render da lista é outra unidade; o modal e a leitura ficam reais.
        a.window.renderizarListaAlunos = () => {};
        const op = a.contexto.iniciarOperacao({ tipo: 'reagendamento-composto' });
        const apiReal = a.window.apiFetchBackend;
        const opcoesRecebidas = [];
        a.window.apiFetchBackend = (url, opcoes) => { opcoesRecebidas.push(opcoes); return apiReal(url, opcoes); };
        const iniciou = gate();
        const corpo = gate();
        t.after(() => corpo.resolver([]));
        a.responder = (chamada) => {
            assert.equal(chamada.rota, 'reposicoes?alunoId=aluno-manual');
            if (falhar) { iniciou.resolver(); return resposta({}, 500); }
            return { ok: true, status: 200, json: () => { iniciou.resolver(); return corpo.promise; } };
        };
        a.window._retornoHistoricoReposicoes = { alunoId: 'aluno-manual', origem: a.window.document.getElementById('btnSyncBanco') };
        const retorno = a.window.finalizarRetornoHistoricoReposicoes({ status: 'sucesso', operacao: op });
        await iniciou.promise;
        assert.equal(opcoesRecebidas.length, 1, 'Raiz ativa deve permitir GET do retorno');
        assert.equal(opcoesRecebidas[0].operacao, op);
        assert.equal(opcoesRecebidas[0].contextoDados, op.contexto);
        assert.equal(op.finalizada, false);
        assert.equal(a.contexto.obterPendencia().tentativaId, op.id);
        assert.equal(a.window._retornoHistoricoReposicoes, null);
        corpo.resolver([]);
        await retorno;
        assert.equal(a.sucessos().length, falhar ? 0 : 1);
        assert.equal(op.falha, false, 'Falha de GET não torna escrita desconhecida');
        assert.equal(a.window.document.getElementById('modalHistoricoReposicoes').getAttribute('aria-busy'), 'false');
        if (falhar) assert.ok(a.window.document.querySelector('#conteudoHistoricoReposicoes [role="alert"]'));
        await a.contexto.finalizarOperacao(op);
        assert.equal(a.contexto.obterPendencia(), null);
    }
});