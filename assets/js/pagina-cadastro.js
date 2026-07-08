// ========================================================
// [TAG-JS-CADASTRO] - Lógica de Alunos na SPA (AtivaMente)
// ========================================================

// 1. INICIALIZAÇÃO DA PÁGINA (Chamada pelo app.js ao navegar)
window.inicializarPaginaCadastro = function() {
    // Recarrega do Storage para garantir dados sempre atualizados
    if (typeof carregarDados === 'function') carregarDados();
    
    // Desenha a listagem de alunos
    window.renderizarListaAlunos();
    
    // Garante que o modal começa fechado
    window.togglePainelCadastro(false);
};

// 2. CONTROLE DO MODAL DE CADASTRO/EDIÇÃO (Abre e fecha de forma limpa)
window.togglePainelCadastro = function(mostrar) {
    const modal = document.getElementById('modalFormAluno');
    if (!modal) return;

    if (mostrar) {
        modal.style.display = 'flex'; // Exibe o overlay centralizado
    } else {
        modal.style.display = 'none'; // Esconde o modal
        
        // Limpa o formulário para evitar que resquícios de edição continuem salvos
        const form = document.getElementById('formNovoAluno');
        if (form) form.reset();
        
        const idEdicao = document.getElementById('alunoIdEdicao');
        if (idEdicao) idEdicao.value = '';
    }
};

// Reseta o modal para o estado de "Novo Cadastro"
window.abrirCadastroParaNovo = function() {
    const titulo = document.getElementById('tituloFormAluno');
    const botao = document.getElementById('btnSalvarAluno');
    
    if (titulo) titulo.textContent = 'Cadastrar Novo Aluno';
    if (botao) botao.textContent = 'Adicionar';
    
    window.togglePainelCadastro(true);
};

