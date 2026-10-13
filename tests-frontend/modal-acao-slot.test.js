// [TAG-TESTS-MODAL-ACAO-SLOT] modal-acao-slot.test.js
// T07 (plano 2026-10-12): edição de aula avulsa com DOM real (jsdom) — abrir,
// editar horário, salvar com operação real do contextoDados e salvarDados
// stubado; aviso de conflito na edição (decisão 1 = B) sem gravação; e fechar
// pelo botão Voltar sem escrita. Split de série e reposição ficam FORA
// (já cobertos pela suíte de backend — decisão do T01).

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA = 't07@example.com';

// Prefixo da ordem do index.html necessário para modal-acao-slot.js.
const SCRIPTS = [
    'assets/js/state.js',
    'assets/js/app-shell/contexto-dados.js',
    'assets/js/storage.js',
    'assets/js/utils-ui.js',
    'assets/js/utils-datetime.js',
    'assets/js/utils-formatters.js',
    'backend/shared/recurrence-helpers.js',
    'backend/shared/calculo-ciclo.js',
    'backend/shared/reposicao-flow-helpers.js',
    'assets/js/alunos-helpers.js',
    'assets/js/calendario-engine.js',
    'assets/js/agenda-conflitos.js',
    'assets/js/widget-stepper-duracao.js',
    'assets/js/widget-bloqueio.js',
    'assets/js/features/modals/scheduling-flow-state.js',
    'assets/js/features/modals/scheduling-serializer.js',
    'assets/js/features/modals/dialog-controller.js',
    'assets/js/modal-agendamento.js',
    'assets/js/modal-acao-slot.js',
];

