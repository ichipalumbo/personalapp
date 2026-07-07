// ========================================================
// [PÁGINA-CADASTRO] - Script específico da página de cadastro
// ========================================================

let alunoEditandoId = null;

function atualizarTotalAlunos() {
    const lbl = document.getElementById('totalAlunosLabel');
    if (lbl) lbl.textContent = `Total: ${alunos.length} alunos`;
}

function renderizarListaAlunos(lista) {
    const container = document.getElementById('listaAlunosContainer');
    const alunosParaExibir = lista || alunos;

    if (!container) return;

    if (alunosParaExibir.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#666;">
                <p style="font-size:2rem;margin-bottom:10px;">📭</p>
                <p style="font-size:1.1rem;margin-bottom:5px;">Nenhum aluno cadastrado ainda.</p>
                <p style="font-size:0.85rem;margin-bottom:15px;">Clique em "➕ Novo Aluno" para adicionar!</p>
                <button class="btn btn-primary" onclick="abrirModalNovoAluno()">➕ Novo Aluno</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display:grid;gap:10px;">
            ${alunosParaExibir.map(a => `
                <div class="aluno-card" style="justify-content:space-between;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                        <span>👤 <strong>${a.nome}</strong></span>
                        <span style="font-size:0.75rem;color:#888;">📍 ${a.local || '—'}</span>
                        <span style="font-size:0.75rem;color:#4CAF50;">💰 R$ ${a.preco ? a.preco.toFixed(2) : '0,00'}</span>
                        <span class="objetivo-badge">🎯 ${a.objetivo}</span>
                    </div>
                    <div style="display:flex;gap:5px;">
                        <button class="btn btn-sm btn-secondary" onclick="abrirModalEditar('${a.id}')">✏️ Editar</button>
                        <button class="btn btn-sm btn-danger" onclick="removerAluno('${a.id}')">🗑️</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function filtrarAlunos() {
    const busca = document.getElementById('inputBusca').value.toLowerCase().trim();
    const filtroObj = document.getElementById('filtroObjetivo').value;

    let filtrados = alunos.filter(a => {
        const matchNome = a.nome.toLowerCase().includes(busca);
        const matchLocal = a.local ? a.local.toLowerCase().includes(busca) : false;
        const matchObj = !filtroObj || a.objetivo === filtroObj;
        return (matchNome || matchLocal) && matchObj;
    });

    renderizarListaAlunos(filtrados);
}

// ===== MODAL DE NOVO ALUNO =====

function abrirModalNovoAluno() {
    const modal = document.getElementById('modalNovoAluno');
    if (!modal) {
        console.error('Modal de novo aluno não encontrado!');
        mostrarToast('Erro: modal não encontrado!', 'error');
        return;
    }
    
    document.getElementById('novoNome').value = '';
    document.getElementById('novoLocal').value = '';
    document.getElementById('novoPreco').value = '';
    document.getElementById('novoObjetivo').value = 'Funcional';
    
    modal.classList.add('active');
    
    // Foco no campo nome
    setTimeout(() => {
        const campoNome = document.getElementById('novoNome');
        if (campoNome) campoNome.focus();
    }, 100);
}

function fecharModalNovoAluno() {
    const modal = document.getElementById('modalNovoAluno');
    if (modal) modal.classList.remove('active');
}

function salvarNovoAluno() {
    const nome = document.getElementById('novoNome').value.trim();
    const local = document.getElementById('novoLocal').value.trim();
    const preco = parseFloat(document.getElementById('novoPreco').value) || 0;
    const objetivo = document.getElementById('novoObjetivo').value;

    if (!nome) {
        mostrarToast('Digite o nome do aluno!', 'error');
        document.getElementById('novoNome').focus();
        return;
    }

    const novo = {
        id: Date.now().toString(),
        nome,
        local: local || '',
        preco,
        objetivo
    };

    alunos.push(novo);
    salvarDados();
    
    fecharModalNovoAluno();
    atualizarTotalAlunos();
    renderizarListaAlunos();
    
    mostrarToast(`✅ ${nome} cadastrado com sucesso!`);
}

// ===== MODAL DE EDIÇÃO =====

function abrirModalEditar(id) {
    const aluno = alunos.find(a => a.id === id);
    if (!aluno) return;

    alunoEditandoId = id;
    document.getElementById('editNome').value = aluno.nome;
    
    // Se não tem campo de local no modal de edição, vamos adicionar suporte
    const editLocal = document.getElementById('editLocal');
    if (editLocal) editLocal.value = aluno.local || '';
    
    document.getElementById('editTelefone').value = aluno.telefone || '';
    document.getElementById('editPreco').value = aluno.preco || '';
    document.getElementById('editObjetivo').value = aluno.objetivo;

    document.getElementById('modalEditar').classList.add('active');
}

function fecharModalEditar() {
    document.getElementById('modalEditar').classList.remove('active');
    alunoEditandoId = null;
}

function salvarEdicao() {
    if (!alunoEditandoId) return;

    const aluno = alunos.find(a => a.id === alunoEditandoId);
    if (!aluno) return;

    const nome = document.getElementById('editNome').value.trim();
    if (!nome) {
        mostrarToast('O nome não pode ficar vazio!', 'error');
        return;
    }

    aluno.nome = nome;
    aluno.telefone = document.getElementById('editTelefone').value.trim();
    aluno.preco = parseFloat(document.getElementById('editPreco').value) || 0;
    aluno.objetivo = document.getElementById('editObjetivo').value;
    
    // Se existir campo de local no modal de edição
    const editLocal = document.getElementById('editLocal');
    if (editLocal) aluno.local = editLocal.value.trim();

    salvarDados();
    atualizarTotalAlunos();
    filtrarAlunos();
    fecharModalEditar();
    mostrarToast(`✅ ${aluno.nome} atualizado com sucesso!`);
}

// ===== REMOVER ALUNO =====

function removerAluno(id) {
    if (!confirm('Tem certeza que deseja remover este aluno?')) return;
    const aluno = alunos.find(a => a.id === id);
    aulas = aulas.filter(a => a.alunoId !== id);
    alunos = alunos.filter(a => a.id !== id);
    salvarDados();
    atualizarTotalAlunos();
    filtrarAlunos();
    mostrarToast(`🗑️ ${aluno ? aluno.nome : 'Aluno'} removido`);
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    atualizarTotalAlunos();
    renderizarListaAlunos();
    
    console.log('✅ Página de cadastro inicializada!');
    console.log(`📊 ${alunos.length} alunos carregados`);
});
