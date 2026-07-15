// [TAG-JS-CALENDARIO-CORE] - Motor Matemático do Grid Mensal (Com Contadores)
window.parseDataFlex = function(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
    if (typeof valor !== 'string') return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const data = new Date(`${valor}T12:00:00`);
        if (!Number.isNaN(data.getTime())) return new Date(data.getFullYear(), data.getMonth(), data.getDate());
        return null;
    }

    const partes = valor.split('/');
    if (partes.length === 3) {
        const [dia, mes, ano] = partes.map(Number);
        if (dia && mes && ano) {
            const data = new Date(ano, mes - 1, dia);
            if (!Number.isNaN(data.getTime())) return new Date(data.getFullYear(), data.getMonth(), data.getDate());
        }
    }

    const dataGenerica = new Date(valor);
    if (!Number.isNaN(dataGenerica.getTime())) {
        return new Date(dataGenerica.getFullYear(), dataGenerica.getMonth(), dataGenerica.getDate());
    }
    return null;
};

window.resolverCompromissoRecorrenteNaData = function(comp, dataAlvo, diaTexto) {
    const dataCriacao = window.parseDataFlex(comp.dataCriacao) || window.parseDataFlex(comp.recorrenciaDataInicio) || window.parseDataFlex(comp.data);
    if (!dataCriacao) return false;

    const dataRef = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());
    const diffMs = dataRef - dataCriacao;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return false;

    const padrao = comp.tipoRecorrencia || 'semanal';
    const intervalo = Math.max(1, parseInt(comp.intervaloRecorrencia || 1, 10));

    if (padrao === 'diaria') {
        return diffDays % intervalo === 0;
    }

    if (padrao === 'semanal') {
        const dias = Array.isArray(comp.diasSemana) && comp.diasSemana.length > 0
            ? comp.diasSemana
            : (comp.dia ? [comp.dia] : []);
        if (!dias.includes(diaTexto)) return false;

        const inicioSemana = new Date(dataCriacao);
        const diaSemanaInicio = inicioSemana.getDay();
        inicioSemana.setDate(inicioSemana.getDate() - diaSemanaInicio + (diaSemanaInicio === 0 ? -6 : 1));

        const alvoSemana = new Date(dataRef);
        const diaSemanaAlvo = alvoSemana.getDay();
        alvoSemana.setDate(alvoSemana.getDate() - diaSemanaAlvo + (diaSemanaAlvo === 0 ? -6 : 1));

        const diffSemanas = Math.round((alvoSemana - inicioSemana) / (1000 * 60 * 60 * 24 * 7));
        return diffSemanas >= 0 && (diffSemanas % intervalo === 0);
    }

    if (padrao === 'mensal') {
        const diffMeses = (dataRef.getFullYear() - dataCriacao.getFullYear()) * 12 + (dataRef.getMonth() - dataCriacao.getMonth());
        if (diffMeses < 0 || (diffMeses % intervalo !== 0)) return false;

        if (Array.isArray(comp.diasSemana) && comp.diasSemana.length > 0) {
            return comp.diasSemana.includes(diaTexto);
        }
        return dataRef.getDate() === dataCriacao.getDate();
    }

    if (padrao === 'anual') {
        const diffAnos = dataRef.getFullYear() - dataCriacao.getFullYear();
        return diffAnos >= 0
            && (diffAnos % intervalo === 0)
            && dataRef.getDate() === dataCriacao.getDate()
            && dataRef.getMonth() === dataCriacao.getMonth();
    }

    return false;
};

window.checarCompromissoNaData = function(comp, dataAlvo, horaStr) {
    if (horaStr) {
        const ehDiaInteiro = comp.tipo === 'bloqueio'
            && (comp.fullDay === true || (comp.horarioInicio === '00:00' && comp.horarioFim === '23:59'));
        if (!ehDiaInteiro && comp.horarioInicio !== horaStr) return false;
    }
    
    const diaSemana = dataAlvo.getDay();
    if (diaSemana < 1 || diaSemana > 6) return false; 
    
    const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const diaTexto = diasUteisMap[diaSemana - 1];
    const dataStr = dataAlvo.toLocaleDateString('pt-BR');
    if (comp.excecoes && comp.excecoes.includes(dataStr)) {
        return false;
    }
    
    if (comp.frequencia === 'semanal') {
        const recorrenciaDataInicio = window.parseDataFlex(comp.recorrenciaDataInicio) || window.parseDataFlex(comp.data);
        const dataAlvoPura = new Date(dataAlvo.getFullYear(), dataAlvo.getMonth(), dataAlvo.getDate());
        if (recorrenciaDataInicio) {
            if ((comp.recorrenciaEscopo || 'fromDate') === 'monthOfDate') {
                if (dataAlvoPura.getFullYear() !== recorrenciaDataInicio.getFullYear() || dataAlvoPura.getMonth() !== recorrenciaDataInicio.getMonth()) {
                    return false;
                }
            } else {
                if (dataAlvoPura < recorrenciaDataInicio) {
                    return false;
                }
            }
        }

        if (comp.tipoRecorrencia) {
            return window.resolverCompromissoRecorrenteNaData(comp, dataAlvoPura, diaTexto);
        }

        if (Array.isArray(comp.diasSemana) && comp.diasSemana.length > 0) {
            return comp.diasSemana.includes(diaTexto);
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
        let aulasDoDia = getAulasDoDia(d, mesAtual, anoAtual);
        
        // [FILTERED] Apply student filter if set and hide deslocamento/bloqueio types
        if (window.filtroAlunoMensalId) {
            aulasDoDia = aulasDoDia.filter(a => a.alunoId === window.filtroAlunoMensalId);
        }
        
        // Only count aulas (hide deslocamento/bloqueio in month view)
        const totalAulas = aulasDoDia.filter(a => !a.tipo || a.tipo === 'aula' || a.tipo === 'reposição').length;

        let aulasHtml = '';
        if (totalAulas > 0) {
            aulasHtml += `<div class="dia-stats-badges">`;
            aulasHtml += `
                <div class="badge-stat-mensal badge-aula" title="${totalAulas} Aula(s)">
                    <i class="fa-solid fa-graduation-cap"></i><span>${totalAulas}</span>
                </div>
            `;
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
