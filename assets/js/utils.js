// ========================================================
// [JS-TOAST] - Função de exibição de toast
// ========================================================

function mostrarToast(msg, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast';
    if (tipo === 'error') toast.classList.add('error');
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ========================================================
// [JS-EXPORT] - Exportar e Importar dados
// ========================================================

function exportarDados() {
    const dados = JSON.stringify({ alunos, aulas }, null, 2);
    const blob = new Blob([dados], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agenda-personal-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast('📥 Dados exportados com sucesso!');
}

function importarDados() {
    document.getElementById('fileInput').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dados = JSON.parse(e.target.result);
            if (dados.alunos && dados.aulas) {
                if (confirm('Isso substituirá todos os dados atuais. Deseja continuar?')) {
                    alunos = dados.alunos;
                    aulas = dados.aulas;
                    salvarDados();
                    renderizarAlunos();
                    renderizarAgenda();
                    renderizarCalendario();
                    mostrarToast('📤 Dados importados com sucesso!');
                }
            } else {
                mostrarToast('Arquivo inválido!', 'error');
            }
        } catch (err) {
            mostrarToast('Erro ao ler o arquivo!', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ========================================================
// [JS-LIMPAR] - Limpar todos os dados
// ========================================================

function limparTudo() {
    if (!confirm('☠️ TEM CERTEZA? Isso vai apagar TODOS os dados (alunos e agenda)!')) return;
    if (!confirm('Última chance! Confirma a limpeza total?')) return;
    alunos = [];
    aulas = [];
    salvarDados();
    renderizarAlunos();
    renderizarAgenda();
    renderizarCalendario();
    mostrarToast('🗑️ Todos os dados foram removidos!');
}

// ========================================================
// [JS-TOGGLE-CADASTRO] - Alternar entre tela de cadastro e agenda
// ========================================================

function toggleTelaCadastro() {
    telaCadastroAberta = !telaCadastroAberta;
    const painelCadastro = document.getElementById('painelCadastro');
    const painelAgenda = document.getElementById('painelAgenda');
    const painelCalendario = document.getElementById('painelCalendario');
    const btnToggle = document.getElementById('btnToggleCadastro');

    if (telaCadastroAberta) {
        painelCadastro.style.display = 'block';
        painelAgenda.style.display = 'none';
        painelCalendario.style.display = 'none';
        btnToggle.textContent = '📅 Voltar para Agenda';
        btnToggle.className = 'btn btn-secondary';
    } else {
        painelCadastro.style.display = 'none';
        painelAgenda.style.display = 'block';
        painelCalendario.style.display = 'block';
        btnToggle.textContent = '👥 Gerenciar Alunos';
        btnToggle.className = 'btn btn-primary';
    }
}
