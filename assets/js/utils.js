// [TAG-JS-KPIS] - Funções para cálculos de KPIs dos alunos
// ⚠️ IMPORTANTE: Essas funções estão disponíveis GLOBALMENTE em todas as abas
// Os dados (alunos, aulas) são sincronizados com o backend via storage.js
// Também estão replicadas no backend (server.js) para uso em APIs

/**
 * Calcula a projeção de recebimento do MÊS INTEIRO (todas as ocorrências do mês)
 * @param {Object} aluno - Objeto do aluno
 * @param {Array} aulas - Array de todas as aulas
 * @returns {Number} Total de aulas previstas no mês × preço
 */
function calcularProjecaoMensalCompleta(aluno, aulas) {
    const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
    let totalAulasMes = 0;
    
    const aulasAluno = aulas.filter(a => 
        a.alunoId === aluno.id && 
        a.tipo === 'aula'
    );
    
    if (aulasAluno.length > 0 && typeof resolverCompromissoRecorrenteNaData === 'function') {
        // Contar aulas que ocorrerão no MÊS INTEIRO
        const hoje = new Date();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0); // Último dia do mês
        const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        
        aulasAluno.forEach(aula => {
            const diasNoMes = fimMes.getDate();
            for (let i = 0; i < diasNoMes; i++) {
                const dataAtual = new Date(inicioMes.getFullYear(), inicioMes.getMonth(), inicioMes.getDate() + i);
                const diaSemana = dataAtual.getDay();
                
                if (diaSemana < 1 || diaSemana > 6) continue; // Pula fds
                
                const diaTexto = diasUteisMap[diaSemana - 1];
                
                if (resolverCompromissoRecorrenteNaData(aula, dataAtual, diaTexto)) {
                    totalAulasMes++;
                }
            }
        });
    } else if (aulasAluno.length > 0) {
        // Fallback: usar dia da semana × 4 semanas
        aulasAluno.forEach(a => {
            if (a.diasSemana && Array.isArray(a.diasSemana)) {
                totalAulasMes += a.diasSemana.length * 4;
            } else {
                totalAulasMes += 4;
            }
        });
    }
    
    return totalAulasMes * preco;
}

/**
 * Calcula quantas aulas já foram REALIZADAS até hoje
 * @param {Object} aluno - Objeto do aluno
 * @param {Array} aulas - Array de todas as aulas
 * @returns {Number} Total de aulas realizadas × preço
 */
function calcularProjecaoRealizadaAteHoje(aluno, aulas) {
    const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
    let totalAulasRealizadas = 0;
    
    const aulasAluno = aulas.filter(a => 
        a.alunoId === aluno.id && 
        a.tipo === 'aula'
    );
    
    if (aulasAluno.length > 0 && typeof resolverCompromissoRecorrenteNaData === 'function') {
        // Contar aulas REALIZADAS: que ocorreram até ONTEM (não contando hoje)
        const hoje = new Date();
        const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        
        aulasAluno.forEach(aula => {
            const diasPassados = Math.floor((ontem - inicioMes) / (1000 * 60 * 60 * 24)) + 1;
            for (let i = 0; i < diasPassados; i++) {
                const dataAtual = new Date(inicioMes.getFullYear(), inicioMes.getMonth(), inicioMes.getDate() + i);
                const diaSemana = dataAtual.getDay();
                
                if (diaSemana < 1 || diaSemana > 6) continue; // Pula fds
                
                const diaTexto = diasUteisMap[diaSemana - 1];
                
                if (resolverCompromissoRecorrenteNaData(aula, dataAtual, diaTexto)) {
                    totalAulasRealizadas++;
                }
            }
        });
    }
    
    return totalAulasRealizadas * preco;
}

/**
 * Calcula a projeção APROXIMADA mensal (frequência × 4 semanas × preço)
 * Para exibição rápida no card do aluno
 * @param {Object} aluno - Objeto do aluno
 * @returns {Number} Valor aproximado mensal
 */
function calcularProjecaoAproximada(aluno) {
    const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
    const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
    return freqAcordada * 4 * preco;
}

/**
 * Calcula quantas aulas faltam agendar para a semana atual
 * @param {Object} aluno - Objeto do aluno
 * @param {Array} aulas - Array de todas as aulas
 * @returns {Number} Diferença entre contratado e agendado (nunca negativo)
 */
function calcularAulasFaltamAgendar(aluno, aulas) {
    const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
    
    // Aulas recorrentes do aluno para esta semana
    const aulasRecorrentesDoAluno = aulas.filter(a => 
        a.alunoId === aluno.id && 
        a.tipo === 'aula' && 
        a.frequencia === 'semanal'
    );
    
    let totalAgendadoSemana = 0;
    aulasRecorrentesDoAluno.forEach(a => {
        if (a.diasSemana && Array.isArray(a.diasSemana)) {
            totalAgendadoSemana += a.diasSemana.length;
        } else {
            totalAgendadoSemana += 1;
        }
    });
    
    return Math.max(0, freqAcordada - totalAgendadoSemana);
}

/**
 * Conta reposições devidas para um aluno
 * @param {String} alunoId - ID do aluno
 * @param {Array} aulas - Array de todas as aulas
 * @returns {Number} Total de reposições
 */
function contarReposicoesPorAluno(alunoId, aulas) {
    return aulas.filter(a => a.alunoId === alunoId && a.tipo === 'reposição').length;
}

// [TAG-JS-TOAST] - Função de exibição de toast
function mostrarToast(msg, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast';
    if (tipo === 'error') toast.classList.add('error');
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}
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
function toggleTelaCadastro() {
    telaCadastroAberta = !telaCadastroAberta;
    
    const painelCadastro = document.getElementById('painelCadastro');
    const painelAgenda = document.getElementById('painelAgenda');
    const painelCalendario = document.getElementById('painelCalendario');
    const btnToggle = document.getElementById('btnToggleCadastro');

    if (telaCadastroAberta) {
        if (painelCadastro) painelCadastro.style.display = 'block';
        if (painelAgenda) painelAgenda.style.display = 'none';
        if (painelCalendario) painelCalendario.style.display = 'none';
        if (btnToggle) {
            btnToggle.textContent = '📅 Voltar para Agenda';
            btnToggle.className = 'btn btn-secondary';
        }
    } else {
        if (painelCadastro) painelCadastro.style.display = 'none';
        if (painelAgenda) painelAgenda.style.display = 'block';
        if (painelCalendario) painelCalendario.style.display = 'block';
        if (btnToggle) {
            btnToggle.textContent = '👥 Gerenciar Alunos';
            btnToggle.className = 'btn btn-primary';
        }
    }
}