// ========================================================
// [TAG-JS-HOME] - Lógica da Home, Slots de 30m e Edição de Compromissos
// ========================================================

let dataSelecionada = new Date();
const DIAS_DA_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

let slotSelecionadoHora = "";
let slotSelecionadoDiaTexto = "";

window.inicializarHome = function() {
    if (typeof carregarDados === 'function') carregarDados();
    
    if (!agendaConfig) agendaConfig = { horaInicio: 7, horaFim: 21 };
    if (!aulasParaRepor) aulasParaRepor = [];

    window.atualizarDataAtual();
    window.atualizarDashboardStats();
    window.renderizarAgendaDia();
    window.renderizarListaReposicoes();
};

// Renderiza a data com ícone de calendário flat e realce de cores
window.atualizarDataAtual = function() {
    const elementoData = document.getElementById('dataAtual');
    if (!elementoData) return;
    const dia = String(dataSelecionada.getDate()).padStart(2, '0');
    const mes = String(dataSelecionada.getMonth() + 1).padStart(2, '0');
    const nomeDia = DIAS_DA_SEMANA[dataSelecionada.getDay()];
    
    elementoData.innerHTML = `<i class="fa-regular fa-calendar-check" style="color: #FFD700; margin-right: 8px;"></i>${nomeDia}, <span style="color: #FFD700; font-weight: 800;">${dia}/${mes}</span>`;
};

window.atualizarDashboardStats = function() {
    const elAulasHoje = document.getElementById('totalAulasHoje');
    const elAulasRepor = document.getElementById('totalAulasRepor');
    const diaTexto = window.getDiaTextoSelecionado();

    if (elAulasHoje && typeof aulas !== 'undefined') {
        const aulasHoje = aulas.filter(a => a.dia === diaTexto && (!a.tipo || a.tipo === 'aula'));
        elAulasHoje.textContent = aulasHoje.length;
    }
    if (elAulasRepor) elAulasRepor.textContent = aulasParaRepor.length;
};

window.getDiaTextoSelecionado = function() {
    const diaIndex = dataSelecionada.getDay();
    if (typeof DIAS !== 'undefined' && diaIndex >= 1 && diaIndex <= 5) return DIAS[diaIndex - 1];
    return diaIndex === 0 ? 'Domingo' : 'Sábado';
};

// Renderiza em slots de 30m agrupados visualmente para compromissos mais longos
window.renderizarAgendaDia = function() {
    const grid = document.getElementById('agendaGridHome');
    if (!grid) return;

    const diaTexto = window.getDiaTextoSelecionado();
    let html = '';

    const inicio = agendaConfig.horaInicio;
    const fim = agendaConfig.horaFim;

    const slotsDoDia = HORARIOS.filter(h => {
        const horaInt = parseInt(h.split(':')[0]);
        return horaInt >= inicio && horaInt < fim;
    });

    let i = 0;
    while (i < slotsDoDia.length) {
        const horaStr = slotsDoDia[i];
        const compromisso = aulas.find(a => a.dia === diaTexto && a.horarioInicio === horaStr);

        if (compromisso) {
            let cardHtml = '';
            const tipo = compromisso.tipo || 'aula';
            const periodoExibicao = `${compromisso.horarioInicio} - ${compromisso.horarioFim}`;

            if (tipo === 'aula') {
                const aluno = typeof getAluno === 'function' ? getAluno(compromisso.alunoId) : null;
                const nome = aluno ? aluno.nome : '❓ Aluno Removido';
                const objetivo = aluno ? aluno.objetivo : 'Outro';
                const local = aluno ? (aluno.local || 'Não definido') : 'Não definido';
                
                cardHtml = `
                    <div class="agenda-dia-aula objetivo-${objetivo.replace(/\s/g,'')}" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nome}</span>
                        <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
                        <span class="agenda-dia-aula-detalhes">${objetivo} (${periodoExibicao})</span>
                    </div>
                `;
            } else if (tipo === 'deslocamento') {
                cardHtml = `
                    <div class="agenda-dia-aula slot-deslocamento" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <span class="agenda-dia-aula-nome" style="color: #FF9800;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                        <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || 'Trânsito'} (${periodoExibicao})</span>
                    </div>
                `;
            } else if (tipo === 'bloqueio') {
                cardHtml = `
                    <div class="agenda-dia-aula slot-bloqueado" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <span class="agenda-dia-aula-nome" style="color: #EF5350;"><i class="fa-solid fa-lock"></i> Bloqueado</span>
                        <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || 'Compromisso'} (${periodoExibicao})</span>
                    </div>
                `;
            }

            html += `
                <div class="agenda-dia-linha">
                    <div class="agenda-dia-horario">${horaStr}</div>
                    ${cardHtml}
                </div>
            `;

            while (i < slotsDoDia.length && slotsDoDia[i] < compromisso.horarioFim) {
                i++;
            }
        } else {
            html += `
                <div class="agenda-dia-linha">
                    <div class="agenda-dia-horario">${horaStr}</div>
                    <div class="agenda-dia-vago" onclick="abrirAgendamentoModal('${diaTexto}', '${horaStr}')">
                        <span class="agenda-dia-vago-texto"><i class="fa-regular fa-calendar-plus" style="color: #FFD700;"></i> Vago — Toque para agendar</span>
                    </div>
                </div>
            `;
            i++;
        }
    }

    grid.innerHTML = html;
};

