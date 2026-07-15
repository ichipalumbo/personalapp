// ========================================================
// [TAG-JS-HOME] - Lógica da Home, Slots de 30m e Edição de Compromissos
// ========================================================

// MODIFICADO: Passa a utilizar escopo global unificado para date-sharing com o Calendário Semanal
window.dataSelecionada = window.dataSelecionada || new Date();
const DIAS_DA_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

let slotSelecionadoHora = "";
let slotSelecionadoDiaTexto = "";

// Variável para rastrear a data alvo de uma ação unificada de cancelamento/reagendamento
window.dataAlvoAcaoStr = null;

// Variável para controlar a hora selecionada a partir do clique no ecrã
window.horarioSelecionadoSlot = null;

// Variável para controlar o reagendamento vindo direto da lista de pendentes
window.reagendamentoDirectCardId = null;

// Helper global para buscar dados de aluno com segurança em qualquer escopo
window.getAluno = function(id) {
    if (typeof alunos !== 'undefined') {
        return alunos.find(a => a.id === id);
    }
    return null;
};

window.inicializarHome = function() {
    if (typeof carregarDados === 'function') carregarDados();
    
    if (!agendaConfig) agendaConfig = { horaInicio: 7, horaFim: 21 };
    if (!aulasParaRepor) aulasParaRepor = [];

    window.atualizarDataAtual();
    window.atualizarDashboardStats();
    window.renderizarAgendaDia();
    window.renderizarListaReposicoes();
    window.inicializarMultiSelectPills();
};

// Renderiza a data com ícone de calendário flat e realce de cores
window.atualizarDataAtual = function() {
    const elementoData = document.getElementById('dataAtual');
    if (!elementoData) return;
    const dia = String(window.dataSelecionada.getDate()).padStart(2, '0');
    const mes = String(window.dataSelecionada.getMonth() + 1).padStart(2, '0');
    const nomeDia = DIAS_DA_SEMANA[window.dataSelecionada.getDay()];

    elementoData.innerHTML = `<i class="fa-solid fa-calendar-minus" style="color: #FFD700; margin-right: 8px;"></i>${nomeDia} <span style="color: #FFD700; font-weight: 800;">(${dia}/${mes})</span>`;
};

window.atualizarDashboardStats = function() {
    const elAulasHoje = document.getElementById('totalAulasHoje');
    const elAulasRepor = document.getElementById('totalAulasRepor');

    if (elAulasHoje && typeof aulas !== 'undefined') {
        const aulasHoje = aulas.filter(a => {
            if (a.tipo && a.tipo !== 'aula') return false;
            return window.checarCompromissoNaData(a, window.dataSelecionada);
        });
        elAulasHoje.textContent = aulasHoje.length;
    }
    if (elAulasRepor) elAulasRepor.textContent = aulasParaRepor.length;
};

