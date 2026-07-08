// ========================================================
// [JS-AGENDA] - Renderização da agenda semanal
// ========================================================

function getAulaNoIntervalo(dia, horario) {
    return aulas.find(a => {
        if (a.dia !== dia) return false;
        return horario >= a.horarioInicio && horario <= a.horarioFim;
    });
}

function getAluno(id) {
    return alunos.find(a => a.id === id);
}

function renderizarAgenda() {
    const grid = document.getElementById('agendaGrid');
    if (!grid) return;
    
    const horariosLista = [...HORARIOS];

    let html = `<div class="agenda-header">Horário</div>`;
    DIAS.forEach(d => {
        html += `<div class="agenda-header">${d}</div>`;
    });

    horariosLista.forEach(horario => {
        html += `<div class="agenda-horario">${horario}</div>`;
        DIAS.forEach(dia => {
            const aula = getAulaNoIntervalo(dia, horario);
            if (aula) {
                const ehInicio = aula.horarioInicio === horario;
                const ehFim = aula.horarioFim === horario;
                const aluno = getAluno(aula.alunoId);
                const nome = aluno ? aluno.nome : '❓ Desconhecido';
                const obj = aluno ? aluno.objetivo : 'Outro';

                let rotulo = '';
                if (ehInicio && ehFim) rotulo = nome;
                else if (ehInicio) rotulo = `▸ ${nome}`;
                else if (ehFim) rotulo = `${nome} ▸`;
                else rotulo = `│ ${nome}`;

                html += `
                    <div class="agenda-cell ocupado" onclick="cancelarAula('${aula.id}')" title="Clique para cancelar aula">
                        <div class="aula-block objetivo-${obj.replace(/\s/g, '')}">
                            <span class="aula-nome">${rotulo}</span>
                            <span class="aula-objetivo">${obj} ${ehInicio ? `(${aula.horarioInicio}-${aula.horarioFim})` : ''}</span>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="agenda-cell vago" onclick="abrirModal('${dia}', '${horario}')" title="Clique para agendar">
                        <span style="color:#444;font-size:0.7rem;">🟢 vago</span>
                    </div>
                `;
            }
        });
    });

    grid.innerHTML = html;
}