// Markup real dos modais, extraído do index.html uma única vez.
const HTML_MODAIS = (() => {
    const fonte = new JSDOM(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'));
    const html = ['modalAgendamento', 'modalAcaoSlot', 'modalEscolhaCobrancaReposicao', 'modalEscolhaExclusao']
        .map((id) => {
            const elemento = fonte.window.document.getElementById(id);
            return elemento ? elemento.outerHTML : '';
        })
        .join('');
    fonte.window.close();
    return html;
})();

const ALUNO_ANA = { id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer', status: 'ativo' };
const ALUNO_MARIA = { id: 'aluno-maria', nome: 'Maria Silva', objetivo: 'Personal Trainer', status: 'ativo' };
const ALUNO_PRAZO = { id: 'aluno-prazo', nome: 'Paula', objetivo: 'Personal Trainer', status: 'ativo', diaVencimento: 10, fechamentoMesCheio: false };

function aulaAvulsa(overrides = {}) {
    return {
        id: 'aula-1',
        tipo: 'aula',
        alunoId: 'aluno-1',
        frequencia: 'uma_vez',
        data: '31/08/2026',
        excecoes: [],
        horarioInicio: '09:00',
        horarioFim: '10:00',
        ...overrides,
    };
}

function serieSabado(overrides = {}) {
    return {
        id: 'serie-1',
        tipo: 'aula',
        alunoId: 'aluno-maria',
        frequencia: 'semanal',
        tipoRecorrencia: 'semanal',
        recorrenciaDataInicio: '2026-09-26',
        diasSemana: ['Sábado'],
        data: '2026-09-26',
        excecoes: [],
        horarioInicio: '18:00',
        horarioFim: '19:00',
        ...overrides,
    };
}

function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

function barreira() {
    return new Promise((resolver) => setImmediate(resolver));
}

// O jsdom dispara DOMContentLoaded nativo de forma assíncrona; esperar por ele
// (em vez de disparar um evento manual) garante que cada listener real seja
// anexado exatamente uma vez — um dispatch manual somado ao evento nativo
// duplicaria o submit e a escrita.
function aguardarDOMContentLoaded(window) {
    return new Promise((resolver) => {
        if (window.document.readyState !== 'loading') {
            resolver();
            return;
        }
        window.document.addEventListener('DOMContentLoaded', () => resolver(), { once: true });
    });
}

async function criarAmbiente(t, { alunos = [], aulas = [] } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>${HTML_MODAIS}</body></html>`, {
        url: 'http://localhost/index.html',
        runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    const { window } = dom;

    window.googleIdentity = {
        isSignedIn: () => true,
        getIdToken: () => 'token-t07',
        getOwnerEmail: () => CONTA,
        addAuthChangeListener: () => {},
    };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.fetch = async () => { throw new Error('T07 não permite rede real'); };

    for (const arquivo of SCRIPTS) carregar(dom, arquivo);

    window.dataSelecionada = new window.Date(2026, 7, 31, 12, 0, 0); // 31/08/2026, segunda-feira

    const capturado = { toasts: [], alerts: [], confirmacoes: [], gravacoes: [] };

    window.log = { info() {}, debug() {}, warn() {}, error() {} };
    window.mostrarToast = (...args) => capturado.toasts.push(args);
    window.alert = (mensagem) => capturado.alerts.push(mensagem);
    window.confirm = (mensagem) => { capturado.confirmacoes.push(mensagem); return true; };
    window.gcal = { isSignedIn: () => false };
    window.inicializarHome = async () => ({ ok: true, estado: 'aplicado' });
    window.salvarDados = async (_silencioso, opcoes) => {
        const op = opcoes && opcoes.operacao;
        capturado.gravacoes.push({
            payload: op && op.intencao ? op.intencao.agendamento : null,
            tipoOperacao: op ? op.tipo : null,
            acaoIntencao: op && op.intencao ? op.intencao.acao : null,
            mesmoContexto: Boolean(op && opcoes.contextoDados === op.contexto),
        });
        window.contextoDados.registrarEtapa(op, { url: 'http://api.test/api/agendamentos', method: 'PUT', confirmada: true });
        return { ok: true, motivo: 'sucesso' };
    };

    window.contextoDados.iniciar();
    await aguardarDOMContentLoaded(window);

    // O estado entra por último e mutando os arrays em vigor: o handler de
    // invalidação do storage.js (disparado dentro de iniciar()) esvazia os
    // lexicais e os expõe como window.alunos/window.aulas — atualizarAlunos/
    // atualizarAulas mantêm uma única referência viva, e os helpers leem
    // window.alunos primeiro. Trocar o lexical por um array novo deixaria o
    // window apontando para o array vazio antigo.
    vm.runInContext(`
        const _alunosInjetados = ${JSON.stringify(alunos)};
        const _aulasInjetadas = ${JSON.stringify(aulas)};
        window.alunos.length = 0;
        window.alunos.push(..._alunosInjetados);
        window.aulas.length = 0;
        window.aulas.push(..._aulasInjetadas);
    `, dom.getInternalVMContext());

    return { dom, window, capturado };
}

test('T07 — edição de aula avulsa: novo horário é gravado e o modal fecha', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA], aulas: [aulaAvulsa()] });

    window.abrirModalAcaoSlot('aula-1');
    const modal = window.document.getElementById('modalAcaoSlot');
    assert.equal(modal.style.display, 'flex', 'DialogController real abre o modal');
    assert.equal(window.document.getElementById('editHoraInicio').value, '09:00', 'formulário pré-preenchido');
    assert.equal(window.document.getElementById('editDuracao').value, '60');
    assert.equal(window.document.getElementById('editAluno').value, 'aluno-1');

    window.document.getElementById('editHoraInicio').value = '11:00';

    window.document.getElementById('formEditarCompromisso').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    await barreira();

    assert.equal(capturado.gravacoes.length, 1, 'exatamente uma gravação');
    const gravacao = capturado.gravacoes[0];
    assert.equal(gravacao.tipoOperacao, 'editar-agendamento');
    assert.equal(gravacao.acaoIntencao, 'editar');
    assert.equal(gravacao.mesmoContexto, true, 'a operação recebe o próprio contexto');
    assert.equal(gravacao.payload.horarioInicio, '11:00', 'intenção carrega o novo horário');

    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas.length, 1);
    assert.equal(aulasGravadas[0].id, 'aula-1');
    assert.equal(aulasGravadas[0].alunoId, 'aluno-1', 'campos não editados são preservados');
    assert.equal(aulasGravadas[0].data, '31/08/2026');
    assert.equal(aulasGravadas[0].horarioInicio, '11:00', 'novo horário aplicado no estado');
    assert.equal(aulasGravadas[0].horarioFim, '12:00');

    assert.equal(modal.style.display, 'none', 'modal fecha após gravar');
    assert.deepEqual(capturado.toasts.map(([mensagem]) => mensagem), ['Alterações salvas com sucesso!']);
    assert.equal(capturado.alerts.length, 0);
    assert.equal(window.contextoDados.obterPendencia(), null, 'operação finalizada sem pendência');
});

test('T07 — conflito na edição avulsa: alerta e nenhuma gravação', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, {
        alunos: [ALUNO_ANA],
        aulas: [
            aulaAvulsa(),
            aulaAvulsa({ id: 'outra-1', horarioInicio: '11:00', horarioFim: '12:00' }),
        ],
    });

    window.abrirModalAcaoSlot('aula-1');
    const modal = window.document.getElementById('modalAcaoSlot');
    window.document.getElementById('editHoraInicio').value = '11:00';

    window.document.getElementById('formEditarCompromisso').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    await barreira();

    assert.deepEqual(capturado.alerts, ['Conflito detectado com Ana (11:00 - 12:00).']);
    assert.equal(capturado.gravacoes.length, 0, 'conflito impede a gravação');
    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas[0].horarioInicio, '09:00', 'estado intacto até a resolução do conflito');
    assert.equal(modal.style.display, 'flex', 'modal continua aberto para correção');
});

test('T07 — fechar pelo botão Voltar não grava nada', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA], aulas: [aulaAvulsa()] });

    window.abrirModalAcaoSlot('aula-1');
    const modal = window.document.getElementById('modalAcaoSlot');
    assert.equal(modal.style.display, 'flex');

    window.document.getElementById('editHoraInicio').value = '11:00';

    const botaoVoltar = Array.from(modal.querySelectorAll('button')).find(
        (botao) => botao.getAttribute('onclick') === 'fecharModalAcaoSlot()',
    );
    assert.ok(botaoVoltar, 'botão Voltar precisa existir no markup real');
    // jsdom com runScripts: 'outside-only' não compila atributos onclick (só com
    // 'dangerously'); chamar a mesma função do atributo é o clique determinístico.
    window.fecharModalAcaoSlot();

    assert.equal(modal.style.display, 'none', 'Voltar fecha o modal');
    assert.equal(capturado.gravacoes.length, 0, 'fechar não grava');
    assert.equal(capturado.alerts.length, 0);
    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas[0].horarioInicio, '09:00', 'estado intacto');
    assert.equal(aulasGravadas[0].horarioFim, '10:00');
    assert.equal(window.contextoDados.obterPendencia(), null);
});

// ── T01 (plano 2026-10-13): cabeçalho dos modais de escolha ──────────────────

test('T01 — contexto de exibição usa a ocorrência clicada, não a raiz da série', async (t) => {
    const { window } = await criarAmbiente(t, { alunos: [ALUNO_MARIA], aulas: [serieSabado()] });
    window.dataAlvoAcaoStr = '17/10/2026';

    const exibicao = window.montarContextoExibicaoOcorrencia(window.aulas[0]);

    assert.equal(exibicao.nomeAluno, 'Maria Silva');
    assert.equal(exibicao.dataHora, 'Sáb., 17/10 · 18:00');
});

test('T01 — sem clique na Semana, contexto usa o dia selecionado (modo Dia)', async (t) => {
    const { window } = await criarAmbiente(t, { alunos: [ALUNO_MARIA], aulas: [serieSabado()] });
    window.dataAlvoAcaoStr = null;
    window.dataSelecionada = new window.Date(2026, 9, 17, 12, 0, 0); // 17/10/2026, sábado

    const exibicao = window.montarContextoExibicaoOcorrencia(window.aulas[0]);

    assert.equal(exibicao.nomeAluno, 'Maria Silva');
    assert.equal(exibicao.dataHora, 'Sáb., 17/10 · 18:00');
});

test('T01 — modal de cobrança exibe nome e data da ocorrência passados pelo chamador', async (t) => {
    const { window } = await criarAmbiente(t, { alunos: [ALUNO_MARIA], aulas: [serieSabado()] });
    window.dataAlvoAcaoStr = '17/10/2026';
    const aula = window.aulas[0];

    const promessa = window.abrirModalEscolhaCobrancaReposicao(aula, () => {}, {
        contextoExibicao: window.montarContextoExibicaoOcorrencia(aula),
    });

    assert.equal(window.document.getElementById('reposicaoEscolhaAluno').textContent, 'Maria Silva');
    assert.equal(window.document.getElementById('reposicaoEscolhaDataHorario').textContent, 'Sáb., 17/10 · 18:00');

    window.fecharModalEscolhaCobrancaReposicao();
    await promessa;
});

test('T01 — modal de exclusão exibe nome do aluno e data da ocorrência', async (t) => {
    const { window } = await criarAmbiente(t, { alunos: [ALUNO_MARIA], aulas: [serieSabado()] });
    window.dataAlvoAcaoStr = '17/10/2026';
    window.idCompromissoSelecionado = 'serie-1';
    const opcoes = [
        { acao: 'instancia', titulo: 'Excluir esta aula', detalhe: 'Só 17/10/2026 sai. A série continua.' },
        { acao: 'daqui', titulo: 'Excluir daqui para frente', detalhe: '17/10/2026 em diante.' },
    ];

    // Produção: o chamador passa o contexto de exibição.
    window.abrirModalEscolhaExclusao(opcoes, {
        compromisso: window.aulas[0],
        exibicao: window.montarContextoExibicaoOcorrencia(window.aulas[0]),
    });
    assert.equal(
        window.document.getElementById('infoEscolhaExclusao').textContent,
        'Maria Silva · Sáb., 17/10 · 18:00',
    );
    window.fecharModalEscolhaExclusao();

    // Fallback do modal (chamador sem contexto) — mesmo resultado, sem "Aluno".
    window.abrirModalEscolhaExclusao(opcoes);
    assert.equal(
        window.document.getElementById('infoEscolhaExclusao').textContent,
        'Maria Silva · Sáb., 17/10 · 18:00',
    );
    window.fecharModalEscolhaExclusao();
});

// ── T05 (plano 2026-10-13): textos e achados do T01 (D11=A, F5c) ─────────────

test('T05 — rótulos da exclusão exibem a data em formato legível (D11)', async (t) => {
    const { window } = await criarAmbiente(t, { alunos: [ALUNO_MARIA], aulas: [serieSabado()] });

    // Como em produção: o handler resolve o dia em gerenciamento e passa adiante.
    const opcoes = window.montarOpcoesExclusaoSlot(window.aulas[0], '17/10/2026');
    const instancia = opcoes.find((opcao) => opcao.acao === 'instancia');
    const daqui = opcoes.find((opcao) => opcao.acao === 'daqui');

    assert.equal(instancia.detalhe, 'Só Sáb., 17/10 sai. A série continua.');
    assert.equal(daqui.detalhe, 'Sáb., 17/10 em diante. O histórico anterior fica.');

    // A raiz da série no texto da "série toda" também sai legível (sem ano).
    assert.match(
        opcoes.find((opcao) => opcao.acao === 'serie').detalhe,
        /Desde Sáb\., 26\/09\.$/,
    );

    // Sem data resolvida pelo chamador, o fallback interno usa a raiz da série.
    const semData = window.montarOpcoesExclusaoSlot(window.aulas[0]);
    assert.equal(semData.find((opcao) => opcao.acao === 'daqui').detalhe, 'Sáb., 26/09 em diante. O histórico anterior fica.');
});

test('T05 — daqui pra frente ancora no dia selecionado no modo Dia (D11)', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_MARIA], aulas: [serieSabado()] });
    window.dataAlvoAcaoStr = null;
    window.idCompromissoSelecionado = 'serie-1';
    window.dataSelecionada = new window.Date(2026, 9, 17, 12, 0, 0); // 17/10/2026, sábado

    await window.executarExclusaoSerieAPartirDe();
    await barreira();

    assert.equal(capturado.confirmacoes.length, 1, 'a previsão pede confirmação uma única vez');
    const aulasDepois = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasDepois.length, 1, 'a série continua (aparada no dia selecionado, não removida pela raiz)');
    assert.equal(aulasDepois[0].recorrenciaFimCondicao, 'untilDate');
    assert.equal(aulasDepois[0].recorrenciaDataFim, '16/10/2026', 'véspera do dia selecionado — a raiz (26/09) não é a âncora');
    assert.equal(capturado.toasts.at(-1)[0], 'Exclusão aplicada a partir de 17/10/2026.');
    assert.equal(window.contextoDados.obterPendencia(), null);
});

test('T05 — avulsa exibe "Agendado para" em formato legível (D11)', async (t) => {
    const { window } = await criarAmbiente(t, { alunos: [ALUNO_ANA], aulas: [aulaAvulsa()] });

    window.abrirModalAcaoSlot('aula-1');

    assert.equal(
        window.document.getElementById('editInfoDia').textContent,
        'Agendado para: Seg., 31/08',
        'sem ISO cru nem pt-BR com ano',
    );
    window.fecharModalAcaoSlot();
});

test('T05 — modal de escolha mostra o prazo calculado pelo módulo compartilhado (F5c)', async (t) => {
    const { window } = await criarAmbiente(t, { alunos: [ALUNO_PRAZO], aulas: [serieSabado({ alunoId: 'aluno-prazo' })] });
    window.dataAlvoAcaoStr = '17/10/2026';

    const promessa = window.abrirModalEscolhaCobrancaReposicao(window.aulas[0], () => {});
    const linha = window.document.getElementById('reposicaoEscolhaPrazo');

    assert.equal(linha.textContent, 'Prazo para reposição: até 10/11.');
    assert.notEqual(linha.style.display, 'none', 'com prazo, a linha aparece no rodapé');

    window.fecharModalEscolhaCobrancaReposicao();
    await promessa;
});

test('T05 — a linha de prazo é limpa entre aberturas sem prazo (F5c)', async (t) => {
    const { window } = await criarAmbiente(t, {
        alunos: [ALUNO_PRAZO, ALUNO_MARIA],
        aulas: [serieSabado({ alunoId: 'aluno-prazo' }), serieSabado({ id: 'serie-2', alunoId: 'aluno-maria' })],
    });
    window.dataAlvoAcaoStr = '17/10/2026';
    const linha = window.document.getElementById('reposicaoEscolhaPrazo');

    const comPrazo = window.abrirModalEscolhaCobrancaReposicao(window.aulas[0], () => {});
    assert.equal(linha.textContent, 'Prazo para reposição: até 10/11.');
    window.fecharModalEscolhaCobrancaReposicao();
    await comPrazo;
    await barreira();

    // Aluno sem configuração de vencimento: prazo não calculável → linha escondida.
    const semPrazo = window.abrirModalEscolhaCobrancaReposicao(window.aulas[1], () => {});
    assert.equal(linha.textContent, '');
    assert.equal(linha.style.display, 'none');
    window.fecharModalEscolhaCobrancaReposicao();
    await semPrazo;
});

test('T05 — confirmação da execução da série toda usa a data legível (D11)', async (t) => {
    const { window, capturado } = await criarAmbiente(t, { alunos: [ALUNO_MARIA], aulas: [serieSabado()] });
    window.idCompromissoSelecionado = 'serie-1';

    await window.executarExclusaoSerie();
    await barreira();

    assert.equal(capturado.confirmacoes.length, 1, 'uma única confirmação para a série inteira');
    assert.match(capturado.confirmacoes[0], /Desde Sáb\., 26\/09\./, 'raiz da série legível, sem ano');
    assert.match(
        capturado.confirmacoes[0],
        /Período: desde sáb\., 26\/09 até sem data de término\./,
        'linha "Período" no formato legível, sem ano',
    );
    assert.equal(
        capturado.toasts.at(-1)[0],
        'Série excluída — todas as ocorrências.',
        'fluxo concluiu após a confirmação',
    );
});

test('T05 — período da série com data final também sai no formato legível', async (t) => {
    const { window, capturado } = await criarAmbiente(t, {
        alunos: [ALUNO_MARIA],
        aulas: [serieSabado({ recorrenciaDataFim: '2026-12-19' })],
    });
    window.idCompromissoSelecionado = 'serie-1';

    await window.executarExclusaoSerie();
    await barreira();

    assert.match(
        capturado.confirmacoes[0],
        /Período: desde sáb\., 26\/09 até sáb\., 19\/12\./,
        'as duas pontas do período em formato legível',
    );
});
