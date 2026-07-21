// [TAG-UTILS-KPI] utils-kpi.js
// Responsabilidade: Cálculos de KPIs dos alunos, notificação toast e exportação de dados
// Depende de: state.js (alunos, aulas, aulasParaRepor), calendario-engine.js (resolverCompromissoRecorrenteNaData — em runtime)
// Expõe: calcularProjecaoMensalCompleta, calcularProjecaoRealizadaAteHoje, calcularProjecaoAproximada,
//         calcularAulasFaltamAgendar, contarReposicoesPorAluno, calcularKPIsAluno, calcularKPIsTodosAlunos,
//         filtrarAulasCalendario, mostrarToast, mostrarOverlaySinc, ocultarOverlaySinc, exportarDados
// ⚠️ As funções de KPI têm versões simplificadas replicadas no backend/server.js (para uso em APIs)

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

/**
 * Calcula KPIs consolidados de um aluno para um mês específico
 * Retorna: Projeção Mensal, Realizado até Hoje, Qtd Aulas a Realizar, Qtd Reposições
 * @param {String} alunoId - ID do aluno
 * @param {Number} mes - Mês (0-11)
 * @param {Number} ano - Ano
 * @param {Array} aulasArray - Array de aulas
 * @returns {Object} { projecaoMensal, realizadoAteHoje, aulasARealizarQtd, reposicoes }
 */
function calcularKPIsAluno(alunoId, mes, ano, aulasArray = window.aulas) {
    const aluno = window.alunos?.find(a => a.id === alunoId);
    if (!aluno) {
        return { projecaoMensal: 0, realizadoAteHoje: 0, aulasARealizarQtd: 0, reposicoes: 0 };
    }

    const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
    const aulasAluno = aulasArray.filter(a => 
        a.alunoId === alunoId && 
        (a.tipo === 'aula' || a.tipo === 'reposição')
    );

    let projecaoMensal = 0;
    let realizadoAteHoje = 0;
    let aulasARealizarQtd = 0;

    const inicioMes = new Date(ano, mes, 1);
    const fimMes = new Date(ano, mes + 1, 0);
    const hoje = new Date();
    const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    aulasAluno.forEach(aula => {
        const diasNoMes = fimMes.getDate();
        for (let i = 1; i <= diasNoMes; i++) {
            const dataAtual = new Date(ano, mes, i);
            const diaSemana = dataAtual.getDay();
            
            if (diaSemana < 1 || diaSemana > 6) continue; // Pula fins de semana
            
            const diaTexto = diasUteisMap[diaSemana - 1];
            
            if (typeof resolverCompromissoRecorrenteNaData === 'function' && 
                resolverCompromissoRecorrenteNaData(aula, dataAtual, diaTexto)) {
                
                // Contar para projeção mensal (apenas "aula", não reposição)
                if (aula.tipo === 'aula') {
                    projecaoMensal++;
                    
                    // Contar para realizado até hoje (completo: < hoje)
                    if (dataAtual < hoje) {
                        realizadoAteHoje++;
                    }
                    
                    // Contar para aulas a realizar (>= hoje)
                    if (dataAtual >= hoje) {
                        aulasARealizarQtd++;
                    }
                } else if (aula.tipo === 'reposição' && dataAtual >= hoje) {
                    // Reposição futura conta como "a realizar"
                    aulasARealizarQtd++;
                }
            }
        }
    });

    // Reposições pendentes no array aulasParaRepor
    const reposicoesPendentes = (window.aulasParaRepor || []).filter(r => r.alunoId === alunoId).length;

    return {
        projecaoMensal: projecaoMensal * preco,
        realizadoAteHoje: realizadoAteHoje * preco,
        aulasARealizarQtd: aulasARealizarQtd,
        reposicoes: reposicoesPendentes
    };
}

/**
 * Calcula KPIs consolidados de TODOS os alunos para um mês específico
 * Retorna somatório: Projeção Mensal, Realizado até Hoje, Qtd Aulas a Realizar, Qtd Reposições
 * @param {Number} mes - Mês (0-11)
 * @param {Number} ano - Ano
 * @param {Array} aulasArray - Array de aulas
 * @param {Array} alunosArray - Array de alunos
 * @returns {Object} { projecaoMensal, realizadoAteHoje, aulasARealizarQtd, reposicoes }
 */
