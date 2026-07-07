// ========================================================
// [PÁGINA-CALENDÁRIO] - Script específico da página de calendário
// ========================================================

function irParaSemana(dia) {
    const data = new Date(anoAtual, mesAtual, dia);
    const diff = data.getDay() === 0 ? -6 : 1 - data.getDay();
    const seg = new Date(data);
    seg.setDate(data.getDate() + diff);
    
    const sex = new Date(seg);
    sex.setDate(seg.getDate() + 4);
    
    const lbl = document.getElementById('semanaLabel');
    if (lbl) {
        lbl.textContent = `Semana de ${seg.getDate()}/${seg.getMonth()+1} a ${sex.getDate()}/${sex.getMonth()+1}/${sex.getFullYear()}`;
    }

    // Renderiza a agenda da semana no grid da página de calendário
    const grid = document.getElementById('agendaGridCalendario');
    if (!grid) return;

    let html = `<div class="agenda-header">Horário</div>`;
    DIAS.forEach(d => { html += `<div class="agenda-header">${d}</div>`; });

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
                html += `<div class="agenda-cell ocupado" style="cursor:default;">
                    <div class="aula-block objetivo-${obj.replace(/\s/g,'')}">
                        <span class="aula-nome">${rot}</span>
                        <span class="aula-objetivo">${obj}${inicio?` (${aula.horarioInicio}-${aula.horarioFim})`:''}</span>
                    </div>
                </div>`;
            } else {
                html += `<div class="agenda-cell vago" style="cursor:default;"><span style="color:#444;font-size:0.7rem;">🟢 vago</span></div>`;
            }
        });
    });

    grid.innerHTML = html;
}

// Sobrescreve a função irParaSemana original para incluir renderização na página
const irParaSemanaOriginal = window.irParaSemana;
window.irParaSemana = function(dia) {
    irParaSemanaOriginal(dia);
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    
    // Popula o select de alunos no modal (se existir)
    const select = document.getElementById('modalSelectAluno');
    if (select) {
        select.innerHTML = alunos.length > 0 
            ? alunos.map(a => `<option value="${a.id}">${a.nome} — ${a.objetivo}${a.preco ? ` (R$${a.preco.toFixed(2)})` : ''}</option>`).join('')
            : `<option value="">— Nenhum aluno —</option>`;
    }
    
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();
    renderizarCalendario(mesAtual, anoAtual);
});

