// [TAG-TESTS-CARREGADOR-FRONTEND] carregar-frontend.js
// Responsabilidade: executar scripts do frontend em Node para teste.
// Os scripts do projeto nao exportam nada: apenas registram funcoes em `window`.
// Cada carga usa um contexto `vm` novo, entao os testes ficam isolados entre si.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ_PROJETO = path.resolve(__dirname, '..', '..');
const CAMINHO_INDEX_HTML = path.join(RAIZ_PROJETO, 'index.html');

const PADRAO_SCRIPT_SRC = /<script\b[^>]*?\ssrc="([^"]+)"/g;

function lerScriptsDoIndexHtml() {
    const html = fs.readFileSync(CAMINHO_INDEX_HTML, 'utf8');
    const encontrados = [];
    let achado;

    PADRAO_SCRIPT_SRC.lastIndex = 0;
    while ((achado = PADRAO_SCRIPT_SRC.exec(html)) !== null) {
        encontrados.push(achado[1]);
    }

    return encontrados;
}

function lerScriptsLocaisDoIndexHtml() {
    return lerScriptsDoIndexHtml().filter((src) => !/^https?:\/\//i.test(src));
}

// No browser `window === globalThis`; sem isso, o UMD de recurrence-helpers
// registra em globalThis e nada aparece em window.
function criarAmbiente() {
    const ambiente = vm.createContext({ console });
    vm.runInContext('globalThis.window = globalThis;', ambiente);
    return ambiente;
}

function carregarScripts(caminhosRelativos, ambienteExistente) {
    const ambiente = ambienteExistente || criarAmbiente();

    for (const relativo of caminhosRelativos) {
        const absoluto = path.join(RAIZ_PROJETO, relativo);
        const codigo = fs.readFileSync(absoluto, 'utf8');
        vm.runInContext(codigo, ambiente, { filename: absoluto });
    }

    return ambiente;
}

module.exports = {
    RAIZ_PROJETO,
    CAMINHO_INDEX_HTML,
    lerScriptsDoIndexHtml,
    lerScriptsLocaisDoIndexHtml,
    criarAmbiente,
    carregarScripts
};