function calcularKPIsTodosAlunos(mes, ano, aulasArray = window.aulas, alunosArray = window.alunos) {
    if (!alunosArray || alunosArray.length === 0) {
        return { projecaoMensal: 0, realizadoAteHoje: 0, aulasARealizarQtd: 0, reposicoes: 0 };
    }
    
    let totalProjecao = 0;
    let totalRealizado = 0;
    let totalARealizarQtd = 0;
    let totalReposicoes = 0;
    
    // Soma KPIs de cada aluno
    alunosArray.forEach(aluno => {
        const kpis = calcularKPIsAluno(aluno.id, mes, ano, aulasArray);
        totalProjecao += kpis.projecaoMensal;
        totalRealizado += kpis.realizadoAteHoje;
        totalARealizarQtd += kpis.aulasARealizarQtd;
        totalReposicoes += kpis.reposicoes;
    });
    
    return {
        projecaoMensal: totalProjecao,
        realizadoAteHoje: totalRealizado,
        aulasARealizarQtd: totalARealizarQtd,
        reposicoes: totalReposicoes
    };
}

/**
 * Filtra aulas para exibição no calendário
 * Remove deslocamento e bloqueio; filtra por aluno se especificado
 * @param {String|null} alunoIdFiltro - ID do aluno para filtrar (null = todos)
 * @param {Array} aulasArray - Array de aulas
 * @returns {Array} Aulas filtradas (apenas aula + reposição)
 */
function filtrarAulasCalendario(alunoIdFiltro = null, aulasArray = window.aulas) {
    let aulasFiltered = aulasArray.filter(a => 
        a.tipo === 'aula' || a.tipo === 'reposição'
    );
    
    if (alunoIdFiltro) {
        aulasFiltered = aulasFiltered.filter(a => a.alunoId === alunoIdFiltro);
    }
    
    return aulasFiltered;
}

// [TAG-JS-TOAST] - Função de exibição de toast
function mostrarToast(msg, tipo = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = 'toast';
    if (tipo === 'error') toast.classList.add('error');
    if (tipo === 'warning') toast.classList.add('warning');
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// [TAG-JS-OVERLAY-SINC] - Overlay bloqueante para operações de sincronização críticas

function _garantirOverlaySinc() {
    let overlay = document.getElementById('overlay-sinc');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'overlay-sinc';
        overlay.className = 'overlay-sinc';
        overlay.innerHTML =
            '<div class="overlay-sinc-conteudo">' +
            '<div class="overlay-sinc-spinner"></div>' +
            '<p class="overlay-sinc-msg"></p>' +
            '</div>';
        document.body.appendChild(overlay);
    }
    return overlay;
}

function mostrarOverlaySinc(mensagem) {
    const overlay = _garantirOverlaySinc();
    const spinner = overlay.querySelector('.overlay-sinc-spinner');

    if (spinner) spinner.style.display = 'block';
    overlay.classList.remove('overlay-sinc-erro');
    overlay.querySelector('.overlay-sinc-msg').textContent = mensagem || 'Salvando...';
    overlay.classList.add('ativo');
    document.body.style.pointerEvents = 'none';
}

function mostrarOverlaySleepMode(mensagem) {
    mostrarOverlaySinc(mensagem || 'Sincronizando... isso pode levar alguns segundos.');
}

function mostrarOverlayErroConexao(mensagem) {
    const overlay = _garantirOverlaySinc();
    const spinner = overlay.querySelector('.overlay-sinc-spinner');

    if (spinner) spinner.style.display = 'none';

    overlay.classList.add('overlay-sinc-erro');
    overlay.querySelector('.overlay-sinc-msg').textContent = mensagem || 'Falha ao conectar. Banco de dados inativo.';
    overlay.classList.add('ativo');
    document.body.style.pointerEvents = '';
}

function ocultarOverlayConexao() {
    const overlay = document.getElementById('overlay-sinc');
    if (!overlay) return;

    const spinner = overlay.querySelector('.overlay-sinc-spinner');
    if (spinner) spinner.style.display = 'block';

    overlay.classList.remove('overlay-sinc-erro');
    overlay.classList.remove('ativo');
    document.body.style.pointerEvents = '';
}

function ocultarOverlaySinc(resultado) {
    ocultarOverlayConexao();
    if (resultado === 'partial') {
        mostrarToast('⚠️ Salvo no banco. Falha no Google Calendar — o evento pode não aparecer no calendário.', 'warning');
    } else if (resultado === 'error') {
        mostrarToast('❌ Falha ao salvar. Tente novamente.', 'error');
    }
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