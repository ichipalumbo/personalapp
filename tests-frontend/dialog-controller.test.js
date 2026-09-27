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

test('dialog-controller abre modal com foco no contexto sem ativar campo', (t) => {
    const { dom, window } = criarAmbiente();
    t.after(() => dom.window.close());

    const dialog = window.document.getElementById('dialog');
    const trigger = window.document.getElementById('trigger');
    const controller = window.DialogController;
    assert.ok(controller && typeof controller.open === 'function');

    trigger.focus();
    controller.open(dialog, { trigger });

    assert.equal(dialog.style.display, 'flex');
    assert.equal(dialog.getAttribute('aria-modal'), 'true');
    assert.equal(dialog.getAttribute('tabindex'), '-1');
    assert.equal(window.document.activeElement, dialog);

    const event = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    assert.doesNotThrow(() => window.document.dispatchEvent(event));
    assert.equal(window.document.activeElement.id, 'close', 'Tab no contexto entra no primeiro controle');

    dialog.focus();
    const eventShiftTab = new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
    window.document.dispatchEvent(eventShiftTab);
    assert.equal(window.document.activeElement.id, 'action', 'Shift+Tab no contexto entra no último controle');

    const eventEscape = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    assert.doesNotThrow(() => window.document.dispatchEvent(eventEscape));
});

test('focaveis ignoram campos ocultos sem receber foco automático', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="dialog" style="display:none">
            <button id="fechar">Fechar</button>
            <div style="display:none"><input id="oculto" /></div>
            <input id="visivel" />
            <button id="salvar">Salvar</button>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    vm.runInContext(fs.readFileSync(CAMINHO_DIALOG_CONTROLLER, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_DIALOG_CONTROLLER });

    const dialog = window.document.getElementById('dialog');
    window.DialogController.open(dialog);

    const ids = window.DialogController.getFocusableElements(dialog).map((el) => el.id).join(',');
    assert.equal(ids, 'fechar,visivel,salvar');
    assert.equal(window.document.activeElement, dialog, 'o contexto recebe foco sem ativar campo');

    window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    assert.equal(window.document.activeElement.id, 'fechar', 'Tab entra no primeiro controle pela ordem do DOM');

    window.document.getElementById('salvar').focus();
    window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    assert.equal(window.document.activeElement.id, 'fechar', 'Tab no \u00faltimo volta ao primeiro na ordem do DOM');
});

test('Escape delega ao onRequestClose do dialog no topo', (t) => {
    const { dom, window } = criarAmbiente();
    t.after(() => dom.window.close());

    const dialog = window.document.getElementById('dialog');
    const chamadas = [];
    window.DialogController.open(dialog, { onRequestClose: () => chamadas.push('fechar') });

    window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    assert.deepEqual(chamadas, ['fechar']);
    assert.equal(dialog.style.display, 'flex');
});

test('Escape sem onRequestClose fecha o dialog e libera o scroll', (t) => {
    const { dom, window } = criarAmbiente();
    t.after(() => dom.window.close());

    const dialog = window.document.getElementById('dialog');
    window.DialogController.open(dialog);
    assert.equal(window.document.body.style.overflow, 'hidden');

    window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    assert.equal(dialog.style.display, 'none');
    assert.equal(window.DialogController.getStack().length, 0);
    assert.equal(window.document.body.style.overflow, '');
});

test('modal de configuracao da agenda abre sem focar o campo numérico', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="btnAgenda">Abrir</button>
        <div id="modalConfigAgenda" style="display:none">
            <h3 id="tituloModalConfigAgenda">Configurar Grade Horária</h3>
            <form id="formConfigAgenda">
                <input id="configHoraInicio" value="8" />
                <input id="configHoraFim" value="18" />
                <button id="btnFecharConfig" type="button">Cancelar</button>
            </form>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalConfigAgenda');
    const trigger = window.document.getElementById('btnAgenda');
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, modal);
    assert.equal(modal.getAttribute('role'), 'dialog');
});

test('modal de escolha de tipo abre com foco no contexto', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalEscolhaTipo" style="display:none" aria-labelledby="tituloModalEscolhaTipo">
            <h3 id="tituloModalEscolhaTipo">Escolha o tipo de agendamento</h3>
            <p id="infoEscolhaSlot">Agendar às 08:00</p>
            <button id="btnEscolhaAula" type="button">Agendar Aula</button>
            <button id="btnEscolhaBloqueio" type="button">Agendar Bloqueio</button>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalEscolhaTipo');
    const trigger = window.document.getElementById('trigger');
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, modal);
});