// Soma minutos a uma string de horário (ex: "18:30" + 90 -> "20:00")
window.somarMinutos = function(horaStr, minutos) {
    const [h, m] = horaStr.split(':').map(Number);
    let totalMinutos = h * 60 + m + parseInt(minutos);
    const novaHora = Math.floor(totalMinutos / 60) % 24;
    const novosMinutos = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, '0')}:${novosMinutos.toString().padStart(2, '0')}`;
};

// Calcula a diferença em minutos entre dois horários "HH:MM"
window.diferencaMinutos = function(inicio, fim) {
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fim.split(':').map(Number);
    return (hF * 60 + mF) - (hI * 60 + mI);
};

window.abrirAgendamentoModal = function(dia, hora) {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;

    const modal = document.getElementById('modalAgendamento');
    document.getElementById('infoHorarioAlvo').textContent = `${dia} — Definir Período`;

    if (document.getElementById('formAgendamento')) {
        document.getElementById('formAgendamento').reset();
    }

    const selectInicio = document.getElementById('agendaHoraInicio');
    const selectDuracao = document.getElementById('agendaDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;

    selectInicio.value = hora;
    if (selectDuracao) {
        selectDuracao.value = "60"; 
    }

    const selectAluno = document.getElementById('agendaAluno');
    if (selectAluno) {
        selectAluno.innerHTML = '<option value="">Selecione um aluno...</option>' + 
            alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }

    window.selecionarTipoAgendamento('aula');
    if (modal) modal.style.display = 'flex';
};

window.selecionarTipoAgendamento = function(tipo) {
    document.getElementById('agendaTipo').value = tipo;
    const tabAula = document.getElementById('tabAgendarAula');
    const tabDeslocamento = document.getElementById('tabAgendarDeslocamento');
    const tabBloqueio = document.getElementById('tabAgendarBloqueio');
    const camposAula = document.getElementById('camposTipoAula');
    const camposBloqueio = document.getElementById('camposTipoBloqueio');

    tabAula.classList.remove('active');
    tabDeslocamento.classList.remove('active');
    tabBloqueio.classList.remove('active');

    if (tipo === 'aula') {
        tabAula.classList.add('active');
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';
        document.getElementById('agendaAluno').required = true;
        document.getElementById('agendaDescricao').required = false;
    } else if (tipo === 'deslocamento') {
        tabDeslocamento.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none'; 
        document.getElementById('agendaAluno').required = false;
        document.getElementById('agendaDescricao').required = false;
    } else if (tipo === 'bloqueio') {
        tabBloqueio.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block'; 
        document.getElementById('agendaAluno').required = false;
        document.getElementById('agendaDescricao').required = true;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', (e) => {
            e.preventDefault();

            const tipo = document.getElementById('agendaTipo').value;
            const hInicio = document.getElementById('agendaHoraInicio').value;
            const duracaoMinutos = document.getElementById('agendaDuracao').value;
            const hFim = window.somarMinutos(hInicio, duracaoMinutos);

            let novoCompromisso = {
                id: Date.now().toString(),
                dia: slotSelecionadoDiaTexto,
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: tipo
            };

            if (tipo === 'aula') {
                const alunoId = document.getElementById('agendaAluno').value;
                if (!alunoId) return;
                novoCompromisso.alunoId = alunoId;
                novoCompromisso.frequencia = document.getElementById('agendaFrequencia').value;
            } else if (tipo === 'deslocamento') {
                novoCompromisso.descricao = "Trânsito / Deslocamento"; 
            } else if (tipo === 'bloqueio') {
                novoCompromisso.descricao = document.getElementById('agendaDescricao').value.trim();
            }

            aulas.push(novoCompromisso);
            if (typeof salvarDados === 'function') salvarDados();

            document.getElementById('modalAgendamento').style.display = 'none';
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Agendado com sucesso!');
        });
    }

    if (document.getElementById('btnFecharModal')) {
        document.getElementById('btnFecharModal').addEventListener('click', () => {
            document.getElementById('modalAgendamento').style.display = 'none';
        });
    }
});

// MODIFICADO: Abrir modal unificado de EDIÇÃO/GERENCIAMENTO de compromisso
let idCompromissoSelecionado = "";

window.abrirModalAcaoSlot = function(id) {
    idCompromissoSelecionado = id;
    const modal = document.getElementById('modalAcaoSlot');
    const compromisso = aulas.find(a => a.id === id);
    if (!compromisso) return;

    // Exibe o dia em foco
    document.getElementById('editInfoDia').textContent = `Editar Compromisso — ${compromisso.dia}`;
    
    // Configura e popula o seletor de horários de início
    const selectInicio = document.getElementById('editHoraInicio');
    const selectDuracao = document.getElementById('editDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = compromisso.horarioInicio;

    // Calcula a duração atual e marca o correto no select
    const minutos = window.diferencaMinutos(compromisso.horarioInicio, compromisso.horarioFim);
    selectDuracao.value = minutos.toString();

    const tipo = compromisso.tipo || 'aula';
    const camposAula = document.getElementById('editCamposTipoAula');
    const camposBloqueio = document.getElementById('editCamposTipoBloqueio');
    const btnRepor = document.getElementById('btnMandarParaReposicao');

    // Carrega e oculta as seções de campos com base no tipo ativo do bloco
    if (tipo === 'aula') {
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';
        btnRepor.style.display = 'block'; // Mostra Reagendar somente para aulas

        const selectAluno = document.getElementById('editAluno');
        if (selectAluno) {
            selectAluno.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
            selectAluno.value = compromisso.alunoId;
        }
        document.getElementById('editFrequencia').value = compromisso.frequencia || 'uma_vez';
    } else if (tipo === 'deslocamento') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none';
        btnRepor.style.display = 'none'; // Deslocamento não se reagenda
    } else if (tipo === 'bloqueio') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block';
        btnRepor.style.display = 'none'; // Bloqueios particulares não geram reposições pendentes
        document.getElementById('editDescricao').value = compromisso.descricao || '';
    }

    if (modal) modal.style.display = 'flex';
};

window.fecharModalAcaoSlot = function() {
    document.getElementById('modalAcaoSlot').style.display = 'none';
};

// Listeners das ações de Salvamento, Cancelamento e Reagendamento (Alterados)
document.addEventListener('DOMContentLoaded', () => {
    const formEditar = document.getElementById('formEditarCompromisso');
    if (formEditar) {
        formEditar.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            const hInicio = document.getElementById('editHoraInicio').value;
            const duracaoMinutos = document.getElementById('editDuracao').value;
            const hFim = window.somarMinutos(hInicio, duracaoMinutos);

            if (hInicio >= hFim) {
                alert("O horário de término deve ser posterior ao início!");
                return;
            }

            // Grava os novos horários
            compromisso.horarioInicio = hInicio;
            compromisso.horarioFim = hFim;

            const tipo = compromisso.tipo || 'aula';
            if (tipo === 'aula') {
                compromisso.frequencia = document.getElementById('editFrequencia').value;
            } else if (tipo === 'bloqueio') {
                compromisso.descricao = document.getElementById('editDescricao').value.trim();
            }

            if (typeof salvarDados === 'function') salvarDados();

            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Alterações salvas com sucesso!');
        });
    }

    // Cancelar (Excluir definitivamente)
    const btnDeletar = document.getElementById('btnDeletarDefinitivo');
    if (btnDeletar) {
        btnDeletar.addEventListener('click', () => {
            if (confirm("Deseja realmente cancelar este compromisso definitivamente?")) {
                aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
                if (typeof salvarDados === 'function') salvarDados();
                
                window.fecharModalAcaoSlot();
                window.inicializarHome();
                if (typeof mostrarToast === 'function') mostrarToast('Compromisso cancelado.');
            }
        });
    }

    // Reagendar (Enviar para reposição pendente)
    const btnMandarReposicao = document.getElementById('btnMandarParaReposicao');
    if (btnMandarReposicao) {
        btnMandarReposicao.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            if (confirm("Deseja reagendar esta aula (enviar para fila de reposição)?")) {
                aulasParaRepor.push({
                    id: Date.now().toString(),
                    alunoId: compromisso.alunoId,
                    dataCancelamento: new Date().toLocaleDateString('pt-BR')
                });
                
                // Remove o compromisso da agenda atual
                aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
                
                if (typeof salvarDados === 'function') salvarDados();

                window.fecharModalAcaoSlot();
                window.inicializarHome();
                if (typeof mostrarToast === 'function') mostrarToast('🔄 Aula enviada para reposição!');
            }
        });
    }
});

window.togglePainelReposicoes = function() {
    const painel = document.getElementById('painelReposicoesPendentes');
    if (painel.style.display === 'none') {
        painel.style.display = 'block';
        window.renderizarListaReposicoes();
    } else {
        painel.style.display = 'none';
    }
};

window.renderizarListaReposicoes = function() {
    const container = document.getElementById('listaReposicoesPendentes');
    if (!container) return;
    if (!aulasParaRepor || aulasParaRepor.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: #666; text-align: center; padding: 10px;">Sem reposições pendentes.</p>`;
        return;
    }
    container.innerHTML = aulasParaRepor.map(rep => {
        const aluno = typeof getAluno === 'function' ? getAluno(rep.alunoId) : null;
        return `
            <div class="aluno-card" style="border-left-color: #FF5252; display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #222;">
                <div>
                    <strong style="display: block; color: #FFF; font-size: 0.9rem;">${aluno ? aluno.nome : 'Aluno'}</strong>
                    <span style="font-size: 0.72rem; color: #FF5252; font-weight: 600;">Cancelada em ${rep.dataCancelamento}</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="resolverReposicao('${rep.id}')" style="background: #FF5252; color: #FFF; border: none;">
                    <i class="fa-solid fa-check"></i> Resolvido
                </button>
            </div>
        `;
    }).join('');
};

