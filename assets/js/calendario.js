// ========================================================
// [TAG-JS-CALENDARIO-CORE] - Motor Matemático do Grid Mensal (Com Contadores)
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

// Filtra e retorna as aulas cadastradas em determinado dia da semana
// CORREÇÃO: Suporta compromissos únicos (pela data específica) e recorrentes (pelo dia da semana)
function getAulasDoDia(dia, mes, ano) {
    const data = new Date(ano, mes, dia);
    const diaSemana = data.getDay();
    
    // Mostramos apenas compromissos de segunda a sexta na agenda de trabalho (1 a 5)
    if (diaSemana < 1 || diaSemana > 5) return [];
    
    const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
    const diaTexto = diasUteisMap[diaSemana - 1];
    const dataStr = data.toLocaleDateString('pt-BR'); // ex: "06/07/2026"
    
    return aulas.filter(a => {
        // Se for recorrente semanal, bate pelo dia da semana
        if (a.frequencia === 'semanal') {
            return a.dia === diaTexto;
        }
        // Se não houver data salva por segurança (compromissos antigos), bate pelo dia
        if (!a.data) {
            return a.dia === diaTexto;
        }
        // Se for único, bate pela data exata
        return a.data === dataStr;
    });
}

// Constrói visualmente as células do Mês de forma super informativa com estatísticas
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
    
    // Busca informações de recobrimento do mês anterior
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
    const diasMesAnterior = getDiasNoMes(mesAnterior, anoAnterior);
    
    let html = '';
    
    // Cabeçalho textual dos dias da semana
    DIAS_SEMANA.forEach(d => {
        html += `<div class="dia-header">${d}</div>`;
    });
    
    // CORREÇÃO: Alinhamento das células do mês. Como DIAS_SEMANA começa no domingo,
    // o número de células de preenchimento inicial é exatamente igual a 'primeiroDia'.
    const inicioPreenchimento = primeiroDia;
    for (let i = inicioPreenchimento; i > 0; i--) {
        html += `<div class="dia-cell outro-mes"><div class="dia-numero">${diasMesAnterior - i + 1}</div></div>`;
    }
    
    // Desenha os dias válidos do mês corrente com contadores dinâmicos
    for (let d = 1; d <= totalDias; d++) {
        const ehHoje = d === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();
        const aulasDoDia = getAulasDoDia(d, mesAtual, anoAtual);
        
        // Separando e contando os tipos de atividades do dia
        const totalAulas = aulasDoDia.filter(a => !a.tipo || a.tipo === 'aula').length;
        const totalDesloc = aulasDoDia.filter(a => a.tipo === 'deslocamento').length;
        const totalBloqueios = aulasDoDia.filter(a => a.tipo === 'bloqueio').length;

        let aulasHtml = '';
        if (aulasDoDia.length > 0) {
            aulasHtml += `<div class="dia-stats-badges">`;
            
            // Renderiza indicador específico apenas se houver o evento
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
        
        // Clicar em qualquer célula do mês redireciona de forma inteligente
        html += `
            <div class="dia-cell ${ehHoje ? 'hoje' : ''}" onclick="irParaSemana(${d})">
                <div class="dia-numero">${d}</div>
                ${aulasHtml}
            </div>
        `;
    }
    
    // Preencher as células do final da grade
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

// Redirecionamento Inteligente ao Clicar na Célula
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