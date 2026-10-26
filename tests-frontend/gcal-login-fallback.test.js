const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

function criarAmbienteHome(isSignedIn = true, calendarConnected = false, welcomeDismissed = false) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <main id="tela-home">
            <div id="calendarioSemanalHomeGrid"></div>
            <div id="cardBoasVindasGcal" class="card-boas-vindas-gcal" hidden>
                <div class="card-boas-vindas-gcal-conteudo">
                    <div class="card-boas-vindas-gcal-texto">
                        <strong>Sincronizar com a Google Agenda?</strong>
                    </div>
                </div>
                <div class="card-boas-vindas-gcal-acoes">
                    <button type="button" class="btn-gcal-conectar-card" id="btnConectarGcalCard">Conectar</button>
                    <button type="button" class="btn-gcal-dispensar-card" id="btnDispensarGcalCard">Agora não</button>
                </div>
            </div>
        </main>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });

    const { window } = dom;
    require('./setup/contexto-dados')(dom);

    if (welcomeDismissed) {
        window.localStorage.setItem('gcal_welcome_dismissed', 'true');
    }

    let connectCalendarChamado = 0;
    const baseIdentity = window.googleIdentity || {};
    window.googleIdentity = {
        ...baseIdentity,
        isSignedIn: () => isSignedIn,
        getCachedCalendarConnectionStatus: () => ({ connected: calendarConnected }),
        connectCalendar: async () => {
            connectCalendarChamado++;
            return { connected: true };
        }
    };

    window.agendaConfig = { horaInicio: 7, horaFim: 21 };
    window.aulasParaRepor = [];
    window.aulas = [];
    window.atualizarDashboardStats = () => {};
    window.renderizarHomeSemana = () => {};
    window.inicializarMultiSelectPills = () => {};

    const caminhoViewHome = path.resolve(__dirname, '../assets/js/view-home.js');
    vm.runInContext(fs.readFileSync(caminhoViewHome, 'utf8'), dom.getInternalVMContext(), { filename: caminhoViewHome });

    return { dom, window, getConnectCalendarChamado: () => connectCalendarChamado };
}

test('card boas-vindas: aparece quando autenticado, sem calendário e não dispensado', (t) => {
    const { dom, window } = criarAmbienteHome(true, false, false);
    t.after(() => dom.window.close());

    window.atualizarVisibilidadeCardBoasVindasGcal();
    const card = window.document.getElementById('cardBoasVindasGcal');
    assert.equal(card.hidden, false, 'Card deve estar visível');
});

test('card boas-vindas: permanece oculto quando usuário não está autenticado', (t) => {
    const { dom, window } = criarAmbienteHome(false, false, false);
    t.after(() => dom.window.close());

    window.atualizarVisibilidadeCardBoasVindasGcal();
    const card = window.document.getElementById('cardBoasVindasGcal');
    assert.equal(card.hidden, true, 'Card deve estar oculto para anônimo');
});

test('card boas-vindas: permanece oculto quando calendário já está conectado', (t) => {
    const { dom, window } = criarAmbienteHome(true, true, false);
    t.after(() => dom.window.close());

    window.atualizarVisibilidadeCardBoasVindasGcal();
    const card = window.document.getElementById('cardBoasVindasGcal');
    assert.equal(card.hidden, true, 'Card deve estar oculto quando conectado');
});

test('card boas-vindas: botão Dispensar oculta card e grava preferência no localStorage', (t) => {
    const { dom, window } = criarAmbienteHome(true, false, false);
    t.after(() => dom.window.close());

    window.atualizarVisibilidadeCardBoasVindasGcal();
    const card = window.document.getElementById('cardBoasVindasGcal');
    assert.equal(card.hidden, false);

    const btnDispensar = window.document.getElementById('btnDispensarGcalCard');
    btnDispensar.click();

    assert.equal(card.hidden, true, 'Card deve ocultar ao dispensar');
    assert.equal(window.localStorage.getItem('gcal_welcome_dismissed'), 'true', 'Deve persistir dispensa');

    // Nova renderização deve manter oculto
    window.atualizarVisibilidadeCardBoasVindasGcal();
    assert.equal(card.hidden, true, 'Card deve permanecer oculto em renderizações posteriores');
});

test('card boas-vindas: botão Conectar aciona connectCalendar do googleIdentity', async (t) => {
    const { dom, window, getConnectCalendarChamado } = criarAmbienteHome(true, false, false);
    t.after(() => dom.window.close());

    window.atualizarVisibilidadeCardBoasVindasGcal();
    const btnConectar = window.document.getElementById('btnConectarGcalCard');
    btnConectar.click();

    await new Promise((r) => setImmediate(r));

    assert.equal(getConnectCalendarChamado(), 1, 'connectCalendar deve ter sido chamado');
    const card = window.document.getElementById('cardBoasVindasGcal');
    assert.equal(card.hidden, true, 'Card deve ocultar após acionar conexão');
});

test('salvarEventoComGCal: salva autonomamente sem disparar popup interativo quando desconectado', async (t) => {
    const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    require('./setup/contexto-dados')(dom);

    let ensureOpts = null;
    const baseIdentity = window.googleIdentity || {};
    window.googleIdentity = {
        ...baseIdentity,
        isSignedIn: () => true,
        ensureCalendarConnection: async (opts) => {
            ensureOpts = opts;
            return { connected: false };
        }
    };

    const avisos = [];
    window.mostrarToast = (texto, tipo) => avisos.push({ texto, tipo });

    let gravou = false;
    window.salvarDados = async (_silencioso, opcoes) => {
        gravou = true;
        window.contextoDados.registrarEtapa(opcoes.operacao, { method: 'POST', confirmada: true });
        return { ok: true, motivo: 'sucesso' };
    };
    window.inicializarHome = async () => true;

    const caminhoGcal = path.resolve(__dirname, '../assets/js/google-calendar.js');
    vm.runInContext(fs.readFileSync(caminhoGcal, 'utf8'), dom.getInternalVMContext(), { filename: caminhoGcal });

    const resultado = await window.salvarEventoComGCal({ id: 'aula-1' });

    assert.equal(resultado.ok, true, 'Salva com sucesso');
    assert.equal(gravou, true, 'Gravou dados via salvarDados');
    assert.ok(ensureOpts, 'ensureCalendarConnection foi chamado');
    assert.equal(ensureOpts.interactive, false, 'Deve ter usado interactive: false');
    assert.equal(avisos.length, 0, 'Nenhum toast intrusivo deve ser exibido');
});

test('google-identity: updateGoogleCalendarStatusUI oculta card de boas-vindas ao conectar', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="btnConnectGoogleCalendar"></button>
        <div id="gcalConnectedState" hidden></div>
        <div id="cardBoasVindasGcal"></div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    require('./setup/contexto-dados')(dom);

    const caminhoApiConfig = path.resolve(__dirname, '../assets/js/config/api-config.js');
    vm.runInContext(fs.readFileSync(caminhoApiConfig, 'utf8'), dom.getInternalVMContext(), { filename: caminhoApiConfig });

    const caminhoAuth = path.resolve(__dirname, '../assets/js/auth/google-identity.js');
    vm.runInContext(fs.readFileSync(caminhoAuth, 'utf8'), dom.getInternalVMContext(), { filename: caminhoAuth });

    const card = window.document.getElementById('cardBoasVindasGcal');
    assert.equal(card.hidden, false);

    window.googleIdentity.updateGoogleCalendarStatusUI({ connected: true });
    assert.equal(card.hidden, true, 'Card deve ser ocultado quando conectado');
});