test('modal de reagendamento abre sem ativar o seletor', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalReagendarAula" style="display:none" aria-labelledby="tituloModalReagendarAula">
            <h3 id="tituloModalReagendarAula">Agendar Reposição</h3>
            <p id="infoReagendamentoSlot">Agendar reposição às 08:00</p>
            <form>
                <select id="reagendarAluno">
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
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, modal);
});

test('modal de agendamento abre sem ativar o seletor', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalAgendamento" style="display:none" aria-labelledby="agendaTituloModal">
            <h3 id="agendaTituloModal">Novo Agendamento</h3>
            <form id="formAgendamento">
                <select id="agendaAluno">
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
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, modal);
});

test('modal de recorrencia abre sem ativar o seletor de data', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="trigger">Abrir</button>
        <div id="modalRecorrencia" style="display:none" aria-labelledby="tituloModalRecorrencia">
            <h3 id="tituloModalRecorrencia">Configurar Repetição</h3>
            <form id="formRecorrencia">
                <input id="recorrenciaDataInicio" value="2026-09-24" />
                <select id="recorrenciaPadrao"><option value="semanal">Semanal</option></select>
            </form>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    const modal = window.document.getElementById('modalRecorrencia');
    const trigger = window.document.getElementById('trigger');
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js'), 'utf8'), dom.getInternalVMContext(), { filename: 'dialog-controller.js' });

    trigger.focus();
    window.DialogController.open(modal, { trigger });

    assert.equal(modal.style.display, 'flex');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.activeElement, modal);
});

test('modais de escolha curtas não declaram preferência de foco', (t) => {
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;

    const modalCobranca = window.document.getElementById('modalEscolhaCobrancaReposicao');
    assert.ok(modalCobranca);
    assert.equal(modalCobranca.getAttribute('role'), 'dialog');
    assert.ok(modalCobranca.querySelector('#tituloModalEscolhaCobrancaReposicao'));
    assert.equal(modalCobranca.querySelector('[data-dialog-focus]'), null);

    const modalExclusao = window.document.getElementById('modalEscolhaExclusao');
    assert.ok(modalExclusao);
    assert.equal(modalExclusao.getAttribute('role'), 'dialog');
    assert.ok(modalExclusao.querySelector('#tituloModalEscolhaExclusao'));
});

test('todo modal-overlay do index.html declara dialog com titulo e sem aria-modal estatico', (t) => {
    const html = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');
    const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const doc = dom.window.document;
    const overlays = [...doc.querySelectorAll('.modal-overlay')];
    assert.ok(overlays.length >= 12);
    const problemas = overlays.flatMap((overlay) => {
        const erros = [];
        if (overlay.getAttribute('role') !== 'dialog') erros.push(`${overlay.id}: sem role=dialog`);
        const titulo = overlay.getAttribute('aria-labelledby');
        if (!titulo || !doc.getElementById(titulo)) erros.push(`${overlay.id}: aria-labelledby ausente ou inv\u00e1lido`);
        if (overlay.getAttribute('aria-modal') === 'true') erros.push(`${overlay.id}: aria-modal="true" com o di\u00e1logo oculto`);
        return erros;
    });
    assert.deepEqual(problemas, []);
});

test('underlay perde aria-modal enquanto outro dialog esta no topo', (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="baixo" style="display:none"><button>A</button></div>
        <div id="topo" style="display:none"><button>B</button></div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    vm.runInContext(fs.readFileSync(CAMINHO_DIALOG_CONTROLLER, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_DIALOG_CONTROLLER });

    const baixo = window.document.getElementById('baixo');
    const topo = window.document.getElementById('topo');
    window.DialogController.open(baixo);
    window.DialogController.open(topo);
    assert.equal(baixo.getAttribute('aria-modal'), 'false');
    assert.equal(topo.getAttribute('aria-modal'), 'true');

    window.DialogController.close(topo);
    assert.equal(baixo.getAttribute('aria-modal'), 'true');
    assert.equal(window.document.body.style.overflow, 'hidden', 'scroll segue bloqueado enquanto houver dialog aberto');
});
