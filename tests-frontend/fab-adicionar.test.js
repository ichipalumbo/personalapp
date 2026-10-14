// Contrato do FAB compartilhado: marcação real, criação dinâmica e CSS único.
// CSSOM valida a estrutura/declarações; pixels e interação visual continuam no mock.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(RAIZ, 'assets/css/style.css'), 'utf8');
const HOME = path.join(RAIZ, 'assets/js/view-home.js');

function ambiente(t) {
    const dom = new JSDOM(HTML, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    require('./setup/contexto-dados')(dom);
    vm.runInContext(fs.readFileSync(HOME, 'utf8'), dom.getInternalVMContext(), { filename: HOME });
    window.document.getElementById('tela-home').style.display = 'block';
    window.trocarFABNovoHome();
    const estilo = window.document.createElement('style');
    estilo.textContent = CSS;
    window.document.head.appendChild(estilo);
    assert.ok(estilo.sheet, 'CSS real precisa ser interpretado, não comparado por regex de texto');
    return { window, regras: coletarRegras(estilo.sheet.cssRules) };
}

function coletarRegras(lista, midias = []) {
    return Array.from(lista).flatMap((regra) => {
        if (regra.selectorText) return [{ seletor: regra.selectorText, estilo: regra.style, midias }];
        if (!regra.cssRules) return [];
        const proximas = regra.media ? [...midias, regra.media.mediaText] : midias;
        return coletarRegras(regra.cssRules, proximas);
    });
}

function seletores(regra) {
    // O parser CSSOM do jsdom preserva comentários dentro da lista de seletores.
    return regra.seletor.replace(/\/\*[\s\S]*?\*\//g, '').split(',').map((seletor) => seletor.trim());
}

function regraUnica(regras, seletor, reduzido = false) {
    const encontradas = regras.filter((regra) => seletores(regra).includes(seletor)
        && (reduzido
            ? regra.midias.includes('(prefers-reduced-motion: reduce)')
            : regra.midias.length === 0));
    assert.equal(encontradas.length, 1, `${seletor} deve ter uma única regra ${reduzido ? 'de movimento reduzido' : 'base'}`);
    return encontradas[0].estilo;
}

function verificarDeclaracoes(estilo, esperado) {
    for (const [propriedade, valor] of Object.entries(esperado)) {
        assert.equal(estilo.getPropertyValue(propriedade).trim().replace(/\s+/g, ' '), valor, propriedade);
    }
}

// M35/M36: retirar a classe do HTML ou voltar às classes locais na criação dinâmica.
test('FABs de Alunos e Home usam a mesma classe, inclusive ao alternar modo e recriar', (t) => {
    const { window } = ambiente(t);
    const doc = window.document;
    const alunos = doc.getElementById('btnFlutuanteAdicionar');
    const home = doc.getElementById('fabNovoHome');
    for (const botao of [alunos, home]) {
        assert.equal(botao.className, 'fab-adicionar');
        assert.equal(botao.getAttribute('type'), 'button');
        assert.equal(botao.getAttribute('style'), null, 'IDs não devem carregar estilo próprio inline');
        assert.equal(botao.querySelector('i').className, 'fa-solid fa-plus');
        assert.equal(botao.querySelector('i').getAttribute('aria-hidden'), 'true');
    }
    assert.equal(alunos.getAttribute('aria-label'), 'Novo aluno');
    assert.equal(alunos.getAttribute('onclick'), 'abrirCadastroParaNovo()');
    assert.equal(home.getAttribute('aria-label'), 'Novo agendamento para a semana selecionada');
    assert.equal(typeof home.onclick, 'function');

    window.modoHomeAtivo = 'dia';
    window.trocarFABNovoHome();
    assert.equal(doc.getElementById('fabNovoHome'), home);
    assert.equal(home.className, 'fab-adicionar');
    assert.equal(home.getAttribute('aria-label'), 'Novo agendamento para o dia selecionado');
    doc.getElementById('tela-home').style.display = 'none';
    window.trocarFABNovoHome();
    assert.equal(doc.getElementById('fabNovoHome'), null);
    doc.getElementById('tela-home').style.display = 'block';
    window.trocarFABNovoHome();
    assert.notEqual(doc.getElementById('fabNovoHome'), home);
    assert.equal(doc.getElementById('fabNovoHome').className, 'fab-adicionar');
    assert.equal(doc.querySelectorAll('.fab-adicionar').length, 2);
});

// M37/M38: reintroduzir estilo por ID/classe da tela, quebrando a fonte única.
test('FAB tem uma única fonte CSS de aparência, sem overrides por ID ou classes antigas', (t) => {
    const { regras } = ambiente(t);
    const locais = regras.filter((regra) => /#(?:fabNovoHome|btnFlutuanteAdicionar)\b|\.(?:btn-weekly-add|fab-novo-home)\b/.test(regra.seletor));
    assert.deepEqual(locais.map((regra) => regra.seletor), [], 'estilo do FAB não deve depender da tela ou do ID');
    const seletoresFab = regras.flatMap(seletores).filter((seletor) => seletor.includes('.fab-adicionar'));
    assert.ok(seletoresFab.every((seletor) => /^\.fab-adicionar(?::(?:hover|active))?$/.test(seletor)), 'nenhum seletor do FAB pode ser limitado a uma tela');
    verificarDeclaracoes(regraUnica(regras, '.fab-adicionar'), {
        position: 'fixed', bottom: 'calc(var(--bottombar-height, 0px) + 16px)', right: '25px',
        width: '60px', height: '60px', 'border-radius': '50%', background: 'rgb(255, 215, 0)',
        color: 'rgb(13, 13, 13)', 'font-size': '1.5rem',
        'box-shadow': '0 14px 28px rgba(0, 0, 0, 0.42)', 'z-index': '100', cursor: 'pointer',
        display: 'flex', 'align-items': 'center', 'justify-content': 'center',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease'
    });
});

// M38/M39: hover exclusivo de Home ou reduced-motion ainda apontando para classe antiga.
test('FAB compartilha hover, pressão e movimento reduzido com a referência da Home', (t) => {
    const { regras } = ambiente(t);
    verificarDeclaracoes(regraUnica(regras, '.fab-adicionar:hover'), {
        transform: 'translateY(-2px)', 'box-shadow': '0 18px 34px rgba(0, 0, 0, 0.5)',
        filter: 'brightness(1.03)'
    });
    verificarDeclaracoes(regraUnica(regras, '.fab-adicionar:active'), { transform: 'scale(0.9)' });
    verificarDeclaracoes(regraUnica(regras, '.fab-adicionar', true), { transition: 'none' });
});