// Mapeamento direto de dia index do JavaScript para consistência total da Prô Josy
window.getDiaTextoSelecionado = function() {
    const diaIndex = window.dataSelecionada.getDay();
    const diasMapeados = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return diasMapeados[diaIndex];
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

    const agora = new Date();
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
    const ehHoje = window.dataSelecionada.toDateString() === agora.toDateString();

    let i = 0;
    let slotAtualIdSetado = false;

    while (i < slotsDoDia.length) {
        const horaStr = slotsDoDia[i];
        
        // Determina se este slot específico representa o momento atual do sistema
        const [slotH, slotM] = horaStr.split(':').map(Number);
        const slotMinutos = slotH * 60 + slotM;
        const ehSlotMomentoAtual = ehHoje && (agoraMinutos >= slotMinutos && agoraMinutos < slotMinutos + 30);

        // Busca compromisso respeitando o novo motor unificado do Canvas
        const compromisso = aulas.find(a => window.checarCompromissoNaData(a, window.dataSelecionada, horaStr));

        // Verifica se o compromisso engloba o horário atual do sistema
        let ehCompromissoNoMomentoAtual = false;
        if (compromisso && ehHoje) {
            const [cIniH, cIniM] = compromisso.horarioInicio.split(':').map(Number);
            const [cFimH, cFimM] = compromisso.horarioFim.split(':').map(Number);
            const cIniMin = cIniH * 60 + cIniM;
            const cFimMin = cFimH * 60 + cFimM;
            ehCompromissoNoMomentoAtual = agoraMinutos >= cIniMin && agoraMinutos < cFimMin;
        }

        const destacarLinha = ehSlotMomentoAtual || ehCompromissoNoMomentoAtual;
        const atribuirIdScroll = destacarLinha && !slotAtualIdSetado;
        if (atribuirIdScroll) {
            slotAtualIdSetado = true;
        }

        if (compromisso) {
            let cardHtml = '';
            const tipo = compromisso.tipo || 'aula';
            const periodoExibicao = `${compromisso.horarioInicio} - ${compromisso.horarioFim}`;

            // Sistema inteligente de Tags Visuais Premium nos cards
            let tagVisualHtml = '';

            if (tipo === 'aula') {
                const aluno = window.getAluno(compromisso.alunoId);
                const nome = aluno ? aluno.nome : '❓ Aluno Removido';
                const objetivo = aluno ? aluno.objetivo : 'Outro';
                const local = aluno ? (aluno.local || 'Não definido') : 'Não definido';

                // Classificação visual de acordo com o tipo real do agendamento
                if (compromisso.reagendada || compromisso.isReposicao) {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(100, 181, 246, 0.15); color: #64B5F6; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
                } else if (compromisso.frequencia === 'semanal') {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 215, 0, 0.15); color: #FFD700; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-infinity"></i> Recorrente</span>`;
                } else {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(129, 199, 132, 0.15); color: #81C784; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
                }
                
                cardHtml = `
                    <div class="agenda-dia-aula objetivo-${objetivo.replace(/\s/g,'')}" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                            <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nome}</span>
                            ${tagVisualHtml}
                        </div>
                        <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
                        <span class="agenda-dia-aula-detalhes">${objetivo} (${periodoExibicao})</span>
                    </div>
                `;
            } else if (tipo === 'deslocamento') {
                tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 152, 0, 0.15); color: #FF9800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-car-side"></i> Trânsito</span>`;
                
                cardHtml = `
                    <div class="agenda-dia-aula slot-deslocamento" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                            <span class="agenda-dia-aula-nome" style="color: #FF9800;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                            ${tagVisualHtml}
                        </div>
                        <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || 'Trânsito'} (${periodoExibicao})</span>
                    </div>
                `;
            } else if (tipo === 'bloqueio') {
                tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(239, 83, 80, 0.15); color: #EF5350; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-lock"></i> Bloqueio</span>`;

                cardHtml = `
                    <div class="agenda-dia-aula slot-bloqueado" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                            <span class="agenda-dia-aula-nome" style="color: #EF5350;"><i class="fa-solid fa-lock"></i> Bloqueado</span>
                            ${tagVisualHtml}
                        </div>
                        <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || 'Compromisso'} (${periodoExibicao})</span>
                    </div>
                `;
            }

            html += `
                <div class="agenda-dia-linha ${destacarLinha ? 'linha-hora-atual' : ''}" ${atribuirIdScroll ? 'id="slot-hora-atual"' : ''}>
                    <div class="agenda-dia-horario">
                        ${horaStr}
                        ${destacarLinha ? '<span class="pulse-indicador-agora"></span>' : ''}
                    </div>
                    ${cardHtml}
                </div>
            `;

            while (i < slotsDoDia.length && slotsDoDia[i] < compromisso.horarioFim) {
                i++;
            }
        } else {
            // Agora ao clicar num slot vago abre o modal intermédio de escolha de tipo
            html += `
                <div class="agenda-dia-linha ${destacarLinha ? 'linha-hora-atual' : ''}" ${atribuirIdScroll ? 'id="slot-hora-atual"' : ''}>
                    <div class="agenda-dia-horario">
                        ${horaStr}
                        ${destacarLinha ? '<span class="pulse-indicador-agora"></span>' : ''}
                    </div>
                    <div class="agenda-dia-vago" onclick="window.abrirEscolhaTipoModal('${diaTexto}', '${horaStr}')">
                        <span class="agenda-dia-vago-texto"><i class="fa-regular fa-calendar-plus" style="color: #FFD700;"></i> Vago — Toque para agendar</span>
                    </div>
                </div>
            `;
            i++;
        }
    }

    grid.innerHTML = html;

    // MODIFICADO: Comportamento de autoscroll (scrollIntoView) foi removido da Home para evitar movimentos abruptos e irritantes ao recarregar ou navegar entre dias!
};

