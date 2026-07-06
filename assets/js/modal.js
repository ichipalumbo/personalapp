// ========================================================
// [JS-MODAL] - Modal de agendamento (com horário duplo)
// ========================================================

let modalDia = '';
let modalHorarioClick = '';

function preencherSelectHorarios() {
    const selectInicio = document.getElementById('modalHorarioInicio');
    const selectFim = document.getElementById('modalHorarioFim');
    
    const options = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = options;
    selectFim.innerHTML = options;

    if (modalHorarioClick) {
        selectInicio.value = modalHorarioClick;
    }
}

function abrirModal(dia, horario) {
    if (alunos.length === 0) {
        mostrarToast('Cadastre pelo menos um aluno primeiro!', 'error');
        return;
    }

    modalDia = dia;
    modalHorarioClick = horario;

    document.getElementById('modalInfo').textContent = `${dia}`;

    const select = document.getElementById('modalSelectAluno');
    select.innerHTML = alunos.map(a => `
        <option value="${a.id}">${a.nome} — ${a.objetivo} ${a.preco ? `(R$ ${a.preco.toFixed(2)})` : ''}</option>
    `).join('');

    preencherSelectHorarios();
    document.getElementById('modalAgendar').classList.add('active');
}

function fecharModal() {
    document.getElementById('modalAgendar').classList.remove('active');
}

function confirmarAgendamento() {
    const select = document.getElementById('modalSelectAluno');
    const alunoId = select.value;
    const horarioInicio = document.getElementById('modalHorarioInicio').value;
    const horarioFim = document.getElementById('modalHorarioFim').value;

    if (!alunoId) {
        mostrarToast('Selecione um aluno!', 'error');
        return;
    }

    // Validar ordem dos horários
    const idxInicio = HORARIOS.indexOf(horarioInicio);
    const idxFim = HORARIOS.indexOf(horarioFim);
    if (idxInicio > idxFim) {
        mostrarToast('Horário final deve ser após o horário inicial!', 'error');
        return;
    }

    // Verificar conflito com outras aulas no intervalo
    for (let i = idxInicio; i <= idxFim; i++) {
        const h = HORARIOS[i];
        const conflito = getAulaNoIntervalo(modalDia, h);
        if (conflito && conflito.alunoId !== alunoId) {
            const alunoConflito = getAluno(conflito.alunoId);
            mostrarToast(`Conflito de horário com ${alunoConflito ? alunoConflito.nome : 'outro aluno'}!`, 'error');
            return;
        }
    }

    const aula = {
        id: Date.now().toString(),
        alunoId,
        dia: modalDia,
        horarioInicio,
        horarioFim
    };

    // Se já existir uma aula do mesmo aluno no mesmo dia, atualiza
    const aulaExistente = aulas.find(a => a.alunoId === alunoId && a.dia === modalDia);
    if (aulaExistente) {
        if (confirm(`O aluno já tem aula na ${modalDia}. Deseja atualizar o horário?`)) {
            aulaExistente.horarioInicio = horarioInicio;
            aulaExistente.horarioFim = horarioFim;
            salvarDados();
            renderizarAgenda();
            fecharModal();
            const aluno = getAluno(alunoId);
            mostrarToast(`🔄 Horário atualizado: ${aluno ? aluno.nome : 'Aluno'} — ${modalDia} ${horarioInicio}-${horarioFim}`);
            return;
        } else {
            fecharModal();
            return;
        }
    }

    aulas.push(aula);
    salvarDados();
    renderizarAgenda();
    fecharModal();

    const aluno = getAluno(alunoId);
    mostrarToast(`🎯 Aula agendada: ${aluno ? aluno.nome : 'Aluno'} — ${modalDia} ${horarioInicio}-${horarioFim}`);
}

// ========================================================
// [JS-CANCELAR] - Cancelamento de aula
// ========================================================

function cancelarAula(aulaId) {
    if (!confirm('Cancelar esta aula?')) return;
    aulas = aulas.filter(a => a.id !== aulaId);
    salvarDados();
    renderizarAgenda();
    mostrarToast('Aula cancelada');
}
