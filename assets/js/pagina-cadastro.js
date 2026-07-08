// ========================================================
// [GERENCIAR ALUNOS] - Listagem e Cadastro na SPA
// ========================================================

// Esta função é chamada pelo app.js sempre que clicas na aba "Alunos"
window.inicializarPaginaCadastro = function() {
    if (typeof carregarDados === 'function') carregarDados();
    window.renderizarListaAlunos();
};

window.renderizarListaAlunos = function() {
    const listaContainer = document.getElementById('listaAlunos');
    if (!listaContainer) return;

    // Se já tens uma função que desenha a lista (ex: atualizarListaAlunos), usa-a.
    // Caso contrário, usamos este renderizador ultra-responsivo otimizado para telemóvel:
    if (typeof atualizarListaAlunos === 'function') {
        atualizarListaAlunos();
    } else if (typeof alunos !== 'undefined') {
        if (alunos.length === 0) {
            listaContainer.innerHTML = '<p style="color: #666; font-size: 0.9rem; padding: 10px;">Nenhum aluno cadastrado ainda.</p>';
            return;
        }

        listaContainer.innerHTML = alunos.map(aluno => `
            <div class="aluno-card">
                <div>
                    <strong style="display:block; color:#FFF; font-size: 0.95rem;">${aluno.nome}</strong>
                    <span style="font-size:0.75rem; color:#FFD700;">Objetivo: ${aluno.objetivo}</span>
                </div>
                <button class="btn btn-danger btn-sm" onclick="deletarAlunoSPA('${aluno.id}')" style="padding: 5px 10px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join('');
    }
};

// Função auxiliar para apagar alunos e atualizar o ecrã na hora sem recarregar a página
window.deletarAlunoSPA = function(id) {
    if (confirm("Tens a certeza que queres remover este aluno?")) {
        if (typeof excluirAluno === 'function') {
            excluirAluno(id); // Chama a tua função original do alunos.js
        } else if (typeof alunos !== 'undefined') {
            // Caso não encontre, apaga diretamente do array global
            alunos = alunos.filter(a => a.id !== id);
            if (typeof salvarDados === 'function') salvarDados();
        }
        // Atualiza a lista no ecrã imediatamente
        window.renderizarListaAlunos();
        if (typeof mostrarToast === 'function') mostrarToast('Aluno removido com sucesso!');
    }
};

// Escuta o envio do formulário de novo aluno (executada apenas uma vez)
document.addEventListener('DOMContentLoaded', () => {
    const formAluno = document.getElementById('formNovoAluno');
    if (formAluno) {
        formAluno.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const nomeInput = document.getElementById('alunoNome');
            const objetivoSelect = document.getElementById('alunoObjetivo');
            
            if (!nomeInput || !objetivoSelect) return;

            const nome = nomeInput.value.trim();
            const objetivo = objetivoSelect.value;

            if (!nome || !objetivo) return;

            // Cria o objeto do novo aluno
            const novoAluno = {
                id: Date.now().toString(),
                nome: nome,
                objetivo: objetivo
            };

            if (typeof alunos !== 'undefined') {
                alunos.push(novoAluno);
                if (typeof salvarDados === 'function') salvarDados();
                
                // Limpa os campos do formulário para o próximo cadastro
                nomeInput.value = '';
                objetivoSelect.value = '';
                
                // Atualiza o ecrã na hora!
                window.renderizarListaAlunos();
                if (typeof mostrarToast === 'function') mostrarToast('✅ Aluno cadastrado com sucesso!');
            }
        });
    }
});