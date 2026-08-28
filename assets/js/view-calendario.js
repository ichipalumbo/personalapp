// [TAG-VIEW-CALENDARIO] view-calendario.js
// Responsabilidade: Visão semanal da Home (grid da semana e ações de slot)
// Depende de: state.js, storage.js, alunos-helpers.js (window.getAluno), agenda-card-template.js (window.criarCardAgendamento), calendario-engine.js, modal-acao-slot.js (abrirModalAcaoSlot — em runtime)
window.semanaReferencia = new Date();
window.filtroAlunoSemanalId = null; // Estado do filtro de aluno na semana exibida na Home

/**
 * Popula os dropdowns de filtro de alunos em ambas as abas
 */
window.preencherFiltrosAlunos = function() {
    const alunosLista = window.alunos || [];

    const preencherSelect = (id) => {
        const select = document.getElementById(id);
        if (!select) return;

        const valorAtual = select.value;

        // Ensure the "Todos" placeholder is at index 0 — add it once, never touch again.
        if (select.options.length === 0 || select.options[0].value !== '') {
            select.innerHTML = '<option value="">👥 Todos os Alunos</option>';
        }

        // Build a Set of IDs that belong in the new list.
        const novosIds = new Set(alunosLista.map(function (a) { return a.id; }));

        // Remove stale options (iterate in reverse to preserve indices during removal).
        for (let i = select.options.length - 1; i >= 1; i--) {
            if (!novosIds.has(select.options[i].value)) {
                select.remove(i);
            }
        }

        // Build a Set of IDs already present after the removal pass.
        const existingIds = new Set();
        for (let i = 1; i < select.options.length; i++) {
            existingIds.add(select.options[i].value);
        }

        // Add missing options; update text for existing ones if the name changed.
        alunosLista.forEach(function (aluno) {
            if (!existingIds.has(aluno.id)) {
                const option = document.createElement('option');
                option.value = aluno.id;
                option.textContent = aluno.nome;
                select.appendChild(option);
            } else {
                for (let i = 1; i < select.options.length; i++) {
                    if (select.options[i].value === aluno.id) {
                        if (select.options[i].textContent !== aluno.nome) {
                            select.options[i].textContent = aluno.nome;
                        }
                        break;
                    }
                }
            }
        });

        // Defensive fallback: if count still doesn't match, fall back to a full reset.
        if (select.options.length !== alunosLista.length + 1) {
            select.innerHTML = '<option value="">👥 Todos os Alunos</option>';
            alunosLista.forEach(function (aluno) {
                const option = document.createElement('option');
                option.value = aluno.id;
                option.textContent = aluno.nome;
                select.appendChild(option);
            });
        }

        // Restore the previously selected value if it is still valid.
        if (valorAtual && alunosLista.some(function (a) { return a.id === valorAtual; })) {
            select.value = valorAtual;
        }
    };

    preencherSelect('filtroAlunoSemanaHome');
};

/**
 * Atualiza o filtro da semana exibida na Home e re-renderiza
 */
window.atualizarFiltroSemanaHome = function() {
    const select = document.getElementById('filtroAlunoSemanaHome');
    if (select) {
        window.filtroAlunoSemanalId = select.value || null;
        window.renderizarHomeSemana();
    }
};

window.atualizarFiltroCalendarioSemanal = window.atualizarFiltroSemanaHome;

