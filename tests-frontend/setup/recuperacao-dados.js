const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '../..');
const EMAIL = 'ana@example.com';
const ALVOS = {
    alunoIds: ['aluno-ana'], agendamentoIds: ['aula-ana'],
    reposicaoIds: ['repo/ana?1'], cicloIds: ['ciclo-ana']
};
const ROTA_REPOSICAO = 'reposicoes/repo%2Fana%3F1';
const ROTA_HISTORICO = 'financas/aluno-ana/historico';
const BATCH = ['alunos', 'agendamentos', 'configuracao/grade_horarios', 'bloqueios-externos', 'reposicoes'];
const copiar = (dados) => JSON.parse(JSON.stringify(dados));

function snapshot(nome = 'Ana — intenção local') {
    return {
        alunos: [{ id: 'aluno-ana', nome, status: 'ativo', objetivo: 'Personal Trainer', local: 'Academia', preco: 80, frequenciaSemanal: 2 }],
        aulas: [{ id: 'aula-ana', alunoId: 'aluno-ana', tipo: 'aula', data: '2026-10-06', horarioInicio: '08:00', horarioFim: '09:00', googleCalendarEventId: 'evento-local' }],
        reposicoes: [{ id: ALVOS.reposicaoIds[0], alunoId: 'aluno-ana', dataOriginal: '2026-10-01', dataCancelamento: '01/10/2026', status: 'pendente', cobravel: true }],
        grade: { inicio: '07:00', fim: '20:00' }, meta: 640
    };
}

function remoto(nome = 'Ana — servidor v1') {
    const aluno = snapshot(nome).alunos[0];
    const reposicao = { id: ALVOS.reposicaoIds[0], alunoId: aluno.id, alunoNome: nome, status: 'pendente', dataOriginal: '2026-10-01', horarioOriginal: '08:00', cobravel: false, validoAte: '2026-11-01' };
    const ciclo = { _id: 'ciclo-ana', alunoId: aluno.id, cicloInicio: '2026-10-01', cicloFim: '2026-10-31', dataVencimento: '2026-10-10', metodoCobranca: 'por-aula', precoAulaSnapshot: 80, aulasContadas: 8, aulasManuaisExtras: 0, valorTotalCiclo: 640, dataPagamento: null };
    return {
        alunos: [aluno],
        agendamentos: [{ ...snapshot().aulas[0], horarioInicio: '10:00', horarioFim: '11:00', googleCalendarEventId: 'evento-remoto', gcalSyncPendingAt: '2026-10-05T10:00:00Z', gcalSyncPendingTentativas: 2 }],
        'configuracao/grade_horarios': { chave: 'grade_horarios', horaInicio: '06:00', horaFim: '21:00' },
        'bloqueios-externos': [{ googleCalendarEventId: 'externo-remoto', titulo: 'Consulta', data: '2026-10-07', horarioInicio: '12:00', horarioFim: '13:00' }],
        reposicoes: [reposicao],
        [ROTA_REPOSICAO]: reposicao,
        [ROTA_HISTORICO]: [ciclo],
        financas: [{ alunoId: aluno.id, aluno, configuracaoPendente: false, status: 'em_aberto', historicoDisponivel: true, cicloAtual: ciclo }],
        'alunos/consistencia-agenda': [{ alunoId: aluno.id, consistente: true }]
    };
}

function resposta(dados, status = 200) {
    return new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } });
}

function adiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}

function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

