const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA_A = 'ana-d2@example.com';
const CONTA_B = 'bia-d2@example.com';
const BATCH = ['alunos', 'agendamentos', 'configuracao/grade_horarios', 'bloqueios-externos', 'reposicoes'];
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const eventos = () => new Promise((resolver) => setImmediate(resolver));
const testar = (nome, executar) => test(nome, { timeout: 5000 }, executar);
function adiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}
function resposta(dados, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => copiar(dados) };
}
function snapshot(vazio = false) {
    return { alunos: vazio ? [] : [{ id: 'aluno-1', nome: 'Cache da Ana', objetivo: 'Personal Trainer' }],
        aulas: [], reposicoes: [], grade: { inicio: '07:00', fim: '20:00' }, meta: 123 };
}
function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}
function ambiente(t, opcoes = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <span id="headerCacheState" hidden>Sincronizando dados...</span>
        <button id="btnSyncBanco"><span id="btnSyncBancoText">Sincronizar Dados</span></button>
        <main id="tela-home"></main><main id="tela-alunos"></main><main id="tela-financas"></main>
        <form id="formD2"><input id="rascunho"></form>
    </body></html>`, { url: 'http://localhost/index.html#tela-home', runScripts: 'outside-only' });
    const w = dom.window;
    let email = CONTA_A;
    let token = 'token-d2';
    let online = true;
    const listeners = new Set();
    const a = { dom, w, chamadas: [], avisos: [], renders: [], gates: [], nomeRemoto: 'Servidor da Ana' };
    w.googleIdentity = {
        getOwnerEmail: () => email, getIdToken: () => token,
        addAuthChangeListener: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
    Object.defineProperty(w.navigator, 'onLine', { get: () => online });
    w.Headers = Headers;
    w.AbortController = AbortController;
    w.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    w.log = new Proxy({}, { get: () => () => {} });
    w.mostrarToast = (...args) => a.avisos.push(args);
    w.__appShell = { router: { getCurrentViewId: () => null } };
    const dados = (rota) => rota === 'alunos' ? [{ id: 'aluno-1', nome: a.nomeRemoto, objetivo: 'Personal Trainer' }]
        : rota === 'configuracao/grade_horarios' ? { horaInicio: '06:00', horaFim: '22:00' } : [];
    a.responder = (chamada) => resposta(dados(chamada.rota));
    w.fetch = async (url, init = {}) => {
        const endereco = new URL(String(url));
        assert.equal(endereco.origin, 'http://api.test', 'nenhuma rede real');
        if (endereco.pathname === '/') return resposta({}); // ping preexistente separado
        const chamada = { rota: endereco.pathname.slice('/api/'.length), method: init.method || 'GET', conta: email, init };
        a.chamadas.push(chamada);
        assert.equal(chamada.method, 'GET', 'B2/manual não escreve');
        assert.equal(init.headers.get('Authorization'), 'Bearer token-d2');
        return a.responder(chamada);
    };
    ['assets/js/state.js', 'assets/js/app/contexto-dados.js', 'assets/js/storage.js'].forEach((arquivo) => carregar(dom, arquivo));
    const c = w.contextoDados;
    c.iniciar();
    if (opcoes.cache !== 'ausente') c.salvarPrincipal(snapshot(opcoes.cache === 'vazio'));
    w.hidratarCacheDados();
    if (opcoes.sessao === false) token = null;
    carregar(dom, 'assets/js/app/coordenador-sync-boot.js');
    const b2 = w.syncBootDados;
    w.atualizarViewAtualAposSync = async (contexto) => { a.renders.push(contexto); return true; };
    a.c = c;
    a.b2 = b2;
    a.estado = () => b2.obterEstado();
    a.rotulo = () => w.document.getElementById('headerCacheState').hidden;
    a.formulario = (aberto) => c.definirFormulario('d2', aberto);
    a.trocar = (novo) => { email = novo; listeners.forEach((fn) => fn()); };
    a.sessao = (valida) => { token = valida ? 'token-d2' : null; listeners.forEach((fn) => fn()); };
    a.conexao = (conectado) => { online = conectado; w.dispatchEvent(new w.Event(conectado ? 'online' : 'offline')); };
    a.disco = () => Object.fromEntries(Object.keys(w.localStorage).map((chave) => [chave, w.localStorage.getItem(chave)]));
    a.segurarAlunos = () => {
        const gate = adiada();
        a.gates.push(gate);
        const anterior = a.responder;
        a.responder = (chamada) => chamada.rota === 'alunos'
            ? { ok: true, status: 200, json: () => gate.promise } : anterior(chamada);
        return { liberar: () => { a.responder = anterior; gate.resolver(dados('alunos')); } };
    };
    t.after(async () => {
        b2.parar();
        a.gates.forEach((gate) => gate.resolver([]));
        await eventos();
        dom.window.close();
    });
    return a;
}
function conferirBatch(chamadas) {
    assert.deepEqual(chamadas.map((c) => c.rota).sort(), [...BATCH].sort());
}

testar('D2-01 — carregar módulo e eventos não ativam B2; bootstrap continua sem ligação', async (t) => {
    const a = ambiente(t);
    a.conexao(true); a.formulario(true); a.formulario(false); a.sessao(true);
    await eventos();
    assert.equal(a.estado().ativo, false);
    assert.equal(a.chamadas.length, 0);
    assert.equal(a.rotulo(), true);
    const bootstrap = fs.readFileSync(path.join(RAIZ, 'assets/js/app/bootstrap.js'), 'utf8');
    assert.equal(/syncBootDados\s*\.\s*iniciar\s*\(/.test(bootstrap), false, 'D3 ainda não executado');
});

testar('D2-02 — uma aplicação por contexto, inclusive iniciar/online repetidos', async (t) => {
    const a = ambiente(t);
    a.b2.iniciar(); a.b2.iniciar();
    await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    conferirBatch(a.chamadas);
    assert.equal(a.renders.length, 1);
    a.b2.retomar(); a.conexao(true); a.formulario(true); a.formulario(false); a.sessao(true);
    await eventos();
    assert.equal(a.chamadas.length, 5);
    assert.equal(a.c.obterPendencia(), null, 'B2 não cria raiz de escrita');
});

for (const cache of ['presente', 'vazio', 'ausente']) {
    testar(`D2-03 — rótulo por voo: cache ${cache}`, async (t) => {
        const a = ambiente(t, { cache });
        const gate = a.segurarAlunos();
        a.b2.iniciar();
        await eventos();
        assert.equal(a.estado().estado, 'em-voo');
        assert.equal(a.rotulo(), cache === 'ausente');
        gate.liberar(); await eventos();
        assert.equal(a.rotulo(), true);
        assert.equal(a.estado().estado, 'aplicado');
    });
}

testar('D2-04 — formulário aberto adia sem aviso/rede; fechar começa leitura nova', async (t) => {
    const a = ambiente(t);
    a.formulario(true); a.b2.iniciar(); await eventos();
    assert.equal(a.estado().motivo, 'interacao-em-andamento');
    assert.equal(a.chamadas.length, 0);
    assert.equal(a.rotulo(), true);
    a.formulario(false); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    conferirBatch(a.chamadas);
});

testar('D2-05 — abrir edição em voo aborta/descarta; fechamento obtém outro batch', async (t) => {
    const a = ambiente(t);
    const gate = a.segurarAlunos();
    a.b2.iniciar(); await eventos();
    const campo = a.w.document.getElementById('rascunho'); campo.value = 'Não perder'; campo.focus();
    a.formulario(true);
    assert.equal(a.rotulo(), true, 'aviso oculto imediatamente no adiamento');
    await eventos();
    assert.equal(a.estado().estado, 'pendente');
    assert.equal(a.w.obterAlunos()[0].nome, 'Cache da Ana');
    assert.equal(a.renders.length, 0);
    assert.equal(a.w.document.activeElement, campo);
    gate.liberar(); a.nomeRemoto = 'Servidor após edição';
    a.formulario(false); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.chamadas.length, 10);
    assert.equal(a.w.obterAlunos()[0].nome, 'Servidor após edição');
    assert.equal(campo.value, 'Não perder');
});

testar('D2-06 — operação em voo suspende; finalizar operação confirmada retoma', async (t) => {
    const a = ambiente(t);
    const gate = a.segurarAlunos();
    a.b2.iniciar(); await eventos();
    const op = a.c.iniciarOperacao({ tipo: 'teste-d2' });
    assert.ok(op);
    a.w.atualizarAlunos([{ id: 'aluno-1', nome: 'Intenção local' }]);
    await eventos();
    assert.equal(a.estado().estado, 'pendente');
    assert.equal(a.w.obterAlunos()[0].nome, 'Intenção local');
    gate.liberar();
    await a.c.finalizarOperacao(op); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.chamadas.length, 10);
});

testar('D2-07 — pendência falha bloqueia até recuperação; adoção não conta como B2', async (t) => {
    const a = ambiente(t);
    const op = a.c.iniciarOperacao({ tipo: 'teste-d2' });
    a.c.marcarFalhaOperacao(op, new Error('Resposta perdida'));
    await a.c.finalizarOperacao(op);
    a.b2.iniciar(); await eventos();
    assert.equal(a.estado().motivo, 'pendencia-local');
    assert.equal(a.chamadas.length, 0);
    const leitura = await a.w.obterLeituraDados();
    assert.equal(a.w.aplicarLeituraDados(leitura, { tentativaId: op.id }).estado, 'aplicado');
    await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.chamadas.length, 10, 'adoção explícita não consome cota B2; nova leitura ordinária após ficar livre');
});

for (const falha of ['http', 'json', 'rede', '401']) {
    testar(`D2-08 — falha ${falha} preserva cache e aguarda evento; fechar form não tenta`, async (t) => {
        const a = ambiente(t);
        const disco = a.disco();
        a.responder = () => falha === 'rede' ? Promise.reject(new Error('Rede indisponível'))
            : falha === 'json' ? { ok: true, status: 200, json: async () => { throw new SyntaxError('JSON inválido'); } }
            : resposta({}, falha === '401' ? 401 : 500);
        a.b2.iniciar(); await eventos();
        assert.equal(a.estado().estado, 'pendente');
        assert.equal(a.estado().aguardandoEvento, true);
        assert.equal(a.rotulo(), true);
        assert.deepEqual(a.disco(), disco);
        assert.equal(a.avisos.length, 0, 'inclusive 401 silencioso');
        a.formulario(true); a.formulario(false); a.b2.iniciar();
        await eventos();
        assert.equal(a.chamadas.length, 5, 'sem loop de retry por interação');
        a.responder = (chamada) => resposta(chamada.rota === 'alunos' ? snapshot().alunos
            : chamada.rota === 'configuracao/grade_horarios' ? { horaInicio: '06:00', horaFim: '22:00' } : []);
        a.conexao(true); await eventos();
        assert.equal(a.estado().estado, 'aplicado');
        assert.equal(a.chamadas.length, 10);
    });
}

testar('D2-09 — sem sessão preserva disco oculto e retoma por login existente', async (t) => {
    const a = ambiente(t, { sessao: false });
    a.b2.iniciar(); await eventos();
    assert.equal(a.estado().motivo, 'sem-sessao');
    assert.equal(a.w.obterAlunos().length, 0);
    assert.equal(a.w.localStorage.getItem('personal_cache_dono'), CONTA_A);
    assert.equal(a.chamadas.length, 0);
    a.sessao(true); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    conferirBatch(a.chamadas);
});

testar('D2-10 — offline fica pendente; online dispara sem polling', async (t) => {
    const a = ambiente(t);
    a.conexao(false); a.b2.iniciar(); await eventos();
    assert.equal(a.estado().motivo, 'sem-conexao');
    assert.equal(a.chamadas.length, 0);
    a.conexao(true); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    conferirBatch(a.chamadas);
});

testar('D2-11 — A→B→A permite uma aplicação nova, sem callback do primeiro A', async (t) => {
    const a = ambiente(t);
    const gate = a.segurarAlunos();
    a.b2.iniciar(); await eventos();
    a.trocar(CONTA_B); gate.liberar(); await eventos();
    assert.equal(a.estado().contexto.ownerEmail, CONTA_B);
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.renders.length, 1, 'primeiro A descartado');
    const geracaoB = a.estado().contexto.geracao;
    a.trocar(CONTA_A); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.estado().contexto.ownerEmail, CONTA_A);
    assert.ok(a.estado().contexto.geracao > geracaoB);
    assert.equal(a.renders.length, 2);
    assert.equal(a.chamadas.length, 15);
});

testar('D2-12 — renovação da mesma conta não renova a cota aplicada', async (t) => {
    const a = ambiente(t);
    a.b2.iniciar(); await eventos();
    const geracao = a.estado().contexto.geracao;
    a.sessao(true); await eventos();
    assert.equal(a.estado().contexto.geracao, geracao);
    assert.equal(a.chamadas.length, 5);
});

testar('D2-13 — leitura inicial existente em voo atende cota sem duplicar nem rerender', async (t) => {
    const a = ambiente(t, { cache: 'ausente' });
    const gate = a.segurarAlunos();
    const inicial = a.w.carregarDados({ forcarRender: false });
    await eventos(); a.b2.iniciar();
    assert.equal(a.estado().motivo, 'leitura-em-andamento');
    assert.equal(a.chamadas.length, 5);
    gate.liberar(); assert.equal((await inicial).estado, 'aplicado'); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.estado().resultado.origem, 'leitura-compativel');
    assert.equal(a.chamadas.length, 5);
    assert.equal(a.renders.length, 0, 'consumidor inicial já possui render');
});

testar('D2-14 — recibo de leitura anterior à interação não atende cota nova', async (t) => {
    const a = ambiente(t);
    const leitura = await a.w.obterLeituraDados();
    assert.equal(a.w.aplicarLeituraDados(leitura).estado, 'aplicado');
    a.formulario(true); a.formulario(false); a.b2.iniciar(); await eventos();
    assert.equal(a.chamadas.length, 10);
    assert.equal(a.estado().estado, 'aplicado');
});

testar('D2-15 — aplicação conta mesmo com complemento falho, sem repetir batch', async (t) => {
    const a = ambiente(t);
    a.w.atualizarViewAtualAposSync = async () => { throw new Error('Complemento falhou'); };
    a.b2.iniciar(); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.estado().resultado.complementoPendente, true);
    a.conexao(true); a.b2.retomar(); await eventos();
    assert.equal(a.chamadas.length, 5);
});

testar('D2-16 — manual espera B2 e complementos, depois faz batch próprio novo', async (t) => {
    const a = ambiente(t);
    const gate = a.segurarAlunos();
    const render = adiada(); a.gates.push(render);
    a.w.atualizarViewAtualAposSync = () => render.promise;
    a.b2.iniciar(); await eventos();
    const manual = a.w.sincronizarBancoDados();
    assert.match(a.w.document.getElementById('btnSyncBancoText').textContent, /Aguardando/);
    assert.equal(a.chamadas.length, 5);
    gate.liberar(); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.estado().emVoo, true);
    assert.equal(a.chamadas.length, 5, 'manual espera toda reserva, não apenas headers do batch');
    a.nomeRemoto = 'Servidor para manual'; render.resolver(true);
    assert.equal((await manual).estado, 'aplicado');
    assert.equal(a.chamadas.length, 10);
    assert.equal(a.w.obterAlunos()[0].nome, 'Servidor para manual');
});

testar('D2-17 — manual existente tem prioridade; B2 aproveita recibo, não repete', async (t) => {
    const a = ambiente(t);
    const gate = a.segurarAlunos();
    const manual = a.w.sincronizarBancoDados();
    await eventos(); a.b2.iniciar();
    assert.equal(a.chamadas.length, 5);
    gate.liberar(); await manual; await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.estado().resultado.origem, 'leitura-compativel');
    assert.equal(a.chamadas.length, 5);
});

testar('D2-18 — finally antigo de B2 não apaga rótulo de leitura seguinte', async (t) => {
    const a = ambiente(t);
    const render = adiada(); a.gates.push(render);
    a.w.atualizarViewAtualAposSync = () => render.promise;
    a.b2.iniciar(); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.rotulo(), false);
    const gate = a.segurarAlunos();
    const outra = a.w.carregarDados({ forcarRemoto: true, forcarRender: false, silenciosoUI: true });
    await eventos(); render.resolver(true); await eventos();
    assert.equal(a.rotulo(), false, 'outro voo ainda tem seu rótulo');
    gate.liberar(); await outra;
    assert.equal(a.rotulo(), true);
});

testar('D2-19 — parar aborta, remove eventos e não aplica resposta antiga', async (t) => {
    const a = ambiente(t);
    const gate = a.segurarAlunos();
    a.b2.iniciar(); await eventos(); a.b2.parar();
    a.conexao(true); a.formulario(true); a.formulario(false);
    gate.liberar(); await eventos();
    assert.equal(a.estado().ativo, false);
    assert.equal(a.rotulo(), true);
    assert.equal(a.renders.length, 0);
    assert.equal(a.w.obterAlunos()[0].nome, 'Cache da Ana');
    assert.equal(a.chamadas.length, 5);
});

testar('D2-20 — rótulo também isola finally de carregarDados de outra conta', async (t) => {
    const a = ambiente(t);
    const gateA = a.segurarAlunos();
    const leituraA = a.w.carregarDados({ forcarRemoto: true, forcarRender: false });
    await eventos(); a.trocar(CONTA_B);
    gateA.liberar();
    a.c.salvarPrincipal(snapshot()); a.w.hidratarCacheDados();
    const gateB = a.segurarAlunos();
    const leituraB = a.w.carregarDados({ forcarRemoto: true, forcarRender: false });
    await eventos(); await leituraA;
    assert.equal(a.rotulo(), false, 'A não apaga aviso de B');
    gateB.liberar(); await leituraB;
    assert.equal(a.rotulo(), true);
});

for (const gatilho of ['online', 'sessao']) {
    testar(`D2-21 — retomada ${gatilho} durante falha pendente não é perdida`, async (t) => {
        const a = ambiente(t);
        const gate = adiada(); a.gates.push(gate);
        const responder = a.responder;
        a.responder = (chamada) => chamada.rota === 'alunos' ? resposta({}, 500)
            : chamada.rota === 'agendamentos' ? gate.promise : responder(chamada);
        a.b2.iniciar(); await eventos();
        assert.equal(a.estado().estado, 'em-voo', 'falha espera tarefa conhecida restante');
        if (gatilho === 'online') a.conexao(true);
        else a.sessao(true);
        a.responder = responder; gate.resolver(resposta([]));
        await eventos();
        assert.equal(a.estado().estado, 'aplicado', 'evento recebido em voo autoriza uma tentativa após término');
        assert.equal(a.estado().aguardandoEvento, false);
        assert.equal(a.chamadas.length, 10);
    });
}

testar('D2-22 — edição após aplicação registra complemento interrompido sem refazer principal', async (t) => {
    const a = ambiente(t);
    const gate = adiada(); a.gates.push(gate);
    a.w.atualizarViewAtualAposSync = () => gate.promise;
    a.b2.iniciar(); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    a.formulario(true); gate.resolver(false); await eventos();
    assert.equal(a.estado().resultado.complementoPendente, true);
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.rotulo(), true);
    a.formulario(false); a.b2.retomar(); await eventos();
    assert.equal(a.chamadas.length, 5);
});

testar('D2-23 — timeout do batch não inicia laço de retry nem aplica parcial', async (t) => {
    const a = ambiente(t);
    const obter = a.w.obterLeituraDados;
    // Prazo apenas da fronteira de rede nesta fixture; lógica de timeout real do storage.
    a.w.obterLeituraDados = (opcoes) => obter({ ...opcoes, timeoutMs: 25 });
    const inicio = adiada();
    a.responder = () => { inicio.resolver(); return new Promise(() => {}); };
    const final = adiada();
    const remover = a.w.leiturasDados.aoMudar(() => {
        if (!a.w.leiturasDados.emAndamento(a.c.capturar())) final.resolver();
    });
    a.b2.iniciar(); await inicio.promise; await final.promise; await eventos(); remover();
    assert.equal(a.estado().estado, 'pendente');
    assert.equal(a.estado().aguardandoEvento, true);
    assert.equal(a.w.obterAlunos()[0].nome, 'Cache da Ana');
    assert.equal(a.chamadas.length, 5);
    a.formulario(true); a.formulario(false); await eventos();
    assert.equal(a.chamadas.length, 5);
});

testar('D2-24 — encerramento manual sem recibo acorda B2 pendente, não perde evento', async (t) => {
    const a = ambiente(t);
    const gate = a.segurarAlunos();
    const responder = a.responder;
    a.responder = (chamada) => chamada.rota === 'reposicoes' ? resposta({}, 500) : responder(chamada);
    const manual = a.w.sincronizarBancoDados();
    await eventos(); a.b2.iniciar();
    assert.equal(a.estado().motivo, 'leitura-em-andamento');
    gate.liberar(); await manual; await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.chamadas.length, 10, 'pedido manual encerrado permite primeira tentativa própria do B2');
});