// Soma minutos a uma string de horário (ex: "18:30" + 90 -> "20:00")
window.somarMinutos = function(horaStr, minutos) {
    const [h, m] = horaStr.split(':').map(Number);
    let totalMinutos = h * 60 + m + parseInt(minutos);
    const novaHora = Math.floor(totalMinutos / 60) % 24;
    const novosMinutos = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, '0')}:${novosMinutos.toString().padStart(2, '0')}`;
};

// Calcula a diferença em minutos entre dois horários
window.diferencaMinutos = function(inicio, fim) {
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fim.split(':').map(Number);
    return (hF * 60 + mF) - (hI * 60 + mI);
};

// Abre o modal de escolha do tipo de agendamento (Fluxo Intermédio)
window.abrirEscolhaTipoModal = function(dia, hora) {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;
    window.horarioSelecionadoSlot = hora; // Memoriza para pré-seleção em qualquer modal subsequente

    const modal = document.getElementById('modalEscolhaTipo');
    if (modal) {
        document.getElementById('infoEscolhaSlot').textContent = `Agendar às ${hora} de ${dia}-feira`;
        modal.style.display = 'flex';
    }
};

window.fecharEscolhaTipoModal = function() {
    const modal = document.getElementById('modalEscolhaTipo');
    if (modal) {
        modal.style.display = 'none';
    }
};

// RENDERIZAÇÃO DO MODAL PARA EVENTO ÚNICO
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

    // CORREÇÃO DO BUG: Atribui a hora exata selecionada no slot ao select de início!
    selectInicio.value = hora || window.horarioSelecionadoSlot || "08:00";
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

// ATIVA INTERAÇÃO NOS BOTÕES DE SELEÇÃO MÚLTIPLA DE DIA (Outlook Style)
window.inicializarMultiSelectPills = function() {
    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
        // Remove listeners duplicados recriando o botão
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        
        novoBtn.addEventListener('click', () => {
            novoBtn.classList.toggle('active');
            window.atualizarTextoPreviewRecorrencia();
        });
    });

    const inputIntervalo = document.getElementById('recorrenciaIntervalo');
    if (inputIntervalo) {
        inputIntervalo.addEventListener('input', () => {
            window.atualizarTextoPreviewRecorrencia();
        });
    }
};

// ATUALIZA RESUMO EXPLICATIVO DINÂMICO DA RECORRÊNCIA (Outlook Style)
window.atualizarTextoPreviewRecorrencia = function() {
    const padrao = document.getElementById('recorrenciaPadrao').value;
    const intervalo = parseInt(document.getElementById('recorrenciaIntervalo').value) || 1;
    const infoText = document.getElementById('textoInfoMensalAnual');
    
    const diasSelecionados = [];
    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill.active').forEach(btn => {
        diasSelecionados.push(btn.getAttribute('data-dia'));
    });

    let msg = "";
    if (padrao === 'diaria') {
        msg = `Repetir a cada ${intervalo} dia(s) útil/úteis (Segunda a Sábado) sem interrupções.`;
    } else if (padrao === 'semanal') {
        const diasStr = diasSelecionados.length > 0 ? diasSelecionados.join(', ') : "[Nenhum selecionado]";
        msg = `Repetir a cada ${intervalo} semana(s) na(s) seguinte(s) data(s): ${diasStr}.`;
    } else if (padrao === 'mensal') {
        const diasStr = diasSelecionados.length > 0 ? ` na(s) ${diasSelecionados.join(', ')}` : " no mesmo dia";
        msg = `Repetir a cada ${intervalo} mês(es)${diasStr} (com base no dia da criação do compromisso).`;
    } else if (padrao === 'anual') {
        msg = `Repetir a cada ${intervalo} ano(s) no mesmo dia e mês em que foi criado.`;
    }

    if (infoText) {
        infoText.innerHTML = `<i class="fa-solid fa-circle-info" style="margin-right: 6px;"></i>${msg}`;
    }
};

// ALTERNA VISUALIZAÇÃO DE PADRÕES DINAMICAMENTE NO MODAL
window.mudarPadraoRecorrencia = function() {
    const padrao = document.getElementById('recorrenciaPadrao').value;
    const containerDias = document.getElementById('containerDiasSemanaRecorrencia');
    const labelUnidade = document.getElementById('labelUnidadeRecorrencia');
    const infoContainer = document.getElementById('infoRecorrenciaMensalAnual');

    if (infoContainer) infoContainer.style.display = 'block';

    // Limpa seleções anteriores para evitar contaminações de formulário
    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
        btn.classList.remove('active');
    });

    if (padrao === 'diaria') {
        containerDias.style.display = 'none';
        labelUnidade.textContent = 'dia(s)';
    } else if (padrao === 'semanal') {
        containerDias.style.display = 'block';
        labelUnidade.textContent = 'semana(s)';
        
        // Pré-seleciona por padrão o dia corrente para agilizar o clique da personal
        const diaHoje = window.getDiaTextoSelecionado();
        document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
            if (btn.getAttribute('data-dia') === diaHoje) btn.classList.add('active');
        });
    } else if (padrao === 'mensal') {
        containerDias.style.display = 'block';
        labelUnidade.textContent = 'mês(es)';
    } else if (padrao === 'anual') {
        containerDias.style.display = 'none';
        labelUnidade.textContent = 'ano(s)';
    }

    window.atualizarTextoPreviewRecorrencia();
};

// ABRE O MODAL DE RECORRÊNCIA SEMANAL (OUTLOOK STYLE)
window.abrirModalRecorrencia = function(dia, hora) {
    const modal = document.getElementById('modalRecorrencia');
    if (document.getElementById('formRecorrencia')) {
        document.getElementById('formRecorrencia').reset();
    }

    const selectInicio = document.getElementById('recorrenciaHoraInicio');
    const selectDuracao = document.getElementById('recorrenciaDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;

    // CORREÇÃO DO BUG: Atribui a hora exata selecionada no slot ao select de início da Recorrência!
    const hAlvo = hora || window.horarioSelecionadoSlot || "08:00";
    selectInicio.value = hAlvo;
    selectDuracao.value = "60";

    document.getElementById('recorrenciaPadrao').value = "semanal";
    document.getElementById('recorrenciaIntervalo').value = "1";

    const selectAluno = document.getElementById('recorrenciaAluno');
    if (selectAluno) {
        selectAluno.innerHTML = '<option value="">Selecione um aluno...</option>' + 
            alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }

    window.mudarPadraoRecorrencia();

    // CORREÇÃO DO BUG DO DIA DA SEMANA: Ativa a pill correspondente ao slot clicado por padrão
    const dAlvo = dia || slotSelecionadoDiaTexto;
    if (dAlvo) {
        document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
            if (btn.getAttribute('data-dia') === dAlvo) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        window.atualizarTextoPreviewRecorrencia();
    }

    window.selecionarTipoRecorrente('aula');
    
    if (modal) modal.style.display = 'flex';
};

window.selecionarTipoRecorrente = function(tipo) {
    document.getElementById('recorrenciaTipo').value = tipo;
    const tabAula = document.getElementById('tabRecorrenteAula');
    const tabDeslocamento = document.getElementById('tabRecorrenteDeslocamento');
    const tabBloqueio = document.getElementById('tabRecorrenteBloqueio');
    const camposAula = document.getElementById('camposRecorrenteAula');
    const camposBloqueio = document.getElementById('camposRecorrenteBloqueio');

    tabAula.classList.remove('active');
    tabDeslocamento.classList.remove('active');
    tabBloqueio.classList.remove('active');

    if (tipo === 'aula') {
        tabAula.classList.add('active');
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';
        document.getElementById('recorrenciaAluno').required = true;
        document.getElementById('recorrenciaDescricao').required = false;
    } else if (tipo === 'deslocamento') {
        tabDeslocamento.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none'; 
        document.getElementById('recorrenciaAluno').required = false;
        document.getElementById('recorrenciaDescricao').required = false;
    } else if (tipo === 'bloqueio') {
        tabBloqueio.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block'; 
        document.getElementById('recorrenciaAluno').required = false;
        document.getElementById('recorrenciaDescricao').required = true;
    }
};

// Abre o modal de reagendamento específico a partir de um slot vazio
window.abrirReagendarAulaModalSlot = function(dia, hora) {
    window.reagendamentoDirectCardId = null; // Indica que a origem foi o clique num slot livre

    const modal = document.getElementById('modalReagendarAula');
    if (!modal) return;

    // Exibe o select completo e esconde o campo estático travado
    document.getElementById('containerSeletorReagendarAluno').style.display = 'block';
    document.getElementById('containerLockReagendarAluno').style.display = 'none';

    // Filtra e popula de forma única os alunos com reposições pendentes na fila
    const selectAluno = document.getElementById('reagendarAluno');
    if (selectAluno) {
        const alunosComFila = [];
        const idsUnicos = new Set();
        
        aulasParaRepor.forEach(rep => {
            if (!idsUnicos.has(rep.alunoId)) {
                idsUnicos.add(rep.alunoId);
                const alunoObj = window.getAluno(rep.alunoId);
                if (alunoObj) {
                    alunosComFila.push(alunoObj);
                }
            }
        });

        if (alunosComFila.length === 0) {
            selectAluno.innerHTML = '<option value="">Não existem alunos com reposição pendente!</option>';
        } else {
            selectAluno.innerHTML = '<option value="">Selecione o aluno...</option>' + 
                alunosComFila.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
        }
    }

    // Configura os valores de dia e hora de início de acordo com o slot clicado
    document.getElementById('reagendarDia').value = dia;

    const selectInicio = document.getElementById('reagendarHoraInicio');
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = hora;

    document.getElementById('infoReagendamentoSlot').textContent = `Encaixar reposição às ${hora} de ${dia}-feira`;

    modal.style.display = 'flex';
};

// Abre o modal específico a partir do botão "Reagendar" no card da fila
window.iniciarReagendamentoReposicao = function(id) {
    const rep = aulasParaRepor.find(r => r.id === id);
    if (!rep) return;

    // Salva o ID da reposição para remoção da fila após submissão do formulário
    window.reagendamentoDirectCardId = id;

    const modal = document.getElementById('modalReagendarAula');
    if (!modal) return;

    // Esconde o select e exibe apenas a informação travada com o nome do aluno selecionado
    document.getElementById('containerSeletorReagendarAluno').style.display = 'none';
    document.getElementById('containerLockReagendarAluno').style.display = 'block';

    const aluno = window.getAluno(rep.alunoId);
    document.getElementById('reagendarAlunoLockedNome').textContent = aluno ? aluno.nome : 'Aluno';
    document.getElementById('reagendarAlunoIdLocked').value = rep.alunoId;

    // Configura dia e hora com valores atuais confortáveis
    const diaTexto = window.getDiaTextoSelecionado();
    document.getElementById('reagendarDia').value = diaTexto;

    const selectInicio = document.getElementById('reagendarHoraInicio');
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = window.horarioSelecionadoSlot || "08:00"; 

    document.getElementById('infoReagendamentoSlot').textContent = `Reagendamento Directo • Fila de espera`;

    modal.style.display = 'flex';
};

window.fecharReagendarAulaModal = function() {
    const modal = document.getElementById('modalReagendarAula');
    if (modal) {
        modal.style.display = 'none';
    }
    window.reagendamentoDirectCardId = null;
};

document.addEventListener('DOMContentLoaded', () => {
    // Escuta do Botão Infinito de Recorrência
    const btnRecorrencia = document.getElementById('btnRecorrenciaAgenda');
    if (btnRecorrencia) {
        btnRecorrencia.addEventListener('click', () => {
            window.abrirModalRecorrencia();
        });
    }

    const btnFecharRecorrencia = document.getElementById('btnFecharModalRecorrencia');
    if (btnFecharRecorrencia) {
        btnFecharRecorrencia.addEventListener('click', () => {
            document.getElementById('modalRecorrencia').style.display = 'none';
        });
    }

    // Configuração dos eventos de clique no modal intermédio de escolha de tipo
    const btnEscolhaUnico = document.getElementById('btnEscolhaUnico');
    if (btnEscolhaUnico) {
        btnEscolhaUnico.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirAgendamentoModal(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    const btnEscolhaRecorrente = document.getElementById('btnEscolhaRecorrente');
    if (btnEscolhaRecorrente) {
        btnEscolhaRecorrente.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirModalRecorrencia(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    const btnEscolhaReposicao = document.getElementById('btnEscolhaReposicao');
    if (btnEscolhaReposicao) {
        btnEscolhaReposicao.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirReagendarAulaModalSlot(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    // Submissão do formulário específico do novo modal de reagendamento
    const formReagendarAula = document.getElementById('formReagendarAula');
    if (formReagendarAula) {
        formReagendarAula.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let alunoId = "";
            let repId = "";

            if (window.reagendamentoDirectCardId) {
                // Origem: Fila de reposição pendente
                const repObj = aulasParaRepor.find(r => r.id === window.reagendamentoDirectCardId);
                if (!repObj) return;
                alunoId = repObj.alunoId;
                repId = repObj.id;
            } else {
                // Origem: Clique no slot vazio
                alunoId = document.getElementById('reagendarAluno').value;
                if (!alunoId) {
                    alert("Por favor, selecione um aluno para agendar a reposição!");
                    return;
                }
                const repObj = aulasParaRepor.find(r => r.alunoId === alunoId);
                if (repObj) {
                    repId = repObj.id;
                }
            }

            const dia = document.getElementById('reagendarDia').value;
            const hInicio = document.getElementById('reagendarHoraInicio').value;
            const duracao = document.getElementById('reagendarDuracao').value;
            const hFim = window.somarMinutos(hInicio, duracao);

            // Adiciona a nova aula de reposição única na agenda
            let novoCompromisso = {
                id: Date.now().toString(),
                dia: dia,
                data: window.dataSelecionada.toLocaleDateString('pt-BR'),
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: 'aula',
                alunoId: alunoId,
                frequencia: 'uma_vez',
                isReposicao: true,
                reagendada: true
            };

            aulas.push(novoCompromisso);

            // Remove o aluno da fila de reposições pendentes
            if (repId) {
                aulasParaRepor = aulasParaRepor.filter(r => r.id !== repId);
            }

            if (typeof salvarDados === 'function') salvarDados();

            window.fecharReagendarAulaModal();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Reposição agendada com sucesso!');
        });
    }

    // Gravação de Evento Único (Sem seletores de recorrência)
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
                data: window.dataSelecionada.toLocaleDateString('pt-BR'),
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: tipo,
                frequencia: 'uma_vez' // Estritamente único!
            };

            if (tipo === 'aula') {
                const alunoId = document.getElementById('agendaAluno').value;
                if (!alunoId) return;
                novoCompromisso.alunoId = alunoId;
            } else if (tipo === 'deslocamento') {
                novoCompromisso.descricao = "Trânsito / Deslocamento"; 
            } else if (tipo === 'bloqueio') {
                novoCompromisso.descricao = document.getElementById('agendaDescricao').value.trim();
            }

            aulas.push(novoCompromisso);
            if (typeof salvarDados === 'function') salvarDados();

            document.getElementById('modalAgendamento').style.display = 'none';
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Horário agendado com sucesso!');
        });
    }

    // Gravação do Novo Evento Recorrente ( Outlook Style )
    const formRecorrencia = document.getElementById('formRecorrencia');
    if (formRecorrencia) {
        formRecorrencia.addEventListener('submit', (e) => {
            e.preventDefault();

            const tipo = document.getElementById('recorrenciaTipo').value;
            const hInicio = document.getElementById('recorrenciaHoraInicio').value;
            const duracaoMinutos = document.getElementById('recorrenciaDuracao').value;
            const hFim = window.somarMinutos(hInicio, duracaoMinutos);
            
            const padrao = document.getElementById('recorrenciaPadrao').value;
            const intervalo = parseInt(document.getElementById('recorrenciaIntervalo').value) || 1;

            const diasSelecionados = [];
            document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill.active').forEach(btn => {
                diasSelecionados.push(btn.getAttribute('data-dia'));
            });

            if ((padrao === 'semanal' || padrao === 'mensal') && diasSelecionados.length === 0) {
                alert("Por favor, selecione ao menos um dia da semana para o padrão semanal/mensal!");
                return;
            }

            // Cria o evento recorrente principal de alta fidelidade
            let novoCompromisso = {
                id: Date.now().toString(),
                dia: diasSelecionados.length > 0 ? diasSelecionados[0] : "Segunda", 
                diasSemana: diasSelecionados, // Salva múltiplos dias selecionados
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: tipo,
                frequencia: 'semanal', 
                tipoRecorrencia: padrao,
                intervaloRecorrencia: intervalo,
                excecoes: [], // Armazenará as datas das instâncias canceladas/reagendadas
                dataCriacao: new Date().toISOString() // Data inicial de ancoragem do motor
            };

            if (tipo === 'aula') {
                const alunoId = document.getElementById('recorrenciaAluno').value;
                if (!alunoId) return;
                novoCompromisso.alunoId = alunoId;
            } else if (tipo === 'deslocamento') {
                novoCompromisso.descricao = "Trânsito / Deslocamento"; 
            } else if (tipo === 'bloqueio') {
                novoCompromisso.descricao = document.getElementById('recorrenciaDescricao').value.trim();
            }

            aulas.push(novoCompromisso);
            if (typeof salvarDados === 'function') salvarDados();

            document.getElementById('modalRecorrencia').style.display = 'none';
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('♾️ Recorrência Outlook configurada!');
        });
    }

    if (document.getElementById('btnFecharModal')) {
        document.getElementById('btnFecharModal').addEventListener('click', () => {
            document.getElementById('modalAgendamento').style.display = 'none';
            window.reposicaoIdEmReagendamento = null; 
        });
    }
});

// Abrir modal unificado de EDIÇÃO/GERENCIAMENTO de compromisso
let idCompromissoSelecionado = "";

window.abrirModalAcaoSlot = function(id) {
    idCompromissoSelecionado = id;
    const modal = document.getElementById('modalAcaoSlot');
    const compromisso = aulas.find(a => a.id === id);
    if (!compromisso) return;

    const freq = compromisso.frequencia || 'uma_vez';
    document.getElementById('editCompromissoFrequencia').value = freq;

    const badge = document.getElementById('badgeTipoCompromisso');
    const containerDiaSemana = document.getElementById('editDiaSemanaContainer');

    const acoesUnico = document.getElementById('acoesCompromissoUnico');
    const acoesRecorrente = document.getElementById('acoesCompromissoRecorrente');

    // Elementos e containers dos botões de reagendamento para modificação dinâmica de layout
    const btnMandarReposicao = document.getElementById('btnMandarParaReposicao');
    const btnReagendarInstancia = document.getElementById('btnReagendarInstancia');
    const recorrenteTopRow = document.querySelector('#acoesCompromissoRecorrente > div');

    const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
    const tipo = compromisso.tipo || 'aula';

    // Remove a opção de "reagendar/reposição" para bloqueios e deslocamentos
    if (tipo !== 'aula') {
        // Se for deslocamento ou bloqueio, oculta botões de reposição e ajusta colunas para preenchimento simétrico
        if (btnMandarReposicao) btnMandarReposicao.style.display = 'none';
        if (btnReagendarInstancia) btnReagendarInstancia.style.display = 'none';
        
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr';
        if (recorrenteTopRow) recorrenteTopRow.style.gridTemplateColumns = '1fr';
    } else {
        // Se for aula de aluno, exibe normalmente os botões e restaura grid simétrico (duas colunas)
        if (btnMandarReposicao) btnMandarReposicao.style.display = 'inline-flex';
        if (btnReagendarInstancia) btnReagendarInstancia.style.display = 'inline-flex';
        
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr 1fr';
        if (recorrenteTopRow) recorrenteTopRow.style.gridTemplateColumns = '1fr 1fr';
    }

    // Usando a nova classe .modal-badge para que ela siga e abrace o tamanho do texto (width: auto)
    if (freq === 'semanal') {
        const padraoNome = compromisso.tipoRecorrencia ? compromisso.tipoRecorrencia.toUpperCase() : "SEMANAL";
        badge.innerHTML = `<i class="fa-solid fa-infinity"></i> ${padraoNome}`;
        badge.className = "modal-badge badge-aula"; 
        
        containerDiaSemana.style.display = 'block';
        document.getElementById('editDiaSemana').value = compromisso.dia || "Segunda";
        document.getElementById('editInfoDia').textContent = `Série Recorrente • Gerenciando dia: ${dataAlvoStr}`;

        // Exibe o painel de botões customizados de recorrência
        if (acoesUnico) acoesUnico.style.display = 'none';
        if (acoesRecorrente) acoesRecorrente.style.display = 'flex';
    } else {
        badge.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ÚNICO`;
        badge.className = "modal-badge badge-desloc"; 
        
        containerDiaSemana.style.display = 'none';
        document.getElementById('editInfoDia').textContent = `Agendado para: ${compromisso.data || compromisso.dia}`;

        // Exibe o painel de botões clássico para compromissos unitários
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr 1fr';
        if (acoesUnico) acoesUnico.style.display = 'grid';
        if (acoesRecorrente) acoesRecorrente.style.display = 'none';
    }
    
    const selectInicio = document.getElementById('editHoraInicio');
    const selectDuracao = document.getElementById('editDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = compromisso.horarioInicio;

    const minutes = window.diferencaMinutos(compromisso.horarioInicio, compromisso.horarioFim);
    selectDuracao.value = minutes.toString();

    const camposAula = document.getElementById('editCamposTipoAula');
    const camposBloqueio = document.getElementById('editCamposTipoBloqueio');

    if (tipo === 'aula') {
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';

        const selectAluno = document.getElementById('editAluno');
        if (selectAluno) {
            selectAluno.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
            selectAluno.value = compromisso.alunoId;
        }
    } else if (tipo === 'deslocamento') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none';
    } else if (tipo === 'bloqueio') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block';
        document.getElementById('editDescricao').value = compromisso.descricao || '';
    }

    if (modal) modal.style.display = 'flex';
};

