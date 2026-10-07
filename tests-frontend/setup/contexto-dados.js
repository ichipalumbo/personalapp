const fs = require('fs');
const path = require('path');
const vm = require('vm');

module.exports = function carregarContexto(dom, ownerEmail = 'teste@example.com') {
    const { window } = dom;
    window.googleIdentity = {
        isSignedIn: () => true,
        getIdToken: () => 'token-de-teste',
        getOwnerEmail: () => ownerEmail,
    };
    const arquivo = path.resolve(__dirname, '../../assets/js/app/contexto-dados.js');
    vm.runInContext(fs.readFileSync(arquivo, 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
    window.contextoDados.capturar();
};