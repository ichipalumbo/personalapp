// [TAG-JS-CALENDARIO-CORE] - Motor Matemático do Grid Mensal (Com Contadores)
window.checarCompromissoNaData = function(comp, dataAlvo, horaStr) {
    if (horaStr && comp.horarioInicio !== horaStr) return false;
    
    const diaSemana = dataAlvo.getDay();
    if (diaSemana < 1 || diaSemana > 6) return false; 
    
    const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaTexto = diasUteisMap[diaSemana - 1];
    const dataStr = dataAlvo.toLocaleDateString('pt-BR');
    if (comp.excecoes && comp.excecoes.includes(dataStr)) {
        return false;
    }
    
    if (comp.frequencia === 'semanal') {
        if (comp.tipoRecorrencia) {
            const dataCriacao = comp.dataCriacao ? new Date(comp.dataCriacao) : new Date(2026, 0, 1);
            const d1 = new Date(dataCriacao.getFullYear(), dataCriacao.getMonth(), dataCriacao.getDate());
            const d2 = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());
            
            const diffTime = d2 - d1;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            const intervalo = parseInt(comp.intervaloRecorrencia || 1);
            if (comp.tipoRecorrencia === 'diaria') {
                return diffDays >= 0 && (diffDays % intervalo === 0);
            }
            if (comp.tipoRecorrencia === 'semanal') {
                const dataCriacaoSegunda = new Date(d1);
                const d1SemanaDay = dataCriacaoSegunda.getDay();
                dataCriacaoSegunda.setDate(d1.getDate() - d1SemanaDay + (d1SemanaDay === 0 ? -6 : 1));
                
                const dataSegunda = new Date(d2);
                const d2SemanaDay = dataSegunda.getDay();
                dataSegunda.setDate(d2.getDate() - d2SemanaDay + (d2SemanaDay === 0 ? -6 : 1));
                
                const diffSemanasTime = dataSegunda - dataCriacaoSegunda;
                const diffSemanas = Math.round(diffSemanasTime / (1000 * 60 * 60 * 24 * 7));
                
                const pertenceNaSemana = diffSemanas >= 0 && (diffSemanas % intervalo === 0);
                const diaSelecionadoValido = Array.isArray(comp.diasSemana) && comp.diasSemana.includes(diaTexto);
                
                return pertenceNaSemana && diaSelecionadoValido;
            }
            if (comp.tipoRecorrencia === 'mensal') {
                const diffMeses = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
                if (diffMeses >= 0 && (diffMeses % intervalo === 0)) {
                    if (Array.isArray(comp.diasSemana) && comp.diasSemana.length > 0) {
                        return comp.diasSemana.includes(diaTexto);
                    }
                    return dataAlvo.getDate() === d1.getDate();
                }
                return false;
            }
            if (comp.tipoRecorrencia === 'anual') {
                const diffAnos = d2.getFullYear() - d1.getFullYear();
                return diffAnos >= 0 && (diffAnos % intervalo === 0) && d2.getDate() === d1.getDate() && d2.getMonth() === d1.getMonth();
            }
        }
        return comp.dia === diaTexto;
    }
    
    if (!comp.data) {
        return comp.dia === diaTexto;
    }
    return comp.data === dataStr;
};

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
    return aulas.filter(a => window.checarCompromissoNaData(a, data));
}
function renderizarCalendario() {
    const grid = document.getElementById('calendarioGrid');
    if (!grid) return;
    
    const label = document.getElementById('nomeMesAno');
    if (label) {
        label.textContent = `${getNomeMes(mesAtual)} de ${anoAtual}`;
    }
    
    const totalDias = getDiasNoMes(mesAtual, anoAtual);
    const primeiroDia = getPrimeiroDiaSemana(mesAtual, anoAtual);
    const hoje = new Date();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
    const diasMesAnterior = getDiasNoMes(mesAnterior, anoAnterior);
    
    let html = '';
    DIAS_SEMANA.forEach(d => {
        html += `<div class="dia-header">${d}</div>`;
    });
    const inicioPreenchimento = primeiroDia;
    for (let i = inicioPreenchimento; i > 0; i--) {
        html += `<div class="dia-cell outro-mes"><div class="dia-numero">${diasMesAnterior - i + 1}</div></div>`;
    }
    for (let d = 1; d <= totalDias; d++) {
        const ehHoje = d === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();
        const aulasDoDia = getAulasDoDia(d, mesAtual, anoAtual);
        const totalAulas = aulasDoDia.filter(a => !a.tipo || a.tipo === 'aula').length;
        const totalDesloc = aulasDoDia.filter(a => a.tipo === 'deslocamento').length;
        const totalBloqueios = aulasDoDia.filter(a => a.tipo === 'bloqueio').length;

        let aulasHtml = '';
        if (aulasDoDia.length > 0) {
            aulasHtml += `<div class="dia-stats-badges">`;
            if (totalAulas > 0) {
                aulasHtml += `
                    <div class="badge-stat-mensal badge-aula" title="${totalAulas} Aula(s)">
                        <i class="fa-solid fa-graduation-cap"></i><span>${totalAulas}</span>
                    </div>
                `;
            }
            if (totalDesloc > 0) {
                aulasHtml += `
                    <div class="badge-stat-mensal badge-desloc" title="${totalDesloc} Deslocamento(s)">
                        <i class="fa-solid fa-car-side"></i><span>${totalDesloc}</span>
                    </div>
                `;
            }
            if (totalBloqueios > 0) {
                aulasHtml += `
                    <div class="badge-stat-mensal badge-bloqueio" title="${totalBloqueios} Bloqueio(s)">
                        <i class="fa-solid fa-lock"></i><span>${totalBloqueios}</span>
                    </div>
                `;
            }
            
            aulasHtml += `</div>`;
        }
        html += `
            <div class="dia-cell ${ehHoje ? 'hoje' : ''}" onclick="irParaSemana(${d})">
                <div class="dia-numero">${d}</div>
                ${aulasHtml}
            </div>
        `;
    }
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
function irParaSemana(dia) {
    const dataAlvo = new Date(anoAtual, mesAtual, dia);
    
    if (typeof dataSelecionada !== 'undefined') {
        dataSelecionada = dataAlvo;
    }
    if (window.semanaReferencia) {
        window.semanaReferencia = dataAlvo;
    }

    if (typeof alternarModoCalendario === 'function') {
        window.alternarModoCalendario('semanal');
    }
}