window.fecharModalAcaoSlot = function() {
    document.getElementById('modalAcaoSlot').style.display = 'none';
};

// Listeners das ações de Salvamento, Cancelamento e Reagendamento
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
            const freq = document.getElementById('editCompromissoFrequencia').value;

            if (hInicio >= hFim) {
                alert("O horário de término deve ser posterior ao início!");
                return;
            }

            compromisso.horarioInicio = hInicio;
            compromisso.horarioFim = hFim;

            if (freq === 'semanal') {
                compromisso.dia = document.getElementById('editDiaSemana').value;
                delete compromisso.data;
            }

            const tipo = compromisso.tipo || 'aula';
            if (tipo === 'bloqueio') {
                compromisso.descricao = document.getElementById('editDescricao').value.trim();
            }

            if (typeof salvarDados === 'function') salvarDados();

            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Alterações salvas com sucesso!');
        });
    }

    // ========================================================
    // [TAG-JS-ACOES-SLOTS] - Lógica Refinada de Cancelamentos/Reagendamentos
    // ========================================================

    // 1. CANCELAR COMPROMISSO ÚNICO (Exclusão total do registro unitário)
    const btnDeletar = document.getElementById('btnDeletarDefinitivo');
    if (btnDeletar) {
        btnDeletar.addEventListener('click', () => {
            aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🗑️ Compromisso único cancelado!');
        });
    }

    // 2. REAGENDAR COMPROMISSO ÚNICO (Mandar unitário para fila de reposição e deletar)
    const btnMandarReposicao = document.getElementById('btnMandarParaReposicao');
    if (btnMandarReposicao) {
        btnMandarReposicao.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            aulasParaRepor.push({
                id: Date.now().toString(),
                alunoId: compromisso.alunoId,
                dataCancelamento: compromisso.data || new Date().toLocaleDateString('pt-BR')
            });
            
            aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();

            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🔄 Aula única enviada para reposição!');
        });
    }

    // 3. CANCELAR APENAS HOJE (Recorrente - Adiciona exceção sem quebrar a série)
    const btnDeletarInstancia = document.getElementById('btnDeletarInstancia');
    if (btnDeletarInstancia) {
        btnDeletarInstancia.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
            if (!compromisso.excecoes) compromisso.excecoes = [];
            if (!compromisso.excecoes.includes(dataAlvoStr)) {
                compromisso.excecoes.push(dataAlvoStr);
            }

            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast(`📅 Aula de ${dataAlvoStr} cancelada!`);
        });
    }

    // 4. REAGENDAR APENAS HOJE (Recorrente - Adiciona exceção hoje E envia o aluno para reposição)
    const btnReagendarInstancia = document.getElementById('btnReagendarInstancia');
    if (btnReagendarInstancia) {
        btnReagendarInstancia.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
            if (!compromisso.excecoes) compromisso.excecoes = [];
            if (!compromisso.excecoes.includes(dataAlvoStr)) {
                compromisso.excecoes.push(dataAlvoStr);
            }

            aulasParaRepor.push({
                id: Date.now().toString(),
                alunoId: compromisso.alunoId,
                dataCancelamento: dataAlvoStr
            });

            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast(`🔄 Aula de ${dataAlvoStr} enviada para reposição!`);
        });
    }

    // 5. CANCELAR SÉRIE COMPLETA (Recorrente - Remove o registro mestre de recorrência)
    const btnDeletarSerie = document.getElementById('btnDeletarSerie');
    if (btnDeletarSerie) {
        btnDeletarSerie.addEventListener('click', () => {
            aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🗑️ Série recorrente excluída do calendário!');
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

// RENDERIZAÇÃO DA FILA DE REPOSIÇÕES COM BOTÃO DE REAGENDAR E DESCARTAR
window.renderizarListaReposicoes = function() {
    const container = document.getElementById('listaReposicoesPendentes');
    if (!container) return;
    if (!aulasParaRepor || aulasParaRepor.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: #666; text-align: center; padding: 10px;">Sem reposições pendentes.</p>`;
        return;
    }
    container.innerHTML = aulasParaRepor.map(rep => {
        const aluno = window.getAluno(rep.alunoId);
        return `
            <div class="aluno-card" style="border-left-color: #FF5252; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: #222;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="display: block; color: #FFF; font-size: 0.9rem;">${aluno ? aluno.nome : 'Aluno'}</strong>
                        <span style="font-size: 0.72rem; color: #FF5252; font-weight: 600;">Cancelada em ${rep.dataCancelamento}</span>
                    </div>
                </div>
                <!-- Ações completas para reencaixar na agenda através do novo modal exclusivo -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button class="btn btn-primary btn-sm" onclick="iniciarReagendamentoReposicao('${rep.id}')" style="background: #FFD700; color: #0D0D0D; font-size: 0.7rem; border: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-calendar-check"></i> Reagendar
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="resolverReposicao('${rep.id}')" style="background: #111; color: #AAA; border: 1px solid #333; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-trash"></i> Descartar
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.resolverReposicao = function(id) {
    aulasParaRepor = aulasParaRepor.filter(r => r.id !== id);
    if (typeof salvarDados === 'function') salvarDados();
    window.inicializarHome();
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
            window.dataSelecionada.setDate(window.dataSelecionada.getDate() - 1);
            window.inicializarHome();
        });
    }
    if (document.getElementById('btnProximo')) {
        document.getElementById('btnProximo').addEventListener('click', () => {
            window.dataSelecionada.setDate(window.dataSelecionada.getDate() + 1);
            window.inicializarHome();
        });
    }
    if (document.getElementById('btnHoje')) {
        document.getElementById('btnHoje').addEventListener('click', () => {
            window.dataSelecionada = new Date();
            window.inicializarHome();
        });
    }
});