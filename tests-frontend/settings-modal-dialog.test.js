const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const CAMINHO_DIALOG_CONTROLLER = path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js');
const CAMINHO_SETTINGS = path.resolve(__dirname, '..', 'assets', 'js', 'settings-modal.js');

function criarAmbiente() {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="btnUserAreaTrigger">Conta</button>
        <div id="appSettingsBackdrop" style="display:none"></div>
        <div id="appSettingsModal" style="display:none">
            <h2><span id="tituloAppSettings">Área do usuário</span><button id="btnCloseSettings" type="button">X</button></h2>
            <button id="btnRenewGoogleCalendarWatch" type="button">Verificar</button>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    const { window } = dom;
    window.userAreaSessionHelper = {
        getSessionSnapshot: () => ({ isSignedIn: true, name: 'Josy', email: 'josy@example.com', picture: '' }),
        renderProfile: (session) => session
    };
    const ctx = dom.getInternalVMContext();
    vm.runInContext(fs.readFileSync(CAMINHO_DIALOG_CONTROLLER, 'utf8'), ctx, { filename: CAMINHO_DIALOG_CONTROLLER });
    vm.runInContext(fs.readFileSync(CAMINHO_SETTINGS, 'utf8'), ctx, { filename: CAMINHO_SETTINGS });
    window.initSettingsModal();
    return { dom, window };
}

test('área do usuário abre no DialogController e Escape devolve o foco ao botão da conta', (t) => {
    const { dom, window } = criarAmbiente();
    t.after(() => dom.window.close());

    const doc = window.document;
    const trigger = doc.getElementById('btnUserAreaTrigger');
    const modal = doc.getElementById('appSettingsModal');
    trigger.focus();

    window.openUserAreaModal();
    assert.equal(window.DialogController.getStack().map((el) => el.id).join(','), 'appSettingsModal');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(doc.body.style.overflow, 'hidden');

    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    assert.equal(modal.style.display, 'none');
    assert.equal(window.DialogController.getStack().length, 0);
    assert.equal(doc.body.style.overflow, '');
    assert.equal(doc.activeElement, trigger);
});

test('clique no fundo não fecha a área do usuário', (t) => {
    const { dom, window } = criarAmbiente();
    t.after(() => dom.window.close());

    window.openUserAreaModal();
    window.document.getElementById('appSettingsBackdrop').click();

    assert.equal(window.document.getElementById('appSettingsModal').style.display, 'flex');
});
