const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const CAMINHO_DIALOG_CONTROLLER = path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js');

function criarAmbiente() {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="dialog" style="display:none" aria-labelledby="titulo">
            <h3 id="titulo">Titulo</h3>
            <button id="close">Fechar</button>
            <input id="campo1" value="a" />
            <button id="action">Salvar</button>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    const { window } = dom;
    vm.runInContext(fs.readFileSync(CAMINHO_DIALOG_CONTROLLER, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_DIALOG_CONTROLLER });
    return { dom, window };
}

test('dialog-controller abre modal com foco inicial e usa stack do topo', (t) => {
    const { dom, window } = criarAmbiente();
    t.after(() => dom.window.close());

    const dialog = window.document.getElementById('dialog');
    const trigger = window.document.getElementById('trigger');
    const input = window.document.getElementById('campo1');

    const controller = window.DialogController;
    assert.ok(controller && typeof controller.open === 'function');

    trigger.focus();
    controller.open(dialog, { trigger });

    assert.equal(dialog.style.display, 'flex');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, input);

    const event = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    assert.doesNotThrow(() => window.document.dispatchEvent(event));

    const eventEscape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    assert.doesNotThrow(() => window.document.dispatchEvent(eventEscape));
});

test('modal de configuracao da agenda abre com dialog controller e foco inicial', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="btnAgenda">Abrir</button>
        <div id="modalConfigAgenda" style="display:none">
            <h3 id="tituloModalConfigAgenda">Configurar Grade Horária</h3>
            <form id="formConfigAgenda">
                <input id="configHoraInicio" value="8" data-dialog-focus="true" />
                <input id="configHoraFim" value="18" />
                <button id="btnFecharConfig" type="button">Cancelar</button>
            </form>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalConfigAgenda');
    const trigger = window.document.getElementById('btnAgenda');
    const input = window.document.getElementById('configHoraInicio');

    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, input);
    assert.equal(modal.getAttribute('role'), 'dialog');
});

test('modal de escolha de tipo abre com dialog controller e foco inicial', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalEscolhaTipo" style="display:none" aria-labelledby="tituloModalEscolhaTipo">
            <h3 id="tituloModalEscolhaTipo">Escolha o tipo de agendamento</h3>
            <p id="infoEscolhaSlot">Agendar às 08:00</p>
            <button id="btnEscolhaAula" data-dialog-focus="true" type="button">Agendar Aula</button>
            <button id="btnEscolhaBloqueio" type="button">Agendar Bloqueio</button>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalEscolhaTipo');
    const trigger = window.document.getElementById('trigger');
    const button = window.document.getElementById('btnEscolhaAula');

    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, button);
});

test('modal de reagendamento abre com dialog controller e foco inicial', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalReagendarAula" style="display:none" aria-labelledby="tituloModalReagendarAula">
            <h3 id="tituloModalReagendarAula">Agendar Reposição</h3>
            <p id="infoReagendamentoSlot">Agendar reposição às 08:00</p>
            <form>
                <select id="reagendarAluno" data-dialog-focus="true">
                    <option value="">Selecione um aluno...</option>
                </select>
                <input id="reagendarData" value="2026-09-24" />
                <select id="reagendarHoraInicio"><option value="08:00">08:00</option></select>
            </form>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalReagendarAula');
    const trigger = window.document.getElementById('trigger');
    const select = window.document.getElementById('reagendarAluno');

    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, select);
});

test('modal de agendamento abre com dialog controller e foco inicial', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalAgendamento" style="display:none" aria-labelledby="agendaTituloModal">
            <h3 id="agendaTituloModal">Novo Agendamento</h3>
            <form id="formAgendamento">
                <select id="agendaAluno" data-dialog-focus="true">
                    <option value="">Selecione um aluno...</option>
                </select>
                <input id="agendaDescricao" value="" />
            </form>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalAgendamento');
    const trigger = window.document.getElementById('trigger');
    const select = window.document.getElementById('agendaAluno');

    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, select);
});

test('modal de recorrencia abre com dialog controller e foco inicial', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalRecorrencia" style="display:none" aria-labelledby="tituloModalRecorrencia">
            <h3 id="tituloModalRecorrencia">Configurar Repetição</h3>
            <form id="formRecorrencia">
                <input id="recorrenciaDataInicio" data-dialog-focus="true" value="2026-09-24" />
                <select id="recorrenciaPadrao"><option value="semanal">Semanal</option></select>
            </form>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalRecorrencia');
    const trigger = window.document.getElementById('trigger');
    const input = window.document.getElementById('recorrenciaDataInicio');

    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, input);
});

test('modais de escolha curtas usam contrato de dialog e foco inicial', (t) => {
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;

    const modalCobranca = window.document.getElementById('modalEscolhaCobrancaReposicao');
    assert.ok(modalCobranca);
    assert.equal(modalCobranca.getAttribute('role'), 'dialog');
    assert.equal(modalCobranca.getAttribute('aria-modal'), 'true');
    assert.ok(modalCobranca.querySelector('#tituloModalEscolhaCobrancaReposicao'));
    assert.equal(modalCobranca.querySelector('#btnCobrarNesteCiclo').getAttribute('data-dialog-focus'), 'true');

    const modalExclusao = window.document.getElementById('modalEscolhaExclusao');
    assert.ok(modalExclusao);
    assert.equal(modalExclusao.getAttribute('role'), 'dialog');
    assert.equal(modalExclusao.getAttribute('aria-modal'), 'true');
    assert.ok(modalExclusao.querySelector('#tituloModalEscolhaExclusao'));
});
