// ========================================================
// [JS-CALENDARIO] - Calendário Mensal
// ========================================================

function getDiasNoMes(mes, ano) {
    return new Date(ano, mes + 1, 0).getDate();
}

function getPrimeiroDiaSemana(mes, ano) {
    return new Date(ano, mes, 1).getDay();
}

function getNomeMes(mes) {
    const nomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return nomes[mes];
}

function getAulasDoDia(dia, mes, ano) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay();
    
    // Só mostramos aulas de segunda a sexta
    if (diaSemana < 1 || diaSemana > 5) return [];
    
    return aulas.filter(a => {
        const idxDia = DIAS.indexOf(a.dia);
        return (idxDia + 1) === diaSemana;
    });
}

function renderizarCalendario() {
    const grid = document.getElementById('calendarioGrid');
    if (!grid) return;
    
    const label = document.getElementById('mesAnoLabel');
    if (label) label.textContent = `${getNomeMes(mesAtual)} ${anoAtual}`;
    
    const totalDias = getDiasNoMes(mesAtual, anoAtual);
    const primeiroDia = getPrimeiroDiaSemana(mesAtual, anoAtual);
    const hoje = new Date();
    
    // Dias do mês anterior para preencher
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
    const diasMesAnterior = getDiasNoMes(mesAnterior, anoAnterior);
    
    let html = '';
    
    // Cabeçalho dos dias da semana
    DIAS_SEMANA.forEach(d => {
        html += `<div class="dia-header">${d}</div>`;
    });
    
    // Dias do mês anterior (para preencher o início)
    const inicioPreenchimento = primeiroDia === 0 ? 6 : primeiroDia - 1;
    for (let i = inicioPreenchimento; i > 0; i--) {
        html += `<div class="dia-cell outro-mes"><div class="dia-numero">${diasMesAnterior - i + 1}</div></div>`;
    }
    
    // Dias do mês atual
    for (let d = 1; d <= totalDias; d++) {
        const ehHoje = d === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();
        const aulasDoDia = getAulasDoDia(d, mesAtual, anoAtual);
        
        let aulasHtml = '';
        if (aulasDoDia.length > 0) {
            const maxMostrar = 3;
            const mostrar = aulasDoDia.slice(0, maxMostrar);
            const restantes = aulasDoDia.length - maxMostrar;
            
            mostrar.forEach(aula => {
                const aluno = getAluno(aula.alunoId);
                if (!aluno) return;
                const objClass = aluno.objetivo.toLowerCase();
                aulasHtml += `<div class="dia-aula-item ${objClass}">${aluno.nome}</div>`;
            });
            
            if (restantes > 0) {
                aulasHtml += `<div class="dia-mais">+${restantes} mais</div>`;
            }
        }
        
        html += `
            <div class="dia-cell ${ehHoje ? 'hoje' : ''}" onclick="irParaSemana(${d})">
                <div class="dia-numero">${d}</div>
                <div class="dia-aulas">${aulasHtml}</div>
            </div>
        `;
    }
    
    // Preencher restante da última semana
    const totalCells = inicioPreenchimento + totalDias;
    const resto = totalCells % 7;
    if (resto > 0) {
        for (let i = 1; i <= (7 - resto); i++) {
            html += `<div class="dia-cell outro-mes"><div class="dia-numero">${i}</div></div>`;
        }
    }
    
    grid.innerHTML = html;
}

function navegarMes(delta) {
    mesAtual += delta;
    if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
    } else if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual--;
    }
    renderizarCalendario();
}

function irParaHoje() {
    const hoje = new Date();
    mesAtual = hoje.getMonth();
    anoAtual = hoje.getFullYear();
    renderizarCalendario();
    irParaSemana(hoje.getDate());
}

function irParaSemana(dia) {
    const data = new Date(anoAtual, mesAtual, dia);
    const diaSemana = data.getDay();
    
    // Encontra a segunda-feira da semana
    const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
    const segunda = new Date(data);
    segunda.setDate(data.getDate() + diff);
    
    const mes = segunda.getMonth();
    const ano = segunda.getFullYear();
    const diaSegunda = segunda.getDate();
    
    // Muda a label da agenda semanal
    const sexta = new Date(segunda);
    sexta.setDate(diaSegunda + 4);
    const label = document.getElementById('semanaLabel');
    if (label) {
        label.textContent = `Semana de ${diaSegunda}/${mes+1} a ${sexta.getDate()}/${sexta.getMonth()+1}/${ano}`;
    }
    
    // Scroll suave para a agenda
    document.getElementById('painelAgenda').scrollIntoView({ behavior: 'smooth' });
}