window.resolverReposicao = function(id) {
    if (confirm("Dar baixa nesta reposição?")) {
        aulasParaRepor = aulasParaRepor.filter(r => r.id !== id);
        if (typeof salvarDados === 'function') salvarDados();
        window.inicializarHome();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const btnConfig = document.getElementById('btnConfigAgenda');
    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            const selectInicio = document.getElementById('configHoraInicio');
            const selectFim = document.getElementById('configHoraFim');
            let options = '';
            for (let i = 0; i <= 23; i++) {
                options += `<option value="${i}">${i.toString().padStart(2, '0')}:00</option>`;
            }
            selectInicio.innerHTML = options;
            selectFim.innerHTML = options;
            selectInicio.value = agendaConfig.horaInicio;
            selectFim.value = agendaConfig.horaFim;
            document.getElementById('modalConfigAgenda').style.display = 'flex';
        });
    }

    if (document.getElementById('btnFecharConfig')) {
        document.getElementById('btnFecharConfig').addEventListener('click', () => {
            document.getElementById('modalConfigAgenda').style.display = 'none';
        });
    }

    if (document.getElementById('formConfigAgenda')) {
        document.getElementById('formConfigAgenda').addEventListener('submit', (e) => {
            e.preventDefault();
            const inicio = parseInt(document.getElementById('configHoraInicio').value);
            const fim = parseInt(document.getElementById('configHoraFim').value);
            if (inicio >= fim) {
                alert("Início deve ser menor que o fim!");
                return;
            }
            agendaConfig.horaInicio = inicio;
            agendaConfig.horaFim = fim;
            if (typeof salvarDados === 'function') salvarDados();
            document.getElementById('modalConfigAgenda').style.display = 'none';
            window.inicializarHome();
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('btnAnterior')) {
        document.getElementById('btnAnterior').addEventListener('click', () => {
            dataSelecionada.setDate(dataSelecionada.getDate() - 1);
            window.inicializarHome();
        });
    }
    if (document.getElementById('btnProximo')) {
        document.getElementById('btnProximo').addEventListener('click', () => {
            dataSelecionada.setDate(dataSelecionada.getDate() + 1);
            window.inicializarHome();
        });
    }
    if (document.getElementById('btnHoje')) {
        document.getElementById('btnHoje').addEventListener('click', () => {
            dataSelecionada = new Date();
            window.inicializarHome();
        });
    }
});