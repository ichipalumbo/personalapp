// ========================================================
// [JS-ALUNOS] - CRUD de alunos
// ========================================================

function adicionarAluno() {
    const nome = document.getElementById('inputNome').value.trim();
    const telefone = document.getElementById('inputTelefone').value.trim();
    const preco = parseFloat(document.getElementById('inputPreco').value) || 0;
    const objetivo = document.getElementById('inputObjetivo').value;

    if (!nome) {
        mostrarToast('Digite o nome do aluno!', 'error');
        return;
    }

    const novo = {
        id: Date.now().toString(),
        nome,
        telefone,
        preco,
        objetivo
    };

    alunos.push(novo);
    salvarDados();
    renderizarAlunos();
    renderizarAgenda();

    document.getElementById('inputNome').value = '';
    document.getElementById('inputTelefone').value = '';
    document.getElementById('inputPreco').value = '';
    mostrarToast(`✅ ${nome} cadastrado com sucesso!`);
}

function removerAluno(id) {
    if (!confirm('Tem certeza que deseja remover este aluno?')) return;
    const aluno = alunos.find(a => a.id === id);
    aulas = aulas.filter(a => a.alunoId !== id);
    alunos = alunos.filter(a => a.id !== id);
    salvarDados();
    renderizarAlunos();
    renderizarAgenda();
    mostrarToast(`🗑️ ${aluno ? aluno.nome : 'Aluno'} removido`);
}

function renderizarAlunos() {
    const grid = document.getElementById('alunosGrid');
    if (!grid) return;
    if (alunos.length === 0) {
        grid.innerHTML = '<p style="color:#666;font-size:0.9rem;">Nenhum aluno cadastrado ainda.</p>';
        return;
    }
    grid.innerHTML = alunos.map(a => `
        <div class="aluno-card">
            <span>👤 ${a.nome}</span>
            <span style="font-size:0.75rem;color:#888;">${a.telefone || '—'}</span>
            <span style="font-size:0.75rem;color:#4caf50;">R$ ${a.preco ? a.preco.toFixed(2) : '0,00'}</span>
            <span class="objetivo-badge">${a.objetivo}</span>
            <span class="remove-aluno" onclick="removerAluno('${a.id}')" title="Remover aluno">✕</span>
        </div>
    `).join('');
}
