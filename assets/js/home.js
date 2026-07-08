// ========================================================
// [TAG-JS-HOME] - Lógica da Home, Slots de 30m e Duração Dinâmica
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

// CORREÇÃO: Renderiza a data com ícone de calendário animado e realce de cores
window.atualizarDataAtual = function() {
    const elementoData = document.getElementById('dataAtual');
    if (!elementoData) return;
    const dia = String(dataSelecionada.getDate()).padStart(2, '0');
    const mes = String(dataSelecionada.getMonth() + 1).padStart(2, '0');
    const nomeDia = DIAS_DA_SEMANA[dataSelecionada.getDay()];
    
    // Insere o ícone de calendário dourado dinamicamente
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

    // Varre todos os horários fracionados do dia que encaixam nos limites do personal
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

window.abrirAgendamentoModal = function(dia, hora) {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;

    const modal = document.getElementById('modalAgendamento');
    document.getElementById('infoHorarioAlvo').textContent = `${dia} — Definir Período`;

    if (document.getElementById('formAgendamento')) {
        document.getElementById('formAgendamento').reset();
    }

    const selectInicio = document.getElementById('agendaHoraInicio');
    const selectFim = document.getElementById('agendaHoraFim');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectFim.innerHTML = optionsHtml;

    selectInicio.value = hora;
    selectFim.value = window.calcularUmaHoraAFrente(hora);

    const selectAluno = document.getElementById('agendaAluno');
    if (selectAluno) {
        selectAluno.innerHTML = '<option value="">Selecione um aluno...</option>' + 
            alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }

    window.selecionarTipoAgendamento('aula');
    if (modal) modal.style.display = 'flex';
};

window.calcularUmaHoraAFrente = function(horaStr) {
    const partes = horaStr.split(':');
    let h = parseInt(partes[0]) + 1;
    if (h > 23) h = 23;
    return `${h.toString().padStart(2, '0')}:${partes[1]}`;
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
    } else {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block';
        if (tipo === 'deslocamento') tabDeslocamento.classList.add('active');
        else tabBloqueio.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', (e) => {
            e.preventDefault();

            const tipo = document.getElementById('agendaTipo').value;
            const hInicio = document.getElementById('agendaHoraInicio').value;
            const hFim = document.getElementById('agendaHoraFim').value;

            if (hInicio >= hFim) {
                alert("O horário de término deve ser posterior ao início!");
                return;
            }

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
            } else {
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

let idCompromissoSelecionado = "";
window.abrirModalAcaoSlot = function(id) {
    idCompromissoSelecionado = id;
    const modal = document.getElementById('modalAcaoSlot');
    const elTexto = document.getElementById('textoCompromissoDetalhes');
    const btnRepor = document.getElementById('btnMandarParaReposicao');
    const compromisso = aulas.find(a => a.id === id);
    if (!compromisso) return;

    if ((compromisso.tipo || 'aula') === 'aula') {
        const aluno = typeof getAluno === 'function' ? getAluno(compromisso.alunoId) : null;
        elTexto.textContent = `Aula com ${aluno ? aluno.nome : 'Aluno'} das ${compromisso.horarioInicio} até ${compromisso.horarioFim}.`;
        btnRepor.style.display = 'block';
    } else {
        elTexto.textContent = `${compromisso.descricao || 'Compromisso'} das ${compromisso.horarioInicio} até ${compromisso.horarioFim}.`;
        btnRepor.style.display = 'none';
    }
    if (modal) modal.style.display = 'flex';
};

window.fecharModalAcaoSlot = function() {
    document.getElementById('modalAcaoSlot').style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('btnDeletarDefinitivo')) {
        document.getElementById('btnDeletarDefinitivo').addEventListener('click', () => {
            if (confirm("Desmarcar horário definitivamente?")) {
                aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
                if (typeof salvarDados === 'function') salvarDados();
                window.fecharModalAcaoSlot();
                window.inicializarHome();
            }
        });
    }

    if (document.getElementById('btnMandarParaReposicao')) {
        document.getElementById('btnMandarParaReposicao').addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (confirm("Enviar para a lista de reposição pendente?")) {
                aulasParaRepor.push({
                    id: Date.now().toString(),
                    alunoId: compromisso.alunoId,
                    dataCancelamento: new Date().toLocaleDateString('pt-BR')
                });
                aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
                if (typeof salvarDados === 'function') salvarDados();
                window.fecharModalAcaoSlot();
                window.inicializarHome();
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