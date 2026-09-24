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