// 3. RENDERIZAÇÃO DA LISTA DE ALUNOS (Cards ultra-responsivos com novas informações)
window.renderizarListaAlunos = function() {
    const listaContainer = document.getElementById('listaAlunos');
    if (!listaContainer) return;

    if (typeof alunos !== 'undefined') {
        if (alunos.length === 0) {
            listaContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #666;">
                    <i class="fa-solid fa-users-slash" style="font-size: 2.5rem; margin-bottom: 10px; display: block;"></i>
                    <p style="font-size: 0.95rem;">Nenhum aluno cadastrado no momento.</p>
                </div>
            `;
            return;
        }

        // Gera o HTML de cada card incluindo Local, Valor Hora e Telefone
        listaContainer.innerHTML = alunos.map(aluno => {
            const preco = aluno.preco ? parseFloat(aluno.preco).toFixed(2) : '0.00';
            const local = aluno.local || 'Não definido';
            const telefone = aluno.telefone || 'Sem tel.';
            
            return `
                <div class="aluno-card" style="display: flex; flex-direction: column; gap: 10px;">
                    <!-- Topo do Card: Nome e Ações -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                        <div>
                            <strong style="display: block; color: #FFF; font-size: 1.05rem; word-break: break-word;">${aluno.nome}</strong>
                            <span style="font-size: 0.75rem; color: #FFD700; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${aluno.objetivo}</span>
                        </div>
                        <div style="display: flex; gap: 8px; flex-shrink: 0;">
                            <!-- Botão Editar -->
                            <button class="btn btn-secondary btn-sm" onclick="prepararEdicaoAluno('${aluno.id}')" style="padding: 6px 10px; background: #333;" title="Editar Aluno">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <!-- Botão Excluir -->
                            <button class="btn btn-danger btn-sm" onclick="deletarAlunoSPA('${aluno.id}')" style="padding: 6px 10px;" title="Excluir Aluno">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Rodapé do Card: Informações de Logística e Valores -->
                    <div style="display: grid; grid-template-columns: 1fr; gap: 6px; font-size: 0.78rem; color: #B0B0B0; border-top: 1px solid #333; padding-top: 8px; margin-top: 2px;">
                        <div><i class="fa-solid fa-location-dot" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${local}</div>
                        <div><i class="fa-solid fa-dollar-sign" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> R$ ${preco} / hora</div>
                        <div><i class="fa-solid fa-phone" style="color: #FFD700; margin-right: 6px; width: 12px;"></i> ${telefone}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
};

// 4. PREPARAÇÃO DO MODAL PARA EDIÇÃO (Puxa os dados antigos para os inputs)
window.prepararEdicaoAluno = function(id) {
    if (typeof alunos === 'undefined') return;
    const aluno = alunos.find(a => a.id === id);
    if (!aluno) return;

    // Popula todos os campos do modal
    const elId = document.getElementById('alunoIdEdicao');
    const elNome = document.getElementById('alunoNome');
    const elLocal = document.getElementById('alunoLocal');
    const elPreco = document.getElementById('alunoPreco');
    const elTelefone = document.getElementById('alunoTelefone');
    const elObjetivo = document.getElementById('alunoObjetivo');

    if (elId) elId.value = aluno.id;
    if (elNome) elNome.value = aluno.nome;
    if (elLocal) elLocal.value = aluno.local || '';
    if (elPreco) elPreco.value = aluno.preco || '';
    if (elTelefone) elTelefone.value = aluno.telefone || '';
    if (elObjetivo) elObjetivo.value = aluno.objetivo || '';

    // Atualiza os títulos visuais do modal
    const titulo = document.getElementById('tituloFormAluno');
    const botao = document.getElementById('btnSalvarAluno');
    if (titulo) titulo.textContent = 'Editar Aluno';
    if (botao) botao.textContent = 'Atualizar';

    // Abre o modal
    window.togglePainelCadastro(true);
};

// 5. APAGAR ALUNO (Remove o aluno e avisa o treinador de forma suave)
window.deletarAlunoSPA = function(id) {
    if (confirm("Tem certeza que deseja remover este aluno? Suas aulas futuras não serão mais associadas a ele.")) {
        if (typeof alunos !== 'undefined') {
            // Remove do array principal
            alunos = alunos.filter(a => a.id !== id);
            
            // Salva as alterações no LocalStorage
            if (typeof salvarDados === 'function') salvarDados();
            
            // Atualiza a tela de listagem e atualiza estatísticas em background
            window.renderizarListaAlunos();
            if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats();
            if (typeof mostrarToast === 'function') mostrarToast('Aluno removido com sucesso!');
        }
    }
};

// 6. EVENT LISTENER DO SUBMIT (Sempre ativo para salvar ou atualizar)
document.addEventListener('DOMContentLoaded', () => {
    const formAluno = document.getElementById('formNovoAluno');
    if (formAluno) {
        formAluno.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const idEdicao = document.getElementById('alunoIdEdicao').value;
            const nome = document.getElementById('alunoNome').value.trim();
            const local = document.getElementById('alunoLocal').value.trim();
            const preco = parseFloat(document.getElementById('alunoPreco').value) || 0;
            const telefone = document.getElementById('alunoTelefone').value.trim();
            const objetivo = document.getElementById('alunoObjetivo').value;

            if (typeof alunos === 'undefined') return;

            if (idEdicao) {
                // Modo Edição: Atualiza as informações do aluno correspondente
                const index = alunos.findIndex(a => a.id === idEdicao);
                if (index !== -1) {
                    alunos[index].nome = nome;
                    alunos[index].local = local;
                    alunos[index].preco = preco;
                    alunos[index].telefone = telefone;
                    alunos[index].objetivo = objetivo;
                    if (typeof mostrarToast === 'function') mostrarToast('✅ Aluno atualizado com sucesso!');
                }
            } else {
                // Modo Cadastro: Cria um novo ID e adiciona ao array
                const novoAluno = {
                    id: Date.now().toString(),
                    nome: nome,
                    local: local,
                    preco: preco,
                    telefone: telefone,
                    objetivo: objetivo
                };
                alunos.push(novoAluno);
                if (typeof mostrarToast === 'function') mostrarToast('✅ Aluno cadastrado com sucesso!');
            }

            // Grava os dados finais no LocalStorage e atualiza o app
            if (typeof salvarDados === 'function') salvarDados();
            window.togglePainelCadastro(false); // Fecha o modal
            window.renderizarListaAlunos(); // Atualiza a lista na tela
            if (typeof atualizarDashboardStats === 'function') atualizarDashboardStats(); // Atualiza contador na Home
        });
    }
});