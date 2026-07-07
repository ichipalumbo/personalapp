// ========================================================
// [HOME] - Dashboard da Home Page
// ========================================================

let visaoAtual = 'dia'; // Começa com 'dia' como padrão

function atualizarDashboard() {
    // Estatísticas
    document.getElementById('statAlunos').textContent = alunos.length;

    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=Dom, 1=Seg...
    const nomeDia = diaSemana >= 1 && diaSemana <= 5 ? DIAS[diaSemana - 1] : null;

    // Aulas hoje
    const aulasHoje = nomeDia ? aulas.filter(a => a.dia === nomeDia) : [];
    document.getElementById('statAulasHoje').textContent = aulasHoje.length;

    // Aulas na semana
    const aulasSemana = aulas.filter(a => DIAS.includes(a.dia));
    document.getElementById('statAulasSemana').textContent = aulasSemana.length;

    // Faturamento semanal
    let faturamento = 0;
    aulasSemana.forEach(aula => {
        const aluno = getAluno(aula.alunoId);
        if (aluno && aluno.preco) {
            faturamento += aluno.preco;
        }
    });
    document.getElementById('statFaturamento').textContent = `R$ ${faturamento.toFixed(2)}`;

    // Renderizar agenda conforme visão
    renderizarHomeAgenda();
}

function getNomeDiaSemana() {
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const hoje = new Date();
    return diasSemana[hoje.getDay()];
}

function getDiaAtual() {
    const hoje = new Date();
    const diaSemana = hoje.getDay(); // 0=Dom, 1=Seg...
    
    if (diaSemana >= 1 && diaSemana <= 5) {
        return DIAS[diaSemana - 1]; // Segunda a Sexta
    } else if (diaSemana === 0) {
        return 'Domingo';
    } else {
        return 'Sábado';
    }
}

function renderizarHomeAgenda() {
    const grid = document.getElementById('agendaGridHome');
    const titulo = document.getElementById('homeTituloAgenda');
    if (!grid || !titulo) return;

    if (visaoAtual === 'dia') {
        titulo.textContent = `📆 Agenda do Dia`;
        renderizarAgendaDia(grid);
    } else {
        titulo.textContent = '📅 Agenda da Semana';
        renderizarAgendaSemana(grid);
    }
}