window.irParaDiaDestaSemana = function(dataStr) {
    const parts = dataStr.split('/');
    if (parts.length === 3) {
        const dia = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10) - 1; // Ajusta mês (0-11 no JS)
        const ano = parseInt(parts[2], 10);
        window.dataSelecionada = new Date(ano, mes, dia);
    }
    if (typeof window.alternarModoHome === 'function') {
        window.alternarModoHome('dia');
    }
};
window.renderizarHomeSemana = function() {
    const gridSemanal = document.getElementById('calendarioSemanalHomeGrid');
    const labelPeriodo = document.getElementById('periodoSemanaHomeLabel');
    if (!gridSemanal) return;
    const dataRef = new Date(window.semanaReferencia);
    const diaSemana = dataRef.getDay();
    const dSeg = dataRef.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const segundaFeira = new Date(dataRef.setDate(dSeg));
    const domingo = new Date(segundaFeira);
    domingo.setDate(segundaFeira.getDate() + 6);
    if (labelPeriodo) {
        const dSegStr = String(segundaFeira.getDate()).padStart(2, '0');
        const mSegStr = String(segundaFeira.getMonth() + 1).padStart(2, '0');
        const dDomStr = String(domingo.getDate()).padStart(2, '0');
        const mDomStr = String(domingo.getMonth() + 1).padStart(2, '0');
        labelPeriodo.textContent = `${dSegStr}/${mSegStr} a ${dDomStr}/${mDomStr}`;
    }
    
    let html = '';
    const diasSemanaMap = typeof window.getNomesDiasUteis === 'function'
        ? window.getNomesDiasUteis().concat('Domingo')
        : ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const minutosAgora = (agora.getHours() * 60) + agora.getMinutes();
    const converterHorarioParaMinutos = (horario) => {
        if (!horario || typeof horario !== 'string') return 0;
        const [horas, minutos] = horario.split(':').map(Number);
        return (horas * 60) + minutos;
    };
    const formatarHoraCheia = (hora) => `${String(hora).padStart(2, '0')}:00`;
    const horaInicioPadrao = formatarHoraCheia(agendaConfig?.horaInicio || 8);

    for (let d = 0; d < 7; d++) {
        const diaAtual = new Date(segundaFeira);
        diaAtual.setDate(segundaFeira.getDate() + d);

        const diaTexto = diasSemanaMap[d];
        const diaNum = String(diaAtual.getDate()).padStart(2, '0');
        const mesNum = String(diaAtual.getMonth() + 1).padStart(2, '0');
        const dataAlvoFormatada = diaAtual.toLocaleDateString('pt-BR');
        const dataIso = `${diaAtual.getFullYear()}-${String(diaAtual.getMonth() + 1).padStart(2, '0')}-${diaNum}`;
        const ehHoje = diaAtual.toDateString() === new Date().toDateString();
        const diaAtualPuro = new Date(diaAtual.getFullYear(), diaAtual.getMonth(), diaAtual.getDate());
        const diaJaPassou = diaAtualPuro < hoje;
        const diaEhHoje = diaAtualPuro.getTime() === hoje.getTime();
        const tituloDia = (diaTexto === 'Sábado' || diaTexto === 'Domingo')
            ? `${diaTexto}, ${diaNum}/${mesNum}`
            : `${diaTexto}-feira, ${diaNum}/${mesNum}`;
        
        // [FILTERED] Apply student filter and get only aula/reposição types
        let compromissosDoDia = (window.aulas || [])
            .filter(a => window.checarCompromissoNaData(a, diaAtual))
            .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
        
        // Filter by student if selected
        if (window.filtroAlunoSemanalId) {
            compromissosDoDia = compromissosDoDia.filter(a => a.alunoId === window.filtroAlunoSemanalId);
        }

        let cardsHtml = '';

        if (compromissosDoDia.length > 0) {
            compromissosDoDia.forEach(comp => {
                const compromissoConcluido = diaJaPassou || (diaEhHoje && converterHorarioParaMinutos(comp.horarioFim) < minutosAgora);
                cardsHtml += window.criarCardAgendamento(comp, {
                    dataReferencia: new Date(diaAtual),
                    compromissoConcluido: compromissoConcluido,
                    onclick: `abrirCalendarioAcaoSlot('${comp.id}', '${dataAlvoFormatada}')`
                });
            });
        } else {
            cardsHtml = `
                <button type="button" class="semana-dia-empty-slot" onclick="window.abrirNovoAgendamentoSemana('${dataIso}', '${horaInicioPadrao}')">
                    <span class="semana-dia-empty-slot-icon"><i class="fa-regular fa-calendar-plus"></i></span>
                    <span class="semana-dia-empty-slot-text">Sem agendamentos para este dia</span>
                </button>
            `;
        }
        html += `
            <section class="semana-dia-box ${ehHoje ? 'is-today' : ''}" id="${ehHoje ? 'semana-dia-hoje-elemento' : ''}">
                <button type="button" class="semana-dia-header" onclick="window.irParaDiaDestaSemana('${dataAlvoFormatada}')">
                    <span class="semana-dia-header-main">
                        <span class="semana-dia-title">${tituloDia}</span>
                        ${ehHoje ? '<span class="semana-dia-today-badge">HOJE</span>' : ''}
                    </span>
                    <span class="semana-dia-open-icon"><i class="fa-solid fa-chevron-right"></i></span>
                </button>
                <div class="semana-dia-content">
                    ${cardsHtml}
                </div>
            </section>
        `;
    }

    gridSemanal.innerHTML = html;
    setTimeout(() => {
        const hojeEl = document.getElementById('semana-dia-hoje-elemento');
        if (hojeEl) {
            hojeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 120);
};
window.renderizarCalendarioSemanal = window.renderizarHomeSemana;
window.obterProximaHoraCheiaSemana = function() {
    const agora = new Date();
    const horaAlvo = new Date(agora);

    if (horaAlvo.getMinutes() > 0 || horaAlvo.getSeconds() > 0 || horaAlvo.getMilliseconds() > 0) {
        horaAlvo.setHours(Math.min(horaAlvo.getHours() + 1, 23), 0, 0, 0);
    } else {
        horaAlvo.setMinutes(0, 0, 0);
    }

    return `${String(horaAlvo.getHours()).padStart(2, '0')}:00`;
};
window.abrirNovoAgendamentoSemana = function(dataIso, horaPadrao) {
    const partes = typeof dataIso === 'string' ? dataIso.split('-').map(Number) : [];
    if (partes.length !== 3) {
        return;
    }

    const dataSelecionada = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0, 0);
    window.abrirNovoAgendamento({
        dataSelecionada,
        hora: horaPadrao || `${String(agendaConfig?.horaInicio || 8).padStart(2, '0')}:00`
    });
};
window.abrirCalendarioAcaoSlot = function(id, dataStr) {
    window.dataAlvoAcaoStr = dataStr;

    if (typeof idCompromissoSelecionado !== 'undefined') {
        idCompromissoSelecionado = id;
    }
    
    if (typeof abrirModalAcaoSlot === 'function') {
        abrirModalAcaoSlot(id);
    }
    const originalFecharModalAcaoSlot = window.fecharModalAcaoSlot;
    window.fecharModalAcaoSlot = function() {
        window.dataAlvoAcaoStr = null; // Limpa o estado
        if (originalFecharModalAcaoSlot) originalFecharModalAcaoSlot();
        if (typeof window.renderizarHomeSemana === 'function') window.renderizarHomeSemana();
        if (typeof window.renderizarHomeDia === 'function') window.renderizarHomeDia();
    };
};

document.addEventListener('DOMContentLoaded', () => {
    const btnSemanaAnterior = document.getElementById('btnSemanaHomeAnterior');
    const btnSemanaProxima = document.getElementById('btnSemanaHomeProxima');
    const btnSemanaHoje = document.getElementById('btnSemanaHomeHoje');

    if (btnSemanaAnterior) {
        btnSemanaAnterior.addEventListener('click', () => {
            window.semanaReferencia.setDate(window.semanaReferencia.getDate() - 7);
            window.renderizarHomeSemana();
        });
    }

    if (btnSemanaProxima) {
        btnSemanaProxima.addEventListener('click', () => {
            window.semanaReferencia.setDate(window.semanaReferencia.getDate() + 7);
            window.renderizarHomeSemana();
        });
    }

    if (btnSemanaHoje) {
        btnSemanaHoje.addEventListener('click', () => {
            window.semanaReferencia = new Date();
            window.renderizarHomeSemana();
        });
    }

    const painelSemana = document.querySelector('.agenda-panel-semana');
    if (painelSemana && typeof window.ativarSwipePeriodo === 'function' && painelSemana.dataset.swipeAtivo !== 'true') {
        painelSemana.dataset.swipeAtivo = 'true';
        window.ativarSwipePeriodo(painelSemana, {
            aoAvancar: function () {
                window.semanaReferencia.setDate(window.semanaReferencia.getDate() + 7);
                window.renderizarHomeSemana();
            },
            aoVoltar: function () {
                window.semanaReferencia.setDate(window.semanaReferencia.getDate() - 7);
                window.renderizarHomeSemana();
            }
        });
    }

    const btnNovaAgendaSemanal = document.getElementById('btnNovaAgendaSemanal');
    if (btnNovaAgendaSemanal) {
        btnNovaAgendaSemanal.addEventListener('click', () => {
            const referenciaSemana = window.semanaReferencia instanceof Date && !Number.isNaN(window.semanaReferencia.getTime())
                ? new Date(window.semanaReferencia)
                : new Date();
            const diaSemanaReferencia = referenciaSemana.getDay();
            const deslocamentoParaSegunda = diaSemanaReferencia === 0 ? -6 : 1 - diaSemanaReferencia;
            const inicioSemana = new Date(
                referenciaSemana.getFullYear(),
                referenciaSemana.getMonth(),
                referenciaSemana.getDate() + deslocamentoParaSegunda,
                0,
                0,
                0,
                0
            );
            const fimSemana = new Date(
                inicioSemana.getFullYear(),
                inicioSemana.getMonth(),
                inicioSemana.getDate() + 6,
                23,
                59,
                59,
                999
            );

            const dataSelecionadaGlobal = window.dataSelecionada instanceof Date && !Number.isNaN(window.dataSelecionada.getTime())
                ? new Date(window.dataSelecionada)
                : null;
            const dataEstaNaSemanaAtiva = dataSelecionadaGlobal
                ? dataSelecionadaGlobal >= inicioSemana && dataSelecionadaGlobal <= fimSemana
                : false;

            const dataBase = dataEstaNaSemanaAtiva
                ? dataSelecionadaGlobal
                : referenciaSemana;
            const dataSelecionada = new Date(
                dataBase.getFullYear(),
                dataBase.getMonth(),
                dataBase.getDate(),
                0,
                0,
                0,
                0
            );

            window.abrirNovoAgendamento({
                dataSelecionada,
                hora: window.obterProximaHoraCheiaSemana()
            });
        });
    }
});