async function criarAmbiente(t, { discoInicial, criarPendencia = true } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body><div class="container">
        <section id="recuperacaoDados" hidden tabindex="-1" role="status">
            <p id="recuperacaoDadosMensagem"></p>
            <button id="btnVerificarDadosServidor">Verificar no servidor</button>
            <button id="btnUsarDadosServidor">Usar dados do servidor</button>
        </section>
        <button id="btnSyncBanco"><span id="btnSyncBancoText">Sincronizar Dados</span></button>
        <span id="headerCacheState" hidden></span>
        <main id="tela-alunos"><form id="formNovoAluno"><input id="nomeAluno" value=""></form></main>
        <main id="tela-financas"></main>
        <div id="modalRascunho" class="modal-overlay" style="display:none"><form><input id="rascunho" value=""></form></div>
    </div></body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    let email = EMAIL;
    const listeners = new Set();
    window.googleIdentity = {
        getOwnerEmail: () => email,
        getIdToken: () => email ? `token-${email}` : null,
        addAuthChangeListener: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
    window.Headers = Headers;
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.log = new Proxy({}, { get: () => () => {} });
    window.mostrarToast = () => {};
    const confirmacoes = [];
    const chamadas = [];
    const substitutos = {};
    const servidor = remoto();
    const a = { dom, window, chamadas, confirmacoes, substitutos, servidor, aceitar: true };
    window.confirm = (texto) => { confirmacoes.push(texto); return a.aceitar; };
    // Nenhum fetch nativo é delegado: inclusive o ping do storage fica no fake.
    window.fetch = async (url, opcoes = {}) => {
        const endereco = new URL(String(url));
        assert.equal(endereco.origin, 'http://api.test');
        const rota = endereco.pathname === '/' ? 'ping' : endereco.pathname.slice('/api/'.length);
        const chamada = { rota, method: opcoes.method || 'GET', headers: opcoes.headers, signal: opcoes.signal };
        chamadas.push(chamada);
        assert.equal(chamada.method, 'GET', `Escrita inesperada: ${rota}`);
        if (rota === 'ping') return resposta({ ok: true });
        assert.equal(opcoes.headers.get('Authorization'), `Bearer token-${email}`);
        assert.ok(Object.hasOwn(servidor, rota) || Object.hasOwn(substitutos, rota), `Rota sem fixture: ${rota}`);
        return substitutos[rota] ? substitutos[rota](opcoes, chamada) : resposta(servidor[rota]);
    };
    t.after(() => assert.ok(chamadas.every((c) => c.method === 'GET'), 'Todos os caminhos devem ser somente leitura'));
    if (discoInicial) Object.entries(discoInicial).forEach(([chave, valor]) => window.localStorage.setItem(chave, valor));
    carregar(dom, 'assets/js/state.js');
    carregar(dom, 'assets/js/app/contexto-dados.js');
    carregar(dom, 'assets/js/storage.js');
    const contexto = window.contextoDados;
    contexto.iniciar();
    a.contexto = contexto;
    if (!discoInicial) {
        assert.equal(contexto.salvarPrincipal(snapshot('Ana — cache confirmado')), true);
        await window.carregarDados({ forcarRender: false });
        if (criarPendencia) {
            const local = snapshot();
            window.atualizarAlunos(local.alunos);
            window.atualizarAulas(local.aulas);
            window.atualizarReposicoes(local.reposicoes);
            const op = contexto.iniciarOperacao({ tipo: 'reposicao-composta', alvos: ALVOS, intencao: { reposicaoId: ALVOS.reposicaoIds[0], cobravel: true } });
            assert.ok(op);
            contexto.registrarEtapa(op, { method: 'PATCH', url: '/reposicoes/cobranca', confirmada: true, status: 200 });
            contexto.registrarEtapa(op, { method: 'POST', url: '/agendamentos', confirmada: false });
            contexto.marcarFalhaOperacao(op, new Error('Resposta de gravação perdida'));
            await contexto.finalizarOperacao(op);
            a.operacaoAntiga = op;
        }
    } else await window.carregarDados({ forcarRender: false });
    [
        'assets/js/features/modals/dialog-controller.js',
        'assets/js/view-financas.js', 'assets/js/view-alunos.js',
        'assets/js/app/recuperacao-dados.js'
    ].forEach((arquivo) => carregar(dom, arquivo));
    // Cabeçalho e handlers reais; não inicia leitura complementar implicitamente.
    window.renderizarFinancas();
    Object.assign(a, {
        painel: window.document.getElementById('recuperacaoDados'),
        verificar: window.document.getElementById('btnVerificarDadosServidor'),
        usar: window.document.getElementById('btnUsarDadosServidor'),
        mensagem: () => window.document.getElementById('recuperacaoDadosMensagem').textContent,
        requisicoes: () => chamadas.filter((c) => c.rota !== 'ping'),
        disco: () => Object.fromEntries(Object.keys(window.localStorage).sort().map((chave) => [chave, window.localStorage.getItem(chave)])),
        memoria: () => copiar({ alunos: window.obterAlunos(), aulas: window.obterAulas(), reposicoes: window.obterReposicoes(), grade: window.obterLimitesGrade(), meta: window.faturamentoMeta }),
        trocar: (novo) => { email = novo; listeners.forEach((fn) => fn()); },
        abrirFormularios: () => {
            const modal = window.document.getElementById('modalRascunho');
            window.togglePainelCadastro(true);
            window.DialogController.open(modal, { onRequestClose: () => { a.fechamentosSolicitados++; } });
            window.document.getElementById('nomeAluno').value = 'Rascunho do aluno';
            window.document.getElementById('rascunho').value = 'Rascunho da agenda';
            window._retornoHistoricoReposicoes = { alunoId: 'aluno-ana' };
            window.reposicaoIdEmReagendamento = ALVOS.reposicaoIds[0];
            window.reagendamentoDirectCardId = 'aula-ana';
        },
        fechamentosSolicitados: 0
    });
    return a;
}

module.exports = { criarAmbiente, snapshot, remoto, resposta, adiada, copiar, EMAIL, ALVOS, BATCH, ROTA_REPOSICAO, ROTA_HISTORICO };