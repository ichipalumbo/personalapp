// [TAG-ALUNOS-HELPERS] alunos-helpers.js
// Responsabilidade: Lookup e geração de HTML para selects de alunos, além dos
// helpers puros de busca por nome e de contato via WhatsApp.
// Depende de: state.js (alunos)
// Expõe: window.normalizarStatusAluno, window.normalizarObjetivoAluno, window.alunoEstaAtivo, window.getAluno(id),
//        window.getAlunosAtivos, window.getAlunosParaSelect(selectedId),
//        window.normalizarTextoBuscaAluno, window.normalizarTelefoneWhatsApp, window.montarLinkWhatsApp

window.normalizarStatusAluno = function(status) {
    return String(status || '').toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
};

window.normalizarObjetivoAluno = function(objetivo) {
    const valor = String(objetivo || '').trim();
    return valor === 'Consultoria Online' ? 'Consultoria Online' : 'Personal Trainer';
};

window.alunoEstaAtivo = function(aluno) {
    return window.normalizarStatusAluno(aluno && aluno.status) === 'ativo';
};

window.getAlunosAtivos = function() {
    const listaAlunos = Array.isArray(window.alunos)
        ? window.alunos
        : (typeof alunos !== 'undefined' && Array.isArray(alunos) ? alunos : []);

    return listaAlunos.filter(window.alunoEstaAtivo);
};

window.getAluno = function(id) {
    const listaAlunos = Array.isArray(window.alunos)
        ? window.alunos
        : (typeof alunos !== 'undefined' && Array.isArray(alunos) ? alunos : []);

    return listaAlunos.find(a => a.id === id) || null;
};

window.getCompromisso = function(id) {
    const listaCompromissos = Array.isArray(window.aulas)
        ? window.aulas
        : (typeof aulas !== 'undefined' && Array.isArray(aulas) ? aulas : []);

    return listaCompromissos.find(a => a.id === id) || null;
};

window.getAlunosParaSelect = function(selectedId) {
    const listaAlunos = window.getAlunosAtivos();

    return listaAlunos.map(a =>
        `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.nome} — ${a.objetivo}${a.preco ? ` (R$${a.preco.toFixed(2)})` : ''}</option>`
    ).join('');
};

// Normaliza texto para comparação de busca: minúsculas, sem acentos e sem espaços
// sobrando. Usado no filtro por nome da tela de Alunos.
window.normalizarTextoBuscaAluno = function(texto) {
    return String(texto === null || texto === undefined ? '' : texto)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
};

// Telefone no formato aceito pelo wa.me (só dígitos): 10 ou 11 dígitos nacionais
// recebem o DDI 55; números já com 55 + 10/11 dígitos são mantidos. Qualquer outro
// comprimento é inválido e devolve null.
window.normalizarTelefoneWhatsApp = function(telefone) {
    const digitos = String(telefone === null || telefone === undefined ? '' : telefone)
        .replace(/\D/g, '');
    if (!digitos) return null;

    if (digitos.length === 10 || digitos.length === 11) {
        return `55${digitos}`;
    }
    if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
        return digitos;
    }
    return null;
};

window.montarLinkWhatsApp = function(telefone) {
    const numero = window.normalizarTelefoneWhatsApp(telefone);
    return numero ? `https://wa.me/${numero}` : null;
};