function renderizarAgendaDia(grid) {
    const nomeDiaSemana = getNomeDiaSemana();
    const diaAtual = getDiaAtual();
    
    let html = `
        <div class="agenda-dia-container">
            <div class="agenda-dia-header">
                <div class="agenda-dia-col-horario">Horário</div>
                <div class="agenda-dia-col-conteudo">${nomeDiaSemana}</div>
            </div>
    `;

    HORARIOS.forEach(h => {
        const aula = getAulaNoIntervalo(diaAtual, h);
        
        if (aula) {
            const inicio = aula.horarioInicio === h;
            const fim = aula.horarioFim === h;
            const aluno = getAluno(aula.alunoId);
            const nome = aluno ? aluno.nome : '❓ Desconhecido';
            const obj = aluno ? aluno.objetivo : 'Outro';
            const preco = aluno && aluno.preco ? `R$ ${aluno.preco.toFixed(2)}` : '';
            
            html += `
                <div class="agenda-dia-linha">
                    <div class="agenda-dia-col-horario agenda-dia-horario">${h}</div>
                    <div class="agenda-dia-col-conteudo">
                        <div class="agenda-dia-aula" onclick="cancelarAula('${aula.id}')">
                            <div class="agenda-dia-aula-info">
                                <span class="agenda-dia-aula-nome">${nome}</span>
                                <span class="agenda-dia-aula-detalhes">${obj} ${preco}</span>
                            </div>
                            <span class="agenda-dia-aula-periodo">${aula.horarioInicio}-${aula.horarioFim}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="agenda-dia-linha">
                    <div class="agenda-dia-col-horario agenda-dia-horario">${h}</div>
                    <div class="agenda-dia-col-conteudo">
                        <div class="agenda-dia-vago" onclick="abrirModal('${diaAtual}','${h}')">
                            <span class="agenda-dia-vago-texto">🟢 Vago — Clique para agendar</span>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    html += `</div>`;
    grid.innerHTML = html;
}


function renderizarAgendaSemana(grid) {
    let html = `<div class="agenda-header">Horário</div>`;
    DIAS.forEach(d => {
        html += `<div class="agenda-header">${d}</div>`;
    });

    HORARIOS.forEach(h => {
        html += `<div class="agenda-horario">${h}</div>`;
        DIAS.forEach(d => {
            const aula = getAulaNoIntervalo(d, h);
            if (aula) {
                const inicio = aula.horarioInicio === h;
                const fim = aula.horarioFim === h;
                const aluno = getAluno(aula.alunoId);
                const nome = aluno ? aluno.nome : '❓';
                const obj = aluno ? aluno.objetivo : 'Outro';
                let rot = inicio&&fim ? nome : inicio ? `▸ ${nome}` : fim ? `${nome} ▸` : `│ ${nome}`;
                html += `<div class="agenda-cell ocupado" onclick="cancelarAula('${aula.id}')">
                    <div class="aula-block objetivo-${obj.replace(/\s/g,'')}">
                        <span class="aula-nome">${rot}</span>
                        <span class="aula-objetivo">${obj}${inicio?` (${aula.horarioInicio}-${aula.horarioFim})`:''}</span>
                    </div>
                </div>`;
            } else {
                html += `<div class="agenda-cell vago" onclick="abrirModal('${d}','${h}')"><span style="color:#444;font-size:0.7rem;">🟢 vago</span></div>`;
            }
        });
    });

    grid.innerHTML = html;
}

function setVisao(tipo) {
    visaoAtual = tipo;
    const btnDia = document.getElementById('btnVisaoDia');
    const btnSemana = document.getElementById('btnVisaoSemana');

    if (tipo === 'dia') {
        btnDia.className = 'btn btn-primary';
        btnSemana.className = 'btn btn-secondary';
    } else {
        btnDia.className = 'btn btn-secondary';
        btnSemana.className = 'btn btn-primary';
    }

    renderizarHomeAgenda();
}

// ===== CADASTRO RÁPIDO NO MODAL =====

function toggleCadastroRapido() {
    const container = document.getElementById('cadastroRapidoContainer');
    const btn = document.getElementById('btnCadastroRapido');
    
    if (container.style.display === 'none' || container.style.display === '') {
        container.style.display = 'block';
        btn.textContent = '✕ Cancelar';
        btn.className = 'btn btn-sm btn-danger';
    } else {
        container.style.display = 'none';
        btn.textContent = '➕ Novo';
        btn.className = 'btn btn-sm btn-primary';
        // Limpa campos
        document.getElementById('rapidoNome').value = '';
        document.getElementById('rapidoTelefone').value = '';
        document.getElementById('rapidoPreco').value = '';
    }
}

function cadastrarRapido() {
    const nome = document.getElementById('rapidoNome').value.trim();
    const telefone = document.getElementById('rapidoTelefone').value.trim();
    const preco = parseFloat(document.getElementById('rapidoPreco').value) || 0;
    const objetivo = document.getElementById('rapidoObjetivo').value;

    if (!nome) {
        mostrarToast('Digite o nome do aluno!', 'error');
        return;
    }

    const novoAluno = {
        id: Date.now().toString(),
        nome,
        telefone,
        preco,
        objetivo
    };

    alunos.push(novoAluno);
    salvarDados();
    
    // Atualiza o select de alunos
    const select = document.getElementById('modalSelectAluno');
    select.innerHTML = getAlunosParaSelect(novoAluno.id);

    // Fecha o cadastro rápido
    toggleCadastroRapido();
    
    mostrarToast(`✅ ${nome} cadastrado e selecionado!`);
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    
    // Popula o select de alunos no modal (se existir)
    const select = document.getElementById('modalSelectAluno');
    if (select) {
        select.innerHTML = alunos.length > 0 
            ? alunos.map(a => `<option value="${a.id}">${a.nome} — ${a.objetivo}${a.preco ? ` (R$${a.preco.toFixed(2)})` : ''}</option>`).join('')
            : `<option value="">— Nenhum aluno —</option>`;
    }
    
    // Força a visão de DIA a aparecer primeiro
    setVisao('dia');
    atualizarDashboard();
});

